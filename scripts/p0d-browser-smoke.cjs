const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs=require('node:fs');
const BASE='http://127.0.0.1:4173/';

async function dismiss(page){
  for(let attempt=0;attempt<8;attempt++){
    await page.waitForTimeout(attempt===0?250:120);
    const visible=page.locator('#modalRoot .modal-backdrop:visible');
    if(await visible.count()){
      const closed=await page.evaluate(()=>{
        if(typeof closeModal==='function'){closeModal();return true;}
        return false;
      });
      if(!closed){
        const button=visible.getByRole('button',{name:/close|got it|continue|start|okay|ok|dismiss|not now|cancel/i}).last();
        if(await button.count())await button.click({force:true});
      }
    }
  }
  await page.waitForFunction(()=>![...document.querySelectorAll('#modalRoot .modal-backdrop')].some(el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
  }),null,{timeout:5000});
}
async function open(browser,viewport){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const pageErrors=[]; const consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.TBC_PR6?.version==='PR6.0'&&window.TBC_P0C?.version==='P0C.3',null,{timeout:20000});
  await page.waitForSelector('.pr5-primary-nav',{state:'attached',timeout:20000});
  await dismiss(page);
  return {context,page,pageErrors,consoleErrors};
}
async function openLearn(page,selector){
  await dismiss(page);
  await page.locator(selector).click();
  await page.waitForFunction(()=>document.body.dataset.pr6Flow==='learn'&&document.querySelector('.pr6-root:not([hidden])'),null,{timeout:7000});
  await dismiss(page);
}

(async()=>{
  fs.mkdirSync('artifacts/p0d',{recursive:true});
  const browser=await chromium.launch({headless:true});
  try{
    const desktop=await open(browser,{width:1440,height:1000});
    await openLearn(desktop.page,'.pr5-primary-nav [data-pr5-nav="learn"]');
    const base=await desktop.page.evaluate(()=>({overflow:document.documentElement.scrollWidth-window.innerWidth,head:getComputedStyle(document.querySelector('.pr6-page-head')).backgroundImage}));
    assert.ok(base.overflow<=1,`desktop overflow: ${base.overflow}px`);
    assert.match(base.head,/gradient/i,'PR6 hero must retain gradient visual identity');

    const dark=await desktop.page.evaluate(()=>{document.body.classList.add('dark');const el=document.querySelector('.pr6-root');return {color:getComputedStyle(el).color,bg:getComputedStyle(document.querySelector('.pr6-domain-rail')).backgroundColor};});
    assert.ok(dark.color&&dark.bg,'dark theme must compute reconstruction colors');

    const contrast=await desktop.page.evaluate(()=>{document.body.classList.remove('dark');document.body.classList.add('contrast');const h=getComputedStyle(document.querySelector('.pr6-page-head'));return {bg:h.backgroundColor,color:h.color,border:h.borderTopWidth};});
    assert.equal(contrast.bg,'rgb(0, 0, 0)','contrast hero background must be black');
    assert.equal(contrast.color,'rgb(255, 255, 255)','contrast hero text must be white');
    assert.notEqual(contrast.border,'0px','contrast hero needs explicit border');
    await desktop.page.screenshot({path:'artifacts/p0d/desktop-contrast.png',fullPage:true});
    assert.deepEqual(desktop.pageErrors,[],`desktop page errors: ${desktop.pageErrors.join(' | ')}`);
    assert.deepEqual(desktop.consoleErrors,[],`desktop console errors: ${desktop.consoleErrors.join(' | ')}`);
    await desktop.context.close();

    const mobile=await open(browser,{width:390,height:844});
    await openLearn(mobile.page,'.pr5-mobile-nav [data-pr5-nav="learn"]');
    const metrics=await mobile.page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-window.innerWidth,
      nav:getComputedStyle(document.querySelector('.pr5-mobile-nav')).position,
      cards:[...document.querySelectorAll('.pr6-root .pr6-flow-card,[data-p0c-feature]')].map(x=>x.getBoundingClientRect().width),
      viewport:window.innerWidth,
      overlays:[...document.querySelectorAll('#modalRoot .modal-backdrop')].filter(x=>{const s=getComputedStyle(x),r=x.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}).length
    }));
    assert.ok(metrics.overflow<=1,`mobile overflow: ${metrics.overflow}px`);
    assert.equal(metrics.nav,'fixed','mobile navigation must stay fixed');
    assert.ok(metrics.cards.every(w=>w<=metrics.viewport),'cards must stay within mobile viewport');
    assert.equal(metrics.overlays,0,'no blocking modal may remain after dismissal');
    await mobile.page.screenshot({path:'artifacts/p0d/mobile-learn.png',fullPage:true});
    assert.deepEqual(mobile.pageErrors,[],`mobile page errors: ${mobile.pageErrors.join(' | ')}`);
    assert.deepEqual(mobile.consoleErrors,[],`mobile console errors: ${mobile.consoleErrors.join(' | ')}`);
    await mobile.context.close();
    console.log('P0D browser smoke passed: palette inheritance, dark/contrast themes, desktop/mobile containment, fixed navigation, and deterministic overlay stability.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
