const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE='http://127.0.0.1:4173/';

async function dismissBlockingModal(page){
  for(let attempt=0;attempt<8;attempt++){
    await page.waitForTimeout(attempt===0?250:120);
    const modal=page.locator('#modalRoot .modal-backdrop:visible');
    if(!(await modal.count()))continue;
    const closed=await page.evaluate(()=>{if(typeof closeModal==='function'){closeModal();return true}return false});
    if(!closed){
      const button=modal.getByRole('button',{name:/close|got it|continue|start|okay|ok|dismiss|not now|cancel/i}).last();
      if(await button.count())await button.click({force:true});
    }
  }
  await page.waitForFunction(()=>![...document.querySelectorAll('#modalRoot .modal-backdrop')].some(el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
  }),null,{timeout:5000});
}

async function openBase(browser,viewport){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const pageErrors=[];const consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.documentElement.getAttribute('data-pr5-foundation')==='PR5.1',null,{timeout:20000});
  await page.waitForFunction(()=>window.TBC_PR6?.version==='PR6.0'&&window.TBC_P0C?.version==='P0C.3',null,{timeout:20000});
  await page.waitForSelector('.pr5-primary-nav',{state:'attached',timeout:20000});
  await dismissBlockingModal(page);
  await page.waitForTimeout(200);
  return {context,page,pageErrors,consoleErrors};
}

async function injectStage(page){
  assert.equal(await page.evaluate(()=>Boolean(window.TBC_PR7)),false,'PR7 must not be loaded by the P0F production shell during P1A');
  assert.equal(await page.evaluate(()=>Boolean(window.TBC_PR7_COLLECTIONS)),false,'P1A Collections adapter must not be production-loaded');
  await page.addStyleTag({path:'assets/pr7-library-progress.css'});
  await page.addScriptTag({path:'assets/pr7-collections-adapter.js'});
  await page.addScriptTag({path:'assets/pr7-library-progress.js'});
  await page.waitForFunction(()=>window.TBC_PR7?.version==='P1A.1'&&window.TBC_PR7_COLLECTIONS?.version==='P1A.1',null,{timeout:5000});
  const before=await page.evaluate(()=>({
    audit:window.TBC_PR7.audit(),
    adapter:window.TBC_PR7_COLLECTIONS.audit(),
    rootHidden:document.querySelector('.pr7-root')?.hidden,
    stageActive:document.documentElement.hasAttribute('data-pr7-stage-active')
  }));
  assert.equal(before.audit.staged,true,'PR7 must identify itself as staged');
  assert.equal(before.audit.productionActive,false,'P1A must not claim production activation');
  assert.equal(before.audit.directStorageWrites,false,'P1A must declare legacy ownership of persistence');
  assert.equal(before.adapter.directStorageWrites,false,'Collections adapter must not own persistence');
  assert.equal(before.adapter.nativeControl,'.v24-show-more','Collections adapter must target the observed retained show-more control');
  assert.equal(before.audit.pass,true,`P1A prerequisite audit failed: ${JSON.stringify(before.audit)}`);
  assert.equal(before.rootHidden,true,'staged PR7 root must remain hidden until explicit activation');
  assert.equal(before.stageActive,false,'staged PR7 must not activate routing automatically');
  assert.equal(await page.evaluate(()=>window.TBC_PR7.activate()),true,'explicit P1A activation must succeed inside CI');
}

async function waitPr7(page,flow){
  await page.waitForFunction(expected=>{
    const root=document.querySelector('.pr7-root:not([hidden])');
    return document.body.dataset.pr7Flow===expected&&Boolean(root)&&!root.querySelector('.pr7-loading');
  },flow,{timeout:10000});
}
async function waitPr6(page,flow){
  await page.waitForFunction(expected=>document.body.dataset.pr6Flow===expected&&Boolean(document.querySelector('.pr6-root:not([hidden])')),flow,{timeout:10000});
}
async function canonicalHealth(page){
  return page.evaluate(()=>{
    const keys=['theBibleChallenge_v21','theBibleChallenge_v21_recovery'];
    const out={};
    for(const key of keys){
      const raw=localStorage.getItem(key);
      let valid=true;
      if(raw!==null){try{JSON.parse(raw)}catch{valid=false}}
      out[key]={present:raw!==null,valid,length:raw?.length||0};
    }
    out.obsoleteKeys=Object.keys(localStorage).filter(key=>key.startsWith('tbc_v4_'));
    return out;
  });
}
function assertCanonicalHealthy(before,after,label){
  for(const key of ['theBibleChallenge_v21','theBibleChallenge_v21_recovery']){
    assert.equal(after[key].valid,true,`${label}: ${key} must remain parseable when present`);
    if(before[key].present){
      assert.equal(after[key].present,true,`${label}: existing ${key} must not be removed`);
      assert.ok(after[key].length>16,`${label}: existing ${key} must not be reset to an empty/trivial payload`);
    }
  }
  assert.deepEqual(after.obsoleteKeys,[],`${label}: obsolete tbc_v4_ state keys must not be introduced`);
}

(async()=>{
  fs.mkdirSync('artifacts/p1a',{recursive:true});
  const browser=await chromium.launch({headless:true});
  try{
    const desktop=await openBase(browser,{width:1440,height:1000});
    const page=desktop.page;
    const stateBefore=await canonicalHealth(page);
    await injectStage(page);

    await page.evaluate(()=>window.TBC_PR7.open('library'));
    await waitPr7(page,'library');
    let audit=await page.evaluate(()=>window.TBC_PR7.audit());
    assert.equal(audit.bookCount,66,`staged Library must carry all 66 books, found ${audit.bookCount}`);
    assert.equal(await page.locator('.pr7-root [data-pr7-book]').count(),66,'Library view must expose 66 book shortcuts');
    assert.match((await page.locator('.pr7-root').innerText()).replace(/\s+/g,' '),/Bible Library.*66 available/i,'Library view must expose the complete Bible catalog');

    await page.locator('.pr7-root [data-pr7-open="collections"]').click();
    await waitPr7(page,'collections');
    audit=await page.evaluate(()=>window.TBC_PR7.audit());
    assert.equal(audit.collectionCount,22,`staged Collections must mirror all 22 retained collections, found ${audit.collectionCount}`);
    assert.equal(await page.locator('.pr7-root [data-pr7-collection]').count(),22,'Collections view must expose 22 collection shortcuts');

    await page.locator('.pr7-root [data-pr7-open="progress"]').click();
    await waitPr7(page,'progress');
    audit=await page.evaluate(()=>window.TBC_PR7.audit());
    assert.ok(audit.signalCount>=1,`Progress reconstruction must discover at least one retained signal, found ${audit.signalCount}`);
    const progressText=(await page.locator('.pr7-root').innerText()).replace(/\s+/g,' ');
    assert.match(progressText,/Progress.*Adaptive Review.*Focused Practice/i,'Progress view must connect retained signals to next-step practice');

    assertCanonicalHealthy(stateBefore,await canonicalHealth(page),'desktop staged browsing');

    await page.evaluate(()=>document.body.classList.add('dark'));
    const dark=await page.locator('.pr7-root').evaluate(el=>({color:getComputedStyle(el).color,bg:getComputedStyle(el.querySelector('.pr7-lead')).backgroundColor}));
    assert.ok(dark.color&&dark.bg,'dark theme must resolve PR7 colors');
    await page.evaluate(()=>{document.body.classList.remove('dark');document.body.classList.add('contrast')});
    const contrast=await page.locator('.pr7-page-head').evaluate(el=>({bg:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,border:getComputedStyle(el).borderTopWidth}));
    assert.equal(contrast.bg,'rgb(0, 0, 0)','contrast PR7 header must become black');
    assert.equal(contrast.color,'rgb(255, 255, 255)','contrast PR7 header text must become white');
    assert.notEqual(contrast.border,'0px','contrast PR7 header must keep a deterministic border');
    await page.evaluate(()=>document.body.classList.remove('contrast'));

    await page.locator('.pr7-root [data-pr7-pr6="review"]').first().click();
    await waitPr6(page,'review');
    assert.equal(await page.locator('.pr7-root:not([hidden])').count(),0,'PR7 must leave the surface when handing off to PR6 Adaptive Review');

    await page.locator('.pr5-primary-nav [data-pr5-nav="library"]').click();
    await waitPr7(page,'library');
    await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
    await waitPr6(page,'play');
    assert.equal(await page.locator('.pr7-root:not([hidden])').count(),0,'Play navigation must cleanly leave staged PR7');

    const desktopOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert.ok(desktopOverflow<=1,`P1A desktop horizontal overflow: ${desktopOverflow}px`);
    await page.locator('.pr5-primary-nav [data-pr5-nav="library"]').click();
    await waitPr7(page,'library');
    await page.screenshot({path:'artifacts/p1a/desktop-library.png',fullPage:true});
    assert.deepEqual(desktop.pageErrors,[],`P1A desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.consoleErrors,[],`P1A desktop console errors: ${desktop.consoleErrors.join(' | ')}`);
    await desktop.context.close();

    const mobile=await openBase(browser,{width:390,height:844});
    const mobilePage=mobile.page;
    const mobileStateBefore=await canonicalHealth(mobilePage);
    await injectStage(mobilePage);
    await mobilePage.locator('.pr5-mobile-nav [data-pr5-nav="library"]').click();
    await waitPr7(mobilePage,'library');
    audit=await mobilePage.evaluate(()=>window.TBC_PR7.audit());
    assert.equal(audit.bookCount,66,'mobile staged Library must carry all 66 books');
    const mobileMetrics=await mobilePage.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-window.innerWidth,
      navPosition:getComputedStyle(document.querySelector('.pr5-mobile-nav')).position,
      rootWidth:document.querySelector('.pr7-root').getBoundingClientRect().width,
      viewport:window.innerWidth,
      bookWidths:[...document.querySelectorAll('.pr7-root [data-pr7-book]')].map(el=>el.getBoundingClientRect().width)
    }));
    assert.ok(mobileMetrics.overflow<=1,`P1A mobile horizontal overflow: ${mobileMetrics.overflow}px`);
    assert.equal(mobileMetrics.navPosition,'fixed','existing mobile navigation must remain fixed during staged PR7');
    assert.ok(mobileMetrics.rootWidth<=mobileMetrics.viewport,'PR7 root must fit the mobile viewport');
    assert.ok(mobileMetrics.bookWidths.every(width=>width<=mobileMetrics.viewport),'PR7 book controls must fit the mobile viewport');

    await mobilePage.locator('.pr7-root [data-pr7-open="collections"]').click();
    await waitPr7(mobilePage,'collections');
    audit=await mobilePage.evaluate(()=>window.TBC_PR7.audit());
    assert.equal(audit.collectionCount,22,'mobile staged Collections must mirror all 22 retained collections');
    assertCanonicalHealthy(mobileStateBefore,await canonicalHealth(mobilePage),'mobile staged browsing');
    await mobilePage.screenshot({path:'artifacts/p1a/mobile-collections.png',fullPage:true});
    assert.deepEqual(mobile.pageErrors,[],`P1A mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.consoleErrors,[],`P1A mobile console errors: ${mobile.consoleErrors.join(' | ')}`);
    await mobile.context.close();

    console.log('P1A browser smoke passed: staged PR7 carries 66 books, expands and mirrors all 22 retained collections, reads Progress/Mastery signals, hands off to PR6, preserves canonical-state health, inherits themes, and remains desktop/mobile safe without production activation.');
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
