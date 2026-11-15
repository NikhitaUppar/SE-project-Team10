// Mock supabase before requiring any modules
jest.mock('../src/config/supabase', () => ({ from: jest.fn() }));

// Mock nodemailer so no real emails are sent
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));

const express = require('express');
const request = require('supertest');
const supabase = require('../src/config/supabase');
const {
  getPendingCampaigns,
  approveCampaign,
  rejectCampaign,
  getMetrics,
} = require('../src/controllers/adminController');

// Build a minimal Express app
const app = express();
app.use(express.json());
app.get('/api/admin/campaigns', getPendingCampaigns);
app.patch('/api/admin/campaigns/:id/approve', approveCampaign);
app.patch('/api/admin/campaigns/:id/reject', rejectCampaign);
app.get('/api/admin/metrics', getMetrics);

// ─── helpers ──────────────────────────────────────────────────────────────────

const CAMPAIGN_ID = 'aaaa-1111-bbbb-2222';

const fakeCampaign = {
  id: CAMPAIGN_ID,
  title: 'Test Campaign',
  owner_id: 'user-123',
  users: { email: 'owner@example.com', display_name: 'Owner' },
};

/** Wire supabase.from so that:
 *  - first call  → fetchQuery  (used by select/eq/single for fetching a campaign)
 *  - second call → updateQuery (used by update/eq for updating status)
 */
function mockFetchThenUpdate({ fetchData = fakeCampaign, fetchError = null, updateError = null } = {}) {
  const single = jest.fn().mockResolvedValue({ data: fetchData, error: fetchError });
  const fetchEq = jest.fn().mockReturnValue({ single });
  const fetchSelect = jest.fn().mockReturnValue({ fetchEq, eq: fetchEq });

  const updateEq = jest.fn().mockResolvedValue({ error: updateError });
  const update = jest.fn().mockReturnValue({ eq: updateEq });

  supabase.from
    .mockReturnValueOnce({ select: fetchSelect })   // fetch campaign
    .mockReturnValueOnce({ update });               // update status
}

/** Wire supabase.from for getPendingCampaigns */
function mockPendingCampaigns({ data = [fakeCampaign], error = null } = {}) {
  const order = jest.fn().mockResolvedValue({ data, error });
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  supabase.from.mockReturnValue({ select });
}

/** Wire supabase.from for getMetrics (4 parallel Promise.all calls) */
function mockMetrics({
  donationsData = [{ amount: 100 }, { amount: 200 }],
  donationsError = null,
  campaignsCount = 3,
  campaignsError = null,
  donorsData = [{ donor_id: 'u1' }, { donor_id: 'u2' }, { donor_id: 'u1' }],
  donorsError = null,
  flaggedCount = 1,
  flaggedError = null,
} = {}) {
  // getMetrics calls Promise.all with 4 queries in this order:
  //   1. donations → amounts (donationsData)
  //   2. campaigns → active count (campaignsCount)
  //   3. donations → donor_ids (donorsData)
  //   4. campaigns → flagged count (flaggedCount)
  // We use mockReturnValueOnce so each call gets the right data.

  const makeEq = (resolved) => ({ eq: jest.fn().mockReturnValue(Promise.resolve(resolved)) });

  supabase.from
    .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeEq({ data: donationsData, error: donationsError })) })
    .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeEq({ data: [], count: campaignsCount, error: campaignsError })) })
    .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeEq({ data: donorsData, error: donorsError })) })
    .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeEq({ data: [], count: flaggedCount, error: flaggedError })) });
}

// ─── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  supabase.from.mockReset();
});

// ── getPendingCampaigns ───────────────────────────────────────────────────────
describe('GET /api/admin/campaigns — getPendingCampaigns', () => {
  test('returns list of pending campaigns with status 200', async () => {
    mockPendingCampaigns({ data: [fakeCampaign] });
    const res = await request(app).get('/api/admin/campaigns');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('campaigns');
    expect(res.body.campaigns).toHaveLength(1);
    expect(res.body.campaigns[0].title).toBe('Test Campaign');
  });

  test('returns empty array when no campaigns are pending', async () => {
    mockPendingCampaigns({ data: [] });
    const res = await request(app).get('/api/admin/campaigns');
    expect(res.status).toBe(200);
    expect(res.body.campaigns).toHaveLength(0);
  });

  test('returns 500 when database query fails', async () => {
    mockPendingCampaigns({ data: null, error: { message: 'DB error' } });
    const res = await request(app).get('/api/admin/campaigns');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

// ── approveCampaign ───────────────────────────────────────────────────────────
describe('PATCH /api/admin/campaigns/:id/approve — approveCampaign', () => {
  test('approves an existing campaign and returns 200', async () => {
    mockFetchThenUpdate();
    const res = await request(app).patch(`/api/admin/campaigns/${CAMPAIGN_ID}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Campaign approved');
  });

  test('returns 404 when campaign does not exist', async () => {
    mockFetchThenUpdate({ fetchData: null, fetchError: { message: 'not found' } });
    const res = await request(app).patch(`/api/admin/campaigns/${CAMPAIGN_ID}/approve`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Campaign not found');
  });

  test('returns 500 when database update fails', async () => {
    mockFetchThenUpdate({ updateError: { message: 'update failed' } });
    const res = await request(app).patch(`/api/admin/campaigns/${CAMPAIGN_ID}/approve`);
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('succeeds even when campaign owner has no email (no crash)', async () => {
    mockFetchThenUpdate({
      fetchData: { ...fakeCampaign, users: { email: null, display_name: 'No Email' } },
    });
    const res = await request(app).patch(`/api/admin/campaigns/${CAMPAIGN_ID}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Campaign approved');
  });
});

// ── rejectCampaign ────────────────────────────────────────────────────────────
describe('PATCH /api/admin/campaigns/:id/reject — rejectCampaign', () => {
  test('rejects an existing campaign and returns 200', async () => {
    mockFetchThenUpdate();
    const res = await request(app)
      .patch(`/api/admin/campaigns/${CAMPAIGN_ID}/reject`)
      .send({ reason: 'Insufficient proof documents' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Campaign rejected');
  });

  test('rejects campaign without a reason provided', async () => {
    mockFetchThenUpdate();
    const res = await request(app)
      .patch(`/api/admin/campaigns/${CAMPAIGN_ID}/reject`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Campaign rejected');
  });

  test('returns 404 when campaign does not exist', async () => {
    mockFetchThenUpdate({ fetchData: null, fetchError: { message: 'not found' } });
    const res = await request(app)
      .patch(`/api/admin/campaigns/${CAMPAIGN_ID}/reject`)
      .send({ reason: 'Fake' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Campaign not found');
  });

  test('returns 500 when database update fails', async () => {
    mockFetchThenUpdate({ updateError: { message: 'update failed' } });
    const res = await request(app)
      .patch(`/api/admin/campaigns/${CAMPAIGN_ID}/reject`)
      .send({ reason: 'Some reason' });
    expect(res.status).toBe(500);
  });

  test('succeeds when owner has no email (no crash)', async () => {
    mockFetchThenUpdate({
      fetchData: { ...fakeCampaign, users: { email: null } },
    });
    const res = await request(app)
      .patch(`/api/admin/campaigns/${CAMPAIGN_ID}/reject`)
      .send({ reason: 'Missing docs' });
    expect(res.status).toBe(200);
  });
});

// ── getMetrics ────────────────────────────────────────────────────────────────
describe('GET /api/admin/metrics — getMetrics', () => {
  test('returns correct platform metrics', async () => {
    mockMetrics();
    const res = await request(app).get('/api/admin/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalDonations');
    expect(res.body).toHaveProperty('activeCampaigns');
    expect(res.body).toHaveProperty('totalDonors');
    expect(res.body).toHaveProperty('flaggedItems');
    // 100 + 200 = 300 total donations
    expect(res.body.totalDonations).toBe(300);
    // u1 and u2 → 2 unique donors
    expect(res.body.totalDonors).toBe(2);
    expect(res.body.activeCampaigns).toBe(3);
    expect(res.body.flaggedItems).toBe(1);
  });

  test('returns 500 when donations query fails', async () => {
    mockMetrics({ donationsError: { message: 'DB error' } });
    const res = await request(app).get('/api/admin/metrics');
    expect(res.status).toBe(500);
  });

  test('returns 500 when campaigns query fails', async () => {
    mockMetrics({ campaignsError: { message: 'DB error' } });
    const res = await request(app).get('/api/admin/metrics');
    expect(res.status).toBe(500);
  });

  test('returns 500 when donors query fails', async () => {
    // donationsError is null but donorsError triggers 500
    mockMetrics({ donorsError: { message: 'DB error' }, donationsError: { message: 'DB error' } });
    const res = await request(app).get('/api/admin/metrics');
    expect(res.status).toBe(500);
  });

  test('handles zero donations gracefully', async () => {
    mockMetrics({ donationsData: [], donorsData: [] });
    const res = await request(app).get('/api/admin/metrics');
    expect(res.status).toBe(200);
    expect(res.body.totalDonations).toBe(0);
    expect(res.body.totalDonors).toBe(0);
  });
});
