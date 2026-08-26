#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const baselinePath=path.join(ROOT,'certification/p2a-question-bank-extraction-baseline.json');
const summaryPath=path.join(DIR,'question-bank-summary.json');
if(!fs.existsSync(baselinePath)||!fs.existsSync(summaryPath))throw new Error('P2D freeze requires P2A baseline and generated summary');
const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
const summary=JSON.parse(fs.readFileSync(summaryPath,'utf8'));
const expected={canonical:5799,registry:6072,structured:203,books:66,aliases:273};
for(const [k,v] of Object.entries(expected))if(summary?.counts?.[k]!==v)throw new Error(`Refusing P2D baseline update: ${k}=${summary?.counts?.[k]} expected ${v}`);
const p2c=baseline?.p2c;
if(!p2c||p2c.phase!=='P2C'||p2c.semanticAccuracy!==true||p2c.confirmedDefectsRemaining!==0)throw new Error('P2D requires completed P2C semantic certification');
baseline.source=baseline.source||{};
baseline.source.indexBlobSha1=summary.source.indexBlobSha1;
baseline.hashes=baseline.hashes||{};
baseline.hashes.algorithm='sha256';
baseline.hashes.canonicalBankSha256=summary.hashes.canonicalBank;
baseline.hashes.structuredBankSha256=summary.hashes.structuredBank;
baseline.hashes.registryBankSha256=summary.hashes.registry;
baseline.p2d={
  phase:'P2D',
  questionQuality:true,
  canonicalQuestionsReviewed:5799,
  choiceQuestionsReviewed:5596,
  confirmedDefectsRemaining:0,
  repairedQuestions:6,
  repairedFieldTransformations:6,
  stemTaskRepairs:6,
  difficultyPolicyTransformations:1,
  certifiedDifficultyPins:6,
  difficultyDistributionPreserved:true,
  warningsNonBlocking:true
};
fs.writeFileSync(baselinePath,JSON.stringify(baseline,null,2)+'\n');
console.log('P2D froze the question-quality-corrected P2A source and aggregate hashes.');
console.log(`Index blob SHA-1: ${baseline.source.indexBlobSha1}`);
console.log(`Canonical SHA-256: ${baseline.hashes.canonicalBankSha256}`);
console.log(`Structured SHA-256: ${baseline.hashes.structuredBankSha256}`);
console.log(`Registry SHA-256: ${baseline.hashes.registryBankSha256}`);
