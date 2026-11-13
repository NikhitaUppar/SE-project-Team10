jest.mock('../src/config/supabase', () => ({ from: jest.fn() }));
const database = require('../src/config/supabase');
const { getCampaignDonors } = require('../src/controllers/campaignDonorsController');
const { summarizeDonations, loadCampaignDonors } = require('../src/services/campaignDonors');

const row = (id, donor, amount, extra = {}) => ({
  id, donor_id: donor, amount, status: 'completed', is_anonymous: false,
  created_at: '2030-01-01T12:00:00Z', users: { display_name: donor, email: 'private@example.test' }, ...extra,
});
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
beforeEach(() => jest.clearAllMocks());

test('aggregates named donors, limits top/recent lists to five, and uses exact rupee decimals', () => {
  const result = summarizeDonations([
    row('1', 'A', '100.10'), row('2', 'A', '200.20'), row('3', 'B', '300.25'),
    ...['C', 'D', 'E', 'F', 'G'].map((name, i) => row(String(i + 4), name, 20 + i)),
  ]);
  expect(result.top_donors).toHaveLength(5);
  expect(result.recent_donations).toHaveLength(5);
  expect(result.top_donors.slice(0, 2)).toEqual([
    { rank: 1, donor_name: 'A', amount: 300.3, is_anonymous: false },
    { rank: 2, donor_name: 'B', amount: 300.25, is_anonymous: false },
  ]);
});

test('anonymity masks names and never adds anonymous amounts to named totals', () => {
  const result = summarizeDonations([
    row('1', 'A', 100), row('2', 'A', 200, { is_anonymous: true }),
    row('3', 'A', 150, { is_anonymous: true }),
  ]);
  expect(result.top_donors.map(d => [d.donor_name, d.amount])).toEqual([['Anonymous', 350], ['A', 100]]);
  expect(result.recent_donations.filter(d => d.is_anonymous).every(d => d.donor_name === 'Anonymous')).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(/email|donor_id|razorpay|private@example/);
});

test.each(['pending', 'failed', 'refunded', 'cancelled'])('ignores %s records', status => {
  expect(summarizeDonations([row('1', 'A', 500, { status })])).toEqual({ top_donors: [], recent_donations: [] });
});

test('also excludes captured records explicitly awaiting campaign reconciliation', () => {
  expect(summarizeDonations([row('1', 'A', 500, { campaign_credited: false })]).top_donors).toEqual([]);
});

test('deduplicates repeated records and provider payment/order IDs without hiding distinct gifts', () => {
  const rows = [row('1', 'A', 100, { razorpay_order_id: 'order1' }),
    row('2', 'A', 100, { razorpay_order_id: 'order1', razorpay_payment_id: 'pay1' }),
    row('3', 'A', 100, { razorpay_payment_id: 'pay1' }), row('4', 'A', 150)];
  expect(summarizeDonations(rows.concat(rows)).top_donors[0].amount).toBe(250);
});

test('a duplicate private/anonymous copy can never reveal its named identity', () => {
  const result = summarizeDonations([row('1', 'Secret', 100, { razorpay_payment_id: 'pay1' }),
    row('2', 'Secret', 100, { razorpay_payment_id: 'pay1', is_anonymous: true })]);
  expect(JSON.stringify(result)).not.toContain('Secret');
});

test('a record linking separate order-only and payment-only copies is still counted just once', () => {
  const result = summarizeDonations([
    row('1', 'A', 100, { razorpay_order_id: 'order1' }),
    row('2', 'A', 100, { razorpay_payment_id: 'pay1' }),
    row('3', 'A', 100, { razorpay_order_id: 'order1', razorpay_payment_id: 'pay1', is_anonymous: true }),
  ]);
  expect(result.top_donors).toEqual([{ rank: 1, donor_name: 'Anonymous', amount: 100, is_anonymous: true }]);
  expect(result.recent_donations).toHaveLength(1);
});

test('ties, missing/deleted users, and newest-first ordering are deterministic', () => {
  const rows = [row('4', null, 50, { users: null }), row('3', null, 50, { users: null }),
    row('2', 'B', 50, { created_at: '2030-01-02T12:00:00Z' }), row('1', 'A', 50)];
  expect(summarizeDonations(rows)).toEqual(summarizeDonations([...rows].reverse()));
  expect(summarizeDonations(rows).recent_donations.map(d => d.id)).toEqual(['2', '1', '3', '4']);
  expect(summarizeDonations(rows).top_donors.filter(d => d.donor_name === 'Donor')).toHaveLength(2);
});

test('loads a campaign beyond Supabase row limits with keyset paging', async () => {
  const rows = Array.from({ length: 1001 }, (_, i) => row(String(i).padStart(4, '0'), 'A', 1));
  const database = { from: jest.fn(() => {
    let cursor = '';
    const chain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(),
      gt: jest.fn((column, value) => { expect(column).toBe('id'); cursor = value; return chain; }),
      then: resolve => resolve({ data: rows.filter(r => r.id > cursor).slice(0, 1000), error: null }) };
    return chain;
  }) };
  expect((await loadCampaignDonors(database, 'campaign')).top_donors[0].amount).toBe(1001);
  expect(database.from).toHaveBeenCalledTimes(2);
});

test('empty histories return two empty arrays', () => {
  expect(summarizeDonations([])).toEqual({ top_donors: [], recent_donations: [] });
});

test('invalid IDs fail before querying the database', async () => {
  const res = response(); await getCampaignDonors({ params: { id: 'invalid' } }, res);
  expect(res.status).toHaveBeenCalledWith(400); expect(database.from).not.toHaveBeenCalled();
});

test.each([[null, null, 404], [null, { message: 'private SQL detail' }, 500]])('campaign lookup failure is safe %#', async (data, error, status) => {
  database.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error }) }) }) });
  const res = response(); await getCampaignDonors({ params: { id: '11111111-1111-4111-8111-111111111111' } }, res);
  expect(res.status).toHaveBeenCalledWith(status);
  expect(JSON.stringify(res.json.mock.calls)).not.toContain('SQL');
});
