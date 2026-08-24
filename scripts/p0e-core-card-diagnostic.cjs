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

  async function snapshot(label){
    const data=await page.evaluate(()=>{
      const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)!==0&&r.width>0&&r.height>0};
      const content=document.querySelector('.content');
      const nativeNav=document.querySelector('.pr5-native-nav');
      return {
        bodyDomain:document.body.dataset.pr5Domain||null,bodyFlow:document.body.dataset.pr6Flow||null,
        title:document.querySelector('.topbar h1')?.textContent?.trim()||null,
        p0c:window.TBC_P0C.audit(),pr6:window.TBC_PR6.audit(),
        nativeNav:[...(nativeNav?.querySelectorAll('button,a[href],[role="button"]')||[])].map(el=>({text:String(el.textContent||el.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim(),active:el.classList.contains('active'),visible:visible(el)})),
        contentButtons:[...(content?.querySelectorAll('button,a[href],[role="button"]')||[])].filter(el=>!el.closest('[data-pr5-ui],[data-pr6-ui],[data-p0c-ui]')).map(el=>({id:el.id||'',text:String(el.textContent||el.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,180),active:el.classList.contains('active'),visible:visible(el)})).filter(x=>/play|practice|campaign|expedition|duel/i.test(`${x.id} ${x.text}`)).slice(0,100)
      };
    });
    console.log(`P0E REENTRY DIAGNOSTIC ${label} ${JSON.stringify(data)}`);
  }

  await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
  await page.waitForFunction(()=>document.body.dataset.pr6Flow==='play'&&document.querySelector('.pr6-root:not([hidden])'),null,{timeout:7000});
  await page.waitForTimeout(500);
  await snapshot('PLAY_INITIAL');

  const launched=await page.evaluate(()=>window.TBC_P0C.launch('campaign'));
  console.log('P0E REENTRY CAMPAIGN_LAUNCHED '+launched);
  await page.waitForTimeout(500);
  await snapshot('CAMPAIGN');

  await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
  await page.waitForFunction(()=>document.body.dataset.pr6Flow==='play'&&document.querySelector('.pr6-root:not([hidden])'),null,{timeout:7000});
  await page.waitForTimeout(800);
  await snapshot('PLAY_REENTRY');

  await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
