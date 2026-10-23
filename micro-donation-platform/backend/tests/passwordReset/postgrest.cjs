const express = require('express');

// A local PostgREST adapter connects the real Supabase JS client to test PostgreSQL.
async function startTestPostgrest(db) {
  const query = (sql, args) => db.transaction(async (tx) => {
    await tx.exec('SET LOCAL ROLE service_role');
    return tx.query(sql, args);
  });
  const app = express();
  app.use(express.json());
  app.get('/rest/v1/users', async (req, res) => {
    try {
      const allowed = ['id', 'email', 'password_hash', 'display_name', 'role', 'is_verified', 'auth_version'];
      const columns = req.query.select.split(',').map((column) => column.trim());
      if (columns.some((column) => !allowed.includes(column))) throw new Error('Unexpected test column');
      const column = req.query.email ? 'email' : 'id';
      const { rows } = await query(`SELECT ${columns.join(',')} FROM public.users WHERE ${column} = $1`, [req.query[column].slice(3)]);
      if (req.get('Accept')?.includes('application/vnd.pgrst.object+json')) {
        if (!rows.length) return res.status(406).json({ code: 'PGRST116', details: '0 rows', message: 'No row' });
        return res.json(rows[0]);
      }
      return res.json(rows);
    } catch (error) { return res.status(500).json({ code: error.code || 'TEST_ERROR' }); }
  });
  app.post('/rest/v1/users', async (req, res) => {
    try {
      const user = req.body;
      await query('INSERT INTO public.users (id, email, password_hash, display_name, is_verified) VALUES ($1, $2, $3, $4, $5)',
        [user.id, user.email, user.password_hash, user.display_name, user.is_verified]);
      return res.status(201).end();
    } catch (error) { return res.status(400).json({ code: error.code || 'TEST_ERROR' }); }
  });
  app.post('/rest/v1/rpc/:name', async (req, res) => {
    try {
      const { name } = req.params;
      if (!['issue_password_reset_token', 'reset_password_with_token', 'issue_email_verification_token', 'verify_email_token'].includes(name)) return res.sendStatus(404);
      const args = name.startsWith('issue_')
        ? [req.body.p_user_id, req.body.p_token_hash]
        : name === 'verify_email_token' ? [req.body.p_token_hash] : [req.body.p_token_hash, req.body.p_password_hash];
      const placeholders = args.map((_, i) => `$${i + 1}`).join(',');
      const { rows } = await query(`SELECT public.${name}(${placeholders}) AS result`, args);
      return res.json(rows[0].result);
    } catch (error) { return res.status(500).json({ code: error.code || 'TEST_ERROR' }); }
  });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

module.exports = { startTestPostgrest };
