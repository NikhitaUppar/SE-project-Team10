const { before, beforeEach, after, test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createFixture } = require('./fixture.cjs');
let f;
before(async () => { f = await createFixture(); });
beforeEach(async () => { await f.seed(); });
after(async () => { if (f) await f.close(); });
const close = () => f.lifecycle.closeExpiredCampaigns({ database: f.database, now: f.now });
const rows = async table => (await f.db.query(`SELECT * FROM public.${table} ORDER BY id`)).rows;

test('one SQL update closes only past-deadline active campaigns, including offset timestamps', async () => {
  const before = await rows('campaigns');
  assert.equal((await close()).closedCount, 2);
  const after = await rows('campaigns');
  for (let i = 0; i < before.length; i++) {
    const eligible = [f.ids.expired, f.ids.offsetExpired].includes(before[i].id);
    assert.deepEqual(after[i], { ...before[i], status: eligible ? f.lifecycle.CAMPAIGN_STATUS.CLOSED : before[i].status });
  }
});

test('at the exact deadline it stays active; one millisecond later it closes', async () => {
  await close();
  assert.equal((await f.db.query('SELECT status FROM public.campaigns WHERE id=$1', [f.ids.boundary])).rows[0].status, f.lifecycle.CAMPAIGN_STATUS.ACTIVE);
  assert.equal((await f.lifecycle.closeExpiredCampaigns({ database: f.database, now: new Date(f.now.getTime() + 1) })).closedCount, 1);
});

test('repeated/concurrent executions are idempotent and do not repeat side effects', async () => {
  const results = await Promise.all([close(), close()]);
  assert.equal(results.reduce((sum, result) => sum + result.closedCount, 0), 2);
  assert.equal((await close()).closedCount, 0);
  assert.equal((await f.db.query('SELECT count(*)::int AS count FROM public.test_expiry_audit')).rows[0].count, 2);
});

test('campaign details, donation records, progress updates, and relationships are preserved', async () => {
  const donations = await rows('donations'), updates = await rows('campaign_updates');
  await close();
  assert.deepEqual(await rows('donations'), donations);
  assert.deepEqual(await rows('campaign_updates'), updates);
});

test('startup catch-up and subsequent scheduled checks use the actual database service', async () => {
  const { startCampaignExpiryJob } = require('../../src/jobs/campaignExpiryJob');
  let scheduled;
  const cron = { schedule: (expression, callback, options) => {
    assert.equal(expression, '0 0 * * *'); assert.equal(options.timezone, 'Asia/Kolkata'); scheduled = callback; return { stop() {} };
  } };
  const job = startCampaignExpiryJob({ cron, close, logger: { info() {}, error() {} } });
  assert.equal((await job.ready).closedCount, 2);
  assert.equal((await scheduled()).closedCount, 0);
  job.stop();
});

test('failed closure preserves state and can be retried safely', async () => {
  const before = await rows('campaigns');
  await f.db.exec('REVOKE UPDATE ON public.campaigns FROM service_role');
  try { await assert.rejects(close(), /Campaign expiry update failed/); }
  finally { await f.db.exec('GRANT UPDATE ON public.campaigns TO service_role'); }
  assert.deepEqual(await rows('campaigns'), before);
  assert.equal((await close()).closedCount, 2);
});

test('public detail reports closure and denies new donations before midnight persistence', async () => {
  const detail = await request(f.app).get('/api/campaigns/' + f.ids.expired);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.status, f.lifecycle.CAMPAIGN_STATUS.CLOSED);
  assert.equal(detail.body.accepting_donations, false);
  assert.equal((await f.db.query('SELECT status FROM public.campaigns WHERE id=$1', [f.ids.expired])).rows[0].status, f.lifecycle.CAMPAIGN_STATUS.ACTIVE, 'GET must not write to the database');
  const order = await request(f.app).post('/api/donations/create-order').set('Authorization', 'Bearer ' + f.token('donor')).send({ amount: 50, campaign_id: f.ids.expired });
  assert.equal(order.status, 409);
});

test('persisted closed campaigns reject orders while future active campaigns accept them', async () => {
  await close();
  const order = id => request(f.app).post('/api/donations/create-order').set('Authorization', 'Bearer ' + f.token('donor')).send({ amount: 50, campaign_id: id });
  for (const name of ['expired', 'closed', 'pending', 'rejected']) assert.equal((await order(f.ids[name])).status, 409);
  assert.equal((await order(f.ids.future)).status, 200);
  assert.equal((await order(require('crypto').randomUUID())).status, 404);
});

test('browsing filters expired active rows before pagination and count, while keeping future campaigns', async () => {
  const response = await request(f.app).get('/api/campaigns');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.campaigns.map(c => c.id), [f.ids.future]);
  assert.equal(response.body.pagination.total, 1);
  assert.equal(response.body.campaigns[0].accepting_donations, true);
  await close();
  const history = await request(f.app).get('/api/campaigns?status=closed');
  assert.equal(history.status, 200);
  assert.ok(history.body.campaigns.some(c => c.id === f.ids.expired));
});

test('campaign creation keeps the existing review workflow; expiry does not approve/reject pending campaigns', async () => {
  const response = await request(f.app).post('/api/campaigns').set('Authorization', 'Bearer ' + f.token('owner')).send({ title: 'New campaign', description: 'Future campaign', goal_amount: 2000, category: 'Education', deadline: new Date(Date.now() + 86400000).toISOString() });
  assert.equal(response.status, 201);
  assert.equal(response.body.campaign.status, f.lifecycle.CAMPAIGN_STATUS.PENDING_REVIEW);
  await close();
  assert.equal((await f.db.query('SELECT status FROM public.campaigns WHERE id=$1', [response.body.campaign.id])).rows[0].status, f.lifecycle.CAMPAIGN_STATUS.PENDING_REVIEW);
});
