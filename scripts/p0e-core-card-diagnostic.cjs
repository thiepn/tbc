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

  const data=await page.evaluate(()=>{
    const needles=['v24CollectionsPanel','collections','libraryScreen','v292LibraryScreen'];
    const callers=[];
    for(const key of Object.keys(window).sort()){
      let fn,source='';
      try{fn=window[key];if(typeof fn!=='function')continue;source=String(fn).replace(/\s+/g,' ')}catch{continue}
      if(needles.some(n=>source.includes(n))){
        callers.push({key,source:source.slice(0,1800)});
      }
    }
    const specifics={};
    for(const key of ['v292Go','navTo','v24PracticeScreen','v24PracticeFilters','v24SetPracticeTab','v24SetPracticeView','studyScreen','learningScreen','playScreen','libraryScreen']){
      try{if(typeof window[key]==='function')specifics[key]=String(window[key]).replace(/\s+/g,' ').slice(0,2600)}catch{}
    }
    return {callers,specifics,p0c:window.TBC_P0C.audit(),pr6:window.TBC_PR6.audit()};
  });
  console.log('P0E COLLECTION ROUTE DIAGNOSTIC '+JSON.stringify(data));

  await page.locator('.pr5-primary-nav [data-pr5-nav="learn"]').click();
  await page.waitForFunction(()=>document.body.dataset.pr6Flow==='learn',null,{timeout:7000});
  await page.waitForTimeout(500);
  const learn=await page.evaluate(()=>({
    html:document.querySelector('.pr6-root:not([hidden]) [data-pr6-view]')?.innerHTML.slice(0,9000)||'',
    p0c:window.TBC_P0C.audit()
  }));
  console.log('P0E COLLECTION ROUTE LEARN '+JSON.stringify(learn));
  await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
