const { before, beforeEach, after, test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createFixture } = require('./fixture.cjs');
let fixture;
before(async () => { fixture = await createFixture(); });
beforeEach(async () => { await fixture.seed(); });
after(async () => { if (fixture) await fixture.close(); });
const post = (body, key = 'owner', id) => {
  const req = request(fixture.app).post(`/api/campaigns/${id || fixture.ids.campaign}/updates`).send(body);
  return key ? req.set('Authorization', `Bearer ${fixture.token(fixture.ids[key])}`) : req;
};
const list = id => request(fixture.app).get(`/api/campaigns/${id || fixture.ids.campaign}/updates`);
const count = async () => (await fixture.db.query('SELECT count(*)::int AS count FROM public.campaign_updates')).rows[0].count;

test('the authenticated owner saves trimmed text with server-generated ID and timestamp', async () => {
  const response = await post({ content: '  First school supplies delivered.  ', campaign_id: fixture.ids.missing, owner_id: fixture.ids.otherOwner, created_at: '2000-01-01' });
  assert.equal(response.status, 201);
  assert.equal(response.body.update.content, 'First school supplies delivered.');
  assert.equal(response.body.update.campaign_id, fixture.ids.campaign);
  assert.match(response.body.update.id, /^[a-f0-9-]{36}$/);
  assert.ok(Math.abs(Date.now() - Date.parse(response.body.update.created_at)) < 60000);
  assert.equal(await count(), 1);
  assert.equal((await list()).body.updates[0].content, response.body.update.content);
});

for (const content of [undefined, null, '', ' \n\t ', 123, {}, ['text'], 'a'.repeat(5001)]) {
  test(`rejects invalid update text: ${JSON.stringify(content)?.slice(0, 30)}`, async () => {
    assert.equal((await post({ content })).status, 400);
    assert.equal(await count(), 0);
  });
}

test('accepts 5000 characters and preserves multiline text as data', async () => {
  assert.equal((await post({ content: 'a'.repeat(5000) })).status, 201);
  const content = 'Delivered books.\nNext: school bags.\n<script>window.__xss = true</script>';
  assert.equal((await post({ content })).body.update.content, content);
});

test('rejects unauthenticated and invalid/expired JWTs', async () => {
  assert.equal((await post({ content: 'Unauthorized' }, null)).status, 401);
  for (const token of ['invalid', fixture.token(fixture.ids.owner, { exp: 1 })]) {
    const response = await request(fixture.app).post(`/api/campaigns/${fixture.ids.campaign}/updates`).set('Authorization', `Bearer ${token}`).send({ content: 'Unauthorized' });
    assert.equal(response.status, 401);
  }
  assert.equal(await count(), 0);
});

for (const key of ['otherOwner', 'donor', 'admin']) {
  test(`rejects ${key} even when the body claims campaign ownership`, async () => {
    assert.equal((await post({ content: 'Not mine', owner_id: fixture.ids.owner, user_id: fixture.ids.owner }, key)).status, 403);
    assert.equal(await count(), 0);
  });
}

test('a donor cannot post even if the campaign row names them as owner', async () => {
  await fixture.db.query('UPDATE public.campaigns SET owner_id = $1 WHERE id = $2', [fixture.ids.donor, fixture.ids.campaign]);
  assert.equal((await post({ content: 'Donor' }, 'donor')).status, 403);
});

test('uses the database role rather than a stale JWT role claim', async () => {
  const token = fixture.token(fixture.ids.donor, { role: 'campaign_owner' });
  const response = await request(fixture.app).post(`/api/campaigns/${fixture.ids.campaign}/updates`).set('Authorization', `Bearer ${token}`).send({ content: 'Forged role' });
  assert.equal(response.status, 403);
});

for (const status of ['pending_review', 'rejected', 'closed']) {
  test(`does not post on ${status} campaigns`, async () => {
    await fixture.db.query('UPDATE public.campaigns SET status = $1 WHERE id = $2', [status, fixture.ids.campaign]);
    assert.equal((await post({ content: 'Not active' })).status, 409);
    assert.equal(await count(), 0);
  });
}

test('returns 404 for nonexistent campaigns and 400 for malformed IDs', async () => {
  assert.equal((await post({ content: 'Missing' }, 'owner', fixture.ids.missing)).status, 404);
  assert.equal((await list(fixture.ids.missing)).status, 404);
  for (const id of ['invalid', '123', 'abc%27OR%201=1']) {
    assert.equal((await post({ content: 'Invalid' }, 'owner', id)).status, 400);
    assert.equal((await list(id)).status, 400);
  }
});

test('public reads are oldest first with a stable ID tie-break, and exclude other campaigns', async () => {
  const entries = [
    ['cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2026-10-26T15:00:00Z', 'Third'],
    ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-26T10:00:00Z', 'Second'],
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-10-26T10:00:00Z', 'First'],
  ];
  for (const [id, date, content] of entries) await fixture.db.query('INSERT INTO public.campaign_updates (id,campaign_id,created_at,content) VALUES ($1,$2,$3,$4)', [id, fixture.ids.campaign, date, content]);
  await fixture.db.query("INSERT INTO public.campaigns (id,owner_id,title,description,goal_amount,category,deadline,status) VALUES ($1,$2,'Other','Other',100,'Education','2099-12-31','active')", [fixture.ids.missing, fixture.ids.otherOwner]);
  await fixture.db.query('INSERT INTO public.campaign_updates (campaign_id,content) VALUES ($1,$2)', [fixture.ids.missing, 'Other campaign']);
  const response = await list();
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.updates.map(u => u.content), ['First', 'Second', 'Third']);
  const donorRead = await request(fixture.app).get(`/api/campaigns/${fixture.ids.campaign}/updates`).set('Authorization', `Bearer ${fixture.token(fixture.ids.donor)}`);
  assert.equal(donorRead.status, 200);
  await fixture.db.exec("UPDATE public.campaigns SET status = 'closed'");
  assert.equal((await list()).body.updates.length, 3, 'Past progress remains readable after closure');
});

test('an empty timeline returns an empty list', async () => {
  assert.deepEqual((await list()).body, { updates: [] });
});

test('database failures return safe errors without saving updates', async () => {
  await fixture.db.exec("CREATE FUNCTION public.fail_test_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Private database detail'; END; $$; CREATE TRIGGER fail_test_update BEFORE INSERT ON public.campaign_updates FOR EACH ROW EXECUTE FUNCTION public.fail_test_update();");
  try {
    const response = await post({ content: 'Should fail' });
    assert.equal(response.status, 500);
    assert.ok(!JSON.stringify(response.body).includes('Private'));
    assert.equal(await count(), 0);
  } finally { await fixture.db.exec('DROP TRIGGER fail_test_update ON public.campaign_updates; DROP FUNCTION public.fail_test_update();'); }
  await fixture.db.exec('REVOKE SELECT ON public.campaign_updates FROM service_role');
  try { assert.equal((await list()).status, 500); }
  finally { await fixture.db.exec('GRANT SELECT ON public.campaign_updates TO service_role'); }
});

test('campaign creation, browsing, and detail retrieval still work', async () => {
  const created = await request(fixture.app).post('/api/campaigns').set('Authorization', `Bearer ${fixture.token(fixture.ids.owner)}`).send({ title: 'New campaign', description: 'New story', goal_amount: 1000, category: 'Education', deadline: '2099-12-31' });
  assert.equal(created.status, 201);
  assert.equal(created.body.campaign.status, 'pending_review');
  assert.equal(created.body.campaign.owner_id, fixture.ids.owner);
  const browse = await request(fixture.app).get('/api/campaigns');
  assert.equal(browse.status, 200);
  assert.ok(browse.body.campaigns.some(c => c.id === fixture.ids.campaign));
  const detail = await request(fixture.app).get(`/api/campaigns/${fixture.ids.campaign}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.owner_id, fixture.ids.owner);
});
