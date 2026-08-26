#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');

const ROOT=path.resolve(__dirname,'..');
const INDEX=process.env.P2E_INDEX||path.join(ROOT,'index.html');
const pkgRe=/(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
const fail=msg=>{throw new Error(`P2E repair: ${msg}`)};

const OLD_MANIFEST='"activeTierCounts":{"beginner":1338,"advanced":1141,"easy":1666,"standard":1133,"expert":521}';
const NEW_MANIFEST='"activeTierCounts":{"beginner":1338,"advanced":1140,"easy":1668,"standard":1132,"expert":521}';
const OLD_QB11='const QB11_EXPECTED_TIERS=Object.freeze({beginner:1338,easy:1666,standard:1133,advanced:1141,expert:521});';
const NEW_QB11='const QB11_EXPECTED_TIERS=Object.freeze({beginner:1338,easy:1668,standard:1132,advanced:1140,expert:521});';

if(!fs.existsSync(INDEX))fail(`missing ${INDEX}`);
let html=fs.readFileSync(INDEX,'utf8');
const m=html.match(pkgRe);if(!m)fail('embedded engine package not found');
let engine=zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8');

const p2c=/      const p2cDifficultyPins=\{[^\n]+\};\n      const p2cPin=p2cDifficultyPins\[row\.id\];\n      if\(p2cPin\)\{row\.finalDifficulty=p2cPin\[0\];row\.score=p2cPin\[1\];row\.p2cDifficultyPreserved=true;\}\n/;
const p2d=/      const p2dDifficultyPins=\{[^\n]+\};\n      const p2dPin=p2dDifficultyPins\[row\.id\];\n      if\(p2dPin\)\{row\.finalDifficulty=p2dPin\[0\];row\.score=p2dPin\[1\];row\.p2dDifficultyPreserved=true;\}\n/;
const hasC=p2c.test(engine),hasD=p2d.test(engine);
if(hasC!==hasD)fail(`temporary difficulty-pin state is partial: p2c=${hasC}, p2d=${hasD}`);
let removed=0,freezeUpdates=0;
if(hasC){engine=engine.replace(p2c,'');engine=engine.replace(p2d,'');removed=10;}
if(/p2[cd]DifficultyPins|p2[cd]DifficultyPreserved/.test(engine))fail('temporary P2C/P2D difficulty pin code remains after recalibration cleanup');

function replaceFreeze(oldToken,newToken,label){
  const oldCount=engine.split(oldToken).length-1;
  const newCount=engine.split(newToken).length-1;
  if(oldCount===1&&newCount===0){engine=engine.replace(oldToken,newToken);freezeUpdates++;return;}
  if(oldCount===0&&newCount===1)return;
  fail(`${label} freeze state invalid: old=${oldCount}, new=${newCount}`);
}
replaceFreeze(OLD_MANIFEST,NEW_MANIFEST,'QB6 manifest');
replaceFreeze(OLD_QB11,NEW_QB11,'QB11 expected tiers');
if((removed===0)!==(freezeUpdates===0))fail(`partial idempotency state: removed=${removed}, freezeUpdates=${freezeUpdates}`);

if(removed||freezeUpdates){
  const gz=zlib.gzipSync(Buffer.from(engine,'utf8'),{level:9});
  const b64=gz.toString('base64');
  if(zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8')!==engine)fail('engine re-pack round-trip mismatch');
  html=html.replace(pkgRe,(_,open,_payload,close)=>open+b64+close);
  fs.writeFileSync(INDEX,html,'utf8');
}
console.log(`P2E calibration complete: ${removed} deferred difficulty pin(s) removed; ${freezeUpdates} tier-freeze contract(s) updated.`);
