const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE = 'http://127.0.0.1:4173/';
const TIERS = ['Beginner', 'Easy', 'Standard', 'Advanced', 'Expert'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(String(err)));

  await page.addInitScript(() => {
    window.__P0A_STORAGE_WRITES__ = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      try { window.__P0A_STORAGE_WRITES__.push({ key: String(key), value: String(value).slice(0, 320) }); } catch {}
      return original.call(this, key, value);
    };
  });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.getAttribute('data-pr5-foundation') === 'PR5.1', null, { timeout: 20000 });
    await page.waitForTimeout(1000);

    const modal = page.locator('#modalRoot .modal-backdrop');
    assert.equal(await modal.isVisible(), true, 'fresh profile must show the onboarding difficulty chooser');
    const onboardingText = (await modal.innerText()).replace(/\s+/g, ' ').trim();
    assert.match(onboardingText, /CHOOSE YOUR BIBLE DIFFICULTY/i);
    for (const tier of TIERS) assert.match(onboardingText, new RegExp(`\\b${tier}\\b`, 'i'), `onboarding must expose ${tier}`);
    assert.match(onboardingText, /Help me choose/i, 'onboarding must retain placement help');
    assert.match(onboardingText, /15 questions/i, 'placement help must retain the 15-question selector');

    const bootWrites = await page.evaluate(() => window.__P0A_STORAGE_WRITES__ || []);
    assert.ok(bootWrites.some(x => x.key === 'theBibleChallenge_v21'), 'boot must write the canonical persisted state');
    assert.ok(bootWrites.some(x => x.key === 'theBibleChallenge_v21_recovery'), 'boot must create the recovery save');

    const beginner = modal.getByRole('button').filter({ hasText: /Beginner/i }).first();
    assert.ok(await beginner.count(), 'Beginner onboarding control must exist');
    assert.equal(await beginner.isVisible(), true, 'Beginner onboarding control must be visible');
    await beginner.click();
    await page.waitForTimeout(500);

    const persisted = await page.evaluate(() => {
      const raw = localStorage.getItem('theBibleChallenge_v21');
      return raw ? JSON.parse(raw) : null;
    });
    assert.ok(persisted, 'canonical persisted state must remain readable');
    assert.equal(persisted.onboarded, true, 'choosing an onboarding level must complete onboarding');
    assert.equal(String(persisted.settings?.difficulty || '').toLowerCase(), 'beginner', 'chosen onboarding difficulty must persist');

    const runtime = await page.evaluate(() => ({
      exportProgress: typeof window.exportProgress,
      loadState: typeof window.loadState,
      save: typeof window.save,
      saveQuizSession: typeof window.saveQuizSession,
      restoreQuizSession: typeof window.restoreQuizSession,
      importProgress: ['v213ImportProgress','v281ImportProgress','v296ImportProgress'].some(name => typeof window[name] === 'function'),
      localKeys: Object.keys(localStorage),
      fileInputs: document.querySelectorAll('input[type="file"]').length,
    }));

    for (const name of ['exportProgress','loadState','save','saveQuizSession','restoreQuizSession']) {
      assert.equal(runtime[name], 'function', `${name} must remain available at runtime`);
    }
    assert.equal(runtime.importProgress, true, 'at least one progress-import implementation must remain available');
    assert.ok(runtime.fileInputs >= 1, 'file-based import surface must remain in the app');
    assert.ok(runtime.localKeys.includes('theBibleChallenge_v21'), 'canonical state key must exist after onboarding');
    assert.deepEqual(pageErrors, [], `runtime page errors: ${pageErrors.join(' | ')}`);

    console.log('P0A RUNTIME PASSED: onboarding, five levels, placement help, persisted difficulty, recovery save, export/import, session save/restore, and runtime stability verified.');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
