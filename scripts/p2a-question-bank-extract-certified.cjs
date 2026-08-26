#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const SOURCE=path.join(__dirname,'p2a-question-bank-extract.cjs');
const BASELINE=path.join(ROOT,'certification/p2a-question-bank-extraction-baseline.json');
const fail=msg=>{console.error(`P2A certified extractor: ${msg}`);process.exit(1)};
let tiers;
if(process.env.P2A_EXPECTED_TIERS){try{tiers=JSON.parse(process.env.P2A_EXPECTED_TIERS)}catch{fail('P2A_EXPECTED_TIERS is not valid JSON')}}
else {if(!fs.existsSync(BASELINE))fail('certification baseline missing');tiers=JSON.parse(fs.readFileSync(BASELINE,'utf8'))?.expected?.difficultyDistribution;}
const keys=['Beginner','Easy','Standard','Advanced','Expert'];
if(!tiers||keys.some(k=>!Number.isInteger(tiers[k])))fail(`invalid certified difficulty distribution: ${JSON.stringify(tiers)}`);
let src=fs.readFileSync(SOURCE,'utf8');
const re=/const EXPECTED_TIERS=\{Beginner:\d+,Easy:\d+,Standard:\d+,Advanced:\d+,Expert:\d+\};/;
if(!re.test(src))fail('could not locate P2A EXPECTED_TIERS constant');
const replacement=`const EXPECTED_TIERS={Beginner:${tiers.Beginner},Easy:${tiers.Easy},Standard:${tiers.Standard},Advanced:${tiers.Advanced},Expert:${tiers.Expert}};`;
src=src.replace(re,replacement);
const tmp=path.join(__dirname,`.p2a-certified-${process.pid}-${Date.now()}.cjs`);
fs.writeFileSync(tmp,src,'utf8');
try{
  console.log(`P2A certified extractor distribution: ${keys.map(k=>`${k}=${tiers[k]}`).join(', ')}`);
  const r=spawnSync(process.execPath,[tmp],{cwd:ROOT,env:process.env,stdio:'inherit'});
  if(r.error)throw r.error;
  process.exitCode=r.status??1;
}finally{try{fs.unlinkSync(tmp)}catch{}}
