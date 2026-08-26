#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const zlib=require('node:zlib');
const {execFileSync}=require('node:child_process');

const ROOT=path.resolve(__dirname,'..');
const P2C_SOURCE='fc5be02b1163306177cd7de1588b4664cbfa0143';
const INDEX=path.join(ROOT,'index.html');
const pkgRe=/(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
const fail=msg=>{throw new Error(`P2D preservation: ${msg}`)};
function split(html){
  const m=html.match(pkgRe);if(!m)fail('embedded engine package missing');
  return {
    shell:html.replace(pkgRe,`${m[1]}__P2D_ENGINE_PAYLOAD__${m[3]}`),
    engine:zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8')
  };
}
if(!fs.existsSync(INDEX))fail('current index.html missing');
const baseHtml=execFileSync('git',['show',`${P2C_SOURCE}:index.html`],{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024});
const tmp=path.join(os.tmpdir(),`tbc-p2d-expected-${process.pid}.html`);
fs.writeFileSync(tmp,baseHtml,'utf8');
try{
  execFileSync(process.execPath,['scripts/p2d-question-quality-repair.cjs'],{
    cwd:ROOT,
    env:{...process.env,P2D_INDEX:tmp},
    encoding:'utf8',
    stdio:['ignore','pipe','pipe'],
    maxBuffer:64*1024*1024
  });
  const expected=split(fs.readFileSync(tmp,'utf8'));
  const current=split(fs.readFileSync(INDEX,'utf8'));
  if(expected.shell!==current.shell)fail('HTML outside the embedded engine package changed from the P2C production baseline');
  if(expected.engine!==current.engine)fail('decompressed engine differs from P2C by more than the six approved prompt repairs and one six-ID difficulty-preservation injection');
}finally{
  try{fs.unlinkSync(tmp)}catch{}
}
console.log('TBC P2D — Exact Preservation Audit');
console.log(`PASS  outer HTML remains byte-equivalent to P2C production source ${P2C_SOURCE}`);
console.log('PASS  decompressed engine equals P2C engine plus exactly the approved P2D question-quality repairs');
console.log('P2D PRESERVATION PASSED: no unrelated monolith changes detected.');
