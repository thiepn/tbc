const { chromium } = require('playwright');

const BASE='http://127.0.0.1:4173/';
const STORAGE_KEY='theBibleChallenge_v21';

async function completeOnboarding(page){
  const modal=page.locator('#modalRoot .modal-backdrop');
  if(!(await modal.count())||!(await modal.isVisible()))return;
  const text=(await modal.innerText()).replace(/\s+/g,' ').trim();
  if(!/CHOOSE YOUR BIBLE DIFFICULTY/i.test(text))return;
  const standard=modal.getByRole('button').filter({hasText:/Standard/i}).first();
  if(await standard.count())await standard.click();
  await page.waitForFunction(key=>{try{const s=JSON.parse(localStorage.getItem(key));return s?.onboarded===true}catch{return false}},STORAGE_KEY,{timeout:7000});
  await page.waitForFunction(()=>!document.querySelector('#modalRoot .modal-backdrop'),null,{timeout:7000});
}

async function dump(page,name){
  const out=await page.evaluate(()=>{
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)!==0&&r.width>0&&r.height>0};
    const text=el=>String(el.innerText||el.textContent||el.getAttribute?.('aria-label')||el.getAttribute?.('title')||'').replace(/\s+/g,' ').trim();
    const pattern=/collection|library|progress|mastery|book|learn|study|stat|journey|path|review/i;
    const controls=[...document.querySelectorAll('button,a[href],[role="button"],select,input,label')]
      .map(el=>({tag:el.tagName,id:el.id,cls:String(el.className||''),text:text(el).slice(0,240),visible:visible(el),onclick:el.getAttribute?.('onclick')||null}))
      .filter(x=>pattern.test(`${x.id} ${x.cls} ${x.text} ${x.onclick||''}`))
      .slice(0,250);
    const windowKeys=Object.keys(window)
      .filter(k=>/collection|library|progress|mastery|book|learn|study|stat/i.test(k))
      .sort().map(k=>({key:k,type:typeof window[k]})).slice(0,250);
    return {
      bodyDomain:document.body.dataset.pr5Domain||null,
      bodyFlow:document.body.dataset.pr6Flow||null,
      title:document.querySelector('.topbar h1')?.textContent?.trim()||null,
      exactIds:['collectionsBtn','libraryBtn','progressBtn'].map(id=>{const el=document.getElementById(id);return {id,exists:Boolean(el),visible:el?visible(el):false,text:el?text(el):null,onclick:el?.getAttribute?.('onclick')||null}}),
      controls,windowKeys
    };
  });
  console.log(`P0D FEATURE MAP ${name}: ${JSON.stringify(out)}`);
}

async function nativeNav(page,route){
  const result=await page.evaluate(routeName=>{
    if(typeof window.navTo==='function'){window.TBC_PR6?.deactivate?.();window.navTo(routeName);return 'navTo'}
    const n=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
    const terms={learn:['learn'],library:['library','books'],progress:['progress','mastery','stats'],home:['home']}[routeName]||[routeName];
    const own=el=>Boolean(el.closest?.('[data-pr5-ui],[data-pr6-ui],[data-p0c-ui],[data-p0b-ui]'));
    const candidate=[...document.querySelectorAll('button,a[href],[role="button"]')].filter(el=>!own(el)).find(el=>terms.some(t=>n(el.textContent||el.getAttribute('aria-label')||el.getAttribute('title')).includes(t)));
    if(candidate){window.TBC_PR6?.deactivate?.();candidate.click();return 'click'}
    return null;
  },route);
  await page.waitForTimeout(650);
  return result;
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  try{
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>window.TBC_PR6?.version==='PR6.0'&&window.TBC_P0C?.version==='P0C.3',null,{timeout:20000});
    await completeOnboarding(page);
    await dump(page,'HOME_AFTER_ONBOARDING');
    for(const route of ['learn','library','progress','home']){
      const via=await nativeNav(page,route);
      console.log(`P0D FEATURE MAP NAV ${route}: ${via}`);
      await dump(page,route.toUpperCase());
    }
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(err=>{console.error(err);process.exit(1)});
