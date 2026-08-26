#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');

const ROOT=path.resolve(__dirname,'..');
const INDEX=process.env.P2C_INDEX||path.join(ROOT,'index.html');
const pkgRe=/(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
const fail=msg=>{throw new Error(`P2C repair: ${msg}`)};

const PROMPT_FIXES=[
  ['d4.easy.mode.parables.luke-good-samaritan.16','Which option identifies the person associated with the cited passage?','Which statement best captures the closing challenge of the cited parable?'],
  ['d4.easy.mode.parables.matt-tenants.09','Which option identifies the person associated with the cited passage?','Which parable is associated with the cited passage?'],
  ['phase6.jesus.luke.cross.criminal','Which option identifies the person associated with the cited passage?','What does Jesus promise the criminal who asks to be remembered?'],
  ['phase8.wp.joel.spirit.scope','Which option identifies the person associated with the cited passage?','What is notable about the people who receive the Spirit in Joel’s promise?'],
  ['phase9.nt.2-peter.2.meaning','Which option identifies the person associated with the cited passage?','What contradiction does 2 Peter 2 expose in false teachers who promise freedom?'],
  ['d4.easy.major.1-chronicles-inventory-1.01','Which option identifies the place associated with the cited passage?','Which statement best summarizes the significance of the genealogies in 1 Chronicles 1–9?'],
  ['phase9.nt.1-timothy.2.context','Which option identifies the place associated with the cited passage?','Why does 1 Timothy 2 place prayer for rulers within a wider salvation perspective?'],
  ['v402.miracle.feeding-bread-discourse','Which option identifies the place associated with the cited passage?','Why does John place the feeding sign before the Bread of Life discourse?'],
  ['v21.clueReduction.39','Which option best identifies the event supported by the cited evidence?','Which person is identified by the cited evidence?'],
];

if(!fs.existsSync(INDEX))fail(`missing ${INDEX}`);
let html=fs.readFileSync(INDEX,'utf8');
const m=html.match(pkgRe);if(!m)fail('embedded engine package not found');
let engine=zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8');
let mutations=0;
const repairedQuestions=new Set();

function repairOverridePrompt(id,bad,good){
  const startToken=`"itemId":"${id}","fields":{`;
  let cursor=0,badCount=0,goodCount=0,seen=0;
  while(true){
    const pos=engine.indexOf(startToken,cursor);if(pos<0)break;
    seen++;
    const end=engine.indexOf('},"editorial":',pos);
    if(end<0)fail(`${id} override object is unterminated`);
    const segment=engine.slice(pos,end);
    const badToken=`"prompt":${JSON.stringify(bad)}`;
    const goodToken=`"prompt":${JSON.stringify(good)}`;
    if(segment.includes(badToken)){
      const next=segment.replace(badToken,goodToken);
      engine=engine.slice(0,pos)+next+engine.slice(end);
      const delta=next.length-segment.length;
      cursor=end+delta;
      badCount++;mutations++;repairedQuestions.add(id);
    }else{
      if(segment.includes(goodToken))goodCount++;
      cursor=end+1;
    }
  }
  if(!seen)fail(`${id} has no editorial override entry`);
  if(!badCount&&!goodCount)fail(`${id} has neither expected defective nor repaired prompt`);
}

function repairSourceToken(id,oldToken,newToken,label){
  const marker=`"itemId":"${id}"`;
  const pos=engine.indexOf(marker);
  if(pos<0)fail(`${id} source item not found`);
  const nextPos=engine.indexOf('{"itemId":',pos+marker.length);
  const end=nextPos<0?Math.min(engine.length,pos+6000):nextPos;
  const segment=engine.slice(pos,end);
  if(segment.includes(oldToken)){
    const next=segment.replace(oldToken,newToken);
    engine=engine.slice(0,pos)+next+engine.slice(end);
    mutations++;repairedQuestions.add(id);
  }else if(!segment.includes(newToken)){
    fail(`${id} ${label} matches neither defective nor repaired signature`);
  }
}

for(const [id,bad,good] of PROMPT_FIXES)repairOverridePrompt(id,bad,good);
repairSourceToken('phase9.nt.romans.7.structure','"biblicalEvidence":["Romans 8"]','"biblicalEvidence":["Romans 7","Romans 8"]','evidence');
repairSourceToken('phase9.nt.romans.8.book-understanding','"biblicalEvidence":["Romans 9-11"]','"biblicalEvidence":["Romans 8","Romans 9-11"]','evidence');
repairSourceToken('phase11.connection.passover-christ','"reference":"Exodus 12; 1 Corinthians 5:7; Gospel Passion narratives"','"reference":"Exodus 12; 1 Corinthians 5:7; John 19:14, 36"','reference');
repairSourceToken('phase11.connection.passover-christ','"biblicalEvidence":["Exodus 12; 1 Corinthians 5:7; Gospel Passion narratives"]','"biblicalEvidence":["Exodus 12; 1 Corinthians 5:7; John 19:14, 36"]','evidence');

if(mutations!==0&&mutations!==15)fail(`expected 15 first-pass field transformations or 0 idempotent transformations, got ${mutations}`);
if(mutations!==0&&repairedQuestions.size!==12)fail(`expected 12 repaired questions, got ${repairedQuestions.size}`);

if(mutations){
  const gz=zlib.gzipSync(Buffer.from(engine,'utf8'),{level:9});
  const b64=gz.toString('base64');
  if(zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8')!==engine)fail('engine re-pack round-trip mismatch');
  html=html.replace(pkgRe,(_,open,_payload,close)=>open+b64+close);
  fs.writeFileSync(INDEX,html,'utf8');
}
console.log(`P2C repair complete: ${mutations} field transformation(s) across ${repairedQuestions.size} semantic defect question(s).`);
