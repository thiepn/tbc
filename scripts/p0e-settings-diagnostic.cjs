const {chromium}=require('playwright');
const BASE='http://127.0.0.1:4173/';
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
 const before=await page.evaluate(()=>snapshot());
 console.log('P0E SETTINGS BEFORE '+JSON.stringify(before));
 await page.locator('[data-pr5-utility="settings"]').click();
 await page.waitForTimeout(50);
 console.log('P0E SETTINGS +50 '+JSON.stringify(await page.evaluate(()=>snapshot())));
 await page.waitForTimeout(200);
 console.log('P0E SETTINGS +250 '+JSON.stringify(await page.evaluate(()=>snapshot())));
 await page.waitForTimeout(500);
 console.log('P0E SETTINGS +750 '+JSON.stringify(await page.evaluate(()=>snapshot())));
 await page.waitForTimeout(1000);
 console.log('P0E SETTINGS +1750 '+JSON.stringify(await page.evaluate(()=>snapshot())));
 await context.close();await browser.close();
 function snapshot(){return null}
})().catch(e=>{console.error(e);process.exit(1)});
