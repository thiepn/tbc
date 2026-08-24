const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE = 'http://127.0.0.1:4173/';
const STORAGE_KEY = 'theBibleChallenge_v21';
const TIERS = ['Beginner', 'Easy', 'Standard', 'Advanced', 'Expert'];

const esc = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tierRe = tier => new RegExp(`^\\s*${esc(tier)}(?:\\s|$)`, 'i');

async function waitForShell(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-pr5-foundation') === 'PR5.1',
    null,
    { timeout: 20000 }
  );
  await page.waitForTimeout(400);
}

async function readState(page) {
  return page.evaluate(key => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, STORAGE_KEY);
}

async function onboardingModal(page) {
  const modal = page.locator('#modalRoot .modal-backdrop');
  await modal.waitFor({ state: 'visible', timeout: 15000 });
  return modal;
}

async function chooseOnboardingTier(page, tier) {
  const modal = await onboardingModal(page);
  const text = (await modal.innerText()).replace(/\s+/g, ' ').trim();
  assert.match(text, /CHOOSE YOUR BIBLE DIFFICULTY/i, 'fresh profile must open the difficulty onboarding');
  for (const expected of TIERS) {
    const control = modal.getByRole('button').filter({ hasText: tierRe(expected) }).first();
    assert.ok(await control.count(), `onboarding must expose ${expected}`);
    assert.equal(await control.isVisible(), true, `${expected} onboarding control must be visible`);
  }

  const target = modal.getByRole('button').filter({ hasText: tierRe(tier) }).first();
  await target.click();
  await page.waitForFunction(({ key, tierName }) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const state = JSON.parse(raw);
      return state?.onboarded === true && String(state?.settings?.difficulty || '').toLowerCase() === tierName.toLowerCase();
    } catch {
      return false;
    }
  }, { key: STORAGE_KEY, tierName: tier }, { timeout: 7000 });
}

async function verifyAllOnboardingChoices(browser) {
  for (const tier of TIERS) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));

    await waitForShell(page);
    await chooseOnboardingTier(page, tier);

    let state = await readState(page);
    assert.equal(state?.onboarded, true, `${tier}: onboarding flag must persist immediately`);
    assert.equal(String(state?.settings?.difficulty || '').toLowerCase(), tier.toLowerCase(), `${tier}: selected difficulty must persist immediately`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    state = await readState(page);
    assert.equal(state?.onboarded, true, `${tier}: onboarding flag must survive reload`);
    assert.equal(String(state?.settings?.difficulty || '').toLowerCase(), tier.toLowerCase(), `${tier}: selected difficulty must survive reload`);

    const chooserVisible = await page.locator('#modalRoot .modal-backdrop').filter({ hasText: /CHOOSE YOUR BIBLE DIFFICULTY/i }).isVisible().catch(() => false);
    assert.equal(chooserVisible, false, `${tier}: onboarding chooser must not reopen after completion`);
    assert.deepEqual(errors, [], `${tier}: page errors: ${errors.join(' | ')}`);
    await context.close();
  }
}

async function verifyPlacementHelp(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));

  await waitForShell(page);
  const modal = await onboardingModal(page);
  const before = (await modal.innerText()).replace(/\s+/g, ' ').trim();
  assert.match(before, /Help me choose/i, 'onboarding must retain the placement helper');
  assert.match(before, /15 questions/i, 'placement helper must remain a 15-question flow');

  const help = modal.getByRole('button').filter({ hasText: /Help me choose/i }).first();
  assert.ok(await help.count(), 'Help me choose control must exist');
  assert.equal(await help.isVisible(), true, 'Help me choose control must be visible');
  await help.click();
  await page.waitForTimeout(500);

  const activeModal = page.locator('#modalRoot .modal-backdrop');
  assert.equal(await activeModal.isVisible(), true, 'placement flow must remain visible after launch');
  const after = (await activeModal.innerText()).replace(/\s+/g, ' ').trim();
  assert.notEqual(after, before, 'Help me choose must transition into the placement flow');
  assert.match(after, /(?:question|placement|difficulty|level|1\s*\/\s*15|1\s+of\s+15)/i, 'placement flow must present placement/question UI');
  assert.deepEqual(errors, [], `placement flow page errors: ${errors.join(' | ')}`);
  await context.close();
}

async function visibleTierSet(page) {
  const visible = new Set();
  for (const tier of TIERS) {
    const candidates = page.getByText(tier, { exact: true });
    const count = await candidates.count();
    for (let i = 0; i < count; i++) {
      if (await candidates.nth(i).isVisible().catch(() => false)) {
        visible.add(tier);
        break;
      }
    }
  }
  return visible;
}

async function selectWithAllTiers(page) {
  const selects = page.locator('select');
  const count = await selects.count();
  for (let i = 0; i < count; i++) {
    const select = selects.nth(i);
    if (!(await select.isVisible().catch(() => false))) continue;
    const options = (await select.locator('option').allTextContents()).map(x => x.trim().toLowerCase());
    if (TIERS.every(tier => options.some(option => option === tier.toLowerCase() || option.includes(tier.toLowerCase())))) return select;
  }
  return null;
}

async function clickFirstVisible(page, patterns) {
  for (const pattern of patterns) {
    const candidates = page.locator('button, a[href], [role="button"]').filter({ hasText: pattern });
    const count = await candidates.count();
    for (let i = 0; i < count; i++) {
      const candidate = candidates.nth(i);
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click();
        await page.waitForTimeout(450);
        return true;
      }
    }

    const labelled = page.locator(`button[aria-label],button[title],[role="button"][aria-label],[role="button"][title]`);
    const labelledCount = await labelled.count();
    for (let i = 0; i < labelledCount; i++) {
      const candidate = labelled.nth(i);
      if (!(await candidate.isVisible().catch(() => false))) continue;
      const label = `${await candidate.getAttribute('aria-label') || ''} ${await candidate.getAttribute('title') || ''}`;
      if (pattern.test(label)) {
        await candidate.click();
        await page.waitForTimeout(450);
        return true;
      }
    }
  }
  return false;
}

async function locatePostOnboardingDifficultySurface(page) {
  let select = await selectWithAllTiers(page);
  let tiers = await visibleTierSet(page);
  if (select || tiers.size === TIERS.length) return { select, tiers, route: 'current view' };

  const routes = [
    { name: 'settings', patterns: [/^Settings$/i, /Preferences/i] },
    { name: 'play', patterns: [/^Play$/i] },
    { name: 'focused practice', patterns: [/Focused Practice/i, /Practice setup/i, /Choose (?:a )?focus/i] },
    { name: 'difficulty', patterns: [/Difficulty/i, /Level/i, /Tier/i] },
  ];

  for (const route of routes) {
    const clicked = await clickFirstVisible(page, route.patterns);
    if (!clicked) continue;
    select = await selectWithAllTiers(page);
    tiers = await visibleTierSet(page);
    if (select || tiers.size === TIERS.length) return { select, tiers, route: route.name };
  }

  return { select: null, tiers: await visibleTierSet(page), route: 'not found' };
}

async function setExpertFromVisibleControl(page, surface) {
  if (surface.select) {
    await surface.select.selectOption({ label: /Expert/i }).catch(async () => {
      const options = await surface.select.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, text: node.textContent || '' })));
      const expert = options.find(option => /expert/i.test(option.text));
      assert.ok(expert, 'difficulty select must contain Expert');
      await surface.select.selectOption(expert.value);
    });
  } else {
    const expertButton = page.getByRole('button').filter({ hasText: tierRe('Expert') });
    const expertRadio = page.getByRole('radio', { name: /Expert/i });
    const expertLabel = page.locator('label').filter({ hasText: tierRe('Expert') });
    if (await expertButton.count() && await expertButton.first().isVisible().catch(() => false)) await expertButton.first().click();
    else if (await expertRadio.count() && await expertRadio.first().isVisible().catch(() => false)) await expertRadio.first().check();
    else if (await expertLabel.count() && await expertLabel.first().isVisible().catch(() => false)) await expertLabel.first().click();
    else assert.fail('five-tier surface is visible but no usable Expert control was found');
  }

  await page.waitForFunction(key => {
    try {
      const raw = localStorage.getItem(key);
      return raw && String(JSON.parse(raw)?.settings?.difficulty || '').toLowerCase() === 'expert';
    } catch {
      return false;
    }
  }, STORAGE_KEY, { timeout: 7000 });
}

async function verifyPostOnboardingSelector(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));

  await waitForShell(page);
  await chooseOnboardingTier(page, 'Standard');
  await page.waitForTimeout(400);

  const surface = await locatePostOnboardingDifficultySurface(page);
  assert.ok(surface.select || surface.tiers.size === TIERS.length,
    `after onboarding, a reachable five-tier difficulty selector must remain available; found [${[...surface.tiers].join(', ')}] via ${surface.route}`);

  await setExpertFromVisibleControl(page, surface);
  let state = await readState(page);
  assert.equal(String(state?.settings?.difficulty || '').toLowerCase(), 'expert', 'post-onboarding difficulty change must persist');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(650);
  state = await readState(page);
  assert.equal(String(state?.settings?.difficulty || '').toLowerCase(), 'expert', 'post-onboarding difficulty change must survive reload');
  assert.deepEqual(errors, [], `post-onboarding selector page errors: ${errors.join(' | ')}`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await verifyAllOnboardingChoices(browser);
    await verifyPlacementHelp(browser);
    await verifyPostOnboardingSelector(browser);
    console.log('P0B PASSED: all five onboarding choices, placement help, reachable post-onboarding five-tier selector, difficulty changes, persistence, reload stability, and runtime errors verified.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error('P0B FAILED');
  console.error(error);
  process.exit(1);
});
