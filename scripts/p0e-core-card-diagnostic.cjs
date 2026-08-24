const { chromium } = require('playwright');
const BASE='http://127.0.0.1:4173/';
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.TBC_PR6?.version==='PR6.0'&&window.TBC_P0C?.version==='P0C.3',null,{timeout:20000});
  await page.waitForTimeout(700);
  await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});
  const sources=await page.evaluate(()=>({
    openModal:typeof openModal==='function'?String(openModal).replace(/\s+/g,' ').slice(0,1800):null,
    closeModal:typeof closeModal==='function'?String(closeModal).replace(/\s+/g,' ').slice(0,1200):null,
    panel:typeof v24CollectionsPanel==='function'?String(v24CollectionsPanel).replace(/\s+/g,' ').slice(0,500):null
  }));
  console.log('P0E COLLECTION MODAL SOURCES '+JSON.stringify(sources));

  const result=await page.evaluate(()=>{
    if(typeof openModal!=='function'||typeof v24CollectionsPanel!=='function')return {opened:false,reason:'missing API'};
    const html=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="p0eCollectionsTitle"><div class="modal-head"><div><h2 id="p0eCollectionsTitle">Collections</h2><p>Saved curated Bible practice scopes</p></div><button class="icon-btn" aria-label="Close" onclick="closeModal()">×</button></div><div class="modal-body">${v24CollectionsPanel()}</div></div>`;
    openModal(html,true);
    return {opened:true};
  });
  await page.waitForTimeout(600);
  const snapshot=await page.evaluate(()=>{
    const modal=document.querySelector('#modalRoot .modal');
    return {
      modalVisible:Boolean(modal&&getComputedStyle(modal).display!=='none'),
      cards:document.querySelectorAll('#modalRoot .v24-collection-card').length,
      list:Boolean(document.querySelector('#modalRoot .v24-collection-list')),
      close:Boolean(document.querySelector('#modalRoot [aria-label="Close"]')),
      text:String(modal?.innerText||'').replace(/\s+/g,' ').trim().slice(0,1400)
    };
  });
  console.log('P0E COLLECTION MODAL RESULT '+JSON.stringify({result,snapshot,errors}));
  await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});
  await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
