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
  await page.waitForFunction(() => document.documentElement.getAttribute('data-pr5-foundation') === 'PR5.2-RESTORED', null, { timeout: 20000 });
  await page.waitForFunction(() => window.TBC_PR6?.version === 'PR6.0', null, { timeout: 20000 });
  await page.waitForSelector('[data-pr5-nav="play"]', { state: 'attached', timeout: 20000 });
  await page.waitForTimeout(600);
  await dismissBlockingModal(page);
  await page.waitForTimeout(200);
  return { context, page, pageErrors, consoleErrors };
}

async function waitForFinishedFlow(page, flow, title) {
  await page.waitForFunction(expected => {
    const root = document.querySelector('.pr6-root:not([hidden])');
    return document.body.dataset.pr6Flow === expected.flow &&
      document.body.classList.contains('pr6-native-active') &&
      root?.querySelector('h2')?.textContent?.trim() === expected.title &&
      !root?.querySelector('.pr6-loading');
  }, { flow, title }, { timeout: 7000 });
}

async function assertFlow(page, flow, title) {
  await page.locator(`.pr6-root [data-pr6-open="${flow}"]`).first().click();
  await waitForFinishedFlow(page, flow, title);
}

async function nativeContentVisible(page) {
  return page.evaluate(() => {
    const content = document.querySelector('.content');
    return Boolean(content && getComputedStyle(content).display !== 'none' && content.children.length > 0);
  });
}

(async () => {
  fs.mkdirSync('artifacts/pr6', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await openCheckedPage(browser, { width: 1440, height: 1000 });
    const page = desktop.page;

    await page.locator('.sidebar .nav [data-pr5-nav="play"]').first().click();
    await waitForFinishedFlow(page, 'play', 'Play');
    assert.equal(await page.locator('.pr6-root .pr6-intro-grid .pr6-flow-card').count(), 2, 'Play hub must expose Quick Play and Focused Practice');

    const visual = await page.locator('.pr6-flow-card.primary').evaluate(el => ({
      background: getComputedStyle(el).backgroundImage,
      shadow: getComputedStyle(el).boxShadow,
      color: getComputedStyle(el).color
    }));
    assert.match(visual.background, /gradient/i, 'PR6 primary cards must use the restored vibrant gradient language');
    assert.notEqual(visual.shadow, 'none', 'PR6 primary cards must retain visual depth');

    const audit = await page.evaluate(() => window.TBC_PR6.audit());
    assert.equal(audit.pass, true, `PR6 audit failed: ${JSON.stringify(audit)}`);

    await assertFlow(page, 'quick', 'Quick Play');
    assert.equal(await page.locator('.pr6-root [data-pr6-action="quick-start"]').count(), 1, 'Quick Play needs one verified launch action');
    await assertFlow(page, 'focused', 'Focused Practice');
    assert.equal(await page.locator('.pr6-root [data-pr6-book-search]').count(), 1, 'Focused Practice needs book search');
    assert.equal(await page.locator('.pr6-root [data-pr6-testament]').count(), 3, 'Focused Practice needs All/OT/NT filters');

    await page.locator('.sidebar .nav [data-pr5-nav="learn"]').first().click();
    await waitForFinishedFlow(page, 'learn', 'Learn');
    assert.equal(await page.locator('.pr6-root .pr6-intro-grid.three .pr6-flow-card').count(), 3, 'Learn hub must expose Journey, Path, and Review');
    await assertFlow(page, 'journey', 'Bible Journey');
    assert.equal(await page.locator('.pr6-root .pr6-roadmap > div').count(), 8, 'Bible Journey roadmap must show eight canonical sections');
    await assertFlow(page, 'path', 'Learning Path');
    assert.ok(await page.locator('.pr6-root .pr6-path-list').count(), 'Learning Path native list must render');
    await assertFlow(page, 'review', 'Adaptive Review');
    assert.equal(await page.locator('.pr6-root .pr6-review-loop > div').count(), 3, 'Adaptive Review must render retrieval loop');

    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(desktopOverflow <= 1, `PR6 desktop horizontal overflow: ${desktopOverflow}px`);
    await page.screenshot({ path: 'artifacts/pr6/desktop-adaptive-review-restored.png', fullPage: true });

    await page.locator('.sidebar .nav [data-pr5-nav="home"]').first().click();
    await page.waitForFunction(() => !document.body.classList.contains('pr6-native-active'), null, { timeout: 7000 });
    assert.equal(await nativeContentVisible(page), true, 'native v4.1.0 overview Home must recover after PR6 exit');

    assert.deepEqual(desktop.pageErrors, [], `desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.consoleErrors, [], `desktop console errors: ${desktop.consoleErrors.join(' | ')}`);
    await desktop.context.close();

    const mobile = await openCheckedPage(browser, { width: 390, height: 844 });
    const mobilePage = mobile.page;
    await mobilePage.locator('.mobile-nav [data-pr5-nav="learn"]').first().click();
    await waitForFinishedFlow(mobilePage, 'learn', 'Learn');
    await assertFlow(mobilePage, 'journey', 'Bible Journey');
    const mobileMetrics = await mobilePage.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      rootVisible: Boolean(document.querySelector('.pr6-root:not([hidden])')),
      subnavButtons: [...document.querySelectorAll('.pr6-subnav button')].map(el => el.getBoundingClientRect().height)
    }));
    assert.ok(mobileMetrics.overflow <= 1, `PR6 mobile horizontal overflow: ${mobileMetrics.overflow}px`);
    assert.equal(mobileMetrics.rootVisible, true, 'PR6 root must remain visible on mobile');
    assert.ok(mobileMetrics.subnavButtons.every(height => height >= 38), `PR6 mobile subnav target below design floor: ${mobileMetrics.subnavButtons.join(', ')}`);
    await mobilePage.screenshot({ path: 'artifacts/pr6/mobile-bible-journey-restored.png', fullPage: true });

    assert.deepEqual(mobile.pageErrors, [], `mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.consoleErrors, [], `mobile console errors: ${mobile.consoleErrors.join(' | ')}`);
    await mobile.context.close();

    const source = fs.readFileSync('assets/pr6-play-learning.js', 'utf8');
    const vibrant = fs.readFileSync('assets/pr6-vibrant.css', 'utf8');
    assert.equal(/localStorage\.setItem|sessionStorage\.setItem/.test(source), false, 'PR6 must not create competing persistence');
    assert.ok(vibrant.includes('var(--cyan)') && vibrant.includes('var(--gold)') && vibrant.includes('var(--indigo)'), 'PR6 vibrant skin must use original TBC color tokens');

    console.log('PR6 restoration smoke passed: all reconstructed flows, native navigation handoff, vibrant styling, responsive layout, and runtime errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
