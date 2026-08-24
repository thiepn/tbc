const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:4173/';

async function dismissBlockingModal(page) {
  const modal = page.locator('#modalRoot .modal-backdrop');
  if (!(await modal.count()) || !(await modal.isVisible().catch(() => false))) return;
  await page.evaluate(() => { if (typeof closeModal === 'function') closeModal(); });
  await page.waitForFunction(() => !document.querySelector('#modalRoot .modal-backdrop'), null, { timeout: 5000 }).catch(() => {});
}

async function legacyPlay(page) {
  await page.evaluate(() => {
    window.TBC_PR6?.deactivate?.();
    const norm = v => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const nav = document.querySelector('.pr5-native-nav') || document.querySelector('.nav');
    const target = [...(nav?.querySelectorAll('button,a[href],[role="button"]') || [])]
      .find(el => norm(el.textContent || el.getAttribute('aria-label')) === 'play');
    target?.click();
  });
  await page.waitForTimeout(800);
}

async function snapshot(page, label) {
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
        parent: cleanHere(el.closest('section,article,.panel,.card,.mode-card,.action-card,[class*="mode"],[class*="duel"],[class*="campaign"],[class*="expedition"]')?.innerText || '').slice(0, 650),
      }))
      .filter(x => /quick play|campaign|expedition|duel/i.test(`${x.text} ${x.cls} ${x.aria} ${x.title} ${x.parent}`));
    const duelNodes = [...document.querySelectorAll('[id*="duel" i],[class*="duel" i],[data-mode*="duel" i],[data-action*="duel" i]')]
      .slice(0, 100)
      .map(el => ({
        tag: el.tagName,
        id: el.id || '',
        cls: String(el.className || ''),
        text: cleanHere(el.textContent).slice(0, 350),
        visible: visible(el),
      }));
    return { title: document.querySelector('.topbar h1')?.textContent?.trim() || '', controls, duelNodes };
  });
  console.log(`P0C ${label} MAP ` + JSON.stringify(map));
  return map;
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

    // Diagnostic only: hidden authoritative route is used for discovery, never certification.
    await legacyPlay(page);
    const initial = await snapshot(page, 'LEGACY PLAY');
    for (const mode of ['Campaign', 'Expedition']) {
      const exact = initial.controls.filter(item => new RegExp(`^${mode}$`, 'i').test(item.text) && item.visible);
      console.log(`P0C ${mode.toUpperCase()} EXACT VISIBLE TARGETS: ${exact.length}`);
    }

    const quick = page.locator('button,a[href],[role="button"]').filter({ hasText: /^Quick Play$/i }).filter({ visible: true }).first();
    if (await quick.count()) {
      await quick.click();
      await page.waitForTimeout(650);
    }
    const quickMap = await snapshot(page, 'LEGACY QUICK PLAY');
    const duelExact = quickMap.controls.filter(item => /^Duel$/i.test(item.text) && item.visible);
    const duelLike = quickMap.controls.filter(item => /duel/i.test(`${item.text} ${item.cls} ${item.aria} ${item.title} ${item.parent}`) && item.visible);
    console.log(`P0C DUEL EXACT VISIBLE TARGETS: ${duelExact.length}`);
    console.log('P0C DUEL-LIKE VISIBLE CONTROLS ' + JSON.stringify(duelLike));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error('P0C LEGACY MODE MAP FAILED');
  console.error(error);
  process.exit(1);
});
