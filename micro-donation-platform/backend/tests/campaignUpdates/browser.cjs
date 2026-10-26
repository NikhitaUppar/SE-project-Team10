// Optional browser check. Set PLAYWRIGHT_MODULE_PATH to an installed
// playwright-core module and CHROME_PATH if Chrome is not in its Windows default.
// Uses an isolated database and intercepts all API calls; never loads .env.
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core');
const { createFixture } = require('./fixture.cjs');

async function run() {
  let fixture, browser, server;
  let stage = 'setup';
  try {
    fixture = await createFixture();
    await fixture.seed();
    for (const [date, content] of [['2020-01-03', 'Third update'], ['2020-01-01', 'First update'], ['2020-01-02', 'Second update']]) {
      await fixture.db.query('INSERT INTO public.campaign_updates (campaign_id,content,created_at) VALUES ($1,$2,$3)', [fixture.ids.campaign, content, date]);
    }
    server = await new Promise(resolve => {
      const listening = fixture.app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    const api = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true });
    let failReads = false, failPost = false, postRequests = 0;
    const pageFor = async (role, width = 1280) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Kolkata' });
      if (role) await context.addInitScript(token => localStorage.setItem('token', token), fixture.token(fixture.ids[role]));
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      await page.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        if (url.pathname.endsWith('/updates') && request.method() === 'GET' && failReads) {
          return route.fulfill({ status: 500, headers, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary read failure' }) });
        }
        if (url.pathname.endsWith('/updates') && request.method() === 'POST') {
          postRequests++;
          await new Promise(resolve => setTimeout(resolve, 400));
          if (failPost) return route.fulfill({ status: 500, headers, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary post failure' }) });
        }
        const response = await route.fetch({ url: api + url.pathname + url.search });
        await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
      });
      return { context, page };
    };
    const url = `http://localhost:5173/campaigns/${fixture.ids.campaign}`;
    const owner = await pageFor('owner');
    stage = 'owner timeline';
    await owner.page.goto(url);
    await owner.page.getByText('First update', { exact: true }).waitFor();
    const section = owner.page.getByRole('region', { name: 'Progress updates' });
    assert.deepEqual(await section.locator('ol li p').allTextContents(), ['First update', 'Second update', 'Third update']);
    assert.equal(await section.locator('time').count(), 3);
    assert.ok(await section.locator('time').first().getAttribute('datetime'));
    console.log('PASS: chronological timeline and timestamps');
    stage = 'empty text validation';
    const input = owner.page.getByLabel('Share a progress update');
    await input.fill('   ');
    await owner.page.getByRole('button', { name: 'Post Update', exact: true }).click();
    await owner.page.getByRole('alert').filter({ hasText: 'Enter an update' }).waitFor();
    assert.equal(postRequests, 0);
    stage = 'submission state and error recovery';
    const content = 'Delivered school books.\n<img src=x onerror="window.__updateXss=true">';
    await input.fill(content);
    failPost = true;
    await owner.page.getByRole('button', { name: 'Post Update', exact: true }).click();
    await owner.page.getByRole('button', { name: /^Posting/ }).waitFor();
    assert.equal(await input.isDisabled(), true);
    await owner.page.getByRole('alert').filter({ hasText: 'Temporary post failure' }).waitFor();
    assert.equal(await input.inputValue(), content);
    failPost = false;
    await owner.page.getByRole('button', { name: 'Post Update', exact: true }).click();
    await owner.page.getByRole('status').filter({ hasText: 'Your progress update has been posted.' }).waitFor();
    assert.equal((await section.locator('ol li p').allTextContents()).at(-1), content);
    assert.equal(await input.inputValue(), '');
    assert.equal(await owner.page.evaluate(() => Boolean(window.__updateXss)), false);
    assert.equal(await section.locator('ol img').count(), 0);
    assert.equal((await fixture.db.query('SELECT count(*)::int AS count FROM public.campaign_updates')).rows[0].count, 4);
    console.log('PASS: validation, loading, error retry, persistence, immediate UI refresh, and escaped HTML');
    await owner.page.reload();
    await owner.page.getByText('First update', { exact: true }).waitFor();
    assert.equal(await owner.page.getByRole('region', { name: 'Progress updates' }).locator('ol li p').count(), 4);
    await owner.context.close();
    stage = 'reader roles and mobile layout';
    for (const role of [null, 'donor', 'otherOwner', 'admin']) {
      const { context, page } = await pageFor(role, 390);
      await page.goto(url);
      await page.getByText('First update', { exact: true }).waitFor();
      assert.equal(await page.getByLabel('Share a progress update').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Post Update', exact: true }).count(), 0);
      const timeline = page.getByRole('region', { name: 'Progress updates' });
      const overflowing = await timeline.evaluate(section => [section, ...section.querySelectorAll('*')]
        .filter(node => node.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 8).map(node => ({ tag: node.tagName, className: node.className, right: node.getBoundingClientRect().right })));
      assert.deepEqual(overflowing, [], 'Mobile content must fit the viewport');
      await context.close();
    }
    console.log('PASS: guest/donor/other-owner/admin read access, hidden form, and mobile layout');
    stage = 'read failure recovery';
    failReads = true;
    const retry = await pageFor('owner');
    await retry.page.goto(url);
    await retry.page.getByRole('alert').filter({ hasText: 'Unable to load progress updates' }).waitFor();
    failReads = false;
    await retry.page.getByRole('button', { name: 'Retry loading updates' }).click();
    await retry.page.getByText('First update', { exact: true }).waitFor();
    await retry.context.close();
    stage = 'inactive and missing campaigns';
    await fixture.db.query("UPDATE public.campaigns SET status='closed' WHERE id=$1", [fixture.ids.campaign]);
    const closed = await pageFor('owner');
    await closed.page.goto(url);
    await closed.page.getByText('You can post progress updates when this campaign is active.').waitFor();
    assert.equal(await closed.page.getByLabel('Share a progress update').count(), 0);
    await closed.page.goto(`http://localhost:5173/campaigns/${fixture.ids.missing}`);
    await closed.page.getByRole('alert').filter({ hasText: 'Campaign not found.' }).waitFor();
    assert.equal(await closed.page.getByRole('region', { name: 'Progress updates' }).count(), 0);
    await closed.context.close();
    console.log('PASS: retryable read errors, inactive campaigns, and missing campaigns');
    stage = 'existing browse regression';
    await fixture.db.query("UPDATE public.campaigns SET status='active' WHERE id=$1", [fixture.ids.campaign]);
    const browse = await pageFor(null);
    await browse.page.goto('http://localhost:5173/campaigns');
    await browse.page.getByText('School supplies', { exact: true }).waitFor();
    await browse.context.close();
    console.log('PASS: existing campaign browse page');
  } catch (error) {
    throw new Error(`Browser check failed at ${stage}: ${error.message}`);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    if (fixture) await fixture.close();
  }
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
