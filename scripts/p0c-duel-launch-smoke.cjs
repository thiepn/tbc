const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE='http://127.0.0.1:4173/';

async function open(browser,viewport){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const pageErrors=[];
  const consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.TBC_PR6?.version==='PR6.0'&&window.TBC_P0C?.version==='P0C.3',null,{timeout:20000});
  await page.waitForSelector('.pr5-primary-nav',{state:'attached',timeout:20000});
  await page.waitForTimeout(700);
  await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});
  return {context,page,pageErrors,consoleErrors};
}

async function verify(browser,viewport,mobile=false){
  const state=await open(browser,viewport);
  const {page}=state;
  const nav=mobile?'.pr5-mobile-nav [data-pr5-nav="play"]':'.pr5-primary-nav [data-pr5-nav="play"]';
  await page.locator(nav).click();
  await page.waitForFunction(()=>document.body.dataset.pr6Flow==='play'&&document.querySelector('.pr6-root:not([hidden])'),null,{timeout:7000});
  const cardSelector='[data-p0c-preserved="play"] [data-p0c-feature="duel"]';
  await page.waitForFunction(selector=>{
    const cards=[...document.querySelectorAll(selector)];
    const card=cards[0];
    return cards.length===1&&Boolean(card)&&card.checkVisibility()&&!card.disabled&&card.getAttribute('aria-disabled')!=='true';
  },cardSelector,{timeout:7000});
  const clicked=await page.evaluate(selector=>{
    const cards=[...document.querySelectorAll(selector)];
    if(cards.length!==1||cards[0].disabled||cards[0].getAttribute('aria-disabled')==='true')return false;
    cards[0].click(); return true;
  },cardSelector);
  assert.equal(clicked,true,'Duel preservation card must remain usable after the exact-one assertion');
  const modal=page.locator('#modalRoot .modal.v31-duel-shell');
  await modal.waitFor({state:'visible',timeout:5000});
  await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});

  const launched=await page.evaluate(()=>window.TBC_P0C.launch('duel'));
  assert.equal(launched,true,'P0C Duel bridge must resolve the canonical legacy entrypoint');
  await modal.waitFor({state:'visible',timeout:5000});
  const text=(await modal.innerText()).replace(/\s+/g,' ').trim();
  assert.match(text,/Duel/i,'Duel setup modal must render');
  assert.match(text,/Player 1|Resume/i,'Duel setup must expose a playable setup/resume surface');
  const audit=await page.evaluate(()=>window.TBC_P0C.audit());
  assert.equal(audit.features.duel,true,'P0C audit must report Duel available after direct launch');

  if(mobile){
    const metrics=await modal.evaluate(el=>({width:el.getBoundingClientRect().width,viewport:window.innerWidth}));
    assert.ok(metrics.width<=metrics.viewport,`Duel modal must fit mobile viewport: ${metrics.width}px > ${metrics.viewport}px`);
  }

  await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});
  assert.deepEqual(state.pageErrors,[],`Duel page errors: ${state.pageErrors.join(' | ')}`);
  assert.deepEqual(state.consoleErrors,[],`Duel console errors: ${state.consoleErrors.join(' | ')}`);
  await state.context.close();
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    await verify(browser,{width:1440,height:1000},false);
    await verify(browser,{width:390,height:844},true);
    console.log('P0C Duel launch smoke passed: canonical v31OpenDuelSetup bridge, desktop/mobile setup modal, audit availability, and runtime stability verified.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
