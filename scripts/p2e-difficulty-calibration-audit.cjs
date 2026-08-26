#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const OUT=path.resolve(ROOT,process.env.P2E_OUT_DIR||'artifacts/p2e');
const load=n=>JSON.parse(fs.readFileSync(path.join(DIR,n),'utf8'));
const bank=load('question-bank.json');
const summary=load('question-bank-summary.json');
const qs=bank.questions||[];
const failures=[];
const warnings=[];
const fail=(code,id,detail)=>failures.push({code,id:id||null,detail});
const warn=(code,id,detail)=>warnings.push({code,id:id||null,detail});
const EXPECTED_DIST={Beginner:1338,Easy:1668,Standard:1132,Advanced:1140,Expert:521};
const EXPECTED_DEFERRED={
  'd4.easy.major.1-chronicles-inventory-1.01':['Easy',23,'Advanced',63],
  'd4.easy.mode.parables.luke-good-samaritan.16':['Easy',29,'Expert',97],
  'phase9.nt.romans.7.structure':['Advanced',62,'Standard',42],
  'v402.miracle.feeding-bread-discourse':['Expert',80,'Advanced',60],
  'd4.easy.place.place-elah':['Beginner',19,'Beginner',19],
  'place.elah.significance':['Standard',49,'Standard',49],
  'place.jordan.significance':['Standard',49,'Standard',49],
  'place.shechem.significance':['Standard',49,'Standard',49],
  'place.shiloh.significance':['Advanced',64,'Advanced',64],
  'place.valley-elah.v20-significance':['Standard',49,'Standard',49]
};
const tierForScore=n=>n<20?'Beginner':n<40?'Easy':n<60?'Standard':n<80?'Advanced':'Expert';
const normTier=v=>String(v||'').trim().toLowerCase();
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const byId=new Map(qs.map(q=>[q.canonicalId,q]));

if(qs.length!==5799)fail('COUNT_CANONICAL',null,`${qs.length} != 5799`);
for(const [tier,n] of Object.entries(EXPECTED_DIST))if(summary?.difficultyDistribution?.[tier]!==n)fail('DISTRIBUTION',null,`${tier}=${summary?.difficultyDistribution?.[tier]} expected ${n}`);
if(summary?.runtimeHealth?.qb11BankAudit?.passed!==true)fail('QB11_BANK_AUDIT',null,'QB11 frozen runtime audit did not pass after recalibration');

let scored=0;
for(const q of qs){
  const qb5=q?.qualityMetadata?.qb5Difficulty;
  const signal=Number(qb5?.difficultySignal);
  if(!Number.isFinite(signal)){
    fail('MISSING_DIFFICULTY_SIGNAL',q.canonicalId,JSON.stringify(qb5));
    continue;
  }
  scored++;
  if(signal<0||signal>100)fail('DIFFICULTY_SIGNAL_RANGE',q.canonicalId,String(signal));
  const expected=tierForScore(signal);
  if(q.difficulty!==expected)fail('TIER_SCORE_MISMATCH',q.canonicalId,`${q.difficulty}/${signal} expected ${expected}`);
  if(qb5?.finalTier&&cap(normTier(qb5.finalTier))!==q.difficulty)fail('QB5_FINAL_TIER_MISMATCH',q.canonicalId,`${qb5.finalTier} vs ${q.difficulty}`);
  const serialized=JSON.stringify(q);
  if(serialized.includes('p2cDifficultyPreserved')||serialized.includes('p2dDifficultyPreserved'))fail('DEFERRED_PIN_FLAG_REMAINS',q.canonicalId,'temporary prior-phase difficulty preservation flag remains');
}
if(scored!==5799)fail('DIFFICULTY_SIGNAL_COVERAGE',null,`${scored}/5799`);

let tierChanges=0,unchanged=0;
for(const [id,[newTier,newScore,oldTier,oldScore]] of Object.entries(EXPECTED_DEFERRED)){
  const q=byId.get(id);
  if(!q){fail('MISSING_DEFERRED_QUESTION',id,'question absent');continue;}
  const score=Number(q?.qualityMetadata?.qb5Difficulty?.difficultySignal);
  if(q.difficulty!==newTier||score!==newScore)fail('DEFERRED_RECALIBRATION_MISMATCH',id,`${q.difficulty}/${score} expected ${newTier}/${newScore}`);
  if(newTier!==oldTier||newScore!==oldScore)tierChanges++;else unchanged++;
}
if(tierChanges!==4)fail('TIER_CHANGE_COUNT',null,`${tierChanges} != 4`);
if(unchanged!==6)fail('UNCHANGED_DEFERRED_COUNT',null,`${unchanged} != 6`);

// Review-only signal: questions very close to a tier boundary are not defects.
for(const q of qs){
  const score=Number(q?.qualityMetadata?.qb5Difficulty?.difficultySignal);
  if(Number.isFinite(score)&&[19,20,39,40,59,60,79,80].includes(score))warn('BOUNDARY_SCORE',q.canonicalId,`${q.difficulty}/${score}`);
}

fs.mkdirSync(OUT,{recursive:true});
const report={
  phase:'P2E',
  scope:'difficulty-calibration-and-tier-integrity',
  counts:{canonical:qs.length,scored,confirmedDefects:failures.length,warnings:warnings.length,deferredPinsReviewed:10,tierChanges,unchangedDeferredQuestions:unchanged},
  distribution:summary?.difficultyDistribution,
  expectedDistribution:EXPECTED_DIST,
  confirmedDefects:failures,
  warnings
};
fs.writeFileSync(path.join(OUT,'difficulty-calibration-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('TBC P2E — Difficulty Calibration & Tier Integrity Audit');
console.log(`Canonical=${qs.length}; Scored=${scored}; Deferred reviewed=10; Tier changes=${tierChanges}; Unchanged=${unchanged}`);
console.log(`Distribution=${Object.entries(EXPECTED_DIST).map(([k,v])=>`${k}:${v}`).join(' | ')}`);
console.log(`Confirmed defects=${failures.length}; Boundary warnings=${warnings.length}`);
for(const x of failures)console.error(`FAIL  ${x.code} ${x.id||''} — ${x.detail}`);
if(failures.length){console.error(`P2E FAILED: ${failures.length} difficulty-calibration defect(s).`);process.exit(1)}
console.log('P2E PASSED: all 5,799 QB5 signals agree with their tiers and the ten deferred pins are resolved without temporary overrides.');
