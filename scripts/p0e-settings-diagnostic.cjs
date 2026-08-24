const {chromium}=require('playwright');
const BASE='http://127.0.0.1:4173/';
const snap=()=>({
 domain:document.body.dataset.pr5Domain||null,
 flow:document.body.dataset.pr6Flow||null,
 title:document.querySelector('.topbar h1')?.textContent?.trim()||null,
 nativeActive:[...document.querySelectorAll('.pr5-native-nav button,.pr5-native-nav a,[data-pr5-native] button,[data-pr5-native] a')].filter(el=>el.classList.contains('active')||el.getAttribute('aria-current')==='page').map(el=>({id:el.id||null,text:String(el.textContent||'').replace(/\s+/g,' ').trim(),cls:el.className})),
 settingsUtility:{cls:document.querySelector('[data-pr5-utility="settings"]')?.className||null,current:document.querySelector('[data-pr5-utility="settings"]')?.getAttribute('aria-current')||null},
 globals:{screen:typeof window.screen==='string'?window.screen:null,stateScreen:window.state?.screen||null},
 visibleSections:[...document.querySelectorAll('.main section,.main .card,.main .panel,.main [class*="settings" i]')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}).slice(0,25).map(el=>({id:el.id||null,cls:String(el.className||''),text:String(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,220)})),
 mainText:String(document.querySelector('.main')?.innerText||'').replace(/\s+/g,' ').trim().slice(0,1800),
 candidates:[...document.querySelectorAll('button,a,[role="button"]')].filter(el=>/settings|preferences|difficulty|theme/i.test(String(el.textContent||el.getAttribute('aria-label')||el.getAttribute('title')||''))).slice(0,30).map(el=>({id:el.id||null,text:String(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,160),cls:String(el.className||''),active:el.classList.contains('active'),current:el.getAttribute('aria-current')}))
});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.documentElement.getAttribute('data-pr5-foundation')==='PR5.1',null,{timeout:20000});
 await page.waitForSelector('[data-pr5-utility="settings"]',{state:'attached',timeout:20000});
 await page.waitForTimeout(700);
 await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});
 await page.waitForTimeout(250);
 console.log('P0E SETTINGS BEFORE '+JSON.stringify(await page.evaluate(snap)));
 await page.locator('[data-pr5-utility="settings"]').click();
 for(const [label,delay] of [['+50',50],['+250',200],['+750',500],['+1750',1000]]){
   await page.waitForTimeout(delay);
   console.log(`P0E SETTINGS ${label} `+JSON.stringify(await page.evaluate(snap)));
 }
 await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
