const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE = 'http://127.0.0.1:4173/';

async function openCheckedPage(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-pr5-foundation') === 'PR5.1', null, { timeout: 20000 });
  await page.waitForSelector('.pr5-primary-nav', { timeout: 20000 });
  await page.waitForTimeout(700);
  return { context, page, pageErrors, consoleErrors };
}

(async () => {
  fs.mkdirSync('artifacts/pr5', { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await openCheckedPage(browser, { width: 1440, height: 1000 });
    const { page } = desktop;

    assert.equal(await page.locator('.pr5-primary-nav [data-pr5-nav]').count(), 4, 'desktop primary nav must have four domains');
    assert.equal(await page.locator('.pr5-mobile-nav [data-pr5-nav]').count(), 4, 'mobile nav DOM must have four domains');
    assert.equal(await page.locator('.pr5-home').count(), 1, 'reconstructed Home must replace legacy Home');
    assert.match(await page.locator('.pr5-home h2').innerText(), /Know the Word/i);

    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(desktopOverflow <= 1, `desktop horizontal overflow: ${desktopOverflow}px`);

    await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('body').getAttribute('data-pr5-domain'), 'play');
    assert.equal(await page.locator('.pr5-home').count(), 0, 'Home shell must leave the DOM after entering Play');

    await page.locator('.pr5-primary-nav [data-pr5-nav="home"]').click();
    await page.waitForTimeout(700);
    assert.equal(await page.locator('body').getAttribute('data-pr5-domain'), 'home');
    assert.equal(await page.locator('.pr5-home').count(), 1, 'Home shell must reconstruct after returning Home');
    await page.screenshot({ path: 'artifacts/pr5/desktop-home.png', fullPage: true });

    assert.deepEqual(desktop.pageErrors, [], `desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.consoleErrors, [], `desktop console errors: ${desktop.consoleErrors.join(' | ')}`);
    await desktop.context.close();

    const mobile = await openCheckedPage(browser, { width: 390, height: 844 });
    const mobilePage = mobile.page;
    const mobileNavDisplay = await mobilePage.locator('.pr5-mobile-nav').evaluate(el => getComputedStyle(el).display);
    const sidebarDisplay = await mobilePage.locator('.sidebar').evaluate(el => getComputedStyle(el).display);
    assert.equal(mobileNavDisplay, 'grid', 'PR5 mobile nav must be visible at phone width');
    assert.equal(sidebarDisplay, 'none', 'desktop sidebar must be hidden at phone width');

    const mobileMetrics = await mobilePage.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      navHeights: [...document.querySelectorAll('.pr5-mobile-nav [data-pr5-nav]')].map(el => el.getBoundingClientRect().height),
      home: Boolean(document.querySelector('.pr5-home'))
    }));
    assert.ok(mobileMetrics.overflow <= 1, `mobile horizontal overflow: ${mobileMetrics.overflow}px`);
    assert.ok(mobileMetrics.navHeights.every(height => height >= 44), `mobile touch target below 44px: ${mobileMetrics.navHeights.join(', ')}`);
    assert.equal(mobileMetrics.home, true, 'Home must render on mobile');
    await mobilePage.screenshot({ path: 'artifacts/pr5/mobile-home.png', fullPage: true });

    assert.deepEqual(mobile.pageErrors, [], `mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.consoleErrors, [], `mobile console errors: ${mobile.consoleErrors.join(' | ')}`);
    await mobile.context.close();

    const shellSource = fs.readFileSync('assets/pr5-shell.js', 'utf8');
    assert.equal(/localStorage|sessionStorage|STORAGE_KEY|PREF_KEY/.test(shellSource), false, 'PR5 shell must not access persistence state');

    console.log('PR5 browser smoke passed: desktop + mobile shell, routing, Home, overflow, touch targets, and runtime errors');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
