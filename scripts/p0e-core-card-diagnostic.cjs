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

  const sources=await page.evaluate(()=>{
    const needles=['exploreSection','v292SetExplore','Collections','collections'];
    const rows=[];
    for(const key of Object.keys(window).sort()){
      let source='';
      try{if(typeof window[key]!=='function')continue;source=String(window[key]).replace(/\s+/g,' ')}catch{continue}
      if(needles.some(n=>source.includes(n))){
        rows.push({key,source:source.slice(0,3000)});
      }
    }
    const named={};
    for(const key of ['v292PlayNow','v292SetExplore','v292ExplorePanel','v292Explore','v3210PlayNow','v3210PracticePanel','v3210PlayScreen','v292Go','v292PlayScreen']){
      try{if(typeof window[key]==='function')named[key]=String(window[key]).replace(/\s+/g,' ').slice(0,5000)}catch{}
    }
    return {rows:rows.slice(0,160),named,uiPreferences:window.state?.uiPreferences||null};
  });
  console.log('P0E EXPLORE SOURCES '+JSON.stringify(sources));

  async function snap(label){
    const data=await page.evaluate(()=>{
      const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
      return {
        title:document.querySelector('.topbar h1')?.textContent?.trim()||null,
        screen:typeof screen!=='undefined'?screen:null,
        prefs:window.state?.uiPreferences||null,
        collectionCards:document.querySelectorAll('.v24-collection-card').length,
        collectionList:Boolean(document.querySelector('.v24-collection-list')),
        tabs:[...document.querySelectorAll('[role="tab"],button')].filter(el=>visible(el)&&/collections|books|focus|explore|practice/i.test(el.textContent||'')).map(el=>({text:String(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,160),selected:el.getAttribute('aria-selected'),cls:String(el.className||'')})).slice(0,80),
        text:String(document.querySelector('.content')?.innerText||'').replace(/\s+/g,' ').trim().slice(0,2500)
      };
    });
    console.log(`P0E EXPLORE ROUTE ${label} ${JSON.stringify(data)}`);
  }

  await page.evaluate(()=>{window.TBC_PR6?.deactivate?.(); if(typeof v292Go==='function')v292Go('play','now')});
  await page.waitForTimeout(700);
  await snap('PLAY_NOW');

  await page.evaluate(()=>{if(typeof v292SetExplore==='function')v292SetExplore('collections')});
  await page.waitForTimeout(900);
  await snap('SET_EXPLORE_COLLECTIONS');

  const clicked=await page.evaluate(()=>{
    const buttons=[...document.querySelectorAll('button,[role="button"],[role="tab"]')];
    const target=buttons.find(el=>/^(explore|practice|focused practice)$/i.test(String(el.textContent||'').replace(/\s+/g,' ').trim()));
    if(target){target.click();return String(target.textContent||'').replace(/\s+/g,' ').trim()}
    return null;
  });
  console.log('P0E EXPLORE CLICKED '+JSON.stringify(clicked));
  await page.waitForTimeout(800);
  await snap('AFTER_EXPLORE_CLICK');
  await page.evaluate(()=>{if(typeof v292SetExplore==='function')v292SetExplore('collections')});
  await page.waitForTimeout(800);
  await snap('EXPLORE_THEN_COLLECTIONS');

  await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
