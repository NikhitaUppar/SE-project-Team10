jest.mock('../src/config/supabase', () => ({ from: jest.fn(), rpc: jest.fn() }));
jest.mock('../src/controllers/emailController', () => ({ sendVerificationEmail: jest.fn() }));

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const supabase = require('../src/config/supabase');
const { sendVerificationEmail } = require('../src/controllers/emailController');
const authRoutes = require('../src/routes/auth');

const app = express();
let clientNumber = 0;
app.set('trust proxy', 1);
app.use((req, res, next) => {
  req.headers['x-forwarded-for'] = `192.0.2.${clientNumber}`;
  next();
});
app.use(express.json());
app.use('/api/auth', authRoutes);
const token = 'ab'.repeat(32);
const credentials = { email: 'donor@example.test', password: 'correct-password' };
const account = {
  id: '11111111-1111-1111-1111-111111111111',
  email: credentials.email, is_verified: false,
  password_hash: bcrypt.hashSync(credentials.password, 4),
};

function mockAccount(data = account, error = null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error });
  const insert = jest.fn().mockResolvedValue({ error: null });
  supabase.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }), insert });
  return { maybeSingle, insert };
}

beforeEach(() => {
  clientNumber += 1;
  jest.clearAllMocks();
  mockAccount();
  supabase.rpc.mockReset().mockResolvedValue({ data: 'created', error: null });
  sendVerificationEmail.mockReset().mockResolvedValue({ accepted: [credentials.email] });
});

describe('verification endpoint', () => {
  test.each(['short', 'ab'.repeat(33), 'AB'.repeat(32), '<script>', '0'.repeat(63)])(
    'rejects malformed token %# without querying the database', async (invalid) => {
      const response = await request(app).get(`/api/auth/verify/${encodeURIComponent(invalid)}`);
      expect(response.status).toBe(400);
      expect(supabase.rpc).not.toHaveBeenCalled();
    }
  );

  test.each([
    ['verified', 200], ['invalid', 400], ['expired', 410], ['already_verified', 400], [null, 400],
  ])('handles database outcome %s with HTTP %s', async (data, status) => {
    supabase.rpc.mockResolvedValue({ data, error: null });
    const response = await request(app).get(`/api/auth/verify/${token}`).set('Accept', 'application/json');
    expect(response.status).toBe(status);
    expect(supabase.rpc).toHaveBeenCalledWith('verify_email_token', {
      p_token_hash: crypto.createHash('sha256').update(token).digest('hex'),
    });
    expect(JSON.stringify(response.body)).not.toContain(token);
  });

  test.each(['returned', 'thrown'])('handles %s database failures safely', async (type) => {
    if (type === 'returned') supabase.rpc.mockResolvedValue({ data: null, error: { message: 'private details' } });
    else supabase.rpc.mockRejectedValue(new Error('private details'));
    const response = await request(app).get(`/api/auth/verify/${token}`);
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Unable to verify email. Please try again.');
  });
});

describe('resend endpoint', () => {
  test.each([{}, { email: credentials.email }, { password: credentials.password },
    { ...credentials, password: '' }, { ...credentials, email: 'invalid' },
    { ...credentials, password: 'a'.repeat(73) }, { ...credentials, password: {} }])(
    'rejects invalid credentials %# without a user lookup', async (body) => {
      const response = await request(app).post('/api/auth/resend-verification').send(body);
      expect(response.status).toBe(400);
      expect(supabase.from).not.toHaveBeenCalled();
    }
  );

  test.each(['missing account', 'wrong password'])('rejects %s without sending mail', async (type) => {
    if (type === 'missing account') mockAccount(null);
    const response = await request(app).post('/api/auth/resend-verification')
      .send(type === 'wrong password' ? { ...credentials, password: 'incorrect' } : credentials);
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid email or password' });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('verified account does not generate another token or email', async () => {
    mockAccount({ ...account, is_verified: true });
    const response = await request(app).post('/api/auth/resend-verification').send(credentials);
    expect(response.status).toBe(200);
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  test('resend normalizes email and stores a digest different from the emailed token', async () => {
    const response = await request(app).post('/api/auth/resend-verification')
      .send({ ...credentials, email: ' DONOR@EXAMPLE.TEST ' });
    expect(response.status).toBe(200);
    const [email, emailedToken] = sendVerificationEmail.mock.calls[0];
    expect(email).toBe(credentials.email);
    expect(emailedToken).toMatch(/^[a-f0-9]{64}$/);
    const digest = supabase.rpc.mock.calls[0][1].p_token_hash;
    expect(digest).not.toBe(emailedToken);
    expect(digest).toBe(crypto.createHash('sha256').update(emailedToken).digest('hex'));
  });

  test('throttling returns 429 and does not send mail', async () => {
    supabase.rpc.mockResolvedValue({ data: 'throttled', error: null });
    const response = await request(app).post('/api/auth/resend-verification').send(credentials);
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('60');
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  test('concurrently verified user does not get another email', async () => {
    supabase.rpc.mockResolvedValue({ data: 'already_verified', error: null });
    const response = await request(app).post('/api/auth/resend-verification').send(credentials);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Your email is already verified. You can log in.');
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  test.each(['lookup', 'rpc', 'rpc rejection', 'unexpected rpc response', 'smtp'])(
    '%s failure returns a safe 503', async (type) => {
      if (type === 'lookup') mockAccount(null, { message: 'private details' });
      if (type === 'rpc') supabase.rpc.mockResolvedValue({ error: { message: 'private details' } });
      if (type === 'rpc rejection') supabase.rpc.mockRejectedValue(new Error('private details'));
      if (type === 'unexpected rpc response') supabase.rpc.mockResolvedValue({ data: null, error: null });
      if (type === 'smtp') sendVerificationEmail.mockRejectedValue(new Error('private SMTP details'));
      const response = await request(app).post('/api/auth/resend-verification').send(credentials);
      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Unable to send verification email. Please try again after one minute.');
    }
  );
});

describe('registration with verification', () => {
  const body = { ...credentials, display_name: 'Test donor' };

  test.each(['lookup rejection', 'insert rejection', 'token storage', 'smtp'])(
    '%s is handled without disclosing internal errors', async (type) => {
      const db = mockAccount(null);
      if (type === 'lookup rejection') db.maybeSingle.mockRejectedValue(new Error('private details'));
      if (type === 'insert rejection') db.insert.mockRejectedValue(new Error('private details'));
      if (type === 'token storage') supabase.rpc.mockResolvedValue({ error: { message: 'private details' } });
      if (type === 'smtp') sendVerificationEmail.mockRejectedValue(new Error('private details'));
      const response = await request(app).post('/api/auth/register').send(body);
      expect(response.status).toBe(['token storage', 'smtp'].includes(type) ? 503 : 500);
      expect(JSON.stringify(response.body)).not.toContain('private details');
      if (response.status === 503) expect(response.body.error).toMatch(/Account created/);
    }
  );
});
