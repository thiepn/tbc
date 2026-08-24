#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const URL = process.env.TBC_URL || 'http://127.0.0.1:4173/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.TBC_PR6?.open), null, { timeout: 20000 });

    await page.evaluate(() => window.TBC_PR6.open('play'));
    await page.locator('.pr6-root:not([hidden]) .pr6-page-head').waitFor({ state: 'visible', timeout: 15000 });

    await page.evaluate(() => {
      const s = document.body.style;
      s.setProperty('--surface', 'rgb(1, 2, 3)');
      s.setProperty('--surface2', 'rgb(4, 5, 6)');
      s.setProperty('--text', 'rgb(7, 8, 9)');
      s.setProperty('--muted', 'rgb(10, 11, 12)');
      s.setProperty('--line', 'rgb(13, 14, 15)');
      s.setProperty('--indigo', 'rgb(40, 70, 220)');
      s.setProperty('--cyan', 'rgb(20, 180, 190)');
      s.setProperty('--gold', 'rgb(220, 170, 40)');
      s.setProperty('--violet', 'rgb(130, 70, 210)');
      s.setProperty('--shadow', '0 8px 24px rgba(0,0,0,.2)');
      s.setProperty('--shadow-sm', '0 3px 10px rgba(0,0,0,.12)');
    });

    const themed = await page.evaluate(() => {
      const head = document.querySelector('.pr6-page-head');
      const copy = head?.querySelector('p');
      const active = document.querySelector('.pr6-domain-rail button.active');
      const primary = document.querySelector('.pr6-button.primary');
      return {
        headColor: getComputedStyle(head).color,
        copyColor: getComputedStyle(copy).color,
        activeColor: active ? getComputedStyle(active).color : null,
        primaryColor: primary ? getComputedStyle(primary).color : null,
        headBackground: getComputedStyle(head).backgroundImage,
      };
    });

    assert.equal(themed.headColor, 'rgb(7, 8, 9)', 'PR6 heading must inherit --text');
    assert.equal(themed.copyColor, 'rgb(10, 11, 12)', 'PR6 heading copy must inherit --muted');
    assert.equal(themed.activeColor, 'rgb(7, 8, 9)', 'active rail control must inherit --text');
    if (themed.primaryColor) assert.equal(themed.primaryColor, 'rgb(7, 8, 9)', 'primary controls must inherit --text');
    assert.match(themed.headBackground, /gradient/i, 'normal themes retain the legacy accent treatment');

    await page.evaluate(() => document.body.classList.add('contrast'));
    const contrast = await page.evaluate(() => {
      const head = document.querySelector('.pr6-page-head');
      const after = getComputedStyle(head, '::after');
      const style = getComputedStyle(head);
      return {
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        color: style.color,
        boxShadow: style.boxShadow,
        decorationDisplay: after.display,
      };
    });
    assert.equal(contrast.backgroundImage, 'none', 'contrast mode must remove decorative gradients');
    assert.equal(contrast.backgroundColor, 'rgb(1, 2, 3)', 'contrast mode must use the active surface token');
    assert.equal(contrast.color, 'rgb(7, 8, 9)', 'contrast mode must use active text token');
    assert.equal(contrast.boxShadow, 'none', 'contrast mode must remove decorative shadow');
    assert.equal(contrast.decorationDisplay, 'none', 'contrast mode must remove decorative ring pseudo-element');

    await page.evaluate(() => document.body.classList.remove('contrast'));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    const mobile = await page.evaluate(() => {
      const nav = document.querySelector('.pr5-mobile-nav');
      const navStyle = nav ? getComputedStyle(nav) : null;
      return {
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        mobileNav: Boolean(nav),
        mobileNavPosition: navStyle?.position || null,
      };
    });
    assert.ok(mobile.scrollWidth <= mobile.viewport + 2, `mobile layout overflows horizontally: ${mobile.scrollWidth}px > ${mobile.viewport}px`);
    assert.equal(mobile.mobileNav, true, 'mobile navigation must remain present');
    assert.equal(mobile.mobileNavPosition, 'fixed', 'mobile navigation must remain fixed');

    assert.deepEqual(pageErrors, [], `uncaught browser errors: ${pageErrors.join(' | ')}`);
    console.log('P0D RUNTIME PASSED');
    console.log(JSON.stringify({ themed, contrast, mobile }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error('P0D RUNTIME FAILED');
  console.error(error);
  process.exit(1);
});
