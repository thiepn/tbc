#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const ROOT=path.resolve(__dirname,'..');
const INDEX=process.env.P2E_INDEX||path.join(ROOT,'index.html');
const html=fs.readFileSync(INDEX,'utf8');
const m=html.match(/<script id="tbc-engine-package" type="application\/octet-stream">([A-Za-z0-9+/=\r\n]+)<\/script>/);
if(!m)throw new Error('embedded engine missing');
const engine=zlib.gunzipSync(Buffer.from(m[1].replace(/\s+/g,''),'base64')).toString('utf8');
for(const needle of ['1338','1666','1133','1141','521']){
  let at=0,count=0;
  while((at=engine.indexOf(needle,at))>=0&&count<20){
    console.log(`CONTEXT ${needle} #${count+1}: ${engine.slice(Math.max(0,at-220),Math.min(engine.length,at+320)).replace(/\n/g,'\\n')}`);
    at+=needle.length;count++;
  }
  console.log(`TOTAL-SHOWN ${needle}: ${count}`);
}
