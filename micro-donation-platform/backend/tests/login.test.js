jest.mock('../src/config/supabase', () => ({ from: jest.fn() }));

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../src/config/supabase');
const authRoutes = require('../src/routes/auth');
const { authenticate, requireRole } = require('../src/middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.get('/protected', authenticate, (req, res) => res.json({ user: req.user }));
app.get('/admin', authenticate, requireRole('admin'), (req, res) => res.sendStatus(200));

const secret = 'issue-4-test-only-secret';
const password = 'correct password';
const user = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'donor@example.com', role: 'donor', display_name: 'Donor', is_verified: true,
  password_hash: bcrypt.hashSync(password, 4),
};
const publicUser = { ...user };
delete publicUser.password_hash;
const originalSecret = process.env.JWT_SECRET;

function mockDatabase(data = user, error = null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error });
  // Protected routes select only public fields.
  const single = jest.fn().mockResolvedValue({
    data: data && Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'password_hash')),
    error,
  });
  const eq = jest.fn().mockReturnValue({ maybeSingle, single });
  const select = jest.fn().mockReturnValue({ eq });
  supabase.from.mockReturnValue({ select });
  return { select, eq, maybeSingle, single };
}

beforeEach(() => {
  process.env.JWT_SECRET = secret;
  supabase.from.mockReset();
  mockDatabase();
});
afterAll(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

describe('Issue #4 login', () => {
  test('valid credentials return a signed JWT expiring in exactly seven days and a safe user', async () => {
    const { eq } = mockDatabase();
    const response = await request(app).post('/api/auth/login')
      .send({ email: ' DONOR@EXAMPLE.COM ', password });
    expect(response.status).toBe(200);
    expect(eq).toHaveBeenCalledWith('email', user.email);
    const decoded = jwt.verify(response.body.token, secret, { algorithms: ['HS256'] });
    expect(decoded).toMatchObject({ id: user.id, email: user.email, role: user.role });
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
    expect(response.body.user).toEqual({
      id: user.id, email: user.email, role: user.role, display_name: user.display_name,
    });
    expect(JSON.stringify(response.body)).not.toContain(user.password_hash);
    expect(decoded).not.toHaveProperty('password_hash');
    const me = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${response.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toEqual(publicUser);
  });

  test.each(['wrong password', `${password} `])('wrong password returns 401 (%s)', async (wrongPassword) => {
    const response = await request(app).post('/api/auth/login')
      .send({ email: user.email, password: wrongPassword });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid email or password' });
  });

  test('nonexistent user returns the same generic 401 as a wrong password', async () => {
    mockDatabase(null);
    const response = await request(app).post('/api/auth/login').send({ email: user.email, password });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid email or password' });
  });

  test.each([
    {}, { email: user.email }, { password }, { email: '', password },
    { email: user.email, password: '' }, { email: 123, password },
    { email: user.email, password: {} }, { email: 'invalid', password },
    { email: user.email, password: 'a'.repeat(73) },
    { email: user.email, password: 'é'.repeat(37) },
  ])('missing or invalid credentials return 400 without a database query: %j', async (body) => {
    const response = await request(app).post('/api/auth/login').send(body);
    expect(response.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('missing request body returns 400', async () => {
    expect((await request(app).post('/api/auth/login')).status).toBe(400);
  });

  test('correct password for an unverified account returns 403 without a token', async () => {
    mockDatabase({ ...user, is_verified: false });
    const response = await request(app).post('/api/auth/login').send({ email: user.email, password });
    expect(response.status).toBe(403);
    expect(response.body.token).toBeUndefined();
  });

  test('wrong password for an unverified account still returns generic 401', async () => {
    mockDatabase({ ...user, is_verified: false });
    const response = await request(app).post('/api/auth/login')
      .send({ email: user.email, password: 'wrong' });
    expect(response.status).toBe(401);
  });

  test.each(['database error', 'database rejection', 'missing secret'])('%s returns a safe 500', async (failure) => {
    if (failure === 'database error') mockDatabase(null, { message: 'sensitive database details' });
    if (failure === 'database rejection') {
      mockDatabase().maybeSingle.mockRejectedValue(new Error('sensitive database details'));
    }
    if (failure === 'missing secret') delete process.env.JWT_SECRET;
    const response = await request(app).post('/api/auth/login').send({ email: user.email, password });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Unable to log in' });
  });
});

describe('protected route authentication', () => {
  test.each([undefined, 0, -1, '1', 2])('rejects a stale or invalid session version %s after password reset', async (version) => {
    mockDatabase({ ...user, auth_version: 1 });
    const claims = version === undefined ? { id: user.id } : { id: user.id, auth_version: version };
    const token = jwt.sign(claims, secret, { expiresIn: '7d' });
    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  test('accepts the current session version without exposing internal version data', async () => {
    mockDatabase({ ...user, auth_version: 1 });
    const token = jwt.sign({ id: user.id, auth_version: 1 }, secret, { expiresIn: '7d' });
    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(publicUser);
    expect(response.body.user).not.toHaveProperty('auth_version');
  });

  test.each([
    undefined, 'Basic abc', 'Bearer ', 'Bearer malformed',
    `Bearer ${jwt.sign({ id: user.id }, 'wrong-secret', { expiresIn: '7d' })}`,
    `Bearer ${jwt.sign({ id: user.id }, secret, { expiresIn: -1 })}`,
    `Bearer ${jwt.sign({ id: user.id }, secret)}`,
    `Bearer ${jwt.sign({}, secret, { expiresIn: '7d' })}`,
    `Bearer ${jwt.sign({ id: user.id }, secret, { algorithm: 'HS384', expiresIn: '7d' })}`,
  ])('rejects missing, malformed, expired, or invalid token %#', async (header) => {
    const call = request(app).get('/protected');
    if (header !== undefined) call.set('Authorization', header);
    expect((await call).status).toBe(401);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test.each(['deleted user', 'unverified user', 'database error', 'database rejection'])('rejects %s', async (failure) => {
    if (failure === 'deleted user') mockDatabase(null);
    if (failure === 'unverified user') mockDatabase({ ...user, is_verified: false });
    if (failure === 'database error') mockDatabase(null, { message: 'private error' });
    if (failure === 'database rejection') mockDatabase().single.mockRejectedValue(new Error('private error'));
    const token = jwt.sign({ id: user.id }, secret, { expiresIn: '7d' });
    expect((await request(app).get('/protected').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });

  test('loads public user fields from the database and uses its current role', async () => {
    const { select } = mockDatabase();
    const token = jwt.sign({ id: user.id, role: 'admin' }, secret, { expiresIn: '7d' });
    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(publicUser);
    expect(select).toHaveBeenCalledWith('id, email, role, display_name, is_verified, auth_version');
    expect((await request(app).get('/admin').set('Authorization', `Bearer ${token}`)).status).toBe(403);
    mockDatabase({ ...user, role: 'admin' });
    expect((await request(app).get('/admin').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });
});
