const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'certification/p0f-production-baseline.json'), 'utf8'));
const BASE = process.env.TBC_PRODUCTION_URL || baseline.productionUrl;
const ORIGIN = new URL(BASE).origin;

async function dismiss(page) {
  for (let attempt = 0; attempt < 8; attempt++) {
    await page.waitForTimeout(attempt === 0 ? 250 : 120);
    const visible = page.locator('#modalRoot .modal-backdrop:visible');
    if (await visible.count()) {
      const closed = await page.evaluate(() => {
        if (typeof closeModal === 'function') {
          closeModal();
          return true;
        }
        return false;
      });
      if (!closed) {
        const button = visible.getByRole('button', { name: /close|got it|continue|start|okay|ok|dismiss|not now|cancel/i }).last();
        if (await button.count()) await button.click({ force: true });
      }
    }
  }
  await page.waitForFunction(() => ![...document.querySelectorAll('#modalRoot .modal-backdrop')].some(el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }), null, { timeout: 5000 });
}

async function openCheckedPage(browser, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  const failedEssentialRequests = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('requestfailed', request => {
    try {
      const url = new URL(request.url());
      if (url.origin === ORIGIN && /\.(?:js|css|html)(?:$|\?)/i.test(url.pathname + url.search)) {
        failedEssentialRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText || 'failed'}`);
      }
    } catch {}
  });

  const url = new URL(BASE);
  url.searchParams.set('p0f-browser', `${label}-${Date.now()}`);
  const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  assert.ok(response && response.ok(), `${label} production document must return HTTP success`);
  await page.waitForFunction(() => window.TBC_PR6?.version === 'PR6.0' && window.TBC_P0C?.version === 'P0C.3', null, { timeout: 25000 });
  await page.waitForSelector('.pr5-primary-nav', { state: 'attached', timeout: 20000 });
  await dismiss(page);
  return { context, page, pageErrors, failedEssentialRequests };
}

async function openLearn(page, selector) {
  await dismiss(page);
  await page.locator(selector).click();
  await page.waitForFunction(() => document.body.dataset.pr6Flow === 'learn' && document.querySelector('.pr6-root:not([hidden])'), null, { timeout: 10000 });
  await dismiss(page);
}

(async () => {
  fs.mkdirSync('artifacts/p0f', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await openCheckedPage(browser, { width: 1440, height: 1000 }, 'desktop');
    const page = desktop.page;
    assert.equal(await page.locator('.pr5-primary-nav [data-pr5-nav]').count(), 4, 'production desktop primary navigation must retain four domains');
    assert.equal(await page.locator('.pr5-home').count(), 1, 'production Home reconstruction must render');
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(desktopOverflow <= 1, `production desktop horizontal overflow: ${desktopOverflow}px`);

    await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
    await page.waitForFunction(() => document.body.dataset.pr5Domain === 'play', null, { timeout: 10000 });
    await openLearn(page, '.pr5-primary-nav [data-pr5-nav="learn"]');
    await page.screenshot({ path: 'artifacts/p0f/production-desktop-learn.png', fullPage: true });
    assert.deepEqual(desktop.pageErrors, [], `production desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.failedEssentialRequests, [], `production desktop essential request failures: ${desktop.failedEssentialRequests.join(' | ')}`);
    await desktop.context.close();

    const mobile = await openCheckedPage(browser, { width: 390, height: 844 }, 'mobile');
    const mobilePage = mobile.page;
    const nav = await mobilePage.locator('.pr5-mobile-nav').evaluate(el => ({
      display: getComputedStyle(el).display,
      position: getComputedStyle(el).position
    }));
    assert.equal(nav.display, 'grid', 'production mobile navigation must be visible');
    assert.equal(nav.position, 'fixed', 'production mobile navigation must remain fixed');
    await openLearn(mobilePage, '.pr5-mobile-nav [data-pr5-nav="learn"]');
    const metrics = await mobilePage.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      cards: [...document.querySelectorAll('.pr6-root .pr6-flow-card,[data-p0c-feature]')].map(el => el.getBoundingClientRect().width),
      viewport: window.innerWidth,
      overlays: [...document.querySelectorAll('#modalRoot .modal-backdrop')].filter(el => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).length
    }));
    assert.ok(metrics.overflow <= 1, `production mobile horizontal overflow: ${metrics.overflow}px`);
    assert.ok(metrics.cards.every(width => width <= metrics.viewport), 'production cards must stay within mobile viewport');
    assert.equal(metrics.overlays, 0, 'production must not leave a blocking modal over the reconstructed flow');
    await mobilePage.screenshot({ path: 'artifacts/p0f/production-mobile-learn.png', fullPage: true });
    assert.deepEqual(mobile.pageErrors, [], `production mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.failedEssentialRequests, [], `production mobile essential request failures: ${mobile.failedEssentialRequests.join(' | ')}`);
    await mobile.context.close();

    console.log('P0F LIVE BROWSER PASSED: production GitHub Pages load, Play/Learn navigation, desktop/mobile containment, fixed mobile navigation, asset delivery, and runtime stability verified.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
