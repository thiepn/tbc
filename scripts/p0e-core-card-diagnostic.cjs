const { chromium } = require('playwright');
const BASE='http://127.0.0.1:4173/';
const ENTRY=/collection|library|progress|mastery|stats/i;
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
    const data=await page.evaluate(src=>{
      const re=new RegExp(src,'i');
      const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)!==0&&r.width>0&&r.height>0};
      const windowKeys=Object.keys(window).filter(k=>re.test(k)).sort().map(key=>{
        let type='unknown',source='';
        try{type=typeof window[key];if(type==='function')source=String(window[key]).replace(/\s+/g,' ').slice(0,700)}catch{}
        return {key,type,source};
      });
      const elements=[...document.querySelectorAll('[id],button,a[href],[role="button"]')].map(el=>({
        tag:el.tagName,id:el.id||'',cls:String(el.className||''),
        text:String(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').replace(/\s+/g,' ').trim().slice(0,260),
        visible:visible(el),own:Boolean(el.closest('[data-pr5-ui],[data-pr6-ui],[data-p0c-ui]'))
      })).filter(x=>re.test(`${x.id} ${x.cls} ${x.text}`)).slice(0,240);
      return {
        bodyDomain:document.body.dataset.pr5Domain||null,bodyFlow:document.body.dataset.pr6Flow||null,
        title:document.querySelector('.topbar h1')?.textContent?.trim()||null,
        p0c:window.TBC_P0C.audit(),pr6:window.TBC_PR6.audit(),windowKeys,elements
      };
    },ENTRY.source);
    console.log(`P0E LEARN ENTRYPOINT DIAGNOSTIC ${label} ${JSON.stringify(data)}`);
  }

  await snapshot('INITIAL');
  await page.locator('.pr5-primary-nav [data-pr5-nav="learn"]').click();
  await page.waitForFunction(()=>document.body.dataset.pr6Flow==='learn'&&document.querySelector('.pr6-root:not([hidden])'),null,{timeout:7000});
  await page.waitForTimeout(800);
  await snapshot('RECONSTRUCTED_LEARN');

  await page.evaluate(()=>{
    window.TBC_PR6?.deactivate?.();
    const nav=document.querySelector('.pr5-native-nav')||document.querySelector('.nav');
    const target=[...(nav?.querySelectorAll('button,a[href],[role="button"]')||[])].find(el=>/^(study|learn)$/i.test(String(el.textContent||el.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim()));
    target?.click();
  });
  await page.waitForTimeout(800);
  await snapshot('NATIVE_STUDY');

  await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
