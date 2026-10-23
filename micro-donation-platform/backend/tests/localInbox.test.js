const nodemailer = require('nodemailer');
const request = require('supertest');
const { startLocalInbox } = require('../scripts/local-inbox');

let inbox;
beforeAll(async () => { inbox = await startLocalInbox({ smtpPort: 0, webPort: 0 }); });
afterAll(async () => { await inbox.close(); });

test('captures a real SMTP message, decodes its text, and serves the inbox locally', async () => {
  const transporter = nodemailer.createTransport({ host: '127.0.0.1', port: inbox.smtpPort });
  const link = 'http://localhost:5173/verify-email#token=' + 'ab'.repeat(32);
  const info = await transporter.sendMail({
    from: 'noreply@microdonate.test', to: 'student@example.test',
    subject: 'Verify your email', text: `Verify: ${link}`,
    html: `<a href="${link}">Verify</a>`,
  });
  expect(info.accepted).toEqual(['student@example.test']);
  const response = await fetch(`http://127.0.0.1:${inbox.webPort}/api/messages`);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const messages = await response.json();
  expect(messages).toHaveLength(1);
  expect(messages[0]).toMatchObject({ to: 'student@example.test', subject: 'Verify your email', text: expect.stringContaining(link) });
  expect(messages[0]).not.toHaveProperty('html');
  const page = await fetch(`http://127.0.0.1:${inbox.webPort}/`);
  expect(await page.text()).toContain('Local inbox');
});

test('rejects foreign Host headers instead of exposing local emails', async () => {
  const response = await request(`http://127.0.0.1:${inbox.webPort}`).get('/api/messages').set('Host', 'untrusted.example');
  expect(response.status).toBe(403);
});
