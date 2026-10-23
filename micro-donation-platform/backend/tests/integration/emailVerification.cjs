const { before, after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { startLocalSmtp } = require('../helpers/localSmtp');
const { startTestPostgrest } = require('../helpers/testPostgrest');

let db;
let smtp;
let postgrest;
let app;
let clientNumber = 0;
const credentials = { email: 'verification@example.test', password: 'test-password-123' };
const digest = (token) => crypto.createHash('sha256').update(token).digest('hex');
const migration = fs.readFileSync(path.join(__dirname, '../../src/config/migrations/005_email_verification.sql'), 'utf8');

before(async () => {
  db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  await db.exec(fs.readFileSync(path.join(__dirname, '../../src/config/schema.sql'), 'utf8'));
  // Supabase's backend role already has these user-table privileges.
  await db.exec('GRANT USAGE ON SCHEMA public TO service_role; GRANT SELECT, INSERT, UPDATE ON public.users TO service_role;');
  await db.exec(migration);
  postgrest = await startTestPostgrest(db);
  smtp = await startLocalSmtp();
  // These settings exist only in this child test process, never in a .env file.
  Object.assign(process.env, {
    SUPABASE_URL: postgrest.url, SUPABASE_SERVICE_KEY: 'local-test-only-key',
    JWT_SECRET: 'local-test-only-jwt-secret', CLIENT_URL: 'http://frontend.test',
    SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.port), SMTP_USER: '', SMTP_PASS: '',
    EMAIL_FROM: 'sender@example.test', NODE_ENV: 'test',
  });
  app = express();
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    req.headers['x-forwarded-for'] = `192.0.2.${clientNumber}`;
    next();
  });
  app.use(express.json());
  app.use('/api/auth', require('../../src/routes/auth'));
});

after(async () => {
  if (smtp) await smtp.close();
  if (postgrest) await postgrest.close();
  if (db) await db.close();
});

beforeEach(async () => {
  clientNumber += 1;
  await db.exec('TRUNCATE public.users CASCADE;');
  smtp.messages.length = 0;
  smtp.rejectRecipients(false);
});

async function addUnverifiedAccount() {
  const id = crypto.randomUUID();
  await db.query('INSERT INTO public.users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
    [id, credentials.email, bcrypt.hashSync(credentials.password, 4), 'Test donor']);
  return id;
}

function capturedToken() {
  const message = smtp.messages.at(-1).replace(/=\r?\n/g, '').replace(/=3D/g, '=');
  const match = message.match(/http:\/\/frontend\.test\/verify-email#token=([a-f0-9]{64})/);
  assert.ok(match, 'The captured SMTP message must contain a verification link');
  return match[1];
}

const verify = (token) => request(app).get(`/api/auth/verify/${token}`).set('Accept', 'application/json');

test('signup OTP arrives over SMTP before a user exists, then verification allows password creation and login', async () => {
  const email = 'otp-signup@example.test';
  const post = (path, body) => request(app).post('/api/auth/signup/' + path).send(body);
  const sent = await post('send-code', { email, display_name: 'OTP Student' });
  assert.equal(sent.status, 200);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.users')).rows[0].count, 0);
  const message = smtp.messages.at(-1).replace(/=\r?\n/g, '').replace(/=3D/g, '=');
  const code = message.match(/Your verification code is: (\d{6})/)[1];
  assert.ok(!JSON.stringify(sent.body).includes(code));
  const checked = await post('verify-code', { email, code });
  assert.equal(checked.status, 200);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.users')).rows[0].count, 0);
  const created = await post('complete', { email, verification_token: checked.body.verification_token, password: credentials.password });
  assert.equal(created.status, 201);
  const user = (await db.query('SELECT * FROM public.users')).rows[0];
  assert.equal(user.is_verified, true);
  assert.equal(user.display_name, 'OTP Student');
  assert.equal(bcrypt.getRounds(user.password_hash), 12);
  const login = await request(app).post('/api/auth/login').send({ email, password: credentials.password });
  assert.equal(login.status, 200);
  assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`)).status, 200);
  assert.equal((await post('complete', { email, verification_token: checked.body.verification_token, password: credentials.password })).status, 400);
});

test('register → real Nodemailer/local SMTP → verification SQL → JWT login and protected route', async () => {
  const response = await request(app).post('/api/auth/register')
    .send({ ...credentials, email: ' VERIFICATION@EXAMPLE.TEST ', display_name: 'Test donor' });
  assert.equal(response.status, 201);
  assert.match(response.body.message, /Check your email/);
  assert.equal(smtp.messages.length, 1, 'The SMTP test service accepted a real Nodemailer message');
  const token = capturedToken();
  assert.ok(!JSON.stringify(response.body).includes(token));
  const stored = (await db.query('SELECT * FROM public.email_tokens')).rows[0];
  assert.equal(stored.token, digest(token));
  assert.notEqual(stored.token, token);
  const lifetime = new Date(stored.expires_at).getTime() - new Date(stored.created_at).getTime();
  assert.ok(Math.abs(lifetime - 24 * 60 * 60 * 1000) < 1000);
  const before = await request(app).post('/api/auth/login').send(credentials);
  assert.equal(before.status, 403);

  const verified = await verify(token);
  assert.equal(verified.status, 200);
  assert.equal(verified.headers['cache-control'], 'no-store');
  assert.equal(verified.headers['referrer-policy'], 'no-referrer');
  const user = (await db.query('SELECT is_verified FROM public.users')).rows[0];
  assert.equal(user.is_verified, true);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.email_tokens')).rows[0].count, 0);

  const login = await request(app).post('/api/auth/login').send(credentials);
  assert.equal(login.status, 200);
  const decoded = jwt.verify(login.body.token, process.env.JWT_SECRET);
  assert.equal(decoded.exp - decoded.iat, 7 * 24 * 60 * 60);
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, credentials.email);
  assert.ok(!('password_hash' in me.body.user));
  assert.equal((await verify(token)).status, 400, 'A consumed token cannot be reused');
});

test('expired and invalid links do not verify an account; resending replaces the old link', async () => {
  await addUnverifiedAccount();
  assert.equal((await request(app).post('/api/auth/resend-verification').send(credentials)).status, 200);
  const oldToken = capturedToken();
  await db.exec("UPDATE public.email_tokens SET expires_at = now() - interval '1 second', created_at = now() - interval '2 minutes'");
  assert.equal((await verify(oldToken)).status, 410);
  assert.equal((await verify('ab'.repeat(32))).status, 400);
  assert.equal((await db.query('SELECT is_verified FROM public.users')).rows[0].is_verified, false);
  assert.equal((await request(app).post('/api/auth/resend-verification').send(credentials)).status, 200);
  const newToken = capturedToken();
  assert.notEqual(oldToken, newToken);
  assert.equal((await verify(oldToken)).status, 400);
  assert.equal((await verify(newToken)).status, 200);
});

test('resend requires the correct password and enforces the database cooldown', async () => {
  await addUnverifiedAccount();
  const wrong = await request(app).post('/api/auth/resend-verification')
    .send({ ...credentials, password: 'wrong-password' });
  assert.equal(wrong.status, 401);
  assert.equal(smtp.messages.length, 0);
  assert.equal((await request(app).post('/api/auth/resend-verification').send(credentials)).status, 200);
  const response = await request(app).post('/api/auth/resend-verification').send(credentials);
  assert.equal(response.status, 429);
  assert.equal(response.headers['retry-after'], '60');
  assert.equal(smtp.messages.length, 1);
});

test('two concurrent verification requests can only succeed once', async () => {
  await addUnverifiedAccount();
  await request(app).post('/api/auth/resend-verification').send(credentials);
  const token = capturedToken();
  const responses = await Promise.all([verify(token), verify(token)]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 400]);
});

test('database failure rolls back verification and leaves the token available for retry', async () => {
  await addUnverifiedAccount();
  await request(app).post('/api/auth/resend-verification').send(credentials);
  const token = capturedToken();
  await db.exec(`
    CREATE FUNCTION public.fail_test_verification() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Simulated storage failure'; END; $$;
    CREATE TRIGGER fail_test_verification BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.fail_test_verification();
  `);
  try {
    const response = await verify(token);
    assert.equal(response.status, 500);
    assert.ok(!JSON.stringify(response.body).includes('Simulated storage failure'));
    assert.equal((await db.query('SELECT is_verified FROM public.users')).rows[0].is_verified, false);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.email_tokens')).rows[0].count, 1);
  } finally {
    await db.exec('DROP TRIGGER fail_test_verification ON public.users; DROP FUNCTION public.fail_test_verification();');
  }
  assert.equal((await verify(token)).status, 200);
});

test('SMTP rejection does not claim successful delivery; the account can recover by resending', async () => {
  smtp.rejectRecipients(true);
  const response = await request(app).post('/api/auth/register').send({ ...credentials, display_name: 'Test donor' });
  assert.equal(response.status, 503);
  assert.match(response.body.error, /Account created/);
  assert.equal(smtp.messages.length, 0);
  assert.equal((await request(app).post('/api/auth/login').send(credentials)).status, 403);
  await db.exec("UPDATE public.email_tokens SET created_at = now() - interval '2 minutes'");
  smtp.rejectRecipients(false);
  assert.equal((await request(app).post('/api/auth/resend-verification').send(credentials)).status, 200);
  assert.equal((await verify(capturedToken())).status, 200);
});

test('direct browser verification redirects to login after verification', async () => {
  await addUnverifiedAccount();
  await request(app).post('/api/auth/resend-verification').send(credentials);
  const response = await request(app).get(`/api/auth/verify/${capturedToken()}`).set('Accept', 'text/html');
  assert.equal(response.status, 303);
  assert.equal(response.headers.location, 'http://frontend.test/login?verified=1');
});

test('anonymous and frontend roles cannot read token digests or execute verification functions', async () => {
  for (const role of ['anon', 'authenticated']) {
    const { rows } = await db.query(`SELECT
      has_table_privilege($1, 'public.email_tokens', 'SELECT') AS read,
      has_function_privilege($1, 'public.verify_email_token(text)', 'EXECUTE') AS verify,
      has_function_privilege($1, 'public.issue_email_verification_token(uuid,text)', 'EXECUTE') AS issue`, [role]);
    assert.deepEqual(rows[0], { read: false, verify: false, issue: false });
  }
  const { rows } = await db.query(`SELECT
    has_table_privilege('service_role', 'public.email_tokens', 'SELECT') AS read,
    has_function_privilege('service_role', 'public.verify_email_token(text)', 'EXECUTE') AS verify`);
  assert.deepEqual(rows[0], { read: true, verify: true });
});

test('migration is repeatable and malformed digests cannot be inserted through the RPC', async () => {
  await db.exec(migration);
  const id = await addUnverifiedAccount();
  await assert.rejects(db.query('SELECT public.issue_email_verification_token($1, $2)', [id, 'invalid']), /Invalid verification digest/);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.email_tokens')).rows[0].count, 0);
});

test('already verified or deleted accounts cannot receive new verification tokens', async () => {
  const id = await addUnverifiedAccount();
  await db.query('UPDATE public.users SET is_verified = true WHERE id = $1', [id]);
  const verified = await db.query('SELECT public.issue_email_verification_token($1, $2) AS result', [id, digest('test-token')]);
  assert.equal(verified.rows[0].result, 'already_verified');
  const missing = await db.query('SELECT public.issue_email_verification_token($1, $2) AS result', [crypto.randomUUID(), digest('test-token')]);
  assert.equal(missing.rows[0].result, 'invalid');
});

test('verification cannot be repeated after an account was verified elsewhere', async () => {
  const id = await addUnverifiedAccount();
  await request(app).post('/api/auth/resend-verification').send(credentials);
  const token = capturedToken();
  await db.query('UPDATE public.users SET is_verified = true WHERE id = $1', [id]);
  assert.equal((await verify(token)).status, 400);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.email_tokens')).rows[0].count, 0);
});
