// Optional: run with a separate Playwright Core installation and frontend on
// localhost:5173. All API traffic is routed to isolated local PostgreSQL.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core');
const { createFixture } = require('./fixture.cjs');

async function run() {
  let fixture, browser, server;
  try {
    fixture = await createFixture(); await fixture.seed();
    server = await new Promise(resolve => { const s = fixture.app.listen(0, '127.0.0.1', () => resolve(s)); });
    const api = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
    const context = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
    await context.addInitScript(token => localStorage.setItem('token', token), fixture.token('donor'));
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    let orderRequests = 0;
    await page.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url());
      const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (url.pathname.endsWith('/create-order')) orderRequests++;
      const response = await route.fetch({ url: api + url.pathname + url.search });
      await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
    });
    await page.goto(`http://localhost:5173/campaigns/${fixture.ids.expired}`);
    await page.getByRole('heading', { name: 'Donations unavailable' }).waitFor();
    assert.equal(await page.getByRole('button', { name: /with Razorpay/ }).count(), 0);
    await page.getByText('closed', { exact: true }).waitFor();
    assert.equal(orderRequests, 0);
    console.log('PASS: expired detail shows closed and has no donation form before the daily job');

    await page.goto(`http://localhost:5173/campaigns/${fixture.ids.future}`);
    const donate = page.getByRole('button', { name: /with Razorpay/ });
    await donate.waitFor(); assert.equal(await donate.isEnabled(), true);
    // The page is stale: simulate a deadline passing without a frontend timer.
    await fixture.db.query('UPDATE public.campaigns SET deadline=$1 WHERE id=$2', [new Date(Date.now() - 1000).toISOString(), fixture.ids.future]);
    await donate.click();
    await page.getByText('Campaign is not accepting donations', { exact: true }).waitFor();
    assert.equal(orderRequests, 1);
    assert.equal((await fixture.db.query('SELECT count(*)::int AS count FROM public.donations')).rows[0].count, 1, 'No new donation is created; the original donation remains');
    console.log('PASS: future campaign initially allows donating, but the backend blocks stale-page requests after expiry');

    const closed = await fixture.lifecycle.closeExpiredCampaigns({ database: fixture.database });
    assert.ok(closed.closedCount >= 3);
    assert.equal((await fixture.db.query('SELECT status FROM public.campaigns WHERE id=$1', [fixture.ids.future])).rows[0].status, fixture.lifecycle.CAMPAIGN_STATUS.CLOSED);
    await page.reload();
    await page.getByRole('heading', { name: 'Donations unavailable' }).waitFor();
    console.log('PASS: persisted closure remains visible after reload');

    await fixture.db.query('UPDATE public.campaigns SET status=$1,deadline=$2 WHERE id=$3', [fixture.lifecycle.CAMPAIGN_STATUS.ACTIVE, new Date(Date.now() + 3600000).toISOString(), fixture.ids.future]);
    await page.goto('http://localhost:5173/campaigns');
    await page.getByText('future', { exact: true }).waitFor();
    assert.equal(await page.getByText('expired', { exact: true }).count(), 0);
    await page.getByRole('link', { name: 'Donate Now', exact: true }).waitFor();
    console.log('PASS: browse retains future campaigns and excludes expired/closed campaigns');
    await context.close();
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    if (fixture) await fixture.close();
  }
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
