#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {execFileSync}=require('node:child_process');

const ROOT=path.resolve(__dirname,'..');
const P2A_SOURCE='25d2ff4975e91c031a78ba07ce57fab4c46d80f0';
const INDEX=path.join(ROOT,'index.html');
const INSERTION_IDS=[
  'phase11.timeline.davidic','phase11.timeline.elijah','phase11.timeline.jesus','phase11.timeline.paul','phase11.timeline.return','phase11.timeline.sinai',
  'v21.timelineInsertion.02','v21.timelineInsertion.03','v21.timelineInsertion.04','v21.timelineInsertion.09','v21.timelineInsertion.10','v21.timelineInsertion.11','v21.timelineInsertion.12','v21.timelineInsertion.13','v21.timelineInsertion.14','v21.timelineInsertion.15','v21.timelineInsertion.16','v21.timelineInsertion.21','v21.timelineInsertion.22','v21.timelineInsertion.23','v21.timelineInsertion.24','v21.timelineInsertion.25','v21.timelineInsertion.26','v21.timelineInsertion.27','v21.timelineInsertion.28','v21.timelineInsertion.29','v21.timelineInsertion.30','v21.timelineInsertion.31','v21.timelineInsertion.32'
];
const DOMAIN=new Set(['0','1','2','3']);
const pkgRe=/(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
const fail=msg=>{throw new Error(`P2B preservation: ${msg}`)};
function split(html){
  const m=html.match(pkgRe);if(!m)fail('embedded engine package missing');
  return {shell:html.replace(pkgRe,`${m[1]}__P2B_ENGINE_PAYLOAD__${m[3]}`),engine:zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8')};
}
function forwardRepair(engine){
  let changes=0;
  for(const id of INSERTION_IDS){
    const marker=`"${id}":{"options":`;const pos=engine.indexOf(marker);
    if(pos<0||engine.indexOf(marker,pos+1)>=0)fail(`expected unique insertion override for ${id}`);
    const a=pos+marker.length,b=engine.indexOf(']',a);if(b<0)fail(`unterminated options for ${id}`);
    const options=JSON.parse(engine.slice(a,b+1)).map(String);
    const missing=[...DOMAIN].filter(x=>!options.includes(x));const extra=options.filter(x=>!DOMAIN.has(x));
    if(options.length!==4||missing.length!==1||extra.length!==1)fail(`${id} P2A source no longer matches confirmed defect signature: ${JSON.stringify(options)}`);
    const fixed=options.map(x=>x===extra[0]?missing[0]:x);
    engine=engine.slice(0,a)+JSON.stringify(fixed)+engine.slice(b+1);changes++;
  }
  const id='numbers-6-24-context';const marker=`{"itemId":"${id}","fields":{"options":`;const pos=engine.indexOf(marker);
  if(pos<0||engine.indexOf(marker,pos+1)>=0)fail(`${id} expected unique QB2 override`);
  const a=pos+marker.length,b=engine.indexOf(']',a);if(b<0)fail(`${id} unterminated options`);
  const options=JSON.parse(engine.slice(a,b+1));const bare='The opening line of the priestly blessing';
  if(!options.includes(bare))fail(`${id} P2A source no longer matches confirmed punctuation defect`);
  engine=engine.slice(0,a)+JSON.stringify(options.map(x=>x===bare?bare+'.':x))+engine.slice(b+1);changes++;
  if(changes!==30)fail(`expected exactly 30 transformations, got ${changes}`);
  return engine;
}
if(!fs.existsSync(INDEX))fail('current index.html missing');
const baseHtml=execFileSync('git',['show',`${P2A_SOURCE}:index.html`],{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024});
const currentHtml=fs.readFileSync(INDEX,'utf8');
const base=split(baseHtml),current=split(currentHtml);
if(base.shell!==current.shell)fail('HTML outside the embedded engine package changed');
const expectedEngine=forwardRepair(base.engine);
if(expectedEngine!==current.engine)fail('decompressed engine contains changes beyond the 30 confirmed P2B repairs');
console.log('TBC P2B — Exact Preservation Audit');
console.log(`PASS  outer HTML byte-equivalent to P2A source ${P2A_SOURCE}`);
console.log('PASS  decompressed engine equals P2A engine plus exactly 30 confirmed transformations');
console.log('P2B PRESERVATION PASSED: no unrelated monolith changes detected.');
