#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');

const ROOT=path.resolve(__dirname,'..');
const INDEX=process.env.P2B_INDEX||path.join(ROOT,'index.html');
const EXPECTED_IDS=[
  'phase11.timeline.davidic','phase11.timeline.elijah','phase11.timeline.jesus','phase11.timeline.paul','phase11.timeline.return','phase11.timeline.sinai',
  'v21.timelineInsertion.02','v21.timelineInsertion.03','v21.timelineInsertion.04','v21.timelineInsertion.09','v21.timelineInsertion.10','v21.timelineInsertion.11','v21.timelineInsertion.12','v21.timelineInsertion.13','v21.timelineInsertion.14','v21.timelineInsertion.15','v21.timelineInsertion.16','v21.timelineInsertion.21','v21.timelineInsertion.22','v21.timelineInsertion.23','v21.timelineInsertion.24','v21.timelineInsertion.25','v21.timelineInsertion.26','v21.timelineInsertion.27','v21.timelineInsertion.28','v21.timelineInsertion.29','v21.timelineInsertion.30','v21.timelineInsertion.31','v21.timelineInsertion.32'
];
const DOMAIN=new Set(['0','1','2','3']);
function fail(msg){throw new Error(`P2B repair: ${msg}`)}
if(!fs.existsSync(INDEX))fail(`missing ${INDEX}`);
let html=fs.readFileSync(INDEX,'utf8');
const pkgRe=/(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
const m=html.match(pkgRe);if(!m)fail('embedded engine package not found');
let engine=zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8');
let changes=0;
const repaired=[];
for(const id of EXPECTED_IDS){
  const marker=`"${id}":{"options":`;
  const pos=engine.indexOf(marker);
  if(pos<0)fail(`override not found for ${id}`);
  if(engine.indexOf(marker,pos+1)>=0)fail(`override not unique for ${id}`);
  const a=pos+marker.length;
  if(engine[a]!=='[')fail(`options array malformed for ${id}`);
  const b=engine.indexOf(']',a);if(b<0)fail(`options array unterminated for ${id}`);
  const options=JSON.parse(engine.slice(a,b+1)).map(String);
  const missing=[...DOMAIN].filter(x=>!options.includes(x));
  const extra=options.filter(x=>!DOMAIN.has(x));
  if(missing.length===0&&extra.length===0&&options.length===4)continue;
  if(options.length!==4||missing.length!==1||extra.length!==1)fail(`${id} unexpected insertion domain: ${JSON.stringify(options)}`);
  const fixed=options.map(x=>x===extra[0]?missing[0]:x);
  if(new Set(fixed).size!==4||fixed.some(x=>!DOMAIN.has(x)))fail(`${id} repair did not restore 0–3 domain`);
  engine=engine.slice(0,a)+JSON.stringify(fixed)+engine.slice(b+1);
  changes++;repaired.push({id,from:options,to:fixed});
}
{
  const id='numbers-6-24-context';
  const marker=`{"itemId":"${id}","fields":{"options":`;
  const pos=engine.indexOf(marker);if(pos<0)fail(`${id} QB2 override not found`);
  if(engine.indexOf(marker,pos+1)>=0)fail(`${id} QB2 override not unique`);
  const a=pos+marker.length;const b=engine.indexOf(']',a);if(b<0)fail(`${id} options unterminated`);
  const options=JSON.parse(engine.slice(a,b+1));
  const bare='The opening line of the priestly blessing';
  const punct=bare+'.';
  if(options.includes(bare)){
    const fixed=options.map(x=>x===bare?punct:x);
    engine=engine.slice(0,a)+JSON.stringify(fixed)+engine.slice(b+1);
    changes++;repaired.push({id,from:bare,to:punct});
  }else if(!options.includes(punct))fail(`${id} expected answer option not found: ${JSON.stringify(options)}`);
}
for(const id of EXPECTED_IDS){
  const marker=`"${id}":{"options":`;const pos=engine.indexOf(marker);const a=pos+marker.length;const b=engine.indexOf(']',a);
  const options=JSON.parse(engine.slice(a,b+1)).map(String);
  if(options.length!==4||new Set(options).size!==4||options.some(x=>!DOMAIN.has(x)))fail(`${id} remains invalid after repair`);
}
const gz=zlib.gzipSync(Buffer.from(engine,'utf8'),{level:9});
const b64=gz.toString('base64');
const check=zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8');
if(check!==engine)fail('engine re-pack round-trip mismatch');
if(changes){
  html=html.replace(pkgRe,(_,open,_payload,close)=>open+b64+close);
  fs.writeFileSync(INDEX,html,'utf8');
}
console.log(`P2B repair complete: ${changes} confirmed source defect(s) corrected.`);
for(const x of repaired)console.log(`  ${x.id}: ${JSON.stringify(x.from)} -> ${JSON.stringify(x.to)}`);
if(changes!==0&&changes!==30)fail(`expected either 30 first-pass repairs or 0 idempotent repairs, got ${changes}`);
