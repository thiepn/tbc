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
  await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
  await page.waitForFunction(()=>document.body.dataset.pr6Flow==='play'&&document.querySelector('.pr6-root:not([hidden])'),null,{timeout:7000});
  await page.waitForTimeout(700);
  const data=await page.evaluate(()=>{
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)!==0&&r.width>0&&r.height>0};
    const selector='.pr6-root [data-pr6-open="quick"], .pr6-root [data-pr6-open="focused"]';
    const matches=[...document.querySelectorAll(selector)].map((el,i)=>({
      i,open:el.dataset.pr6Open||null,tag:el.tagName,cls:String(el.className||''),text:String(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,200),visible:visible(el),
      rootHidden:Boolean(el.closest('.pr6-root')?.hidden),viewHidden:Boolean(el.closest('[data-pr6-view]')?.hidden),connected:el.isConnected,
      parent:String(el.parentElement?.className||''),html:el.outerHTML.slice(0,500)
    }));
    const roots=[...document.querySelectorAll('.pr6-root')].map((el,i)=>({i,hidden:el.hidden,visible:visible(el),flow:el.dataset.pr6Flow||null,children:el.children.length,html:el.outerHTML.slice(0,300)}));
    return {count:matches.length,visibleCount:matches.filter(x=>x.visible).length,matches,roots,bodyFlow:document.body.dataset.pr6Flow||null,p0c:window.TBC_P0C.audit()};
  });
  console.log('P0E CORE CARD DIAGNOSTIC '+JSON.stringify(data));
  await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
