const { chromium } = require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>window.TBC_P0C?.version==='P0C.3',null,{timeout:20000});
    for(let i=0;i<6;i++){
      const visible=page.locator('#modalRoot .modal-backdrop:visible');
      if(await visible.count())await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});
      await page.waitForTimeout(120);
    }
    await page.evaluate(()=>window.TBC_P0C.launch('collections'));
    await page.waitForSelector('#modalRoot .modal-backdrop:visible',{timeout:7000});
    await page.waitForTimeout(300);
    const before=await page.locator('#modalRoot .v24-collection-card').count();
    const clickProbe=await page.evaluate(()=>{
      const button=document.querySelector('#modalRoot .v24-show-more');
      if(!button)return {present:false};
      const info={present:true,onclick:typeof button.onclick,outerHTML:button.outerHTML.slice(0,500)};
      button.click();
      return info;
    });
    await page.waitForTimeout(180);
    const after=await page.locator('#modalRoot .v24-collection-card').count();
    const info=await page.evaluate(()=>{
      const modal=document.querySelector('#modalRoot .p0c-collections-modal')||[...document.querySelectorAll('#modalRoot .modal-backdrop')].find(el=>getComputedStyle(el).display!=='none');
      const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
      return {
        text:clean(modal?.innerText).slice(-2600),
        cards:[...(modal?.querySelectorAll('.v24-collection-card')||[])].map((el,i)=>({i,text:clean(el.innerText).slice(0,160)})),
        controls:[...(modal?.querySelectorAll('button,a,[role="button"],input')||[])].map((el,i)=>({
          i,tag:el.tagName,text:clean(el.textContent||el.value),aria:el.getAttribute('aria-label'),title:el.getAttribute('title'),
          disabled:Boolean(el.disabled),ariaDisabled:el.getAttribute('aria-disabled'),cls:String(el.className),data:{...el.dataset}
        }))
      };
    });
    console.log('P1A COLLECTIONS DIAGNOSTIC START');
    console.log(JSON.stringify({before,clickProbe,after,info},null,2));
    console.log('P1A COLLECTIONS DIAGNOSTIC END');
  }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
