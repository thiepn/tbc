#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const crypto=require('node:crypto');

const ROOT=path.resolve(__dirname,'..');
const INDEX=process.env.P2D_INDEX||path.join(ROOT,'index.html');
const BASELINE=path.join(ROOT,'certification/p2a-question-bank-extraction-baseline.json');
const pkgRe=/(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
const fail=msg=>{throw new Error(`P2D repair: ${msg}`)};
const BAD='Which option identifies the place associated with the cited passage?';
const GOOD='Which statement best describes the significance of the cited location?';
const IDS=[
  'd4.easy.place.place-elah',
  'place.elah.significance',
  'place.jordan.significance',
  'place.shechem.significance',
  'place.shiloh.significance',
  'place.valley-elah.v20-significance'
];
const DIFFICULTY_PINS={
  'd4.easy.place.place-elah':['beginner',19],
  'place.elah.significance':['standard',49],
  'place.jordan.significance':['standard',49],
  'place.shechem.significance':['standard',49],
  'place.shiloh.significance':['advanced',64],
  'place.valley-elah.v20-significance':['standard',49]
};

if(!fs.existsSync(INDEX))fail(`missing ${INDEX}`);
let html=fs.readFileSync(INDEX,'utf8');
const m=html.match(pkgRe);if(!m)fail('embedded engine package not found');
let engine=zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8');
let fieldMutations=0;
let policyMutation=0;
const repaired=new Set();

function blobSha1(buffer){return crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex')}
function isExactP2ESuccessor(){
  if(!fs.existsSync(BASELINE)||process.env.P2D_INDEX)return false;
  const b=JSON.parse(fs.readFileSync(BASELINE,'utf8'));
  const e=b?.p2e;
  return e?.phase==='P2E'&&e?.difficultyCalibration===true&&e?.confirmedDefectsRemaining===0&&e?.deferredPinsRemoved===10&&e?.tierChanges===4&&blobSha1(Buffer.from(html,'utf8'))===b?.source?.indexBlobSha1;
}

function repairPrompt(id){
  const startToken=`"itemId":"${id}","fields":{`;
  let cursor=0,seen=0,badCount=0,goodCount=0;
  while(true){
    const pos=engine.indexOf(startToken,cursor);if(pos<0)break;
    seen++;
    const end=engine.indexOf('},"editorial":',pos);if(end<0)fail(`${id} override object unterminated`);
    const segment=engine.slice(pos,end);
    const badToken=`"prompt":${JSON.stringify(BAD)}`;
    const goodToken=`"prompt":${JSON.stringify(GOOD)}`;
    if(segment.includes(badToken)){
      const next=segment.replace(badToken,goodToken);
      engine=engine.slice(0,pos)+next+engine.slice(end);
      cursor=end+(next.length-segment.length);
      badCount++;fieldMutations++;repaired.add(id);
    }else{
      if(segment.includes(goodToken))goodCount++;
      cursor=end+1;
    }
  }
  if(!seen)fail(`${id} has no QB1 editorial override`);
  if(!badCount&&!goodCount)fail(`${id} matches neither defective nor repaired prompt signature`);
}

function preserveDifficulty(){
  if(isExactP2ESuccessor())return;
  const marker='      row.withinTierDifficulty = withinTier(row.score,row.finalDifficulty);';
  const injected=`      const p2dDifficultyPins=${JSON.stringify(DIFFICULTY_PINS)};\n      const p2dPin=p2dDifficultyPins[row.id];\n      if(p2dPin){row.finalDifficulty=p2dPin[0];row.score=p2dPin[1];row.p2dDifficultyPreserved=true;}\n      row.withinTierDifficulty = withinTier(row.score,row.finalDifficulty);`;
  if(engine.includes('const p2dDifficultyPins='))return;
  const first=engine.indexOf(marker);
  if(first<0||engine.indexOf(marker,first+1)>=0)fail('QB5 within-tier marker is missing or not unique');
  engine=engine.replace(marker,injected);policyMutation=1;
}

for(const id of IDS)repairPrompt(id);
preserveDifficulty();

if(fieldMutations!==0&&fieldMutations!==6)fail(`expected 6 first-pass prompt repairs or 0 idempotent prompt repairs, got ${fieldMutations}`);
if(fieldMutations!==0&&repaired.size!==6)fail(`expected six repaired question IDs, got ${repaired.size}`);
if(fieldMutations===0&&policyMutation!==0)fail('difficulty preservation changed without prompt repairs');

if(fieldMutations||policyMutation){
  const gz=zlib.gzipSync(Buffer.from(engine,'utf8'),{level:9});
  const b64=gz.toString('base64');
  if(zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8')!==engine)fail('engine re-pack round-trip mismatch');
  html=html.replace(pkgRe,(_,open,_payload,close)=>open+b64+close);
  fs.writeFileSync(INDEX,html,'utf8');
}
console.log(`P2D repair complete: ${fieldMutations} prompt repair(s) across ${repaired.size} question(s); ${policyMutation} certified-difficulty preservation injection(s).`);
