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
    const probe=await page.evaluate(()=>{
      const count=()=>document.querySelectorAll('#modalRoot .v24-collection-card').length;
      const fn=window.v24ShowMorePractice;
      const names=Object.getOwnPropertyNames(window).filter(name=>/^v24/i.test(name)).sort();
      const globals={};
      for(const name of names){
        const value=window[name];
        if(typeof value==='function')globals[name]=String(value).slice(0,1800);
        else if(['string','number','boolean'].includes(typeof value))globals[name]=value;
      }
      const before=count();
      let directError=null;
      try{if(typeof fn==='function')fn()}catch(err){directError=String(err?.stack||err)}
      return {before,afterImmediate:count(),directError,source:typeof fn==='function'?String(fn):null,globals};
    });
    await page.waitForTimeout(180);
    probe.afterSettled=await page.locator('#modalRoot .v24-collection-card').count();
    probe.button=await page.locator('#modalRoot .v24-show-more').evaluate(el=>el.outerHTML).catch(()=>null);
    console.log('P1A COLLECTIONS DIAGNOSTIC START');
    console.log(JSON.stringify(probe,null,2));
    console.log('P1A COLLECTIONS DIAGNOSTIC END');
  }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
