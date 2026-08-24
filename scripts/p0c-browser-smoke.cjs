const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE = 'http://127.0.0.1:4173/';

async function dismissBlockingModal(page) {
  for(let attempt=0;attempt<8;attempt++){
    await page.waitForTimeout(attempt===0?250:120);
    const modal = page.locator('#modalRoot .modal-backdrop:visible');
    if (!(await modal.count())) continue;
    const closedByApi = await page.evaluate(() => {
      if (typeof closeModal === 'function') { closeModal(); return true; }
      return false;
    });
    if (!closedByApi) {
      const preferred = modal.getByRole('button', { name: /close|got it|continue|start|okay|ok|dismiss|not now|cancel/i }).last();
      if (await preferred.count()) await preferred.click({force:true});
      else {
        const buttons = modal.getByRole('button');
        if (await buttons.count()) await buttons.last().click({force:true});
      }
    }
  }
  await page.waitForFunction(() => ![...document.querySelectorAll('#modalRoot .modal-backdrop')].some(el => {
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
  }), null, { timeout: 5000 });
}

async function openCheckedPage(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-pr5-foundation') === 'PR5.1', null, { timeout: 20000 });
  await page.waitForFunction(() => window.TBC_PR6?.version === 'PR6.0', null, { timeout: 20000 });
  await page.waitForFunction(() => window.TBC_P0C?.version === 'P0C.3', null, { timeout: 20000 });
  await page.waitForSelector('.pr5-primary-nav', { state: 'attached', timeout: 20000 });
  await dismissBlockingModal(page);
  return { context, page, pageErrors, consoleErrors };
}

async function waitForFlow(page, flow) {
  await page.waitForFunction(expected => {
    const root = document.querySelector('.pr6-root:not([hidden])');
    return document.body.dataset.pr6Flow === expected && Boolean(root) && !root.querySelector('.pr6-loading');
  }, flow, { timeout: 7000 });
}

async function assertNamedCards(page, section, names) {
  const root = page.locator(`[data-p0c-preserved="${section}"]`);
  await root.waitFor({ state: 'visible', timeout: 7000 });
  for (const name of names) {
    const card = root.locator(`[data-p0c-feature="${name}"]`);
    assert.equal(await card.count(), 1, `${section} preservation must expose ${name}`);
    assert.equal(await card.isVisible(), true, `${name} preservation card must be visible`);
  }
}

async function assertSingleVisible(page, selector, message) {
  const locator = page.locator(selector);
  assert.equal(await locator.count(), 1, `${message} must exist exactly once`);
  assert.equal(await locator.isVisible(), true, `${message} must be visible`);
}

async function assertPlayCoreIntact(page) {
  await assertSingleVisible(page, '.pr6-root:not([hidden]) [data-pr6-view] .pr6-intro-grid [data-pr6-action="quick-start"]', 'PR6 Quick Play hub action');
  await assertSingleVisible(page, '.pr6-root:not([hidden]) [data-pr6-view] .pr6-intro-grid [data-pr6-open="focused"]', 'PR6 Focused Practice hub card');
  await assertSingleVisible(page, '.pr6-root:not([hidden]) .pr6-subnav [data-pr6-open="quick"]', 'PR6 Quick Play sub-navigation route');
  await assertSingleVisible(page, '.pr6-root:not([hidden]) .pr6-subnav [data-pr6-open="focused"]', 'PR6 Focused Practice sub-navigation route');
}

async function assertLearnCoreIntact(page) {
  for (const flow of ['journey','path','review']) {
    await assertSingleVisible(page, `.pr6-root:not([hidden]) [data-pr6-view] .pr6-intro-grid [data-pr6-open="${flow}"]`, `PR6 ${flow} hub card`);
    await assertSingleVisible(page, `.pr6-root:not([hidden]) .pr6-subnav [data-pr6-open="${flow}"]`, `PR6 ${flow} sub-navigation route`);
  }
}

async function reopenLearn(page, navSelector) {
  await dismissBlockingModal(page);
  await page.locator(navSelector).click();
  await waitForFlow(page,'learn');
}

async function assertCollectionsLaunch(page) {
  const launched=await page.evaluate(()=>window.TBC_P0C.launch('collections'));
  assert.equal(launched,true,'Collections bridge must open the retained collection engine');
  const modal=page.locator('#modalRoot .modal-backdrop:visible');
  await modal.waitFor({state:'visible',timeout:5000});
  assert.ok(await modal.locator('.v24-collection-card').count()>=18,'Collections modal must render retained collection cards');
  const text=(await modal.innerText()).replace(/\s+/g,' ');
  assert.match(text,/22 collections match/i,'Collections modal must expose all 22 retained collections');
  assert.match(text,/Practice \d+/i,'Collections modal must retain practice actions');
  assert.match(text,/\bTest\b/i,'Collections modal must retain test actions');
  await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});
  await dismissBlockingModal(page);
}

async function assertRouteLaunch(page,key,pattern) {
  const launched=await page.evaluate(feature=>window.TBC_P0C.launch(feature),key);
  assert.equal(launched,true,`${key} bridge must launch through the current legacy route`);
  await page.waitForFunction(source=>{
    const re=new RegExp(source,'i');
    const title=document.querySelector('.topbar h1')?.textContent||'';
    const text=document.querySelector('.main')?.innerText||'';
    return re.test(title)||re.test(text);
  },pattern.source,{timeout:7000});
  assert.equal(await page.locator('.pr6-root:not([hidden])').count(),0,`${key} handoff must leave reconstructed PR6 while the legacy surface is active`);
  const visibleText=(await page.locator('.main').innerText()).replace(/\s+/g,' ');
  assert.match(visibleText,pattern,`${key} legacy surface must be visible`);
}

(async () => {
  fs.mkdirSync('artifacts/p0c', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await openCheckedPage(browser, { width: 1440, height: 1000 });
    const page = desktop.page;

    await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
    await waitForFlow(page, 'play');
    await assertNamedCards(page, 'play', ['duel','campaign','expedition']);
    await assertPlayCoreIntact(page);
    const preHandoff = await page.evaluate(() => window.TBC_PR6.audit());

    const campaignLaunched = await page.evaluate(() => window.TBC_P0C.launch('campaign'));
    assert.equal(campaignLaunched, true, 'Campaign bridge must hand off to the legacy mode');
    await page.waitForTimeout(150);
    await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
    await waitForFlow(page, 'play');
    const reentry = await page.evaluate(() => ({p0c:window.TBC_P0C.audit(),pr6:window.TBC_PR6.audit()}));
    assert.equal(reentry.p0c.pendingNativePrime, false, 'legacy handoff must clear the pending re-entry state before PR6 resumes');
    assert.equal(reentry.p0c.reentryGuard, true, 'P0C re-entry guard must be active');
    assert.equal(reentry.pr6.activeFlow, 'play', 'Campaign → Play re-entry must restore reconstructed Play');
    assert.equal(reentry.pr6.quickTarget, preHandoff.quickTarget, 'Campaign → Play must preserve Quick Play target availability');
    assert.equal(reentry.pr6.focusedTarget, preHandoff.focusedTarget, 'Campaign → Play must preserve Focused Practice target availability relative to the valid pre-handoff Play baseline');
    await assertNamedCards(page, 'play', ['duel','campaign','expedition']);
    await assertPlayCoreIntact(page);

    await page.locator('.pr5-primary-nav [data-pr5-nav="learn"]').click();
    await waitForFlow(page, 'learn');
    await assertNamedCards(page, 'learn', ['collections','library','progress']);
    await assertLearnCoreIntact(page);

    await assertCollectionsLaunch(page);
    await assertRouteLaunch(page,'library',/library|bible|book|chapter|reader/i);
    await reopenLearn(page,'.pr5-primary-nav [data-pr5-nav="learn"]');
    await assertNamedCards(page,'learn',['collections','library','progress']);
    await assertLearnCoreIntact(page);

    await assertRouteLaunch(page,'progress',/progress|mastery|coverage|retention|stats/i);
    await reopenLearn(page,'.pr5-primary-nav [data-pr5-nav="learn"]');
    await assertNamedCards(page,'learn',['collections','library','progress']);
    await assertLearnCoreIntact(page);

    const audit = await page.evaluate(() => window.TBC_P0C.audit());
    assert.equal(audit.pass, true, `P0C audit failed after Play + Learn discovery: ${JSON.stringify(audit)}`);
    for (const key of ['collections','library','progress','journey','path','review','duel','campaign','expedition']) {
      assert.equal(audit.features[key], true, `required preserved feature unavailable: ${key}`);
    }
    assert.ok(Object.prototype.hasOwnProperty.call(audit.storage, 'theBibleChallenge_v21'), 'canonical state key must be audited');
    assert.ok(Object.prototype.hasOwnProperty.call(audit.storage, 'theBibleChallenge_v21_recovery'), 'recovery state key must be audited');

    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(desktopOverflow <= 1, `P0C desktop horizontal overflow: ${desktopOverflow}px`);
    await page.screenshot({ path: 'artifacts/p0c/desktop-learn-preservation.png', fullPage: true });
    assert.deepEqual(desktop.pageErrors, [], `desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.consoleErrors, [], `desktop console errors: ${desktop.consoleErrors.join(' | ')}`);
    await desktop.context.close();

    const mobile = await openCheckedPage(browser, { width: 390, height: 844 });
    const mobilePage = mobile.page;
    await mobilePage.locator('.pr5-mobile-nav [data-pr5-nav="play"]').click();
    await waitForFlow(mobilePage, 'play');
    await assertNamedCards(mobilePage, 'play', ['duel','campaign','expedition']);
    await assertPlayCoreIntact(mobilePage);
    await mobilePage.locator('.pr5-mobile-nav [data-pr5-nav="learn"]').click();
    await waitForFlow(mobilePage, 'learn');
    await assertNamedCards(mobilePage, 'learn', ['collections','library','progress']);
    await assertLearnCoreIntact(mobilePage);

    const mobileMetrics = await mobilePage.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      cardWidths: [...document.querySelectorAll('[data-p0c-feature]')].map(el => el.getBoundingClientRect().width),
      viewport: window.innerWidth
    }));
    assert.ok(mobileMetrics.overflow <= 1, `P0C mobile horizontal overflow: ${mobileMetrics.overflow}px`);
    assert.ok(mobileMetrics.cardWidths.every(width => width <= mobileMetrics.viewport), 'P0C cards must fit mobile viewport');
    await mobilePage.screenshot({ path: 'artifacts/p0c/mobile-learn-preservation.png', fullPage: true });
    assert.deepEqual(mobile.pageErrors, [], `mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.consoleErrors, [], `mobile console errors: ${mobile.consoleErrors.join(' | ')}`);
    await mobile.context.close();

    const source = fs.readFileSync('assets/p0c-existing-feature-preservation.js', 'utf8');
    assert.equal(/localStorage\.setItem|sessionStorage\.setItem/.test(source), false, 'P0C must not write a competing persistence model');
    assert.ok(source.includes("'theBibleChallenge_v21'"), 'P0C must track the canonical v4.1.0 state contract');
    assert.equal(source.includes('tbc_v4_'), false, 'obsolete storage contracts must not return');

    console.log('P0C browser smoke passed: retained Collections engine, current Library and Progress routes, Journey, Learning Path, Adaptive Review, Duel, Campaign, Expedition, PR6 core Play/Learn surfaces, legacy re-entry preservation, canonical persistence, desktop/mobile access, and runtime stability.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
