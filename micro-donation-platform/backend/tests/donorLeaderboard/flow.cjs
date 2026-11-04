const { before, beforeEach, after, test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createFixture } = require('./fixture.cjs');
let f;
before(async () => { f = await createFixture(); });
beforeEach(async () => { await f.seed(); });
after(async () => { if (f) await f.close(); });
const get = id => request(f.app).get(`/api/campaigns/${id || f.ids.campaign}/donors`);

test('real public route aggregates multiple gifts and returns only top five and newest five', async () => {
  for (let i = 0; i < 7; i++) await f.add({ donor: i, amount: 100 + i * 10, time: `2030-01-0${i + 1}T12:00:00Z`, anonymous: i === 6 });
  await f.add({ donor: 0, amount: '100.25', time: '2030-01-08T12:00:00Z' });
  const r = await get(); assert.equal(r.status, 200);
  assert.equal(r.body.top_donors.length, 5); assert.equal(r.body.recent_donations.length, 5);
  assert.equal(r.body.top_donors[0].donor_name, 'Donor 1'); assert.equal(r.body.top_donors[0].amount, 200.25);
  assert.equal(Date.parse(r.body.recent_donations[0].created_at), Date.parse('2030-01-08T12:00:00Z'));
  assert.ok(r.body.top_donors.some(d => d.donor_name === 'Anonymous'));
  assert.doesNotMatch(JSON.stringify(r.body), /Hidden identity|private|password|email|donor_id|razorpay/);
});

test('failed, pending, refunded and other-campaign records never affect the leaderboard', async () => {
  for (const status of ['pending','failed','refunded']) await f.add({ donor: 1, amount: 500, status });
  await f.add({ donor: 2, amount: 500, campaign: f.ids.empty });
  await f.add({ amount: 12.34 });
  const r = await get(); assert.equal(r.body.top_donors.length, 1); assert.equal(r.body.top_donors[0].amount, 12.34);
  assert.equal(r.body.recent_donations.length, 1);
});

test('existing empty campaign returns empty arrays; invalid and missing campaigns have safe errors', async () => {
  assert.deepEqual((await get(f.ids.empty)).body, { top_donors: [], recent_donations: [] });
  assert.equal((await get('not-a-uuid')).status, 400); assert.equal((await get(f.ids.missing)).status, 404);
});

test('duplicate payment rows count once and deleted users do not merge into one donor', async () => {
  await f.add({ amount: 100, payment: 'pay_one', order: 'order_one' });
  await f.add({ amount: 100, payment: 'pay_one', order: 'order_one' });
  await f.add({ amount: 50, donor: null }); await f.add({ amount: 60, donor: null });
  const r = await get(); assert.equal(r.body.top_donors[0].amount, 100);
  assert.equal(r.body.top_donors.filter(d => d.donor_name === 'Donor').length, 2);
  assert.equal(r.body.recent_donations.length, 3);
});

test('database failure returns a retryable UI message without private SQL details', async () => {
  await f.db.exec('ALTER TABLE public.donations RENAME TO unavailable_donations');
  try { const r = await get(); assert.equal(r.status, 500); assert.doesNotMatch(JSON.stringify(r.body), /private|SELECT|table/i); }
  finally { await f.db.exec('ALTER TABLE public.unavailable_donations RENAME TO donations'); }
});

test('real PostgREST keyset queries aggregate more than 1000 completed donation rows', async () => {
  await f.db.query("INSERT INTO public.donations (campaign_id,donor_id,amount,status) SELECT $1,$2,1,'completed' FROM generate_series(1,1005)", [f.ids.campaign, f.donors[0]]);
  const r = await get(); assert.equal(r.status, 200);
  assert.equal(r.body.top_donors[0].amount, 1005);
  assert.equal(r.body.recent_donations.length, 5);
});
