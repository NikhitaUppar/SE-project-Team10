const fs = require('fs');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const { PGlite } = require('@electric-sql/pglite');
const { startCampaignUpdatesPostgrest } = require('../helpers/campaignUpdatesPostgrest.cjs');

async function createFixture() {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  await db.exec(fs.readFileSync(path.join(__dirname, '../../src/config/schema.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(__dirname, '../../src/config/migrations/006_password_reset.sql'), 'utf8'));
  await db.exec('GRANT USAGE ON SCHEMA public TO service_role; GRANT SELECT ON public.users TO service_role; GRANT SELECT, INSERT ON public.campaigns, public.campaign_updates TO service_role;');
  const postgrest = await startCampaignUpdatesPostgrest(db);
  Object.assign(process.env, {
    SUPABASE_URL: postgrest.url, SUPABASE_SERVICE_KEY: 'isolated-test-key',
    JWT_SECRET: 'issue-12-isolated-jwt-secret', NODE_ENV: 'test',
  });
  const app = express();
  app.use(express.json());
  const { authenticate } = require('../../src/middleware/auth');
  app.use('/api/campaigns', require('../../src/routes/campaigns'));
  app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));
  const ids = {
    owner: '11111111-1111-4111-8111-111111111111',
    otherOwner: '22222222-2222-4222-8222-222222222222',
    donor: '33333333-3333-4333-8333-333333333333',
    admin: '44444444-4444-4444-8444-444444444444',
    campaign: '55555555-5555-4555-8555-555555555555',
    missing: '99999999-9999-4999-8999-999999999999',
  };
  const token = (id, overrides = {}) => jwt.sign({ id, auth_version: 0, ...overrides }, process.env.JWT_SECRET,
    { ...(overrides.exp === undefined ? { expiresIn: '1h' } : {}), algorithm: 'HS256' });
  const seed = async () => {
    await db.exec('TRUNCATE public.users CASCADE;');
    for (const [key, role] of [['owner', 'campaign_owner'], ['otherOwner', 'campaign_owner'], ['donor', 'donor'], ['admin', 'admin']]) {
      await db.query('INSERT INTO public.users (id, email, password_hash, display_name, role, is_verified) VALUES ($1,$2,$3,$4,$5,true)', [ids[key], `${key}@example.test`, 'test-fixture-only', key, role]);
    }
    await db.query("INSERT INTO public.campaigns (id, owner_id, title, description, goal_amount, category, deadline, status) VALUES ($1,$2,'School supplies','Support local students',10000,'Education','2099-12-31','active')", [ids.campaign, ids.owner]);
  };
  return { app, db, ids, token, seed, close: async () => { await postgrest.close(); await db.close(); } };
}

module.exports = { createFixture };
