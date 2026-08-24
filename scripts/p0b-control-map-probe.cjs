const { chromium } = require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  const compact=s=>String(s||'').replace(/\s+/g,' ').trim();
  try{
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>document.documentElement.getAttribute('data-pr5-foundation')==='PR5.1',null,{timeout:20000});
    const modal=page.locator('#modalRoot .modal-backdrop');
    await modal.waitFor({state:'visible',timeout:15000});
    await modal.getByRole('button').filter({hasText:/Standard/i}).first().click();
    await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('theBibleChallenge_v21'))?.onboarded===true}catch{return false}},null,{timeout:7000});
    await page.waitForTimeout(500);

    const runtime=await page.evaluate(()=>{
      let state=null;try{state=JSON.parse(localStorage.getItem('theBibleChallenge_v21'))}catch{}
      const interesting=/difficulty|tier|onboard|level|setting|profile|placement/i;
      const windowKeys=Object.keys(window).filter(k=>interesting.test(k)).sort().map(k=>({key:k,type:typeof window[k]})).slice(0,200);
      const controls=[...document.querySelectorAll('button,a,[role="button"],select,input,label')].map(el=>({
        tag:el.tagName,id:el.id,cls:String(el.className||''),text:String(el.innerText||el.textContent||el.getAttribute?.('aria-label')||el.getAttribute?.('title')||'').replace(/\s+/g,' ').trim().slice(0,220),
        data:[...el.attributes].filter(a=>/^data-|aria-|onclick/i.test(a.name)).map(a=>[a.name,a.value]).slice(0,12)
      })).filter(x=>interesting.test(`${x.id} ${x.cls} ${x.text} ${JSON.stringify(x.data)}`)).slice(0,200);
      return {windowKeys,settings:state?.settings||null,controls};
    });
    console.log('P0B CONTROL MAP RUNTIME:',JSON.stringify(runtime));

    const settingsCandidates=page.locator('button,a,[role="button"]').filter({hasText:/^Settings$/i});
    const count=await settingsCandidates.count();
    for(let i=0;i<count;i++){
      if(await settingsCandidates.nth(i).isVisible().catch(()=>false)){
        await settingsCandidates.nth(i).click();break;
      }
    }
    await page.waitForTimeout(600);
    const settingsDump=await page.evaluate(()=>{
      const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
      const text=el=>String(el.innerText||el.textContent||el.getAttribute?.('aria-label')||el.getAttribute?.('title')||'').replace(/\s+/g,' ').trim();
      const roots=[...document.querySelectorAll('#modalRoot .modal-backdrop,.modal,.dialog,[role="dialog"],.settings-panel,.settings')].filter(visible);
      return {
        roots:roots.map(el=>text(el).slice(0,4000)).slice(0,10),
        controls:[...document.querySelectorAll('button,a,[role="button"],select,input,label')].filter(visible).map(el=>({tag:el.tagName,id:el.id,cls:String(el.className||''),text:text(el).slice(0,240),value:el.value||null,type:el.type||null})).slice(0,200),
        selects:[...document.querySelectorAll('select')].filter(visible).map(el=>({id:el.id,value:el.value,options:[...el.options].map(o=>({text:text(o),value:o.value}))}))
      };
    });
    console.log('P0B CONTROL MAP SETTINGS:',JSON.stringify(settingsDump));
  }finally{await context.close();await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
