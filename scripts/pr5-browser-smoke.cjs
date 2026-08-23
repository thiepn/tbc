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
  await page.waitForSelector('.sidebar .nav [data-pr5-nav="play"]', { state: 'attached', timeout: 20000 });
  await page.waitForTimeout(600);
  await dismissBlockingModal(page);
  await page.waitForTimeout(200);
  return { context, page, pageErrors, consoleErrors };
}

(async () => {
  fs.mkdirSync('artifacts/pr5', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await openCheckedPage(browser, { width: 1440, height: 1000 });
    const page = desktop.page;

    assert.equal(await page.locator('.pr5-home,.pr5-native-home,.pr5-primary-nav,.pr5-mobile-nav').count(), 0, 'PR5 must not replace native v4.1.0 UI');
    const nativeHome = await page.evaluate(() => {
      const content = document.querySelector('.content');
      return Boolean(content && getComputedStyle(content).display !== 'none' && content.children.length > 0);
    });
    assert.equal(nativeHome, true, 'native Home content must remain rendered');

    const visualState = await page.evaluate(() => ({
      auroraOpacity: Number.parseFloat(getComputedStyle(document.querySelector('.aurora')).opacity),
      grainOpacity: Number.parseFloat(getComputedStyle(document.querySelector('.grain')).opacity),
      sidebarBackground: getComputedStyle(document.querySelector('.sidebar')).backgroundImage,
      overflow: document.documentElement.scrollWidth - window.innerWidth
    }));
    assert.ok(visualState.auroraOpacity > 0, 'aurora must remain visible');
    assert.ok(visualState.grainOpacity > 0, 'grain must remain visible');
    assert.match(visualState.sidebarBackground, /gradient/i, 'native vibrant sidebar gradient must remain intact');
    assert.ok(visualState.overflow <= 1, `desktop horizontal overflow: ${visualState.overflow}px`);

    const themeState = await page.evaluate(() => {
      const body = document.body;
      const hadDark = body.classList.contains('dark');
      const hadContrast = body.classList.contains('contrast');
      body.classList.remove('contrast');
      body.classList.remove('dark');
      const lightBg = getComputedStyle(body).backgroundImage;
      const lightSurface = getComputedStyle(body).getPropertyValue('--surface').trim();
      body.classList.add('dark');
      const darkBg = getComputedStyle(body).backgroundImage;
      const darkSurface = getComputedStyle(body).getPropertyValue('--surface').trim();
      body.classList.toggle('dark', hadDark);
      body.classList.toggle('contrast', hadContrast);
      return { lightBg, darkBg, lightSurface, darkSurface };
    });
    assert.notEqual(themeState.lightBg, themeState.darkBg, 'native light/dark backgrounds must remain distinct');
    assert.notEqual(themeState.lightSurface, themeState.darkSurface, 'native light/dark surface tokens must remain distinct');

    await page.locator('.sidebar .nav [data-pr5-nav="play"]').first().click();
    await page.waitForFunction(() => document.body.classList.contains('pr6-native-active') && document.body.dataset.pr6Flow === 'play', null, { timeout: 7000 });
    await page.locator('.sidebar .nav [data-pr5-nav="home"]').first().click();
    await page.waitForFunction(() => !document.body.classList.contains('pr6-native-active'), null, { timeout: 7000 });
    const homeRecovered = await page.evaluate(() => {
      const content = document.querySelector('.content');
      return Boolean(content && getComputedStyle(content).display !== 'none' && content.children.length > 0);
    });
    assert.equal(homeRecovered, true, 'native Home must recover after leaving reconstructed Play');
    await page.screenshot({ path: 'artifacts/pr5/desktop-restored-home.png', fullPage: true });

    assert.deepEqual(desktop.pageErrors, [], `desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.consoleErrors, [], `desktop console errors: ${desktop.consoleErrors.join(' | ')}`);
    await desktop.context.close();

    const mobile = await openCheckedPage(browser, { width: 390, height: 844 });
    const mobilePage = mobile.page;
    const mobileMetrics = await mobilePage.evaluate(() => {
      const nav = document.querySelector('.mobile-nav');
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        navDisplay: nav ? getComputedStyle(nav).display : 'missing',
        targets: [...document.querySelectorAll('.mobile-nav [data-pr5-nav]')].map(el => el.getBoundingClientRect().height),
        replacementNav: Boolean(document.querySelector('.pr5-mobile-nav'))
      };
    });
    assert.notEqual(mobileMetrics.navDisplay, 'none', 'native mobile navigation must remain visible');
    assert.equal(mobileMetrics.replacementNav, false, 'replacement mobile navigation must not be injected');
    assert.ok(mobileMetrics.overflow <= 1, `mobile horizontal overflow: ${mobileMetrics.overflow}px`);
    assert.ok(mobileMetrics.targets.length >= 4, 'native mobile navigation must expose the main domains');
    assert.ok(mobileMetrics.targets.every(height => height >= 44), `mobile touch target below 44px: ${mobileMetrics.targets.join(', ')}`);
    await mobilePage.screenshot({ path: 'artifacts/pr5/mobile-restored-home.png', fullPage: true });

    assert.deepEqual(mobile.pageErrors, [], `mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.consoleErrors, [], `mobile console errors: ${mobile.consoleErrors.join(' | ')}`);
    await mobile.context.close();

    const shellSource = fs.readFileSync('assets/pr5-shell.js', 'utf8');
    const css = fs.readFileSync('assets/pr5-foundation.css', 'utf8');
    assert.equal(/localStorage|sessionStorage|STORAGE_KEY|PREF_KEY/.test(shellSource), false, 'PR5 bridge must not access persistence state');
    assert.equal(/\.aurora\s*,\s*\.grain\s*\{[^}]*opacity\s*:\s*0/i.test(css), false, 'PR5 must never hide ambient effects');
    assert.equal(/\.radiance\s*,\s*\.star\s*\{[^}]*animation\s*:\s*none/i.test(css), false, 'PR5 must never disable native hero animation');
    assert.equal(/(^|\n)\s*\.(sidebar|topbar|hero|btn|card)\b/m.test(css), false, 'PR5 compatibility CSS must not restyle native component classes');

    console.log('PR5 restoration smoke passed: native Home/nav, vibrant effects, theme switching, responsive layout, PR6 handoff, and runtime errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
