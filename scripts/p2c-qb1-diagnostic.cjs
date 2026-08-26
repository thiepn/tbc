#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto(process.env.P2A_BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>window.TBC_QB11?.installed===true&&window.TBC_QB1?.summary,{timeout:25000});
    const out=await page.evaluate(()=>({summary:window.TBC_QB1.summary(),audit:window.TBC_QB1.audit?.()}));
    console.log(JSON.stringify(out,null,2));
    if(Number(out?.summary?.blockerCount||0)>0||Number(out?.summary?.malformedCount||0)>0)process.exitCode=2;
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
