const { chromium } = require('playwright');

const BASE='http://127.0.0.1:4173/';
const pattern=/duel|pvp|campaign|expedition|battle|arena/i;
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.TBC_PR6?.version==='PR6.0'&&window.TBC_P0C?.version==='P0C.3',null,{timeout:20000});
  await page.waitForTimeout(800);
  await page.evaluate(()=>{ if(typeof closeModal==='function') closeModal(); });

  async function snapshot(label){
    const data=await page.evaluate(src=>{
      const re=new RegExp(src,'i');
      const keys=Object.keys(window).filter(k=>re.test(k)).sort().map(key=>{
        let type='unknown',source='';
        try{ type=typeof window[key]; if(type==='function') source=String(window[key]).replace(/\s+/g,' ').slice(0,500); }
        catch{}
        return {key,type,source};
      });
      const elements=[...document.querySelectorAll('[id],button,a[href],[role="button"]')].map(el=>({
        tag:el.tagName,id:el.id||'',cls:String(el.className||''),text:String(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').replace(/\s+/g,' ').trim().slice(0,220),
        visible:(()=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0})()
      })).filter(x=>re.test(`${x.id} ${x.cls} ${x.text}`)).slice(0,200);
      return {keys,elements,domain:document.body.dataset.pr5Domain||null,flow:document.body.dataset.pr6Flow||null,p0c:window.TBC_P0C?.audit?.()||null};
    },pattern.source);
    console.log(`P0E DUEL DIAGNOSTIC ${label}: ${JSON.stringify(data)}`);
  }

  await snapshot('INITIAL');

  await page.evaluate(()=>{
    window.TBC_PR6?.deactivate?.();
    const nav=document.querySelector('.pr5-native-nav')||document.querySelector('.nav');
    const play=[...(nav?.querySelectorAll('button,a[href],[role="button"]')||[])].find(el=>/^(play|quick play|practice)$/i.test(String(el.textContent||el.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim()));
    play?.click();
  });
  await page.waitForTimeout(800);
  await snapshot('AFTER_NATIVE_PLAY');

  await context.close();
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
