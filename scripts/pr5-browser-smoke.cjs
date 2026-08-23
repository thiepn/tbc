const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE = 'http://127.0.0.1:4173/';

async function dismissBlockingModal(page) {
  const modal = page.locator('#modalRoot .modal-backdrop');
  if (!(await modal.count()) || !(await modal.isVisible())) return;
  const closedByApi = await page.evaluate(() => {
    if (typeof closeModal === 'function') { closeModal(); return true; }
    return false;
  });
  if (!closedByApi) {
    const preferred = modal.getByRole('button', { name: /close|got it|continue|start|okay|ok|dismiss|not now|cancel/i }).last();
    if (await preferred.count()) await preferred.click();
    else if (await modal.getByRole('button').count()) await modal.getByRole('button').last().click();
  }
  await page.waitForFunction(() => !document.querySelector('#modalRoot .modal-backdrop'), null, { timeout: 5000 });
}

async function openCheckedPage(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-pr5-foundation') === 'compat-v4.1', null, { timeout: 20000 });
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-pr6-reconstruction'), null, { timeout: 20000 });
  await page.waitForSelector('[data-pr5-nav="play"]', { state: 'attached', timeout: 20000 });
  await page.waitForSelector('[data-pr5-nav="learn"]', { state: 'attached', timeout: 20000 });
  await page.waitForTimeout(500);
  await dismissBlockingModal(page);
  return { context, page, pageErrors, consoleErrors };
}

async function visibleNav(page, domain) {
  const items = page.locator(`[data-pr5-nav="${domain}"]`);
  for (let i = 0; i < await items.count(); i++) if (await items.nth(i).isVisible()) return items.nth(i);
  throw new Error(`No visible native ${domain} navigation control`);
}

async function assertNativeShell(page, label) {
  assert.equal(await page.locator('.pr5-primary-nav').count(), 0, `${label}: replacement desktop nav must not exist`);
  assert.equal(await page.locator('.pr5-mobile-nav').count(), 0, `${label}: replacement mobile nav must not exist`);
  assert.equal(await page.locator('.pr5-home').count(), 0, `${label}: replacement Home must not exist`);
  assert.ok(await page.locator('.content').count(), `${label}: native content must remain mounted`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px`);
}

(async () => {
  fs.mkdirSync('artifacts/pr5', { recursive: true });

  const css = fs.readFileSync('assets/pr5-foundation.css', 'utf8');
  const shell = fs.readFileSync('assets/pr5-shell.js', 'utf8');
  assert.equal(/\.aurora\s*,\s*\.grain\s*\{[^}]*opacity\s*:\s*0/i.test(css), false, 'compat CSS must not disable atmospheric effects');
  assert.equal(/\.radiance\s*,\s*\.star\s*\{[^}]*animation\s*:\s*none/i.test(css), false, 'compat CSS must not disable native animations');
  assert.equal(/\.panel\s*,\s*\.card|\.sidebar\s*\{|\.btn-primary\s*,|\.hero\s*\{/i.test(css), false, 'compat CSS must not restyle native v4.1.0 components');
  assert.equal(/pr5-primary-nav|pr5-home-hero/.test(shell), false, 'compat JS must not reconstruct the visual shell');
  assert.equal(/localStorage|sessionStorage|STORAGE_KEY|PREF_KEY/.test(shell), false, 'compat shell must not touch persistence');

  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await openCheckedPage(browser, { width: 1440, height: 1000 });
    await assertNativeShell(desktop.page, 'desktop');
    assert.ok(await desktop.page.locator('.nav').count(), 'desktop native navigation must remain present');

    await (await visibleNav(desktop.page, 'play')).click();
    await desktop.page.waitForFunction(() => document.body.classList.contains('pr6-native-active'));
    assert.equal(await desktop.page.locator('.pr6-root:not([hidden])').count(), 1, 'Play must open reconstructed flow');

    await (await visibleNav(desktop.page, 'home')).click();
    await desktop.page.waitForFunction(() => !document.body.classList.contains('pr6-native-active'));
    assert.notEqual(await desktop.page.locator('.content').evaluate(el => getComputedStyle(el).display), 'none', 'Home must restore native content');

    await (await visibleNav(desktop.page, 'learn')).click();
    await desktop.page.waitForFunction(() => document.body.classList.contains('pr6-native-active'));
    await (await visibleNav(desktop.page, 'library')).click();
    await desktop.page.waitForFunction(() => !document.body.classList.contains('pr6-native-active'));

    await desktop.page.screenshot({ path: 'artifacts/pr5/desktop-native-home.png', fullPage: true });
    assert.deepEqual(desktop.pageErrors, [], `desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.consoleErrors, [], `desktop console errors: ${desktop.consoleErrors.join(' | ')}`);
    await desktop.context.close();

    const mobile = await openCheckedPage(browser, { width: 390, height: 844 });
    await assertNativeShell(mobile.page, 'mobile');
    assert.ok(await mobile.page.locator('.mobile-nav').count(), 'native mobile navigation must remain in the DOM');
    await (await visibleNav(mobile.page, 'play')).click();
    await mobile.page.waitForFunction(() => document.body.classList.contains('pr6-native-active'));
    await (await visibleNav(mobile.page, 'home')).click();
    await mobile.page.waitForFunction(() => !document.body.classList.contains('pr6-native-active'));
    await mobile.page.screenshot({ path: 'artifacts/pr5/mobile-native-home.png', fullPage: true });
    assert.deepEqual(mobile.pageErrors, [], `mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.consoleErrors, [], `mobile console errors: ${mobile.consoleErrors.join(' | ')}`);
    await mobile.context.close();

    console.log('Shell preservation smoke passed: original v4.1.0 presentation + PR6 handoffs on desktop/mobile');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
