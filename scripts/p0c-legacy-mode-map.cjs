const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:4173/';
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

async function dismissBlockingModal(page) {
  const modal = page.locator('#modalRoot .modal-backdrop');
  if (!(await modal.count()) || !(await modal.isVisible().catch(() => false))) return;
  await page.evaluate(() => { if (typeof closeModal === 'function') closeModal(); });
  await page.waitForFunction(() => !document.querySelector('#modalRoot .modal-backdrop'), null, { timeout: 5000 }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.TBC_PR6?.version === 'PR6.0', null, { timeout: 20000 });
    await page.waitForTimeout(650);
    await dismissBlockingModal(page);

    // Diagnostic only: expose the authoritative legacy Play page so we can map
    // exact existing targets. Certification never uses this hidden route.
    await page.evaluate(async () => {
      window.TBC_PR6?.deactivate?.();
      const norm = v => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const nav = document.querySelector('.pr5-native-nav') || document.querySelector('.nav');
      const target = [...(nav?.querySelectorAll('button,a[href],[role="button"]') || [])]
        .find(el => norm(el.textContent || el.getAttribute('aria-label')) === 'play');
      target?.click();
    });
    await page.waitForTimeout(800);

    const map = await page.evaluate(() => {
      const cleanHere = value => String(value || '').replace(/\s+/g, ' ').trim();
      const visible = el => {
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) !== 0 && r.width > 0 && r.height > 0;
      };
      const controls = [...document.querySelectorAll('button,a[href],[role="button"]')]
        .filter(el => !el.closest('[data-pr5-ui],[data-pr6-ui]'))
        .map((el, index) => ({
          index,
          text: cleanHere(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title')),
          visible: visible(el),
          tag: el.tagName,
          cls: String(el.className || ''),
          aria: el.getAttribute('aria-label') || '',
          title: el.getAttribute('title') || '',
          parent: cleanHere(el.closest('section,article,.panel,.card,.mode-card,.action-card,[class*="mode"],[class*="duel"],[class*="campaign"],[class*="expedition"]')?.innerText || '').slice(0, 500),
        }))
        .filter(x => /campaign|expedition|duel/i.test(`${x.text} ${x.cls} ${x.aria} ${x.title} ${x.parent}`));
      const allDuelNodes = [...document.querySelectorAll('*')]
        .filter(el => /duel/i.test(`${el.id || ''} ${el.className || ''} ${el.getAttribute?.('data-mode') || ''} ${el.getAttribute?.('data-action') || ''} ${el.textContent || ''}`))
        .slice(0, 80)
        .map(el => ({
          tag: el.tagName,
          id: el.id || '',
          cls: String(el.className || ''),
          text: cleanHere(el.textContent).slice(0, 220),
          visible: visible(el),
        }));
      return { title: document.querySelector('.topbar h1')?.textContent?.trim() || '', controls, allDuelNodes };
    });

    console.log('P0C LEGACY MODE MAP ' + JSON.stringify(map));

    for (const mode of ['Campaign', 'Expedition', 'Duel']) {
      const match = map.controls.filter(item => new RegExp(`^${mode}$`, 'i').test(item.text) && item.visible);
      console.log(`P0C ${mode.toUpperCase()} EXACT VISIBLE TARGETS: ${match.length}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error('P0C LEGACY MODE MAP FAILED');
  console.error(error);
  process.exit(1);
});
