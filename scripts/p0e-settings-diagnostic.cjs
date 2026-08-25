const {chromium}=require('playwright');
const BASE='http://127.0.0.1:4173/';
const snap=()=>({
 domain:document.body.dataset.pr5Domain||null,
 flow:document.body.dataset.pr6Flow||null,
 title:document.querySelector('.topbar h1')?.textContent?.trim()||null,
 nativeActive:[...document.querySelectorAll('.pr5-native-nav button,.pr5-native-nav a,[data-pr5-native] button,[data-pr5-native] a')].filter(el=>el.classList.contains('active')||el.getAttribute('aria-current')==='page').map(el=>({id:el.id||null,text:String(el.textContent||'').replace(/\s+/g,' ').trim(),cls:el.className})),
 modal:(()=>{const el=document.querySelector('#modalRoot .modal-backdrop');if(!el)return null;const s=getComputedStyle(el),r=el.getBoundingClientRect();return {visible:s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0,text:String(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,1800)}})(),
 nativeSettings:(()=>{const el=[...document.querySelectorAll('button,a,[role="button"]')].find(el=>!el.closest('[data-pr5-ui]')&&String(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').trim()==='Settings');return el?{id:el.id||null,cls:String(el.className||''),aria:el.getAttribute('aria-label'),title:el.getAttribute('title'),onclick:el.getAttribute('onclick'),outer:el.outerHTML.slice(0,1000)}:null})(),
 globals:Object.keys(window).filter(k=>/setting|preference/i.test(k)&&typeof window[k]==='function').sort().slice(0,80).map(k=>({key:k,source:String(window[k]).replace(/\s+/g,' ').slice(0,700)})),
 mainText:String(document.querySelector('.main')?.innerText||'').replace(/\s+/g,' ').trim().slice(0,1200)
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
 const direct=await page.evaluate(()=>{const el=[...document.querySelectorAll('button,a,[role="button"]')].find(el=>!el.closest('[data-pr5-ui]')&&String(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').trim()==='Settings');if(!el)return false;el.click();return true;});
 console.log('P0E SETTINGS DIRECT CLICK '+direct);
 await page.waitForTimeout(300);
 console.log('P0E SETTINGS DIRECT RESULT '+JSON.stringify(await page.evaluate(snap)));
 await page.evaluate(()=>{if(typeof closeModal==='function')closeModal()});
 await page.waitForTimeout(150);
 await page.locator('[data-pr5-utility="settings"]').click();
 await page.waitForTimeout(300);
 console.log('P0E SETTINGS PR5 RESULT '+JSON.stringify(await page.evaluate(snap)));
 await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
