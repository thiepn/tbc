const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const BASE='http://127.0.0.1:4173/';

async function dismissModal(page){
  for(let i=0;i<6;i++){
    await page.waitForTimeout(i?100:250);
    const visible=page.locator('#modalRoot .modal-backdrop:visible');
    if(!(await visible.count()))continue;
    await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});
  }
}
async function open(browser,viewport){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.TBC_P1B?.version==='P1B.0'&&window.TBC_P1B?.audit?.().ready===true,null,{timeout:20000});
  await dismissModal(page);
  return {context,page,pageErrors,consoleErrors};
}
async function waitPr7(page,flow){
  await page.waitForFunction(expected=>document.body.dataset.pr7Flow===expected&&Boolean(document.querySelector('.pr7-root:not([hidden])'))&&!document.querySelector('.pr7-root:not([hidden]) .pr7-loading'),flow,{timeout:10000});
}
async function waitPr6(page,flow){
  await page.waitForFunction(expected=>document.body.dataset.pr6Flow===expected&&Boolean(document.querySelector('.pr6-root:not([hidden])')),flow,{timeout:10000});
}
async function canonical(page){
  return page.evaluate(()=>{
    const out={};
    for(const key of ['theBibleChallenge_v21','theBibleChallenge_v21_recovery']){
      const raw=localStorage.getItem(key);let valid=true;
      if(raw!==null){try{JSON.parse(raw)}catch{valid=false}}
      out[key]={present:raw!==null,valid,length:raw?.length||0};
    }
    out.obsolete=Object.keys(localStorage).filter(k=>k.startsWith('tbc_v4_'));
    return out;
  });
}
function healthy(before,after,label){
  for(const key of ['theBibleChallenge_v21','theBibleChallenge_v21_recovery']){
    assert.equal(after[key].valid,true,`${label}: ${key} must remain parseable`);
    if(before[key].present){assert.equal(after[key].present,true,`${label}: ${key} must remain present`);assert.ok(after[key].length>16,`${label}: ${key} must not be reset`)}
  }
  assert.deepEqual(after.obsolete,[],`${label}: obsolete tbc_v4_ keys must not be introduced`);
}

(async()=>{
  fs.mkdirSync('artifacts/p1b',{recursive:true});
  const browser=await chromium.launch({headless:true});
  try{
    const desktop=await open(browser,{width:1440,height:1000});
    const page=desktop.page;
    const before=await canonical(page);
    let audit=await page.evaluate(()=>window.TBC_P1B.audit());
    assert.equal(audit.productionActive,true,'P1B must identify itself as production-active');
    assert.equal(audit.pass,true,`P1B boot audit failed: ${JSON.stringify(audit)}`);
    assert.equal(await page.locator('.pr7-root:not([hidden])').count(),0,'PR7 must not cover Home after production boot');

    await page.locator('.pr5-primary-nav [data-pr5-nav="library"]').click();
    await waitPr7(page,'library');
    let pr7=await page.evaluate(()=>window.TBC_PR7.audit());
    assert.equal(pr7.active,true,'Library must activate PR7');
    assert.equal(pr7.bookCount,66,'Library must expose all 66 books');
    assert.equal(await page.locator('.pr7-root [data-pr7-book]').count(),66,'Library must render 66 book shortcuts');

    await page.locator('.pr7-root [data-pr7-open="collections"]').click();
    await waitPr7(page,'collections');
    pr7=await page.evaluate(()=>window.TBC_PR7.audit());
    assert.equal(pr7.collectionCount,22,'Collections must mirror all 22 retained collections');
    assert.equal(await page.locator('.pr7-root [data-pr7-collection]').count(),22,'Collections must render 22 shortcuts');

    await page.locator('.pr7-root [data-pr7-open="progress"]').click();
    await waitPr7(page,'progress');
    pr7=await page.evaluate(()=>window.TBC_PR7.audit());
    assert.ok(pr7.signalCount>=1,'Progress must expose retained progress/mastery signals');
    assert.match((await page.locator('.pr7-root').innerText()).replace(/\s+/g,' '),/Progress.*Adaptive Review.*Focused Practice/i);

    await page.locator('.pr7-root [data-pr7-pr6="review"]').first().click();
    await waitPr6(page,'review');
    assert.equal(await page.locator('.pr7-root:not([hidden])').count(),0,'Adaptive Review handoff must hide PR7');

    await page.locator('.pr5-primary-nav [data-pr5-nav="library"]').click();
    await waitPr7(page,'library');
    await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
    await waitPr6(page,'play');
    await page.waitForTimeout(80);
    assert.equal(await page.locator('.pr7-root:not([hidden])').count(),0,'Play must cleanly leave PR7');
    assert.equal((await page.evaluate(()=>window.TBC_PR7.audit())).active,false,'Play handoff must deactivate PR7 routing');

    await page.locator('.pr5-primary-nav [data-pr5-nav="library"]').click();
    await waitPr7(page,'library');
    assert.equal((await page.evaluate(()=>window.TBC_PR7.audit())).active,true,'Trusted Library re-entry must reactivate PR7');

    healthy(before,await canonical(page),'desktop P1B');
    await page.evaluate(()=>document.body.classList.add('dark'));
    assert.ok(await page.locator('.pr7-root').evaluate(el=>getComputedStyle(el).color),'dark theme must resolve PR7 colors');
    await page.evaluate(()=>{document.body.classList.remove('dark');document.body.classList.add('contrast')});
    assert.equal(await page.locator('.pr7-page-head').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)','contrast header must be black');
    await page.evaluate(()=>document.body.classList.remove('contrast'));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert.ok(overflow<=1,`desktop horizontal overflow: ${overflow}px`);
    await page.screenshot({path:'artifacts/p1b/desktop-library.png',fullPage:true});
    assert.deepEqual(desktop.pageErrors,[],`desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.consoleErrors,[],`desktop console errors: ${desktop.consoleErrors.join(' | ')}`);
    await desktop.context.close();

    const mobile=await open(browser,{width:390,height:844});
    const mp=mobile.page,beforeMobile=await canonical(mp);
    await mp.locator('.pr5-mobile-nav [data-pr5-nav="library"]').click();
    await waitPr7(mp,'library');
    assert.equal(await mp.locator('.pr7-root [data-pr7-book]').count(),66,'mobile Library must render 66 books');
    const metrics=await mp.evaluate(()=>({overflow:document.documentElement.scrollWidth-window.innerWidth,nav:getComputedStyle(document.querySelector('.pr5-mobile-nav')).position,root:document.querySelector('.pr7-root').getBoundingClientRect().width,viewport:innerWidth}));
    assert.ok(metrics.overflow<=1,`mobile horizontal overflow: ${metrics.overflow}px`);
    assert.equal(metrics.nav,'fixed','mobile navigation must remain fixed');
    assert.ok(metrics.root<=metrics.viewport,'PR7 root must fit mobile viewport');
    await mp.locator('.pr7-root [data-pr7-open="collections"]').click();
    await waitPr7(mp,'collections');
    assert.equal(await mp.locator('.pr7-root [data-pr7-collection]').count(),22,'mobile Collections must render 22 shortcuts');
    healthy(beforeMobile,await canonical(mp),'mobile P1B');
    await mp.screenshot({path:'artifacts/p1b/mobile-collections.png',fullPage:true});
    assert.deepEqual(mobile.pageErrors,[],`mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.consoleErrors,[],`mobile console errors: ${mobile.consoleErrors.join(' | ')}`);
    await mobile.context.close();

    console.log('P1B browser certification passed: production PR7 boots safely, exposes 66 books / 22 collections / retained progress, hands off to PR6, re-enters correctly, preserves canonical state, themes, and desktop/mobile containment.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
