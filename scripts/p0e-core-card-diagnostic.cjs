const { chromium } = require('playwright');
const BASE='http://127.0.0.1:4173/';
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.TBC_PR6?.version==='PR6.0'&&window.TBC_P0C?.version==='P0C.3',null,{timeout:20000});
  await page.waitForSelector('.pr5-primary-nav',{state:'attached',timeout:20000});
  await page.waitForTimeout(700);
  await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});

  async function snap(label){
    const data=await page.evaluate(()=>({
      title:document.querySelector('.topbar h1')?.textContent?.trim()||null,
      bodyDomain:document.body.dataset.pr5Domain||null,flow:document.body.dataset.pr6Flow||null,
      screen:typeof screen!=='undefined'?screen:null,
      playSection:window.state?.uiPreferences?.playSection||null,
      collectionList:Boolean(document.querySelector('.v24-collection-list')),
      collectionCards:document.querySelectorAll('.v24-collection-card').length,
      collectionTab:[...document.querySelectorAll('[role="tab"]')].find(el=>/collections/i.test(el.textContent||''))?.getAttribute('aria-selected')||null,
      bibleSignals:Boolean(document.querySelector('.v390-library,.v330-bible-reader,[data-v330-reader]'))||/Bible/i.test(document.querySelector('.topbar h1')?.textContent||''),
      visibleText:String(document.querySelector('.content')?.innerText||'').replace(/\s+/g,' ').trim().slice(0,1200)
    }));
    console.log(`P0E ROUTE COMMAND ${label} ${JSON.stringify(data)}`);
  }

  await page.evaluate(()=>{
    window.TBC_PR6?.deactivate?.();
    if(typeof v292Go==='function')v292Go('play','now');
  });
  await page.waitForTimeout(500);
  await page.evaluate(()=>{if(typeof v24SetPracticeTab==='function')v24SetPracticeTab('collections')});
  await page.waitForTimeout(700);
  await snap('COLLECTIONS');

  await page.evaluate(()=>{if(typeof v292Go==='function')v292Go('library')});
  await page.waitForTimeout(800);
  await snap('LIBRARY');

  await page.evaluate(()=>{if(typeof v292Go==='function')v292Go('progress')});
  await page.waitForTimeout(800);
  await snap('PROGRESS');

  await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
