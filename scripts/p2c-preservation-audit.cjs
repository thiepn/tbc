#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const zlib=require('node:zlib');
const {execFileSync}=require('node:child_process');

const ROOT=path.resolve(__dirname,'..');
const P2B_SOURCE='8a7088cefa60c460b9db7c138054b3b65b2000c4';
const INDEX=path.join(ROOT,'index.html');
const pkgRe=/(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
const fail=msg=>{throw new Error(`P2C preservation: ${msg}`)};
function split(html){
  const m=html.match(pkgRe);if(!m)fail('embedded engine package missing');
  return {
    shell:html.replace(pkgRe,`${m[1]}__P2C_ENGINE_PAYLOAD__${m[3]}`),
    engine:zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8')
  };
}
if(!fs.existsSync(INDEX))fail('current index.html missing');
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
  const current=split(fs.readFileSync(INDEX,'utf8'));
  if(expected.shell!==current.shell)fail('HTML outside the embedded engine package changed from the P2B production baseline');
  if(expected.engine!==current.engine)fail('decompressed engine differs from the P2B baseline by more than the 15 approved P2C field transformations');
}finally{
  try{fs.unlinkSync(tmp)}catch{}
}
console.log('TBC P2C — Exact Preservation Audit');
console.log(`PASS  outer HTML remains byte-equivalent to P2B production source ${P2B_SOURCE}`);
console.log('PASS  decompressed engine equals P2B engine plus exactly the approved P2C semantic repairs');
console.log('P2C PRESERVATION PASSED: no unrelated monolith changes detected.');
