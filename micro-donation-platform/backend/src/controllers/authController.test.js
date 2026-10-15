jest.mock('../config/supabase', () => ({
  from: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { register } = require('./authController');

const validRequest = {
  display_name: 'Test Donor',
  email: '  DONOR@example.com ',
  password: 'password123',
};

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const mockDatabase = ({ existingUser = null, lookupError = null, insertError = null } = {}) => {
  const maybeSingle = jest.fn().mockResolvedValue({ data: existingUser, error: lookupError });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const insert = jest.fn().mockResolvedValue({ error: insertError });

  supabase.from.mockReturnValue({ select, insert });
  return { maybeSingle, eq, select, insert };
};

describe('register', () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  test.each([
    [{ ...validRequest, email: 'invalid-email' }],
    [{ ...validRequest, password: 'short' }],
    [{ ...validRequest, display_name: '  ' }],
  ])('rejects invalid input without querying the database', async (body) => {
    const res = createResponse();

    await register({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns 400 when the email is already registered', async () => {
    mockDatabase({ existingUser: { id: 'existing-user' } });
    const res = createResponse();

    await register({ body: validRequest }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'An account with this email already exists',
    });
  });

  it('stores a normalized email, an unverified account, and a bcrypt hash with cost 12', async () => {
    const { insert } = mockDatabase();
    const res = createResponse();

    await register({ body: validRequest }, res);

    const insertedUser = insert.mock.calls[0][0];
    expect(insertedUser).toMatchObject({
      display_name: 'Test Donor',
      email: 'donor@example.com',
      is_verified: false,
    });
    expect(insertedUser.password_hash).not.toBe(validRequest.password);
    expect(await bcrypt.compare(validRequest.password, insertedUser.password_hash)).toBe(true);
    expect(bcrypt.getRounds(insertedUser.password_hash)).toBe(12);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Registration successful' });
  });

  it('returns 400 if a concurrent request creates the same email first', async () => {
    mockDatabase({ insertError: { code: '23505' } });
    const res = createResponse();

    await register({ body: validRequest }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'An account with this email already exists',
    });
  });

  it('returns a server error when the user lookup fails', async () => {
    mockDatabase({ lookupError: { message: 'database unavailable' } });
    const res = createResponse();

    await register({ body: validRequest }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unable to create account' });
  });

  it('returns a server error when inserting the user fails', async () => {
    mockDatabase({ insertError: { code: 'XX000' } });
    const res = createResponse();

    await register({ body: validRequest }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unable to create account' });
  });
});
