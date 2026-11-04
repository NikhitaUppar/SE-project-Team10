jest.mock('../src/config/supabase', () => ({ from: jest.fn() }));
const database = require('../src/config/supabase');
const { CAMPAIGN_STATUS: STATUS, isExpired, canAcceptDonations, presentCampaign, closeExpiredCampaigns } = require('../src/services/campaignLifecycle');
const { createOrder } = require('../src/controllers/donationController');
const { getCampaigns, getCampaignById } = require('../src/controllers/campaignController');

const now = new Date('2030-01-01T18:30:00.000Z');
const active = { id: 'test-id', status: STATUS.ACTIVE, deadline: '2030-01-02T00:00:00+05:30' };
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
beforeEach(() => jest.clearAllMocks());

test('timezone-aware comparisons treat equal instants as the exact, still-open boundary', () => {
  expect(isExpired(active, now)).toBe(false);
  expect(canAcceptDonations(active, now)).toBe(true);
  expect(isExpired(active, new Date(now.getTime() + 1))).toBe(true);
  expect(canAcceptDonations(active, new Date(now.getTime() + 1))).toBe(false);
  expect(isExpired({ ...active, deadline: '2030-01-01T18:30:00Z' }, now)).toBe(false);
  expect(isExpired({ ...active, deadline: '2030-01-01T18:29:59.999Z' }, now)).toBe(true);
  expect(isExpired({ ...active, deadline: '2030-01-01T18:30:00.001Z' }, now)).toBe(false);
});

test.each([STATUS.PENDING_REVIEW, STATUS.REJECTED, STATUS.CLOSED, 'cancelled'])('never accepts donations for %s', status => {
  expect(canAcceptDonations({ ...active, status }, now)).toBe(false);
  expect(presentCampaign({ ...active, status }, new Date(now.getTime() + 1)).status).toBe(status);
});

test.each([undefined, null, '', 'not-a-date'])('invalid/missing deadline %# cannot accept donations', deadline => {
  expect(canAcceptDonations({ ...active, deadline }, now)).toBe(false);
});

test('public presentation closes expired active campaigns without mutating the input', () => {
  const result = presentCampaign(active, new Date(now.getTime() + 1));
  expect(result).toMatchObject({ status: STATUS.CLOSED, accepting_donations: false });
  expect(active.status).toBe(STATUS.ACTIVE);
});

test('bulk closing uses one conditional status-only write, with a UTC strict cutoff', async () => {
  const chain = { update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), lt: jest.fn().mockReturnThis(), select: jest.fn().mockResolvedValue({ count: 2, data: [{ id: 'one' }] }) };
  database.from.mockReturnValue(chain);
  expect(await closeExpiredCampaigns({ now })).toEqual({ closedCount: 2 });
  expect(database.from).toHaveBeenCalledWith('campaigns');
  expect(chain.update).toHaveBeenCalledWith({ status: STATUS.CLOSED }, { count: 'exact' });
  expect(chain.eq).toHaveBeenCalledWith('status', STATUS.ACTIVE);
  expect(chain.lt).toHaveBeenCalledWith('deadline', now.toISOString());
});

test('invalid cutoff or a database error is handled safely', async () => {
  await expect(closeExpiredCampaigns({ now: 'invalid' })).rejects.toThrow('Invalid campaign expiry cutoff');
  const chain = { update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), lt: jest.fn().mockReturnThis(), select: async () => ({ error: { message: 'private database details' } }) };
  database.from.mockReturnValue(chain);
  await expect(closeExpiredCampaigns({ now })).rejects.toThrow('Campaign expiry update failed');
});

test.each([
  [{ ...active, deadline: '2000-01-01T00:00:00Z' }, null, 409],
  [{ ...active, status: STATUS.CLOSED, deadline: '2099-01-01T00:00:00Z' }, null, 409],
  [null, null, 404],
  [null, { message: 'private details' }, 503],
])('order creation fails closed for unavailable campaigns %#', async (campaign, error, status) => {
  const maybeSingle = jest.fn().mockResolvedValue({ data: campaign, error });
  database.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });
  const res = response();
  await createOrder({ body: { amount: 50, campaign_id: active.id }, user: { id: 'donor' } }, res);
  expect(res.status).toHaveBeenCalledWith(status);
  expect(database.from).toHaveBeenCalledTimes(1); // No pending donation/order is written.
  expect(JSON.stringify(res.json.mock.calls)).not.toContain('private details');
});

test('availability checks run in NODE_ENV=test as well as in development', async () => {
  const maybeSingle = jest.fn().mockResolvedValue({ data: { ...active, deadline: '2099-01-01T00:00:00Z' }, error: null });
  database.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });
  const res = response();
  await createOrder({ body: { amount: 50, campaign_id: active.id }, user: { id: 'donor' } }, res);
  expect(maybeSingle).toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(200);
});

test('active browsing filters deadlines at the database before pagination/counting', async () => {
  const chain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), gte: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), range: jest.fn().mockResolvedValue({ data: [], count: 0, error: null }) };
  database.from.mockReturnValue(chain);
  await getCampaigns({ query: {} }, response());
  expect(chain.eq).toHaveBeenCalledWith('status', STATUS.ACTIVE);
  expect(chain.gte).toHaveBeenCalledWith('deadline', expect.stringMatching(/Z$/));
});

test('campaign details expose expired status/permission even before the job runs', async () => {
  database.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { ...active, deadline: '2000-01-01T00:00:00Z' }, error: null }) }) }) });
  const res = response();
  await getCampaignById({ params: { id: active.id } }, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: STATUS.CLOSED, accepting_donations: false }));
});
