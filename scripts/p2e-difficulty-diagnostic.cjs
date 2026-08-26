#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');

const IDS=[
  'd4.easy.major.1-chronicles-inventory-1.01',
  'd4.easy.mode.parables.luke-good-samaritan.16',
  'phase9.nt.romans.7.structure',
  'v402.miracle.feeding-bread-discourse',
  'd4.easy.place.place-elah',
  'place.elah.significance',
  'place.jordan.significance',
  'place.shechem.significance',
  'place.shiloh.significance',
  'place.valley-elah.v20-significance'
];

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto(process.env.P2A_BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>window.TBC_QB11?.installed===true,{timeout:25000});
    const out=await page.evaluate((ids)=>{
      const candidates={};
      for(const key of Object.keys(window)){
        if(!/^TBC_QB/i.test(key))continue;
        const value=window[key];
        if(!value||typeof value!=='object')continue;
        candidates[key]={keys:Object.keys(value).slice(0,80)};
      }
      const rows=[];
      const sources=[];
      for(const key of Object.keys(window)){
        const v=window[key];
        if(!v||typeof v!=='object')continue;
        for(const prop of ['questions','items','rows','registry','records','canonical']){
          const arr=v[prop];
          if(!Array.isArray(arr))continue;
          const hits=arr.filter(x=>x&&ids.includes(x.id||x.canonicalId||x.itemId));
          if(hits.length){sources.push({key,prop,count:hits.length});for(const x of hits)rows.push({key,prop,row:x});}
        }
      }
      return {candidates,sources,rows};
    },IDS);
    console.log(JSON.stringify(out,null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
