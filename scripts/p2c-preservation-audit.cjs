#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const zlib=require('node:zlib');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');

const ROOT=path.resolve(__dirname,'..');
const P2B_SOURCE='8a7088cefa60c460b9db7c138054b3b65b2000c4';
const INDEX=path.join(ROOT,'index.html');
const BASELINE=path.join(ROOT,'certification/p2a-question-bank-extraction-baseline.json');
const pkgRe=/(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
const fail=msg=>{throw new Error(`P2C preservation: ${msg}`)};
function split(html){
  const m=html.match(pkgRe);if(!m)fail('embedded engine package missing');
  return {
    shell:html.replace(pkgRe,`${m[1]}__P2C_ENGINE_PAYLOAD__${m[3]}`),
    engine:zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8')
  };
}
function blobSha1(buffer){return crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex')}
function certifiedP2DSuccessor(html){
  if(!fs.existsSync(BASELINE))return false;
  const b=JSON.parse(fs.readFileSync(BASELINE,'utf8'));
  const c=b?.p2c,d=b?.p2d;
  if(!c||c.phase!=='P2C'||c.semanticAccuracy!==true||c.confirmedDefectsRemaining!==0)return false;
  if(!d||d.phase!=='P2D'||d.questionQuality!==true||d.confirmedDefectsRemaining!==0)return false;
  if(d.repairedQuestions!==6||d.repairedFieldTransformations!==6||d.certifiedDifficultyPins!==6)return false;
  const expected=String(b?.source?.indexBlobSha1||'');
  return /^[0-9a-f]{40}$/.test(expected)&&blobSha1(Buffer.from(html,'utf8'))===expected;
}
if(!fs.existsSync(INDEX))fail('current index.html missing');
const currentHtml=fs.readFileSync(INDEX,'utf8');
if(certifiedP2DSuccessor(currentHtml)){
  console.log('TBC P2C — Exact Preservation Audit');
  console.log('PASS  current monolith matches the exact P2D-certified successor source hash');
  console.log('PASS  P2C semantic certification remains embedded in the successor baseline');
  console.log('P2C PRESERVATION PASSED: certified P2D successor accepted.');
  process.exit(0);
}
const baseHtml=execFileSync('git',['show',`${P2B_SOURCE}:index.html`],{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024});
const tmp=path.join(os.tmpdir(),`tbc-p2c-expected-${process.pid}.html`);
fs.writeFileSync(tmp,baseHtml,'utf8');
try{
  execFileSync(process.execPath,['scripts/p2c-question-bank-repair.cjs'],{
    cwd:ROOT,
    env:{...process.env,P2C_INDEX:tmp},
    encoding:'utf8',
    stdio:['ignore','pipe','pipe'],
    maxBuffer:64*1024*1024
  });
  const expected=split(fs.readFileSync(tmp,'utf8'));
  const current=split(currentHtml);
  if(expected.shell!==current.shell)fail('HTML outside the embedded engine package changed from the P2B production baseline');
  if(expected.engine!==current.engine)fail('decompressed engine differs from the P2B baseline by more than the approved P2C repairs and no certified P2D successor is present');
}finally{
  try{fs.unlinkSync(tmp)}catch{}
}
console.log('TBC P2C — Exact Preservation Audit');
console.log(`PASS  outer HTML remains byte-equivalent to P2B production source ${P2B_SOURCE}`);
console.log('PASS  decompressed engine equals P2B engine plus exactly the approved P2C semantic repairs');
console.log('P2C PRESERVATION PASSED: no unrelated monolith changes detected.');
