// Optional browser check: separate playwright-core install; frontend on :5173.
// Every API request goes to an isolated database. Never reads private .env files.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core');
const { createFixture } = require('./fixture.cjs');

async function run() {
  let f, browser, server;
  let stage = 'setup';
  try {
    f = await createFixture(); await f.seed();
    const now = Date.now();
    for (let i = 0; i < 7; i++) await f.add({ donor: i, amount: 100 + i * 10, anonymous: i === 6, time: new Date(now - (i + 1) * 60000).toISOString() });
    await f.add({ donor: 0, amount: 200, time: new Date(now - 2 * 3600000).toISOString() });
    const longName = 'Supporter'.repeat(30) + '<img src=x onerror="window.__donorXss=true">';
    await f.db.query('UPDATE public.users SET display_name=$1 WHERE id=$2', [longName, f.donors[0]]);
    server = await new Promise(resolve => { const s = f.app.listen(0, '127.0.0.1', () => resolve(s)); });
    const api = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    let fail = false, delay = 500, donorRequests = 0;
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const headers = { 'access-control-allow-origin': 'http://localhost:5173' };
      if (url.pathname.endsWith('/donors')) {
        donorRequests++;
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        if (fail) return route.fulfill({ status: 500, headers, contentType: 'application/json', body: JSON.stringify({ error: 'private provider error' }) });
      }
      const response = await route.fetch({ url: api + url.pathname + url.search });
      await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
    });
    stage = 'loading and rankings';
    const url = `http://localhost:5173/campaigns/${f.ids.campaign}`;
    await page.goto(url);
    const region = page.getByRole('region', { name: 'Campaign supporters' });
    await region.getByRole('status').filter({ hasText: 'Loading donors' }).waitFor();
    await region.getByRole('list', { name: 'Top donors ranking' }).waitFor();
    const top = region.getByRole('list', { name: 'Top donors ranking' });
    const recent = region.getByRole('list', { name: 'Recent donations' });
    assert.equal(await top.locator('li').count(), 5); assert.equal(await recent.locator('li').count(), 5);
    assert.ok((await top.locator('li').first().textContent()).includes('₹300'));
    assert.ok((await top.locator('li').first().textContent()).includes(longName));
    assert.equal(await region.locator('img').count(), 0);
    assert.equal(await page.evaluate(() => Boolean(window.__donorXss)), false);
    assert.ok((await region.innerText()).includes('Anonymous'));
    assert.ok(!(await region.innerText()).includes('Hidden identity'));
    await recent.getByText('1 minute ago', { exact: true }).waitFor();
    const positions = await region.evaluate(el => ({ top: el.querySelector('h2').getBoundingClientRect().top, recent: el.querySelector('h3').getBoundingClientRect().top }));
    assert.ok(positions.recent > positions.top);
    console.log('PASS: loading, top five aggregated ranks, INR, latest five, relative times, anonymity, and escaped text');

    stage = 'existing campaign features';
    await page.getByRole('button', { name: 'Share campaign' }).waitFor();
    await page.locator('form button[type="submit"]').waitFor();
    assert.equal(donorRequests, 1, 'One supporters request replaces the old duplicate history request');
    console.log('PASS: sharing, campaign details, and donation controls preserved');

    stage = 'mobile';
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await region.evaluate(el => [el, ...el.querySelectorAll('*')]
      .filter(node => node.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 5).map(node => ({ tag: node.tagName, className: node.className, right: node.getBoundingClientRect().right })));
    assert.deepEqual(overflow, []);
    console.log('PASS: leaderboard and recent donations fit a 390px viewport with long names');

    stage = 'failure and retry';
    fail = true; delay = 0; await page.reload();
    await region.getByRole('alert').waitFor();
    assert.equal(await top.count(), 0);
    assert.ok(!(await region.innerText()).includes('private provider'));
    fail = false; await region.getByRole('button', { name: 'Retry loading donors' }).click();
    await top.waitFor();
    console.log('PASS: safe API error, no fabricated donor data, and successful retry');

    stage = 'empty campaign and reload persistence';
    await page.goto(`http://localhost:5173/campaigns/${f.ids.empty}`);
    await region.getByText('No completed donations yet. Be the first to support this campaign.').waitFor();
    await region.getByText('No recent donations yet.').waitFor();
    await page.goto(url); await top.waitFor(); await page.reload(); await top.waitFor();
    assert.equal(await top.locator('li').count(), 5);
    console.log('PASS: empty state, campaign isolation, and persisted results after reload');
    await context.close();
  } catch (error) { throw new Error(`Leaderboard browser check failed at ${stage}: ${error.message}`); }
  finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    if (f) await f.close();
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
