const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { PGlite } = require('@electric-sql/pglite');

async function createFixture() {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  await db.exec(fs.readFileSync(path.join(__dirname, '../../src/config/schema.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(__dirname, '../../src/config/migrations/006_password_reset.sql'), 'utf8'));
  await db.exec(`
    GRANT USAGE ON SCHEMA public TO service_role;
    GRANT SELECT ON public.users TO service_role;
    GRANT SELECT, UPDATE, INSERT ON public.campaigns TO service_role;
    CREATE TABLE public.test_expiry_audit (campaign_id uuid, previous_status text, next_status text);
    GRANT INSERT ON public.test_expiry_audit TO service_role;
    CREATE FUNCTION public.test_log_expiry() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN INSERT INTO public.test_expiry_audit VALUES (NEW.id, OLD.status, NEW.status); RETURN NEW; END; $$;
    CREATE TRIGGER test_log_expiry AFTER UPDATE OF status ON public.campaigns
      FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.test_log_expiry();
  `);
  const query = (sql, args = []) => db.transaction(async tx => {
    await tx.exec('SET LOCAL ROLE service_role'); return tx.query(sql, args);
  });
  const rest = express(); rest.use(express.json());
  const respond = (req, res, rows) => {
    if (req.get('Accept')?.includes('application/vnd.pgrst.object+json')) {
      return rows.length ? res.json(rows[0]) : res.status(406).json({ code: 'PGRST116', details: '0 rows' });
    }
    return res.json(rows);
  };
  rest.get('/rest/v1/users', async (req, res) => {
    try {
      const { rows } = await query('SELECT id,email,role,display_name,is_verified,auth_version FROM public.users WHERE id=$1', [req.query.id.slice(3)]);
      return respond(req, res, rows);
    } catch { return res.status(500).json({ code: 'TEST_ERROR' }); }
  });
  rest.get('/rest/v1/campaigns', async (req, res) => {
    try {
      const args = [], conditions = [];
      for (const column of ['id', 'status', 'category']) if (req.query[column]) { args.push(req.query[column].slice(3)); conditions.push(`${column}=$${args.length}`); }
      if (req.query.deadline) {
        if (!req.query.deadline.startsWith('gte.')) throw new Error('Unexpected test filter');
        args.push(req.query.deadline.slice(4)); conditions.push(`deadline >= $${args.length}`);
      }
      const { rows } = await query("SELECT *, '[]'::json AS campaign_files FROM public.campaigns" + (conditions.length ? ' WHERE ' + conditions.join(' AND ') : '') + ' ORDER BY created_at DESC', args);
      res.set('Content-Range', `0-${Math.max(0, rows.length - 1)}/${rows.length}`);
      return respond(req, res, rows);
    } catch { return res.status(500).json({ code: 'TEST_ERROR' }); }
  });
  rest.patch('/rest/v1/campaigns', async (req, res) => {
    try {
      if (!req.query.status?.startsWith('eq.') || !req.query.deadline?.startsWith('lt.')) throw new Error('Unexpected expiry filter');
      const { rows } = await query('UPDATE public.campaigns SET status=$1 WHERE status=$2 AND deadline<$3 RETURNING id', [req.body.status, req.query.status.slice(3), req.query.deadline.slice(3)]);
      res.set('Content-Range', `0-${Math.max(0, rows.length - 1)}/${rows.length}`);
      return res.json(rows);
    } catch { return res.status(500).json({ code: 'TEST_ERROR', message: 'Private SQL error' }); }
  });
  rest.post('/rest/v1/campaigns', async (req, res) => {
    try {
      const c = req.body;
      const { rows } = await query('INSERT INTO public.campaigns (owner_id,title,description,goal_amount,category,deadline,status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [c.owner_id, c.title, c.description, c.goal_amount, c.category, c.deadline, c.status]);
      return respond(req, res.status(201), rows);
    } catch { return res.status(500).json({ code: 'TEST_ERROR' }); }
  });
  const server = await new Promise(resolve => { const s = rest.listen(0, '127.0.0.1', () => resolve(s)); });
  Object.assign(process.env, { SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_SERVICE_KEY: 'local-expiry-test-key', JWT_SECRET: 'local-expiry-test-secret', NODE_ENV: 'test' });
  const database = require('../../src/config/supabase');
  const lifecycle = require('../../src/services/campaignLifecycle');
  const app = express(); app.use(express.json());
  app.use('/api/campaigns', require('../../src/routes/campaigns'));
  app.use('/api/donations', require('../../src/routes/donations'));
  const { authenticate } = require('../../src/middleware/auth');
  app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));
  const ids = { owner: crypto.randomUUID(), donor: crypto.randomUUID() };
  for (const name of ['expired', 'future', 'boundary', 'closed', 'pending', 'rejected', 'offsetExpired']) ids[name] = crypto.randomUUID();
  let now;
  const seed = async () => {
    await db.exec('TRUNCATE public.users CASCADE; TRUNCATE public.test_expiry_audit;');
    now = new Date();
    for (const [name, role] of [['owner', 'campaign_owner'], ['donor', 'donor']]) {
      await db.query('INSERT INTO public.users (id,email,password_hash,display_name,role,is_verified) VALUES ($1,$2,$3,$4,$5,true)', [ids[name], name + '@example.test', 'fixture-only', name, role]);
    }
    const S = lifecycle.CAMPAIGN_STATUS;
    for (const [name, status, delta] of [['expired', S.ACTIVE, -3600000], ['future', S.ACTIVE, 3600000], ['boundary', S.ACTIVE, 0], ['closed', S.CLOSED, -3600000], ['pending', S.PENDING_REVIEW, -3600000], ['rejected', S.REJECTED, -3600000], ['offsetExpired', S.ACTIVE, -1]]) {
      let deadline = new Date(now.getTime() + delta).toISOString();
      if (name === 'offsetExpired') deadline = new Date(now.getTime() + delta + 19800000).toISOString().replace('Z', '+05:30');
      await db.query('INSERT INTO public.campaigns (id,owner_id,title,description,goal_amount,raised_amount,category,deadline,status) VALUES ($1,$2,$3,$4,1000,10,$5,$6,$7)', [ids[name], ids.owner, name, 'Preserve this campaign story', 'Education', deadline, status]);
    }
    await db.query("INSERT INTO public.donations (campaign_id,donor_id,amount,status) VALUES ($1,$2,10,'completed')", [ids.expired, ids.donor]);
    await db.query('INSERT INTO public.campaign_updates (campaign_id,content) VALUES ($1,$2)', [ids.expired, 'Existing progress must remain']);
  };
  const token = name => jwt.sign({ id: ids[name], auth_version: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { db, database, lifecycle, app, ids, seed, token, get now() { return now; }, close: async () => { await new Promise(resolve => server.close(resolve)); await db.close(); } };
}

module.exports = { createFixture };
