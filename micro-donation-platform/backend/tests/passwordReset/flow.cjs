const { before, beforeEach, after, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PGlite } = require('@electric-sql/pglite');
const { startLocalSmtp } = require('./smtp.cjs');
const { startTestPostgrest } = require('./postgrest.cjs');

let db;
let smtp;
let postgrest;
let app;
let clientNumber = 0;
const pendingRequests = new Set();
const credentials = { email: 'reset@example.test', password: 'old-password-123' };
const newPassword = 'new-password-456';
const digest = (token) => crypto.createHash('sha256').update(token).digest('hex');
const migration = fs.readFileSync(path.join(__dirname, '../../src/config/migrations/006_password_reset.sql'), 'utf8');

before(async () => {
  db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  await db.exec(fs.readFileSync(path.join(__dirname, '../../src/config/schema.sql'), 'utf8'));
  await db.exec('GRANT USAGE ON SCHEMA public TO service_role; GRANT SELECT, INSERT, UPDATE ON public.users TO service_role;');
  await db.exec(migration);
  postgrest = await startTestPostgrest(db);
  smtp = await startLocalSmtp();
  // This test process never loads the real .env or sends external email.
  Object.assign(process.env, {
    SUPABASE_URL: postgrest.url, SUPABASE_SERVICE_KEY: 'local-test-only-key',
    JWT_SECRET: 'local-test-only-jwt-secret', CLIENT_URL: 'http://frontend.test',
    SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.port), SMTP_USER: '', SMTP_PASS: '',
    EMAIL_FROM: 'sender@example.test', NODE_ENV: 'test',
  });
  app = express();
  // Test-only forwarded IPs isolate the actual route limiters between scenarios.
  app.set('trust proxy', 1);
  app.use(express.json());
  const authRoutes = require('../../src/routes/auth');
  // Track the actual controller's post-response work so tests can wait for mail
  // without altering production behavior or mistaking an acknowledgement for delivery.
  const route = authRoutes.stack.find((layer) => layer.route?.path === '/forgot-password').route;
  const handler = route.stack.at(-1);
  const original = handler.handle;
  handler.handle = (...args) => {
    const pending = original(...args);
    pendingRequests.add(pending);
    pending.finally(() => pendingRequests.delete(pending));
    return pending;
  };
  app.use('/api/auth', authRoutes);
});

beforeEach(async () => {
  await Promise.all([...pendingRequests]);
  await db.exec('TRUNCATE public.users CASCADE;');
  smtp.messages.length = 0;
  smtp.rejectRecipients(false);
  clientNumber += 1;
});

after(async () => {
  await Promise.all([...pendingRequests]);
  if (smtp) await smtp.close();
  if (postgrest) await postgrest.close();
  if (db) await db.close();
});

const post = (route, body) => request(app).post(`/api/auth/${route}`)
  .set('X-Forwarded-For', `192.0.2.${clientNumber}`).send(body);
const me = (token) => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
const forgot = async (email = credentials.email) => {
  const response = await post('forgot-password', { email });
  await Promise.all([...pendingRequests]);
  return response;
};
const reset = (token, password = newPassword) => post('reset-password', { token, password });

async function seed(verified = true, email = credentials.email) {
  const id = crypto.randomUUID();
  await db.query('INSERT INTO public.users (id, email, password_hash, display_name, is_verified) VALUES ($1,$2,$3,$4,$5)',
    [id, email, bcrypt.hashSync(credentials.password, 4), 'Test donor', verified]);
  return id;
}

function capturedToken() {
  const message = smtp.messages.at(-1).replace(/=\r?\n/g, '').replace(/=3D/g, '=');
  const match = message.match(/http:\/\/frontend\.test\/reset-password#token=([a-f0-9]{64})/);
  assert.ok(match, 'Real Nodemailer output must contain a password reset link');
  return match[1];
}

test('registration → reset SMTP email → new password login; old password and previous sessions stop working', async () => {
  const registration = await post('register', { ...credentials, display_name: 'Test donor' });
  assert.equal(registration.status, 201);
  // Issue #5 is not merged: verify only this isolated test fixture manually.
  await db.exec('UPDATE public.users SET is_verified = true');
  const loginBefore = await post('login', credentials);
  assert.equal(loginBefore.status, 200);
  const oldToken = loginBefore.body.token;
  const claims = jwt.verify(oldToken, process.env.JWT_SECRET);
  const legacyToken = jwt.sign({ id: claims.id, email: claims.email, role: claims.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  assert.equal((await me(legacyToken)).status, 200, 'Existing pre-version JWTs work before a password reset');
  const response = await forgot(' RESET@EXAMPLE.TEST ');
  assert.equal(response.status, 200);
  assert.equal(smtp.messages.length, 1);
  const token = capturedToken();
  assert.ok(!JSON.stringify(response.body).includes(token));
  const stored = (await db.query('SELECT * FROM public.password_reset_tokens')).rows[0];
  assert.equal(stored.token, digest(token));
  assert.notEqual(stored.token, token);
  assert.equal(new Date(stored.expires_at).getTime() - new Date(stored.created_at).getTime(), 60 * 60 * 1000);

  const changed = await reset(token);
  assert.equal(changed.status, 200);
  assert.equal(changed.headers['cache-control'], 'no-store');
  const account = (await db.query('SELECT * FROM public.users')).rows[0];
  assert.equal(await bcrypt.compare(newPassword, account.password_hash), true);
  assert.equal(bcrypt.getRounds(account.password_hash), 12);
  assert.equal(account.auth_version, 1);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.password_reset_tokens')).rows[0].count, 0);
  assert.equal((await post('login', credentials)).status, 401);
  const loginAfter = await post('login', { ...credentials, password: newPassword });
  assert.equal(loginAfter.status, 200);
  const updatedClaims = jwt.verify(loginAfter.body.token, process.env.JWT_SECRET);
  assert.equal(updatedClaims.auth_version, 1);
  assert.equal(updatedClaims.exp - updatedClaims.iat, 7 * 24 * 60 * 60);
  assert.equal((await me(oldToken)).status, 401);
  assert.equal((await me(legacyToken)).status, 401);
  assert.equal((await me(loginAfter.body.token)).status, 200);
  assert.equal((await reset(token)).status, 400);
});

test('unknown emails receive the same generic response and do not create tokens or messages', async () => {
  await seed();
  const known = await forgot();
  const unknown = await forgot('unknown@example.test');
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.deepEqual(unknown.body, known.body);
  assert.equal(smtp.messages.length, 1);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.password_reset_tokens')).rows[0].count, 1);
});

test('expired and invalid links cannot change the password or sessions', async () => {
  await seed();
  await forgot();
  const token = capturedToken();
  await db.exec("UPDATE public.password_reset_tokens SET expires_at = clock_timestamp() - interval '1 second'");
  assert.equal((await reset(token)).status, 410);
  assert.equal((await reset('ab'.repeat(32))).status, 400);
  const account = (await db.query('SELECT * FROM public.users')).rows[0];
  assert.equal(await bcrypt.compare(credentials.password, account.password_hash), true);
  assert.equal(account.auth_version, 0);
});

test('account cooldown and replacement leave only the newest reset link usable', async () => {
  await seed();
  const first = await forgot();
  const oldToken = capturedToken();
  const repeated = await forgot();
  assert.deepEqual(repeated.body, first.body);
  assert.equal(smtp.messages.length, 1);
  await db.exec("UPDATE public.password_reset_tokens SET created_at = clock_timestamp() - interval '2 minutes'");
  assert.equal((await forgot()).status, 200);
  const latest = capturedToken();
  assert.notEqual(latest, oldToken);
  assert.equal((await reset(oldToken)).status, 400);
  assert.equal((await reset(latest)).status, 200);
});

test('simultaneous resets consume a token once and increment the session version once', async () => {
  await seed();
  await forgot();
  const token = capturedToken();
  const responses = await Promise.all([reset(token, 'candidate-password-1'), reset(token, 'candidate-password-2')]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 400]);
  const winner = responses[0].status === 200 ? 'candidate-password-1' : 'candidate-password-2';
  const account = (await db.query('SELECT * FROM public.users')).rows[0];
  assert.equal(await bcrypt.compare(winner, account.password_hash), true);
  assert.equal(account.auth_version, 1);
});

test('database failure rolls back password/version/token changes and allows a retry', async () => {
  await seed();
  await forgot();
  const token = capturedToken();
  await db.exec(`CREATE FUNCTION public.fail_test_reset() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Simulated storage failure'; END; $$;
    CREATE TRIGGER fail_test_reset BEFORE DELETE ON public.password_reset_tokens
    FOR EACH ROW EXECUTE FUNCTION public.fail_test_reset();`);
  try {
    const response = await reset(token);
    assert.equal(response.status, 500);
    assert.ok(!JSON.stringify(response.body).includes('Simulated storage failure'));
    const account = (await db.query('SELECT * FROM public.users')).rows[0];
    assert.equal(await bcrypt.compare(credentials.password, account.password_hash), true);
    assert.equal(account.auth_version, 0);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.password_reset_tokens')).rows[0].count, 1);
  } finally {
    await db.exec('DROP TRIGGER fail_test_reset ON public.password_reset_tokens; DROP FUNCTION public.fail_test_reset();');
  }
  assert.equal((await reset(token)).status, 200);
});

test('SMTP failure does not reveal account existence and requesting a later link recovers', async () => {
  await seed();
  smtp.rejectRecipients(true);
  const failed = await forgot();
  const unknown = await forgot('unknown@example.test');
  assert.equal(failed.status, 200);
  assert.deepEqual(failed.body, unknown.body);
  assert.equal(smtp.messages.length, 0);
  await db.exec("UPDATE public.password_reset_tokens SET created_at = clock_timestamp() - interval '2 minutes'");
  smtp.rejectRecipients(false);
  await forgot();
  assert.equal((await reset(capturedToken())).status, 200);
});

test('password reset does not verify an unverified account or change a different user', async () => {
  const id = await seed(false);
  const otherId = await seed(true, 'other@example.test');
  await forgot();
  assert.equal((await reset(capturedToken())).status, 200);
  const target = (await db.query('SELECT * FROM public.users WHERE id = $1', [id])).rows[0];
  const other = (await db.query('SELECT * FROM public.users WHERE id = $1', [otherId])).rows[0];
  assert.equal(target.is_verified, false);
  assert.equal((await post('login', { ...credentials, password: newPassword })).status, 403);
  assert.equal(other.auth_version, 0);
  assert.equal(await bcrypt.compare(credentials.password, other.password_hash), true);
});

test('actual routes enforce IP limits independently of account existence', async () => {
  for (let i = 0; i < 5; i += 1) assert.equal((await forgot('unknown@example.test')).status, 200);
  const limited = await forgot('unknown@example.test');
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers['retry-after']) > 0);
  for (let i = 0; i < 20; i += 1) assert.equal((await reset('invalid')).status, 400);
  assert.equal((await reset('invalid')).status, 429);
});

test('only the backend role can read reset digests and invoke the SQL functions', async () => {
  for (const role of ['anon', 'authenticated']) {
    const { rows } = await db.query(`SELECT
      has_table_privilege($1, 'public.password_reset_tokens', 'SELECT') AS read,
      has_function_privilege($1, 'public.issue_password_reset_token(uuid,text)', 'EXECUTE') AS issue,
      has_function_privilege($1, 'public.reset_password_with_token(text,text)', 'EXECUTE') AS reset`, [role]);
    assert.deepEqual(rows[0], { read: false, issue: false, reset: false });
  }
  const { rows } = await db.query(`SELECT
    has_table_privilege('service_role', 'public.password_reset_tokens', 'SELECT') AS read,
    has_function_privilege('service_role', 'public.reset_password_with_token(text,text)', 'EXECUTE') AS reset`);
  assert.deepEqual(rows[0], { read: true, reset: true });
});

test('migration is repeatable without resetting session versions; SQL rejects malformed hashes', async () => {
  const id = await seed();
  await db.query('UPDATE public.users SET auth_version = 3 WHERE id = $1', [id]);
  await db.exec(migration);
  assert.equal((await db.query('SELECT auth_version FROM public.users')).rows[0].auth_version, 3);
  await assert.rejects(db.query('SELECT public.issue_password_reset_token($1,$2)', [id, 'bad']), /Invalid reset digest/);
  await assert.rejects(db.query('SELECT public.reset_password_with_token($1,$2)', [digest('token'), 'plaintext-password']), /Invalid password hash/);
  const result = await db.query('SELECT public.issue_password_reset_token($1,$2) AS result', [crypto.randomUUID(), digest('token')]);
  assert.equal(result.rows[0].result, 'invalid');
});
