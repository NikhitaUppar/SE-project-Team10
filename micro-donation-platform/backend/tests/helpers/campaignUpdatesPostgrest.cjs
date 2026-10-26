const express = require('express');

// Test-only PostgREST adapter: the real Supabase client executes parameterized
// SQL in isolated PostgreSQL with the backend role. No real .env is loaded.
async function startCampaignUpdatesPostgrest(db) {
  const query = (sql, args = []) => db.transaction(async tx => {
    await tx.exec('SET LOCAL ROLE service_role');
    return tx.query(sql, args);
  });
  const app = express();
  app.use(express.json());
  const respond = (req, res, rows) => {
    if (req.get('Accept')?.includes('application/vnd.pgrst.object+json')) {
      return rows.length ? res.json(rows[0]) : res.status(406).json({ code: 'PGRST116', details: '0 rows' });
    }
    return res.json(rows);
  };
  const order = (value, allowed) => {
    if (!value) return '';
    return ' ORDER BY ' + value.split(',').map(item => {
      const [column, direction] = item.split('.');
      if (!allowed.includes(column) || !['asc', 'desc'].includes(direction)) throw new Error('Invalid test ordering');
      return `${column} ${direction}`;
    }).join(',');
  };
  app.get('/rest/v1/users', async (req, res) => {
    try {
      const { rows } = await query('SELECT id, email, role, display_name, is_verified, auth_version FROM public.users WHERE id = $1', [req.query.id.slice(3)]);
      return respond(req, res, rows);
    } catch { return res.status(500).json({ code: 'TEST_ERROR' }); }
  });
  app.get('/rest/v1/campaigns', async (req, res) => {
    try {
      const column = req.query.id ? 'id' : 'status';
      const { rows } = await query(`SELECT *, '[]'::json AS campaign_files FROM public.campaigns WHERE ${column} = $1` + order(req.query.order, ['created_at', 'id']), [(req.query[column] || 'eq.active').slice(3)]);
      if (req.get('Prefer')?.includes('count=exact')) res.set('Content-Range', `0-${Math.max(0, rows.length - 1)}/${rows.length}`);
      return respond(req, res, rows);
    } catch { return res.status(500).json({ code: 'TEST_ERROR' }); }
  });
  app.get('/rest/v1/campaign_updates', async (req, res) => {
    try {
      const { rows } = await query('SELECT id, campaign_id, content, created_at FROM public.campaign_updates WHERE campaign_id = $1' + order(req.query.order, ['created_at', 'id']), [req.query.campaign_id.slice(3)]);
      return respond(req, res, rows);
    } catch { return res.status(500).json({ code: 'TEST_ERROR' }); }
  });
  app.post('/rest/v1/campaign_updates', async (req, res) => {
    try {
      const { campaign_id, content } = req.body;
      const { rows } = await query('INSERT INTO public.campaign_updates (campaign_id, content) VALUES ($1, $2) RETURNING id, campaign_id, content, created_at', [campaign_id, content]);
      return respond(req, res.status(201), rows);
    } catch { return res.status(500).json({ code: 'TEST_ERROR', message: 'Private simulated database details' }); }
  });
  app.post('/rest/v1/campaigns', async (req, res) => {
    try {
      const c = req.body;
      const { rows } = await query('INSERT INTO public.campaigns (owner_id, title, description, goal_amount, category, deadline, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [c.owner_id, c.title, c.description, c.goal_amount, c.category, c.deadline, c.status]);
      return respond(req, res.status(201), rows);
    } catch { return res.status(500).json({ code: 'TEST_ERROR' }); }
  });
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

module.exports = { startCampaignUpdatesPostgrest };
