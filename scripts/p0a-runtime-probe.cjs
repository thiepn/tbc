const { chromium } = require('playwright');
const fs = require('node:fs');

const BASE = 'http://127.0.0.1:4173/';
const TIER = /^(Beginner|Easy|Standard|Advanced|Expert)$/i;
const TRANSFER = /export|import|backup|restore|download|upload|transfer|save data|load data/i;

function compact(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function sourceContext(term) {
  const source = fs.readFileSync('index.html', 'utf8');
  const index = source.indexOf(term);
  if (index < 0) return '(not found)';
  return compact(source.slice(Math.max(0, index - 220), Math.min(source.length, index + term.length + 320)), 700);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));

  await page.addInitScript(() => {
    window.__P0A_STORAGE_WRITES__ = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      try { window.__P0A_STORAGE_WRITES__.push({ key: String(key), value: String(value).slice(0, 240) }); } catch {}
      return original.call(this, key, value);
    };
  });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const modal = page.locator('#modalRoot .modal-backdrop');
    console.log(`modal immediately after DOMContentLoaded: ${await modal.isVisible().catch(() => false)}`);
    if (await modal.count()) console.log(`early modal text: ${compact(await modal.innerText())}`);

    await page.waitForFunction(() => document.documentElement.getAttribute('data-pr5-foundation') === 'PR5.1', null, { timeout: 20000 });
    await page.waitForTimeout(1000);

    console.log(`first-run modal visible after shell boot: ${await modal.isVisible().catch(() => false)}`);
    if (await modal.count()) console.log(`first-run modal: ${compact(await modal.innerText())}`);

    const storageWrites = await page.evaluate(() => window.__P0A_STORAGE_WRITES__ || []);
    console.log(`storage writes during boot: ${JSON.stringify(storageWrites)}`);
    console.log(`introduced source context: ${sourceContext('theBibleChallenge_v30_introduced')}`);

    const onboardingGlobals = await page.evaluate(() => Object.getOwnPropertyNames(window)
      .filter(name => /onboard|introduc|first.*run|difficulty|level|tier/i.test(name))
      .sort());
    console.log(`runtime onboarding/level globals: ${JSON.stringify(onboardingGlobals)}`);

    const relevantControls = await page.locator('button,[role="button"],label,a').evaluateAll((els) =>
      els.map(el => ({
        text: (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim(),
        visible: Boolean(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
      })).filter(x => /beginner|easy|standard|advanced|expert|difficulty|level|tier|welcome|start here|onboard/i.test(x.text))
    );
    console.log(`onboarding/level controls: ${JSON.stringify(relevantControls.slice(0, 40))}`);

    const tierInfo = relevantControls.filter(x => TIER.test(x.text));
    console.log(`tier controls: ${JSON.stringify(tierInfo)}`);

    const storageBefore = await page.evaluate(() => ({
      local: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])),
      session: Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)])),
    }));
    console.log(`storage before tier interaction: local=${Object.keys(storageBefore.local).length}, session=${Object.keys(storageBefore.session).length}`);

    const tierButtons = page.getByRole('button').filter({ hasText: TIER });
    let clickedTier = false;
    for (let i = 0; i < await tierButtons.count(); i += 1) {
      const b = tierButtons.nth(i);
      const text = compact(await b.innerText());
      if (TIER.test(text) && await b.isVisible()) {
        await b.click();
        clickedTier = true;
        console.log(`clicked tier control: ${text}`);
        break;
      }
    }
    if (clickedTier) await page.waitForTimeout(350);

    const storageAfter = await page.evaluate(() => ({
      local: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])),
      session: Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)])),
    }));
    console.log(`storage after tier interaction: local=${Object.keys(storageAfter.local).length}, session=${Object.keys(storageAfter.session).length}`);
    console.log(`local keys: ${Object.keys(storageAfter.local).join(', ') || '(none)'}`);

    if (await modal.isVisible().catch(() => false)) {
      const close = modal.getByRole('button', { name: /continue|start|done|close|got it|ok|okay|not now|skip/i }).last();
      if (await close.count()) await close.click().catch(() => {});
      if (await modal.isVisible().catch(() => false)) {
        await page.evaluate(() => { if (typeof closeModal === 'function') closeModal(); });
      }
      await page.waitForTimeout(250);
    }

    const settings = page.locator('.pr5-utility-link').filter({ hasText: /Settings/i }).first();
    if (await settings.count() && await settings.isVisible()) {
      await settings.click();
      await page.waitForTimeout(700);
    }

    const actionLabels = await page.locator('button,a,[role="button"],label').evaluateAll((els) =>
      els.map(el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
    const transferLabels = [...new Set(actionLabels.filter(x => TRANSFER.test(x)))];
    console.log(`transfer controls: ${JSON.stringify(transferLabels)}`);
    console.log(`file inputs: ${await page.locator('input[type="file"]').count()}`);

    const runtimeGlobals = await page.evaluate(() => Object.getOwnPropertyNames(window)
      .filter(name => /save|load|export|import|backup|restore|persist|storage/i.test(name)).sort());
    console.log(`runtime persistence globals: ${JSON.stringify(runtimeGlobals)}`);
    console.log(`page errors: ${JSON.stringify(errors)}`);
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
