const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE = 'http://127.0.0.1:4173/';
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

async function visibleClickableTexts(page) {
  return page.locator('button,a[href],[role="button"]').evaluateAll(nodes => nodes.filter(el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) !== 0 && r.width > 0 && r.height > 0;
  }).map(el => String(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
}

async function dismissBlockingModal(page) {
  const modal = page.locator('#modalRoot .modal-backdrop');
  if (!(await modal.count()) || !(await modal.isVisible())) return;
  const closedByApi = await page.evaluate(() => {
    if (typeof closeModal === 'function') {
      closeModal();
      return true;
    }
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

async function clickVisible(page, pattern) {
  const candidates = page.locator('button,a[href],[role="button"]').filter({ hasText: pattern });
  const count = await candidates.count();
  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i);
    if (await el.isVisible().catch(() => false)) {
      await el.click();
      await page.waitForTimeout(500);
      return true;
    }
  }
  return false;
}

async function clickNativeNav(page, label) {
  const clicked = await page.evaluate(target => {
    const norm = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const nav = document.querySelector('.pr5-native-nav') || document.querySelector('.nav');
    if (!nav) return false;
    const el = [...nav.querySelectorAll('button,a[href],[role="button"]')].find(node => norm(node.textContent || node.getAttribute('aria-label')) === target.toLowerCase());
    if (!el) return false;
    el.click();
    return true;
  }, label);
  assert.equal(clicked, true, `native ${label} route must remain present`);
  await page.waitForTimeout(650);
}

async function assertVisibleFeature(page, name, pattern) {
  const texts = await visibleClickableTexts(page);
  assert.ok(texts.some(text => pattern.test(text)), `${name} must remain visibly reachable; visible controls: ${texts.slice(0, 70).join(' | ')}`);
}

async function featureText(page) {
  return clean(await page.locator('body').innerText());
}

async function waitForFlow(page, flow, title) {
  await page.waitForFunction(expected => {
    const root = document.querySelector('.pr6-root:not([hidden])');
    return document.body.dataset.pr6Flow === expected.flow &&
      root?.querySelector('h2')?.textContent?.trim() === expected.title &&
      !root.querySelector('.pr6-loading');
  }, { flow, title }, { timeout: 8000 });
}

async function openFlow(page, flow, title) {
  await page.evaluate(id => window.TBC_PR6.open(id), flow);
  await waitForFlow(page, flow, title);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.getAttribute('data-pr5-foundation') === 'PR5.1', null, { timeout: 20000 });
    await page.waitForFunction(() => window.TBC_PR6?.version === 'PR6.0', null, { timeout: 20000 });
    await page.waitForSelector('.pr5-primary-nav', { state: 'attached', timeout: 20000 });
    await page.waitForTimeout(650);
    await dismissBlockingModal(page);
    await page.waitForTimeout(200);

    for (const label of ['Home','Play','Learn','Library']) {
      assert.equal(await page.locator(`.pr5-primary-nav [data-pr5-nav="${label.toLowerCase()}"]`).count(), 1, `${label} primary route must remain present`);
    }
    await assertVisibleFeature(page, 'Progress', /^Progress$/i);
    await assertVisibleFeature(page, 'Settings', /^Settings$/i);

    await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
    await waitForFlow(page, 'play', 'Play');
    await assertVisibleFeature(page, 'Quick Play', /Quick Play/i);
    await assertVisibleFeature(page, 'Focused Practice', /Focused Practice/i);
    await openFlow(page, 'quick', 'Quick Play');
    assert.ok(await page.locator('.pr6-root [data-pr6-action="quick-start"]').count(), 'Quick Play launch action must remain present');
    await openFlow(page, 'focused', 'Focused Practice');
    assert.ok(await page.locator('.pr6-root [data-pr6-book-search]').count(), 'Focused Practice book search must remain present');

    await page.locator('.pr5-primary-nav [data-pr5-nav="learn"]').click();
    await waitForFlow(page, 'learn', 'Learn');
    for (const [flow, title] of [['journey','Bible Journey'],['path','Learning Path'],['review','Adaptive Review']]) {
      await openFlow(page, flow, title);
      assert.equal(clean(await page.locator('.pr6-root h2').innerText()), title, `${title} must render`);
    }

    // Home may consolidate learning routes, but legacy reader access must remain player-facing.
    await page.locator('.pr5-primary-nav [data-pr5-nav="home"]').click();
    await page.waitForTimeout(450);
    await assertVisibleFeature(page, 'Quick Play home action', /Quick Play/i);
    const readerOnHome = (await visibleClickableTexts(page)).some(text => /Read Bible|Bible Reader/i.test(text));

    // Enter authoritative Play to verify modes not reconstructed by PR6.
    await page.evaluate(() => window.TBC_PR6?.deactivate?.());
    await clickNativeNav(page, 'Play');
    await assertVisibleFeature(page, 'Campaign', /Campaign/i);
    await assertVisibleFeature(page, 'Expedition', /Expedition/i);
    const duelOnPlay = (await visibleClickableTexts(page)).some(text => /\bDuel\b/i.test(text));

    // Library/collections must still render through the authoritative route.
    await page.evaluate(() => window.TBC_PR6?.deactivate?.());
    await clickNativeNav(page, 'Library');
    const libraryText = await featureText(page);
    assert.match(libraryText, /Library|Books/i, 'Library route must render library/book content');
    assert.match(libraryText, /Collection/i, 'Collections must remain reachable from Library');

    // Progress/mastery remains a reachable utility.
    const progressClicked = await clickVisible(page, /^Progress$/i);
    assert.equal(progressClicked, true, 'Progress utility must remain clickable');
    const progressText = await featureText(page);
    assert.match(progressText, /Progress|Mastery|Retention|Coverage/i, 'Progress route must expose progress/mastery information');

    // Settings and save-management surfaces remain reachable.
    const settingsClicked = await clickVisible(page, /^Settings$/i);
    assert.equal(settingsClicked, true, 'Settings utility must remain clickable');
    const settingsText = await featureText(page);
    assert.match(settingsText, /Settings/i, 'Settings route must render');
    const runtime = await page.evaluate(() => ({
      exportProgress: typeof window.exportProgress,
      saveQuizSession: typeof window.saveQuizSession,
      restoreQuizSession: typeof window.restoreQuizSession,
      importProgress: ['v213ImportProgress','v281ImportProgress','v296ImportProgress'].some(name => typeof window[name] === 'function'),
      fileInputs: document.querySelectorAll('input[type="file"]').length,
    }));
    assert.equal(runtime.exportProgress, 'function', 'exportProgress must remain callable');
    assert.equal(runtime.saveQuizSession, 'function', 'saveQuizSession must remain callable');
    assert.equal(runtime.restoreQuizSession, 'function', 'restoreQuizSession must remain callable');
    assert.equal(runtime.importProgress, true, 'progress import implementation must remain callable');
    assert.ok(runtime.fileInputs >= 1, 'file import surface must remain packaged');

    assert.equal(readerOnHome, true, 'Bible Reader must retain a visible player-facing entry point');
    assert.equal(duelOnPlay, true, 'Duel must retain a visible player-facing Play entry point');

    assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
    assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);

    console.log('P0C RUNTIME PASSED: Quick/Focused, Journey/Path/Review, Campaign, Expedition, Duel, Bible Reader, Library/Collections, Progress/Mastery, Settings, export/import, and session restoration remain reachable.');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error('P0C RUNTIME FAILED');
  console.error(error);
  process.exit(1);
});
