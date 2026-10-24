jest.mock('../src/config/supabase', () => ({ from: jest.fn(), rpc: jest.fn() }));
jest.mock('../src/controllers/emailController', () => ({ sendPasswordResetEmail: jest.fn() }));

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const supabase = require('../src/config/supabase');
const { sendPasswordResetEmail } = require('../src/controllers/emailController');
const { forgotPassword, resetPassword } = require('../src/controllers/authController');
const { createPasswordResetLimiter } = require('../src/middleware/passwordResetRateLimit');

const token = 'ab'.repeat(32);
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis() });
const generic = { message: 'If an account exists for that email, a password reset link will be sent.' };
const user = { id: '11111111-1111-1111-1111-111111111111', email: 'donor@example.test' };

function database(data = user, error = null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  supabase.from.mockReturnValue({ select: () => ({ eq }) });
  return { eq, maybeSingle };
}

beforeEach(() => {
  jest.clearAllMocks();
  database();
  supabase.rpc.mockReset().mockResolvedValue({ data: 'created', error: null });
  sendPasswordResetEmail.mockReset().mockResolvedValue({ accepted: [user.email] });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('forgot password', () => {
  test('acknowledges before account lookup completes, hiding lookup and SMTP timing', async () => {
    let completeLookup;
    database().maybeSingle.mockReturnValue(new Promise((resolve) => { completeLookup = resolve; }));
    const res = response();
    const pending = forgotPassword({ body: { email: user.email } }, res);
    expect(res.json).toHaveBeenCalledWith(generic);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    completeLookup({ data: null, error: null });
    await pending;
  });

  test.each([undefined, {}, { email: '' }, { email: 123 }, { email: 'invalid' }, { email: 'a'.repeat(255) + '@a.test' }])(
    'validates email without querying the database %#', async (body) => {
      const res = response();
      await forgotPassword({ body }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(supabase.from).not.toHaveBeenCalled();
    }
  );

  test('normalizes email, emails a random token and stores only its digest', async () => {
    const { eq } = database();
    const res = response();
    await forgotPassword({ body: { email: ' DONOR@EXAMPLE.TEST ' } }, res);
    expect(eq).toHaveBeenCalledWith('email', user.email);
    const [recipient, secretToken] = sendPasswordResetEmail.mock.calls[0];
    expect(recipient).toBe(user.email);
    expect(secretToken).toMatch(/^[a-f0-9]{64}$/);
    expect(supabase.rpc).toHaveBeenCalledWith('issue_password_reset_token', {
      p_user_id: user.id, p_token_hash: crypto.createHash('sha256').update(secretToken).digest('hex'),
    });
    expect(res.json).toHaveBeenCalledWith(generic);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain(secretToken);
    expect(console.warn).not.toHaveBeenCalled();
  });

  test.each(['unknown', 'lookup error', 'lookup rejection', 'storage error', 'storage rejection', 'SMTP failure', 'throttled', 'deleted user', 'unexpected status'])(
    '%s has the same generic response without exposing internal information', async (mode) => {
      if (mode === 'unknown') database(null);
      if (mode === 'lookup error') database(null, { message: 'private details' });
      if (mode === 'lookup rejection') database().maybeSingle.mockRejectedValue(new Error('private details'));
      if (mode === 'storage error') supabase.rpc.mockResolvedValue({ error: { message: 'private details' } });
      if (mode === 'storage rejection') supabase.rpc.mockRejectedValue(new Error('private details'));
      if (mode === 'SMTP failure') sendPasswordResetEmail.mockRejectedValue(new Error('private SMTP credentials'));
      if (mode === 'throttled') supabase.rpc.mockResolvedValue({ data: 'throttled' });
      if (mode === 'deleted user') supabase.rpc.mockResolvedValue({ data: 'invalid' });
      if (mode === 'unexpected status') supabase.rpc.mockResolvedValue({ data: null });
      const res = response();
      await forgotPassword({ body: { email: user.email } }, res);
      expect(res.json).toHaveBeenCalledWith(generic);
      expect(res.status).not.toHaveBeenCalled();
      for (const args of console.warn.mock.calls) expect(args).toEqual(['[Auth] Password reset request could not be processed']);
      if (mode !== 'SMTP failure') expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    }
  );
});

describe('reset password', () => {
  test.each([undefined, {}, { token: 'bad', password: 'password123' }, { token, password: 'short' },
    { token, password: '' }, { token, password: {} }, { token, password: 'a'.repeat(73) },
    { token, password: 'é'.repeat(37) }, { token: 'AB'.repeat(32), password: 'password123' }])(
    'rejects malformed token or password %# without querying the database', async (body) => {
      const res = response();
      await resetPassword({ body }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(supabase.rpc).not.toHaveBeenCalled();
    }
  );

  test('uses bcrypt cost 12, preserves password whitespace and calls the atomic reset function', async () => {
    supabase.rpc.mockResolvedValue({ data: 'reset' });
    const password = ' new password ';
    const res = response();
    await resetPassword({ body: { token, password } }, res);
    const [name, params] = supabase.rpc.mock.calls[0];
    expect(name).toBe('reset_password_with_token');
    expect(params.p_token_hash).toBe(crypto.createHash('sha256').update(token).digest('hex'));
    expect(bcrypt.getRounds(params.p_password_hash)).toBe(12);
    expect(await bcrypt.compare(password, params.p_password_hash)).toBe(true);
    expect(await bcrypt.compare(password.trim(), params.p_password_hash)).toBe(false);
    expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successful. Please log in with your new password.' });
  });

  test.each([['invalid', 400], ['expired', 410], [null, 400]])('rejects %s with HTTP %s', async (data, status) => {
    supabase.rpc.mockResolvedValue({ data });
    const res = response();
    await resetPassword({ body: { token, password: 'password123' } }, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  test.each(['returned', 'thrown'])('%s database failure returns safe 500', async (mode) => {
    if (mode === 'returned') supabase.rpc.mockResolvedValue({ error: { message: 'private database error' } });
    else supabase.rpc.mockRejectedValue(new Error('private database error'));
    const res = response();
    await resetPassword({ body: { token, password: 'password123' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unable to reset password. Please try again.' });
  });
});

describe('password reset IP limits', () => {
  test('limits each IP independently and resets the window with Retry-After', () => {
    let timestamp = 1000;
    const limiter = createPasswordResetLimiter({ limit: 2, windowMs: 60000, now: () => timestamp });
    const res = response();
    const next = jest.fn();
    const req = { ip: '127.0.0.1' };
    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith('Retry-After', '60');
    limiter({ ip: '127.0.0.2' }, res, next);
    expect(next).toHaveBeenCalledTimes(3);
    timestamp += 60000;
    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(4);
  });

  test('bounds stored client entries and supports socket IP fallback', () => {
    const limiter = createPasswordResetLimiter({ limit: 2, maxEntries: 1 });
    const next = jest.fn();
    const res = response();
    limiter({ socket: { remoteAddress: '127.0.0.1' } }, res, next);
    limiter({ ip: '127.0.0.2' }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(429);
  });
});
