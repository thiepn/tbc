#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const baselinePath=path.join(ROOT,'certification/p2a-question-bank-extraction-baseline.json');
const summaryPath=path.join(DIR,'question-bank-summary.json');
if(!fs.existsSync(baselinePath)||!fs.existsSync(summaryPath))throw new Error('P2E freeze requires P2A baseline and generated summary');
const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
const summary=JSON.parse(fs.readFileSync(summaryPath,'utf8'));
const expectedCounts={canonical:5799,registry:6072,structured:203,books:66,aliases:273};
const expectedDist={Beginner:1338,Easy:1668,Standard:1132,Advanced:1140,Expert:521};
for(const [k,v] of Object.entries(expectedCounts))if(summary?.counts?.[k]!==v)throw new Error(`Refusing P2E baseline update: ${k}=${summary?.counts?.[k]} expected ${v}`);
for(const [k,v] of Object.entries(expectedDist))if(summary?.difficultyDistribution?.[k]!==v)throw new Error(`Refusing P2E baseline update: ${k}=${summary?.difficultyDistribution?.[k]} expected ${v}`);
if(summary?.runtimeHealth?.qb11BankAudit?.passed!==true)throw new Error('Refusing P2E baseline update: QB11 bank audit did not pass');
if(baseline?.p2d?.phase!=='P2D'||baseline?.p2d?.questionQuality!==true||baseline?.p2d?.confirmedDefectsRemaining!==0)throw new Error('P2E requires completed P2D certification');
baseline.source=baseline.source||{};
baseline.source.indexBlobSha1=summary.source.indexBlobSha1;
baseline.expected=baseline.expected||{};
baseline.expected.difficultyDistribution=expectedDist;
baseline.hashes=baseline.hashes||{};
baseline.hashes.algorithm='sha256';
baseline.hashes.canonicalBankSha256=summary.hashes.canonicalBank;
baseline.hashes.structuredBankSha256=summary.hashes.structuredBank;
baseline.hashes.registryBankSha256=summary.hashes.registry;
baseline.p2e={
  phase:'P2E',
  difficultyCalibration:true,
  canonicalQuestionsReviewed:5799,
  confirmedDefectsRemaining:0,
  deferredPinsReviewed:10,
  deferredPinsRemoved:10,
  recalibratedQuestions:4,
  tierChanges:4,
  unchangedDeferredQuestions:6,
  qb6FreezeUpdated:true,
  qb11FreezeUpdated:true,
  previousDifficultyDistribution:{Beginner:1338,Easy:1666,Standard:1133,Advanced:1141,Expert:521},
  difficultyDistribution:expectedDist
};
fs.writeFileSync(baselinePath,JSON.stringify(baseline,null,2)+'\n');
console.log('P2E froze the recalibrated P2A source, hashes, and tier distribution.');
console.log(`Index blob SHA-1: ${baseline.source.indexBlobSha1}`);
console.log(`Canonical SHA-256: ${baseline.hashes.canonicalBankSha256}`);
console.log(`Structured SHA-256: ${baseline.hashes.structuredBankSha256}`);
console.log(`Registry SHA-256: ${baseline.hashes.registryBankSha256}`);
