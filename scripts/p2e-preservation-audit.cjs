#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const zlib=require('node:zlib');
const {execFileSync}=require('node:child_process');

const ROOT=path.resolve(__dirname,'..');
const P2D_SOURCE='3fc262f187ff9186885f9e48af86963e9d39c34c';
const INDEX=path.join(ROOT,'index.html');
const pkgRe=/(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
const fail=msg=>{throw new Error(`P2E preservation: ${msg}`)};
function split(html){
  const m=html.match(pkgRe);if(!m)fail('embedded engine package missing');
  return {
    shell:html.replace(pkgRe,`${m[1]}__P2E_ENGINE_PAYLOAD__${m[3]}`),
    engine:zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8')
  };
}
if(!fs.existsSync(INDEX))fail('current index.html missing');
const baseHtml=execFileSync('git',['show',`${P2D_SOURCE}:index.html`],{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024});
const tmp=path.join(os.tmpdir(),`tbc-p2e-expected-${process.pid}.html`);
fs.writeFileSync(tmp,baseHtml,'utf8');
try{
  execFileSync(process.execPath,['scripts/p2e-difficulty-calibration-repair.cjs'],{
    cwd:ROOT,
    env:{...process.env,P2E_INDEX:tmp},
    encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:64*1024*1024
  });
  const expected=split(fs.readFileSync(tmp,'utf8'));
  const current=split(fs.readFileSync(INDEX,'utf8'));
  if(expected.shell!==current.shell)fail('HTML outside the embedded engine package changed from the P2D production baseline');
  if(expected.engine!==current.engine)fail('decompressed engine differs from P2D by more than removal of the ten deferred difficulty pins');
}finally{try{fs.unlinkSync(tmp)}catch{}}
console.log('TBC P2E — Exact Preservation Audit');
console.log(`PASS  outer HTML remains byte-equivalent to P2D production source ${P2D_SOURCE}`);
console.log('PASS  engine equals P2D with only the ten deferred P2C/P2D difficulty pins removed');
console.log('P2E PRESERVATION PASSED: no unrelated monolith changes detected.');
