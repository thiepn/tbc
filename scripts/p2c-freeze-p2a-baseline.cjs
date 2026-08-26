#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const baselinePath=path.join(ROOT,'certification/p2a-question-bank-extraction-baseline.json');
const summaryPath=path.join(DIR,'question-bank-summary.json');
if(!fs.existsSync(baselinePath)||!fs.existsSync(summaryPath))throw new Error('P2C freeze requires P2A baseline and generated summary');
const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
const summary=JSON.parse(fs.readFileSync(summaryPath,'utf8'));
const expected={canonical:5799,registry:6072,structured:203,books:66};
for(const [k,v] of Object.entries(expected))if(summary?.counts?.[k]!==v)throw new Error(`Refusing baseline update: ${k}=${summary?.counts?.[k]} expected ${v}`);
if(summary?.counts?.aliases!==273)throw new Error(`Refusing baseline update: aliases=${summary?.counts?.aliases} expected 273`);
if(baseline?.p2b?.phase!=='P2B'||baseline?.p2b?.mechanicalIntegrity!==true||baseline?.p2b?.confirmedDefectsRemaining!==0)throw new Error('P2C requires the completed P2B mechanical baseline');
baseline.source=baseline.source||{};
baseline.source.indexBlobSha1=summary.source.indexBlobSha1;
baseline.hashes=baseline.hashes||{};
baseline.hashes.algorithm='sha256';
baseline.hashes.canonicalBankSha256=summary.hashes.canonicalBank;
baseline.hashes.structuredBankSha256=summary.hashes.structuredBank;
baseline.hashes.registryBankSha256=summary.hashes.registry;
baseline.p2c={
  phase:'P2C',
  semanticAccuracy:true,
  canonicalQuestionsReviewed:5799,
  confirmedDefectsRemaining:0,
  repairedQuestions:12,
  repairedFieldTransformations:15,
  stemDomainRepairs:9,
  evidenceRepairs:2,
  formalReferenceRepairs:1,
  acceptedCrossBookExceptions:1,
  difficultyPolicyTransformations:1,
  certifiedDifficultyPins:4,
  difficultyDistributionPreserved:true
};
fs.writeFileSync(baselinePath,JSON.stringify(baseline,null,2)+'\n');
console.log('P2C froze the semantically corrected P2A source and aggregate hashes.');
console.log(`Index blob SHA-1: ${baseline.source.indexBlobSha1}`);
console.log(`Canonical SHA-256: ${baseline.hashes.canonicalBankSha256}`);
console.log(`Structured SHA-256: ${baseline.hashes.structuredBankSha256}`);
console.log(`Registry SHA-256: ${baseline.hashes.registryBankSha256}`);
