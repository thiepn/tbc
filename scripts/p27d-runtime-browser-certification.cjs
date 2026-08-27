#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE = process.env.TBC_BASE_URL || 'http://127.0.0.1:4173/';
const ARTIFACT_DIR = 'artifacts/p27d';
const CURRENT_NAV = [
  '.pr5-primary-nav [data-pr5-nav][aria-current="page"]',
  '.pr5-utility-nav [data-pr5-utility][aria-current="page"]',
  '.pr5-mobile-nav [data-pr5-nav][aria-current="page"]',
].join(', ');

async function dismissModal(page) {
  for (let i = 0; i < 8; i++) {
    const modal = page.locator('#modalRoot .modal-backdrop:visible');
    if (!(await modal.count())) return;
    const closed = await page.evaluate(() => typeof closeModal === 'function' ? (closeModal(), true) : false);
    if (!closed) {
      const preferred = modal.getByRole('button', { name: /close|got it|continue|start|okay|ok|dismiss|not now|cancel/i }).last();
      if (await preferred.count()) await preferred.click();
      else {
        const buttons = modal.getByRole('button');
        if (await buttons.count()) await buttons.last().click();
      }
    }
    await page.waitForTimeout(100);
  }
}

async function waitNavigationState(page) {
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].some(el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }), CURRENT_NAV, { timeout: 10000 });
}

async function openCandidate(browser, viewport, extra = {}) {
  const context = await browser.newContext({ viewport, ...extra });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() =>
    document.documentElement.getAttribute('data-pr5-foundation') === 'PR5.1' &&
    window.TBC_PR6?.version === 'PR6.0' &&
    window.TBC_P1B?.audit?.().ready === true,
  null, { timeout: 20000 });
  await dismissModal(page);
  await waitNavigationState(page);
  await page.waitForTimeout(100);
  return { context, page, pageErrors, consoleErrors };
}

async function waitPr6(page, flow) {
  await page.waitForFunction(expected =>
    document.body.dataset.pr6Flow === expected &&
    Boolean(document.querySelector('.pr6-root:not([hidden])')) &&
    !document.querySelector('.pr6-root:not([hidden]) .pr6-loading'),
  flow, { timeout: 10000 });
}

async function waitPr7(page, flow) {
  await page.waitForFunction(expected =>
    document.body.dataset.pr7Flow === expected &&
    Boolean(document.querySelector('.pr7-root:not([hidden])')) &&
    !document.querySelector('.pr7-root:not([hidden]) .pr7-loading'),
  flow, { timeout: 10000 });
}

async function runtimeAudit(page, label) {
  const audit = await page.evaluate(currentSelector => {
    const visible = el => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const accessibleName = el => (
      el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
      el.getAttribute('title') || el.getAttribute('alt') ||
      el.getAttribute('value') || el.textContent || ''
    ).replace(/\s+/g, ' ').trim();

    const ids = [...document.querySelectorAll('[id]')].map(el => el.id).filter(Boolean);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const unnamedControls = [...document.querySelectorAll('button,[role="button"],a[href]')]
      .filter(visible).filter(el => !el.closest('[aria-hidden="true"]')).filter(el => !accessibleName(el))
      .map(el => el.outerHTML.slice(0, 180));
    const missingAlt = [...document.querySelectorAll('img')]
      .filter(visible).filter(el => !el.hasAttribute('alt')).map(el => el.outerHTML.slice(0, 180));
    const visibleCurrent = [...document.querySelectorAll(currentSelector)].filter(visible).map(el => ({
      nav: el.dataset.pr5Nav || null,
      utility: el.dataset.pr5Utility || null,
    }));
    const storage = {};
    for (const key of ['theBibleChallenge_v21', 'theBibleChallenge_v21_recovery']) {
      const raw = localStorage.getItem(key);
      let valid = true;
      if (raw !== null) { try { JSON.parse(raw); } catch { valid = false; } }
      storage[key] = { present: raw !== null, valid, raw };
    }
    return {
      duplicateIds,
      unnamedControls,
      missingAlt,
      visibleCurrent,
      storage,
      obsolete: Object.keys(localStorage).filter(key => key.startsWith('tbc_v4_')),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      domain: document.body.dataset.pr5Domain || null,
      p1b: window.TBC_P1B?.audit?.() || null,
      pr6: window.TBC_PR6?.audit?.() || null,
    };
  }, CURRENT_NAV);

  assert.deepEqual(audit.duplicateIds, [], `${label}: duplicate DOM ids`);
  assert.deepEqual(audit.unnamedControls, [], `${label}: visible interactive controls without accessible names`);
  assert.deepEqual(audit.missingAlt, [], `${label}: visible images missing alt attributes`);
  assert.ok(audit.visibleCurrent.length >= 1, `${label}: visible navigation must expose aria-current for domain ${audit.domain}`);
  assert.ok(audit.overflow <= 1, `${label}: horizontal overflow ${audit.overflow}px`);
  assert.equal(audit.p1b?.ready, true, `${label}: P1B runtime must be ready`);
  assert.equal(audit.p1b?.pass, true, `${label}: P1B runtime audit must pass`);
  assert.equal(audit.pr6?.pass, true, `${label}: PR6 runtime audit must pass`);
  Object.entries(audit.storage).forEach(([key, value]) => assert.equal(value.valid, true, `${label}: ${key} must be valid JSON when present`));
  assert.deepEqual(audit.obsolete, [], `${label}: obsolete tbc_v4_ persistence keys must not exist`);
  return audit;
}

async function focusPrimaryByKeyboard(page, control, domain) {
  const order = ['home', 'play', 'learn', 'library'];
  const targetIndex = order.indexOf(domain);
  assert.ok(targetIndex >= 0, `${domain} must be a declared primary navigation domain`);

  const controls = page.locator('.pr5-primary-nav [data-pr5-nav]');
  assert.equal(await controls.count(), order.length, 'desktop primary navigation must expose four ordered controls');
  for (let index = 0; index < order.length; index++) {
    const item = controls.nth(index);
    assert.equal(await item.getAttribute('data-pr5-nav'), order[index], `primary navigation order mismatch at position ${index + 1}`);
    assert.ok(await item.evaluate(el => el.tabIndex >= 0), `${order[index]} primary navigation control must be tabbable`);
  }

  const anchor = page.locator('.pr5-primary-nav [data-pr5-nav="home"]');
  await anchor.focus();
  for (let step = 0; step < targetIndex; step++) await page.keyboard.press('Tab');
  assert.equal(await control.evaluate(el => document.activeElement === el), true, `${domain} navigation must be reachable from Home by forward Tab order`);
}

async function keyboardPrimaryRoute(page, domain, expectedFlow) {
  const control = page.locator(`.pr5-primary-nav [data-pr5-nav="${domain}"]`);
  assert.equal(await control.count(), 1, `desktop ${domain} navigation control must exist`);
  await focusPrimaryByKeyboard(page, control, domain);
  assert.equal(await control.evaluate(el => el.matches(':focus-visible')), true, `${domain} navigation must match :focus-visible after keyboard traversal`);
  const style = await control.evaluate(el => {
    const s = getComputedStyle(el);
    return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow };
  });
  assert.ok((style.outlineStyle !== 'none' && style.outlineWidth !== '0px') || style.boxShadow !== 'none', `${domain} keyboard focus must be visually detectable`);
  await page.keyboard.press('Enter');
  if (expectedFlow === 'pr6') await waitPr6(page, domain);
  if (expectedFlow === 'pr7') await waitPr7(page, domain);
}

function semanticState(raw) {
  const ignoredPaths = new Set([
    'goalMeta.clearReviewStart',
    'ui.playSection',
  ]);
  const walk = (value, path = '') => {
    if (Array.isArray(value)) return value.map((child, index) => walk(child, `${path}[${index}]`));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => {
        const childPath = path ? `${path}.${key}` : key;
        return !ignoredPaths.has(childPath) && !/(?:migrated|updated|saved|written|loaded)At$/i.test(key);
      })
      .map(([key, child]) => {
        const childPath = path ? `${path}.${key}` : key;
        return [key, walk(child, childPath)];
      }));
  };
  return walk(JSON.parse(raw));
}

function assertStoragePreserved(before, after, label) {
  const canonical = 'theBibleChallenge_v21';
  const recovery = 'theBibleChallenge_v21_recovery';

  assert.equal(after[canonical].valid, true, `${label}: canonical state must remain parseable after reload`);
  if (before[canonical].present) {
    assert.equal(after[canonical].present, true, `${label}: canonical state must remain present after reload`);
    assert.deepEqual(
      semanticState(after[canonical].raw),
      semanticState(before[canonical].raw),
      `${label}: canonical user state must survive passive reload outside the two certified boot-normalization fields and bookkeeping timestamps`,
    );
  }

  assert.equal(after[recovery].valid, true, `${label}: recovery snapshot must remain parseable after reload`);
  if (before[recovery].present) {
    assert.equal(after[recovery].present, true, `${label}: recovery snapshot must remain available after reload`);
  }
}

(async () => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { base: BASE, profiles: {}, completedAt: null };
  try {
    const desktop = await openCandidate(browser, { width: 1440, height: 1000 });
    const page = desktop.page;
    const initial = await runtimeAudit(page, 'desktop boot');

    await keyboardPrimaryRoute(page, 'play', 'pr6');
    assert.equal(await page.locator('.pr6-root .pr6-intro-grid .pr6-flow-card').count(), 2, 'Play hub must expose both primary play paths');
    await keyboardPrimaryRoute(page, 'learn', 'pr6');
    await page.locator('.pr6-root [data-pr6-open="journey"]').first().click();
    await waitPr6(page, 'journey');
    assert.equal(await page.locator('.pr6-root .pr6-roadmap > div').count(), 8, 'Bible Journey must retain eight sections');

    await keyboardPrimaryRoute(page, 'library', 'pr7');
    assert.equal(await page.locator('.pr7-root [data-pr7-book]').count(), 66, 'Library must expose all 66 books');
    await page.locator('.pr7-root [data-pr7-open="collections"]').click();
    await waitPr7(page, 'collections');
    assert.equal(await page.locator('.pr7-root [data-pr7-collection]').count(), 22, 'Collections must expose all 22 retained collections');

    await page.locator('.pr5-primary-nav [data-pr5-nav="library"]').click();
    await waitPr7(page, 'library');
    await page.locator('.pr7-root [data-pr7-open="progress"]').click();
    await waitPr7(page, 'progress');
    assert.match((await page.locator('.pr7-root').innerText()).replace(/\s+/g, ' '), /Progress.*Adaptive Review.*Focused Practice/i);

    await page.locator('[data-pr5-utility="settings"]').click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('body').getAttribute('data-pr5-domain'), 'settings', 'Settings must become the active domain');
    await page.locator('.pr5-primary-nav [data-pr5-nav="home"]').click();
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.pr5-home').count(), 1, 'Home must recover after whole-product navigation cycle');

    const beforeReload = (await runtimeAudit(page, 'desktop pre-reload')).storage;
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.TBC_P1B?.audit?.().ready === true, null, { timeout: 20000 });
    await dismissModal(page);
    await waitNavigationState(page);
    const afterReload = await runtimeAudit(page, 'desktop post-reload');
    assertStoragePreserved(beforeReload, afterReload.storage, 'desktop reload');
    await page.screenshot({ path: `${ARTIFACT_DIR}/desktop-final.png`, fullPage: true });
    assert.deepEqual(desktop.pageErrors, [], `desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.consoleErrors, [], `desktop console errors: ${desktop.consoleErrors.join(' | ')}`);
    report.profiles.desktop = { initial, final: afterReload };
    await desktop.context.close();

    const tablet = await openCandidate(browser, { width: 820, height: 1180 });
    const tabletAudit = await runtimeAudit(tablet.page, 'tablet boot');
    const tabletNav = await tablet.page.evaluate(() => ({
      desktop: getComputedStyle(document.querySelector('.pr5-primary-nav')).display,
      mobile: getComputedStyle(document.querySelector('.pr5-mobile-nav')).display,
    }));
    assert.ok(tabletNav.desktop !== 'none' || tabletNav.mobile !== 'none', 'tablet must retain a visible primary navigation surface');
    await tablet.page.screenshot({ path: `${ARTIFACT_DIR}/tablet-home.png`, fullPage: true });
    assert.deepEqual(tablet.pageErrors, [], `tablet page errors: ${tablet.pageErrors.join(' | ')}`);
    assert.deepEqual(tablet.consoleErrors, [], `tablet console errors: ${tablet.consoleErrors.join(' | ')}`);
    report.profiles.tablet = tabletAudit;
    await tablet.context.close();

    const mobile = await openCandidate(browser, { width: 390, height: 844 });
    const mobileAudit = await runtimeAudit(mobile.page, 'mobile boot');
    const mobileMetrics = await mobile.page.evaluate(() => ({
      navPosition: getComputedStyle(document.querySelector('.pr5-mobile-nav')).position,
      navTargets: [...document.querySelectorAll('.pr5-mobile-nav [data-pr5-nav]')].map(el => el.getBoundingClientRect().height),
    }));
    assert.equal(mobileMetrics.navPosition, 'fixed', 'mobile primary navigation must remain fixed');
    assert.ok(mobileMetrics.navTargets.every(height => height >= 44), `mobile primary touch target below 44px: ${mobileMetrics.navTargets.join(', ')}`);
    await mobile.page.locator('.pr5-mobile-nav [data-pr5-nav="library"]').click();
    await waitPr7(mobile.page, 'library');
    assert.equal(await mobile.page.locator('.pr7-root [data-pr7-book]').count(), 66, 'mobile Library must expose all 66 books');
    await mobile.page.screenshot({ path: `${ARTIFACT_DIR}/mobile-library.png`, fullPage: true });
    assert.deepEqual(mobile.pageErrors, [], `mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.consoleErrors, [], `mobile console errors: ${mobile.consoleErrors.join(' | ')}`);
    report.profiles.mobile = mobileAudit;
    await mobile.context.close();

    const reduced = await openCandidate(browser, { width: 1440, height: 1000 }, { reducedMotion: 'reduce' });
    assert.equal(await reduced.page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true, 'reduced-motion preference must be observable');
    const reducedAudit = await runtimeAudit(reduced.page, 'reduced-motion boot');
    assert.deepEqual(reduced.pageErrors, [], `reduced-motion page errors: ${reduced.pageErrors.join(' | ')}`);
    assert.deepEqual(reduced.consoleErrors, [], `reduced-motion console errors: ${reduced.consoleErrors.join(' | ')}`);
    report.profiles.reducedMotion = reducedAudit;
    await reduced.context.close();

    report.completedAt = new Date().toISOString();
    fs.writeFileSync(`${ARTIFACT_DIR}/runtime-browser-report.json`, `${JSON.stringify(report, null, 2)}\n`);
    console.log('P27D runtime/browser certification passed: whole-product routing, complete navigation semantics, ordered primary keyboard traversal/focus visibility, accessible control names, desktop/tablet/mobile containment, semantic passive-reload state preservation, reduced-motion boot, and zero runtime errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
