const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:4173/';
const TIER = /^(Beginner|Easy|Standard|Advanced|Expert)$/i;
const TRANSFER = /export|import|backup|restore|download|upload|transfer|save data|load data/i;

function compact(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.getAttribute('data-pr5-foundation') === 'PR5.1', null, { timeout: 20000 });
    await page.waitForTimeout(1000);

    const modal = page.locator('#modalRoot .modal-backdrop');
    console.log(`first-run modal visible: ${await modal.isVisible().catch(() => false)}`);
    if (await modal.count()) console.log(`first-run modal: ${compact(await modal.innerText())}`);

    const tierInfo = await page.locator('button,[role="button"],label').evaluateAll((els) =>
      els.map(el => ({ text: (el.textContent || '').replace(/\s+/g, ' ').trim(), visible: Boolean(el.offsetWidth || el.offsetHeight || el.getClientRects().length) }))
        .filter(x => /^(Beginner|Easy|Standard|Advanced|Expert)$/i.test(x.text))
    );
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
    console.log(`session keys: ${Object.keys(storageAfter.session).join(', ') || '(none)'}`);

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
      els.map(el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    );
    const transferLabels = [...new Set(actionLabels.filter(x => /export|import|backup|restore|download|upload|transfer|save data|load data/i.test(x)))];
    console.log(`transfer controls: ${JSON.stringify(transferLabels)}`);
    console.log(`file inputs: ${await page.locator('input[type="file"]').count()}`);

    const runtimeGlobals = await page.evaluate(() => Object.getOwnPropertyNames(window)
      .filter(name => /save|load|export|import|backup|restore|persist|storage/i.test(name))
      .sort());
    console.log(`runtime persistence globals: ${JSON.stringify(runtimeGlobals)}`);

    const bodyText = compact(await page.locator('body').innerText(), 2000);
    const transferText = bodyText.split(/(?=[A-Z])/).filter(x => TRANSFER.test(x)).slice(0, 12);
    console.log(`runtime transfer text samples: ${JSON.stringify(transferText)}`);
    console.log(`page errors: ${JSON.stringify(errors)}`);
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
