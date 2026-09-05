#!/usr/bin/env node
'use strict';

/**
 * TBC P2A — Deterministic Question Bank Audit Gate
 *
 * Validates generated extraction artifacts against the P2A contract. This is
 * intentionally read-only and does not import or execute gameplay state logic.
 */

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {worktreeBlob}=require('./tbc-source-identity.cjs');
const {qb11AuditHealthy}=require('./tbc-product-identity.cjs');

const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const BASELINE_PATH=path.join(ROOT,'certification/p2a-question-bank-extraction-baseline.json');
const TIERS=['Beginner','Easy','Standard','Advanced','Expert'];

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object'){const out={};for(const k of Object.keys(value).sort())out[k]=stable(value[k]);return out}
  return value;
}
function sha256(value){return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')}
function file(name){return path.join(DIR,name)}

for(const name of ['question-bank.json','structured-questions.json','question-registry.json','question-bank-summary.json','candidate-discovery.json']){
  if(!fs.existsSync(file(name))){console.error(`P2A audit missing artifact: ${name}`);process.exit(1)}
}
if(!fs.existsSync(BASELINE_PATH)){console.error('P2A audit missing certification baseline.');process.exit(1)}

const bank=readJson(file('question-bank.json'));
const structured=readJson(file('structured-questions.json'));
const summary=readJson(file('question-bank-summary.json'));
const registry=readJson(file('question-registry.json'));
const discovery=readJson(file('candidate-discovery.json'));
const baseline=require('./tbc-product-identity.cjs').currentP2ABaseline(ROOT);
const questions=bank.questions||[];
const structuredQuestions=structured.questions||[];
const checks=[];
const check=(name,pass,detail='')=>checks.push({name,pass:Boolean(pass),detail});

check('schema version',summary.schemaVersion===baseline.schemaVersion,`${summary.schemaVersion} vs ${baseline.schemaVersion}`);
check('artifact schema versions', [bank,structured,registry,discovery].every(x=>x.schemaVersion===baseline.schemaVersion));
check('read-only extraction contract',summary.readOnly===true);
check('canonical count',questions.length===baseline.expected.canonical,`${questions.length}`);
check('registry count',summary.counts.registry===baseline.expected.registry,`${summary.counts.registry}`);
check('registry records count',Array.isArray(registry.records)&&registry.records.length===baseline.expected.registry);
check('alias count',Array.isArray(registry.aliases)&&registry.aliases.length===273&&summary.counts.aliases===273);
check('structured count',structuredQuestions.length===baseline.expected.structured,`${structuredQuestions.length}`);
check('whole-Bible count',summary.counts.books===baseline.expected.books,`${summary.counts.books}`);
check('all 66 canonical books observed',Array.isArray(summary.books)&&summary.books.length===baseline.expected.books);
check('five-tier vocabulary only',questions.every(q=>TIERS.includes(q.difficulty)));
for(const tier of TIERS)check(`${tier} distribution`,summary.difficultyDistribution?.[tier]===baseline.expected.difficultyDistribution[tier],`${summary.difficultyDistribution?.[tier]}`);
check('distribution recomputed from records',TIERS.every(t=>questions.filter(q=>q.difficulty===t).length===summary.difficultyDistribution[t]));
check('books recomputed from records',new Set(questions.map(q=>q.book).filter(Boolean)).size===66);

const ids=questions.map(q=>q.canonicalId);
const idSet=new Set(ids);
check('canonical IDs present',questions.every(q=>typeof q.canonicalId==='string'&&q.canonicalId.length>0));
check('canonical IDs unique',idSet.size===questions.length,`${idSet.size}/${questions.length}`);
check('content hashes present',questions.every(q=>/^[0-9a-f]{64}$/.test(q.contentSha256||'')));
function contentHash(q){const v={...q};for(const k of ['canonicalId','idSource','sourceOrigin','sourceIndex','contentSha256'])delete v[k];return sha256(v)}
check('per-question content hashes recomputed',questions.every(q=>contentHash(q)===q.contentSha256));
check('question text extraction non-empty',questions.every(q=>typeof q.question==='string'&&q.question.trim().length>0));
check('answer extraction non-empty',questions.every(q=>q.correctAnswer!=null&&(typeof q.correctAnswer!=='string'||q.correctAnswer.trim().length>0)));
check('source keys retained',questions.every(q=>Array.isArray(q.sourceKeys)&&q.sourceKeys.length>0));
check('no gameplay-state ownership',!JSON.stringify(summary).includes('localStorage.setItem')&&!JSON.stringify(summary).includes('sessionStorage.setItem'));

const recomputedBankHash=sha256(questions.map(q=>[q.canonicalId,q.contentSha256]));
const recomputedStructuredHash=sha256(structuredQuestions.map(q=>[q.canonicalId,q.contentSha256]));
const qid=row=>String(row?.itemId||row?.id||row?.questionId||row?.qid||'').replace(/\s+/g,' ').trim();
const records=registry.records||[];
const registryIds=records.map(qid);
check('registry IDs present and unique',registryIds.every(Boolean)&&new Set(registryIds).size===records.length);
const registryIdSet=new Set(registryIds);
const aliases=registry.aliases||[];
check('alias identities and canonical targets',new Set(aliases.map(a=>a.itemId)).size===aliases.length&&aliases.every(a=>registryIdSet.has(a.itemId)&&!idSet.has(a.itemId)&&idSet.has(a.canonicalId))&&ids.every(id=>registryIdSet.has(id)));
check('alias cluster count',new Set(aliases.map(a=>a.canonicalId)).size===270);
const recomputedRegistryHash=sha256(records.slice().sort((a,b)=>qid(a).localeCompare(qid(b),'en')).map(row=>[qid(row),sha256(row)]));
check('registry aggregate hash self-consistent',summary.hashes?.registry===recomputedRegistryHash);
check('registry frozen hash',recomputedRegistryHash===baseline.hashes?.registryBankSha256);
check('all aggregate hashes frozen', ['canonicalBankSha256','structuredBankSha256','registryBankSha256'].every(k=>/^[a-f0-9]{64}$/.test(baseline.hashes?.[k]||'')));
check('canonical aggregate hash self-consistent',summary.hashes?.canonicalBank===recomputedBankHash,`${summary.hashes?.canonicalBank} vs ${recomputedBankHash}`);
check('structured aggregate hash self-consistent',summary.hashes?.structuredBank===recomputedStructuredHash,`${summary.hashes?.structuredBank} vs ${recomputedStructuredHash}`);
if(baseline.hashes?.canonicalBankSha256)check('canonical frozen hash',recomputedBankHash===baseline.hashes.canonicalBankSha256,`${recomputedBankHash}`);
if(baseline.hashes?.structuredBankSha256)check('structured frozen hash',recomputedStructuredHash===baseline.hashes.structuredBankSha256,`${recomputedStructuredHash}`);
if(baseline.source?.indexBlobSha1)check('frozen monolith source identity',summary.source?.indexBlobSha1===baseline.source.indexBlobSha1,`${summary.source?.indexBlobSha1}`);
check('artifacts match current candidate source',summary.source?.indexBlobSha1===worktreeBlob('index.html'));
check('runtime health',summary.runtimeHealth?.pageErrors?.length===0&&summary.runtimeHealth?.consoleErrors?.length===0&&qb11AuditHealthy(summary.runtimeHealth?.qb11BankAudit)&&['qb8SchemaAudit','qb8InteractionAudit'].every(k=>summary.runtimeHealth?.[k]?.passed===true));
check('discovery agrees with summary',JSON.stringify(stable(discovery.counts))===JSON.stringify(stable(summary.counts))&&JSON.stringify(stable(discovery.authority))===JSON.stringify(stable(summary.source))&&JSON.stringify(stable(discovery.runtimeHealth))===JSON.stringify(stable(summary.runtimeHealth)));

const requiredNormalizedFields=['question','correctAnswer','distractors','options','bibleReference','book','category','difficulty','explanation','evidence','memoryCue','collections','modeEligibility','questionType'];
for(const field of requiredNormalizedFields)check(`normalized field available: ${field}`,questions.every(q=>Object.prototype.hasOwnProperty.call(q,field)));

const structuredIds=new Set(structuredQuestions.map(q=>q.canonicalId));
check('structured IDs unique',structuredIds.size===structuredQuestions.length);
check('structured content hashes present',structuredQuestions.every(q=>/^[0-9a-f]{64}$/.test(q.contentSha256||'')));
const byId=new Map(questions.map(q=>[q.canonicalId,q]));
check('structured records are exact canonical subset',structuredQuestions.every(q=>q.structured===true&&JSON.stringify(stable(q))===JSON.stringify(stable(byId.get(q.canonicalId)))));
check('structured flags account for subset',questions.filter(q=>q.structured).length===structuredQuestions.length);

const failed=checks.filter(x=>!x.pass);
console.log('TBC P2A — Question Bank Extraction Audit');
for(const item of checks)console.log(`${item.pass?'PASS':'FAIL'}  ${item.name}${!item.pass&&item.detail?` — ${item.detail}`:''}`);
console.log(`\n${checks.length-failed.length}/${checks.length} P2A checks passed.`);
console.log(`Canonical SHA-256: ${recomputedBankHash}`);
console.log(`Structured SHA-256: ${recomputedStructuredHash}`);
console.log(`Registry SHA-256: ${recomputedRegistryHash}`);
if(failed.length){console.error(`P2A FAILED: ${failed.length} extraction invariant(s) failed.`);process.exit(1)}
console.log('P2A PASSED: all 5,799 canonical questions are deterministically represented by the audit infrastructure.');
