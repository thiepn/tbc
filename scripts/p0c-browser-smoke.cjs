const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE = 'http://127.0.0.1:4173/';
const STORAGE_KEY = 'theBibleChallenge_v21';

async function resolveBlockingModal(page) {
  const modal = page.locator('#modalRoot .modal-backdrop');
  if (!(await modal.count()) || !(await modal.isVisible())) return;
  const text = (await modal.innerText()).replace(/\s+/g, ' ').trim();

  if (/CHOOSE YOUR BIBLE DIFFICULTY/i.test(text)) {
    const standard = modal.getByRole('button').filter({ hasText: /^\s*Standard\b/i }).first();
    assert.ok(await standard.count(), 'P0C smoke setup must be able to complete onboarding');
    await standard.click();
    await page.waitForFunction(key => {
      try {
        const state = JSON.parse(localStorage.getItem(key));
        return state?.onboarded === true && String(state?.settings?.difficulty || '').toLowerCase() === 'standard';
      } catch { return false; }
    }, STORAGE_KEY, { timeout: 7000 });
    await page.waitForFunction(() => !document.querySelector('#modalRoot .modal-backdrop'), null, { timeout: 7000 });
    return;
  }

  const closedByApi = await page.evaluate(() => {
    if (typeof closeModal === 'function') { closeModal(); return true; }
    return false;
  });
  if (!closedByApi) {
    const preferred = modal.getByRole('button', { name: /close|got it|continue|start|okay|ok|dismiss|not now|cancel/i }).last();
    if (await preferred.count()) await preferred.click();
    else {
      const buttons = modal.getByRole('button');
      if (await buttons.count()) await buttons.last().click();
    }
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
  await page.waitForFunction(() => document.documentElement.getAttribute('data-pr5-foundation') === 'PR5.1', null, { timeout: 20000 });
  await page.waitForFunction(() => window.TBC_PR6?.version === 'PR6.0', null, { timeout: 20000 });
  await page.waitForFunction(() => window.TBC_P0C?.version === 'P0C.3', null, { timeout: 20000 });
  await page.waitForSelector('.pr5-primary-nav', { state: 'attached', timeout: 20000 });
  await page.waitForTimeout(650);
  await resolveBlockingModal(page);
  await page.waitForTimeout(250);
  return { context, page, pageErrors, consoleErrors };
}

async function waitForFlow(page, flow) {
  await page.waitForFunction(expected => {
    const root = document.querySelector('.pr6-root:not([hidden])');
    return document.body.dataset.pr6Flow === expected && Boolean(root) && !root.querySelector('.pr6-loading');
  }, flow, { timeout: 7000 });
}

async function assertNamedCards(page, section, names) {
  const root = page.locator(`[data-p0c-preserved="${section}"]`);
  await root.waitFor({ state: 'visible', timeout: 7000 });
  for (const name of names) {
    const card = root.locator(`[data-p0c-feature="${name}"]`);
    await card.waitFor({ state: 'visible', timeout: 7000 });
    assert.equal(await card.count(), 1, `${section} preservation must expose ${name}`);
  }
}

(async () => {
  fs.mkdirSync('artifacts/p0c', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await openCheckedPage(browser, { width: 1440, height: 1000 });
    const page = desktop.page;

    await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
    await waitForFlow(page, 'play');
    await assertNamedCards(page, 'play', ['duel','campaign','expedition']);

    const corePlayCards = await page.locator('.pr6-root [data-pr6-open="quick"], .pr6-root [data-pr6-open="focused"]').count();
    assert.equal(corePlayCards, 2, 'P0C must not replace PR6 Quick Play or Focused Practice');

    const campaignLaunched = await page.evaluate(() => window.TBC_P0C.launch('campaign'));
    assert.equal(campaignLaunched, true, 'Campaign bridge must hand off to the legacy mode');
    await page.waitForTimeout(150);
    await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
    await waitForFlow(page, 'play');
    const reentry = await page.evaluate(() => ({p0c:window.TBC_P0C.audit(),pr6:window.TBC_PR6.audit()}));
    assert.equal(reentry.p0c.pendingNativePrime, false, 'legacy handoff must be re-primed before PR6 resumes');
    assert.equal(reentry.p0c.reentryGuard, true, 'P0C re-entry guard must be active');
    assert.equal(reentry.pr6.focusedTarget, true, 'Play re-entry must restore the native focused-practice target');

    await page.locator('.pr5-primary-nav [data-pr5-nav="learn"]').click();
    await waitForFlow(page, 'learn');
    await assertNamedCards(page, 'learn', ['collections','library','progress']);

    const coreLearnCards = await page.locator('.pr6-root [data-pr6-open="journey"], .pr6-root [data-pr6-open="path"], .pr6-root [data-pr6-open="review"]').count();
    assert.equal(coreLearnCards, 3, 'P0C must not replace Journey, Learning Path, or Adaptive Review');

    const audit = await page.evaluate(() => window.TBC_P0C.audit());
    assert.equal(audit.pass, true, `P0C audit failed after Play + Learn discovery: ${JSON.stringify(audit)}`);
    for (const key of ['collections','library','progress','journey','path','review','duel','campaign','expedition']) {
      assert.equal(audit.features[key], true, `required preserved feature unavailable: ${key}`);
    }
    assert.ok(Object.prototype.hasOwnProperty.call(audit.storage, 'theBibleChallenge_v21'), 'canonical state key must be audited');
    assert.ok(Object.prototype.hasOwnProperty.call(audit.storage, 'theBibleChallenge_v21_recovery'), 'recovery state key must be audited');

    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(desktopOverflow <= 1, `P0C desktop horizontal overflow: ${desktopOverflow}px`);
    await page.screenshot({ path: 'artifacts/p0c/desktop-learn-preservation.png', fullPage: true });
    assert.deepEqual(desktop.pageErrors, [], `desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.consoleErrors, [], `desktop console errors: ${desktop.consoleErrors.join(' | ')}`);
    await desktop.context.close();

    const mobile = await openCheckedPage(browser, { width: 390, height: 844 });
    const mobilePage = mobile.page;
    await mobilePage.locator('.pr5-mobile-nav [data-pr5-nav="play"]').click();
    await waitForFlow(mobilePage, 'play');
    await assertNamedCards(mobilePage, 'play', ['duel','campaign','expedition']);
    await mobilePage.locator('.pr5-mobile-nav [data-pr5-nav="learn"]').click();
    await waitForFlow(mobilePage, 'learn');
    await assertNamedCards(mobilePage, 'learn', ['collections','library','progress']);

    const mobileMetrics = await mobilePage.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      cardWidths: [...document.querySelectorAll('[data-p0c-feature]')].map(el => el.getBoundingClientRect().width),
      viewport: window.innerWidth
    }));
    assert.ok(mobileMetrics.overflow <= 1, `P0C mobile horizontal overflow: ${mobileMetrics.overflow}px`);
    assert.ok(mobileMetrics.cardWidths.every(width => width <= mobileMetrics.viewport), 'P0C cards must fit mobile viewport');
    await mobilePage.screenshot({ path: 'artifacts/p0c/mobile-learn-preservation.png', fullPage: true });
    assert.deepEqual(mobile.pageErrors, [], `mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.consoleErrors, [], `mobile console errors: ${mobile.consoleErrors.join(' | ')}`);
    await mobile.context.close();

    const source = fs.readFileSync('assets/p0c-existing-feature-preservation.js', 'utf8');
    assert.equal(/localStorage\.setItem|sessionStorage\.setItem/.test(source), false, 'P0C must not write a competing persistence model');
    assert.ok(source.includes("'theBibleChallenge_v21'"), 'P0C must track the canonical v4.1.0 state contract');
    assert.equal(source.includes('tbc_v4_'), false, 'obsolete storage contracts must not return');

    console.log('P0C browser smoke passed: Collections, Library, Progress/Mastery, Journey, Learning Path, Adaptive Review, Duel, Campaign, Expedition, legacy re-entry, canonical persistence, desktop/mobile access, and runtime stability.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
