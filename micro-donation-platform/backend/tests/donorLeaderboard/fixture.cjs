const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { PGlite } = require('@electric-sql/pglite');

async function createFixture() {
  const db = new PGlite();
  await db.exec(fs.readFileSync(path.join(__dirname, '../../src/config/schema.sql'), 'utf8'));
  const rest = express();
  rest.get('/rest/v1/campaigns', async (req, res) => {
    try {
      const { rows } = await db.query("SELECT *, '[]'::json AS campaign_files FROM public.campaigns WHERE id=$1", [req.query.id.slice(3)]);
      if (req.get('Accept')?.includes('application/vnd.pgrst.object+json')) return rows.length ? res.json(rows[0]) : res.status(406).json({ code: 'PGRST116', details: '0 rows' });
      return res.json(rows);
    } catch { res.status(500).json({ message: 'private database details' }); }
  });
  rest.get('/rest/v1/donations', async (req, res) => {
    try {
      const args = [req.query.campaign_id.slice(3), req.query.status.slice(3)];
      let where = 'd.campaign_id=$1 AND d.status=$2';
      if (req.query.id) { args.push(req.query.id.slice(3)); where += ' AND d.id>$3'; }
      args.push(Number(req.query.limit));
      const { rows } = await db.query(`SELECT d.*, json_build_object('display_name',u.display_name) AS users
        FROM public.donations d LEFT JOIN public.users u ON u.id=d.donor_id
        WHERE ${where} ORDER BY d.id ASC LIMIT $${args.length}`, args);
      return res.json(rows);
    } catch { res.status(500).json({ message: 'private database details' }); }
  });
  const server = await new Promise(resolve => { const s = rest.listen(0, '127.0.0.1', () => resolve(s)); });
  Object.assign(process.env, { SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_SERVICE_KEY: 'leaderboard-local-test-key',
    JWT_SECRET: 'leaderboard-local-test-secret', NODE_ENV: 'test', RAZORPAY_KEY_ID: 'rzp_test_placeholder', RAZORPAY_KEY_SECRET: 'test-only-secret' });
  const app = express();
  app.use(express.json());
  app.use('/api/campaigns', require('../../src/routes/campaigns'));
  const ids = { owner: crypto.randomUUID(), campaign: crypto.randomUUID(), empty: crypto.randomUUID(), missing: crypto.randomUUID() };
  const donors = [];
  const seed = async () => {
    await db.exec('TRUNCATE public.users CASCADE'); donors.length = 0;
    await db.query("INSERT INTO public.users (id,email,password_hash,display_name,role) VALUES ($1,'owner@example.test','fixture-only','Owner','campaign_owner')", [ids.owner]);
    for (const id of [ids.campaign, ids.empty]) await db.query("INSERT INTO public.campaigns (id,owner_id,title,description,goal_amount,category,deadline,status) VALUES ($1,$2,'Leaderboard test campaign','Test campaign',10000,'Education','2099-12-31','active')", [id, ids.owner]);
    for (let i = 0; i < 7; i++) {
      const id = crypto.randomUUID(); donors.push(id);
      await db.query('INSERT INTO public.users (id,email,password_hash,display_name) VALUES ($1,$2,$3,$4)', [id, `private${i}@example.test`, 'private-hash', i === 6 ? 'Hidden identity' : `Donor ${i + 1}`]);
    }
  };
  const add = async ({ donor = 0, amount = 100, status = 'completed', anonymous = false, time = new Date().toISOString(), payment = null, order = null, campaign = ids.campaign } = {}) => {
    const id = crypto.randomUUID();
    await db.query('INSERT INTO public.donations (id,campaign_id,donor_id,amount,status,is_anonymous,created_at,razorpay_payment_id,razorpay_order_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, campaign, donor === null ? null : donors[donor], amount, status, anonymous, time, payment, order]);
    return id;
  };
  return { app, db, ids, donors, seed, add, close: async () => { await new Promise(resolve => server.close(resolve)); await db.close(); } };
}
module.exports = { createFixture };
