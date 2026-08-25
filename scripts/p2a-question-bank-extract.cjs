#!/usr/bin/env node
'use strict';

/**
 * TBC P2A — Canonical Question Bank Extraction
 *
 * Read-only audit tooling. The v4.1.0 engine already defines authoritative
 * question-bank boundaries:
 *   - TBC_QB0.registry()               => 6,072 source registry records
 *   - TBC_QB6.activeQuestions()        => 5,799 canonical active questions
 *   - TBC_QB8.canonicalStructured()    => 203 canonical structured questions
 *   - TBC_QB11.freezeManifest/bankAudit => final release assertions
 *
 * P2A consumes those public runtime APIs and never rewrites gameplay data or
 * browser persistence. Generated evidence lives only under artifacts/p2a.
 */

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const ROOT=path.resolve(__dirname,'..');
const INDEX=path.join(ROOT,'index.html');
const OUT=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const SCHEMA_VERSION='P2A.1';
const EXPECTED={canonical:5799,registry:6072,aliases:273,structured:203,books:66};
const TIERS=['Beginner','Easy','Standard','Advanced','Expert'];
const EXPECTED_TIERS={Beginner:1338,Easy:1666,Standard:1133,Advanced:1141,Expert:521};
const BOOKS=[
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther',
  'Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel',
  'Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians',
  'Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
];

function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o}if(typeof v==='undefined')return null;if(typeof v==='number'&&!Number.isFinite(v))return String(v);return v}
function stableJson(v,pretty=false){return JSON.stringify(stable(v),null,pretty?2:0)}
function sha256(v){return crypto.createHash('sha256').update(typeof v==='string'?v:stableJson(v)).digest('hex')}
function gitBlobSha1(buffer){return crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex')}
function norm(v){return String(v??'').replace(/\s+/g,' ').trim()}
function lower(v){return norm(v).toLowerCase()}
function clone(v,depth=0){if(depth>12)return'[max-depth]';if(v==null||['string','number','boolean'].includes(typeof v))return v;if(Array.isArray(v))return v.map(x=>clone(x,depth+1));if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort()){const x=v[k];if(typeof x!=='function'&&typeof x!=='symbol')o[k]=clone(x,depth+1)}return o}return String(v)}
function asArray(v){if(v==null)return[];if(Array.isArray(v))return v.map(x=>typeof x==='object'?clone(x):norm(x));return[typeof v==='object'?clone(v):norm(v)]}
function normalizeTier(v){const s=lower(v);const map={beginner:'Beginner',easy:'Easy',standard:'Standard',advanced:'Advanced',expert:'Expert'};return map[s]||norm(v)||null}
function normalizeBook(v){const s=norm(v);if(!s)return null;if(/^psalm$/i.test(s))return'Psalms';if(/^song of solomon$/i.test(s))return'Song of Songs';return BOOKS.find(b=>lower(b)===lower(s))||s}
function inferBook(raw){const direct=normalizeBook(raw?.primaryBook||raw?.book||raw?.verse?.book);if(direct&&BOOKS.includes(direct))return direct;const refs=[raw?.reference,raw?.verse?.ref,...asArray(raw?.biblicalEvidence),...asArray(raw?.evidenceRefs)].map(norm).filter(Boolean);for(const ref of refs){const found=BOOKS.slice().sort((a,b)=>b.length-a.length).find(book=>lower(ref).startsWith(lower(book)+' ')||lower(ref)===lower(book));if(found)return found;if(/^psalm\s/i.test(ref))return'Psalms';if(/^song of solomon\s/i.test(ref))return'Song of Songs'}return direct&&BOOKS.includes(direct)?direct:null}
function qid(raw){return norm(raw?.itemId||raw?.id||raw?.questionId||raw?.qid)}
function contentNonEmpty(v){if(v==null)return false;if(typeof v==='string')return !!v.trim();if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.keys(v).length>0;return true}

function normalizeQuestion(raw,index,registryMeta,feedback,structuredSet){
  const canonicalId=qid(raw);
  const answer=typeof raw?.answer==='object'?clone(raw.answer):norm(raw?.answer);
  const options=asArray(raw?.options);
  const answerKey=typeof answer==='string'?lower(answer):'';
  const explicit=asArray(raw?.distractors||raw?.wrongAnswers||raw?.incorrectAnswers);
  const distractors=explicit.length?explicit:options.filter(v=>typeof v!=='string'||lower(v)!==answerKey);
  const reference=clone(raw?.reference??raw?.verse?.ref??raw?.biblicalEvidence?.[0]??raw?.evidenceRefs?.[0]??null);
  const evidence=clone(raw?.biblicalEvidence??raw?.evidenceRefs??feedback?.evidence??[]);
  const interaction=norm(raw?.interaction||'choice').toLowerCase()||'choice';
  const qualityKeys=['reviewStatus','qualityFlags','qualityScore','disputedInterpretation','answerLeak','multipleDefensibleAnswers','esotericOnly','distractorRationales','learningObjective','questionFamily','inferenceSteps','obscurity','distractorSimilarity','contextSupport','chronologySpan','interpretationLoad','structureComplexity','recallSpecificity','qb5Difficulty','qb6Disposition','qb6VariantRole','qb6RedundancyReasons','qb6Active','qb6CanonicalId','qb6Version'];
  const qualityMetadata={};for(const key of qualityKeys)if(Object.prototype.hasOwnProperty.call(raw||{},key))qualityMetadata[key]=clone(raw[key]);
  if(registryMeta?.review)qualityMetadata.registryReview=clone(registryMeta.review);
  if(registryMeta?.difficulty)qualityMetadata.registryDifficulty=clone(registryMeta.difficulty);
  if(feedback)qualityMetadata.qb7Feedback=clone(feedback);
  const modes=raw?.modeEligibility??raw?.modes??raw?.d3Modes??raw?.d4Modes??registryMeta?.modeEligibility?.approved??registryMeta?.modeEligibility?.pending??[];
  const category=raw?.category??raw?.topic??raw?.theme??raw?.domain??raw?.skill??raw?.family??raw?.knowledgeArea??null;
  const normalized={
    canonicalId,
    idSource:'runtime:itemId',
    sourceQuestionId:norm(raw?.sourceQuestionId)||null,
    sourceOrigin:'TBC_QB6.activeQuestions()',
    sourceIndex:index,
    question:norm(raw?.prompt??raw?.question??raw?.stem??raw?.display??raw?.label),
    correctAnswer:answer,
    distractors,
    options,
    bibleReference:reference,
    book:inferBook(raw),
    category:category==null?null:clone(category),
    difficulty:normalizeTier(raw?.difficulty??raw?.qb5Difficulty?.finalTier??raw?.targetTier),
    explanation:clone(raw?.explanation??feedback?.whyCorrect??null),
    evidence,
    memoryCue:clone(raw?.memoryCue??raw?.hint??feedback?.learningFocus??null),
    collections:asArray(raw?.collections??raw?.collection??raw?.collectionIds??raw?.tags),
    modeEligibility:asArray(modes),
    questionType:norm(raw?.type||raw?.questionType||raw?.family)||null,
    interactionType:interaction,
    structured:structuredSet.has(canonicalId),
    qualityMetadata,
    registryMetadata:registryMeta?clone({canonicalId:registryMeta.canonicalId,sourceId:registryMeta.sourceId,disposition:registryMeta.disposition,modeEligibility:registryMeta.modeEligibility,evidence:registryMeta.evidence,difficulty:registryMeta.difficulty,review:registryMeta.review}):null,
    sourceKeys:Object.keys(raw||{}).sort()
  };
  const hashInput={...normalized};delete hashInput.canonicalId;delete hashInput.idSource;delete hashInput.sourceOrigin;delete hashInput.sourceIndex;
  normalized.contentSha256=sha256(hashInput);
  return normalized;
}

function distribution(questions){const out=Object.fromEntries(TIERS.map(t=>[t,0]));for(const q of questions)if(Object.prototype.hasOwnProperty.call(out,q.difficulty))out[q.difficulty]++;return out}
function booksOf(questions){return[...new Set(questions.map(q=>q.book).filter(Boolean))].sort()}

async function extractRuntime(){
  const {chromium}=require('playwright');
  const base=process.env.P2A_BASE_URL||'http://127.0.0.1:4173/';
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext();
    const page=await context.newPage();
    const pageErrors=[];const consoleErrors=[];
    page.on('pageerror',e=>pageErrors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>window.TBC_QB11?.installed===true&&typeof window.TBC_QB0?.registry==='function'&&typeof window.TBC_QB6?.activeQuestions==='function'&&typeof window.TBC_QB8?.canonicalStructured==='function',null,{timeout:25000});
    const data=await page.evaluate(()=>{
      const canonical=window.TBC_QB6.activeQuestions();
      const registry=window.TBC_QB0.registry();
      const structured=window.TBC_QB8.canonicalStructured();
      const structuredIds=structured.map(q=>String(q?.itemId||q?.id||''));
      const feedback={};
      if(typeof window.TBC_QB7?.feedbackFor==='function')for(const q of canonical){const id=String(q?.itemId||q?.id||'');try{feedback[id]=window.TBC_QB7.feedbackFor(q)}catch{feedback[id]=null}}
      const aliasRows=[];
      for(const row of registry){const id=String(row?.itemId||row?.id||'');let info=null;try{info=window.TBC_QB6.aliasInfo(id)}catch{}if(info)aliasRows.push({itemId:id,...info})}
      const safe=v=>JSON.parse(JSON.stringify(v));
      return safe({
        canonical,registry,structuredIds,feedback,aliasRows,
        qb6Manifest:window.TBC_QB6.manifest,
        qb11Freeze:window.TBC_QB11.freezeManifest,
        qb11BankAudit:window.TBC_QB11.bankAudit(),
        qb8SchemaAudit:window.TBC_QB8.schemaAudit(),
        qb8InteractionAudit:window.TBC_QB8.interactionAudit(),
        qb6DuplicateScan:window.TBC_QB6.duplicateScan()
      });
    });
    await context.close();
    return{base,pageErrors,consoleErrors,...data};
  }finally{await browser.close()}
}

async function main(){
  if(!fs.existsSync(INDEX))throw new Error('index.html missing');
  fs.mkdirSync(OUT,{recursive:true});
  const source=fs.readFileSync(INDEX);
  const runtime=await extractRuntime();
  const registry=runtime.registry||[];
  const canonicalRaw=runtime.canonical||[];
  const structuredSet=new Set(runtime.structuredIds||[]);
  const registryById=new Map(registry.map(row=>[norm(row?.itemId||row?.id),row]));
  const questions=canonicalRaw.map((raw,index)=>normalizeQuestion(raw,index,registryById.get(qid(raw))||null,runtime.feedback?.[qid(raw)]||null,structuredSet));
  questions.sort((a,b)=>a.canonicalId.localeCompare(b.canonicalId,'en'));
  const byId=new Map(questions.map(q=>[q.canonicalId,q]));
  const structured=[...structuredSet].map(id=>byId.get(id)).filter(Boolean).sort((a,b)=>a.canonicalId.localeCompare(b.canonicalId,'en'));
  const ids=new Set(questions.map(q=>q.canonicalId));
  const dist=distribution(questions);
  const books=booksOf(questions);
  const fieldCoverage={};
  for(const field of ['question','correctAnswer','distractors','options','bibleReference','book','category','difficulty','explanation','evidence','memoryCue','collections','modeEligibility','questionType','interactionType','qualityMetadata'])fieldCoverage[field]=questions.filter(q=>contentNonEmpty(q[field])).length;
  const bankHash=sha256(questions.map(q=>[q.canonicalId,q.contentSha256]));
  const structuredHash=sha256(structured.map(q=>[q.canonicalId,q.contentSha256]));
  const registryHash=sha256(registry.slice().sort((a,b)=>qid(a).localeCompare(qid(b),'en')).map(row=>[qid(row),sha256(row)]));
  const summary={
    schemaVersion:SCHEMA_VERSION,
    source:{
      indexBlobSha1:gitBlobSha1(source),
      authority:'QB11 frozen runtime',
      registryApi:'TBC_QB0.registry()',
      canonicalApi:'TBC_QB6.activeQuestions()',
      structuredApi:'TBC_QB8.canonicalStructured()',
      feedbackApi:'TBC_QB7.feedbackFor()',
      qb6Manifest:runtime.qb6Manifest,
      qb11Freeze:runtime.qb11Freeze
    },
    counts:{canonical:questions.length,registry:registry.length,aliases:(runtime.aliasRows||[]).length,structured:structured.length,books:books.length},
    expected:EXPECTED,
    difficultyDistribution:dist,
    books,
    fieldCoverage,
    runtimeHealth:{pageErrors:runtime.pageErrors,consoleErrors:runtime.consoleErrors,qb11BankAudit:runtime.qb11BankAudit,qb8SchemaAudit:runtime.qb8SchemaAudit,qb8InteractionAudit:runtime.qb8InteractionAudit,qb6DuplicateScan:runtime.qb6DuplicateScan},
    hashes:{algorithm:'sha256',canonicalBank:bankHash,structuredBank:structuredHash,registry:registryHash},
    readOnly:true
  };
  fs.writeFileSync(path.join(OUT,'question-bank.json'),stableJson({schemaVersion:SCHEMA_VERSION,questions},true)+'\n');
  fs.writeFileSync(path.join(OUT,'structured-questions.json'),stableJson({schemaVersion:SCHEMA_VERSION,questions:structured},true)+'\n');
  fs.writeFileSync(path.join(OUT,'question-registry.json'),stableJson({schemaVersion:SCHEMA_VERSION,records:registry,aliases:runtime.aliasRows||[]},true)+'\n');
  fs.writeFileSync(path.join(OUT,'question-bank-summary.json'),stableJson(summary,true)+'\n');
  fs.writeFileSync(path.join(OUT,'candidate-discovery.json'),stableJson({schemaVersion:SCHEMA_VERSION,authority:summary.source,counts:summary.counts,runtimeHealth:summary.runtimeHealth},true)+'\n');

  console.log('TBC P2A — Authoritative Question Bank Extraction');
  console.log(`Registry: ${registry.length} via TBC_QB0.registry()`);
  console.log(`Canonical: ${questions.length} via TBC_QB6.activeQuestions()`);
  console.log(`Merged aliases: ${(runtime.aliasRows||[]).length}`);
  console.log(`Structured: ${structured.length} via TBC_QB8.canonicalStructured()`);
  console.log(`Unique canonical IDs: ${ids.size}`);
  console.log(`Books: ${books.length}`);
  console.log(`Difficulty: ${TIERS.map(t=>`${t}=${dist[t]}`).join(', ')}`);
  console.log(`Canonical SHA-256: ${bankHash}`);
  console.log(`Structured SHA-256: ${structuredHash}`);
  console.log(`Registry SHA-256: ${registryHash}`);

  const bad=[];
  if(registry.length!==EXPECTED.registry)bad.push(`registry=${registry.length}`);
  if(questions.length!==EXPECTED.canonical)bad.push(`canonical=${questions.length}`);
  if(ids.size!==EXPECTED.canonical)bad.push(`uniqueIds=${ids.size}`);
  if((runtime.aliasRows||[]).length!==EXPECTED.aliases)bad.push(`aliases=${(runtime.aliasRows||[]).length}`);
  if(structured.length!==EXPECTED.structured)bad.push(`structured=${structured.length}`);
  if(books.length!==EXPECTED.books)bad.push(`books=${books.length}`);
  for(const tier of TIERS)if(dist[tier]!==EXPECTED_TIERS[tier])bad.push(`${tier}=${dist[tier]}`);
  if(runtime.qb11BankAudit?.passed!==true)bad.push('QB11 bankAudit did not pass');
  if(runtime.qb8SchemaAudit?.passed!==true)bad.push('QB8 schemaAudit did not pass');
  if(runtime.qb8InteractionAudit?.passed!==true)bad.push('QB8 interactionAudit did not pass');
  if((runtime.pageErrors||[]).length)bad.push(`pageErrors=${runtime.pageErrors.length}`);
  if((runtime.consoleErrors||[]).length)bad.push(`consoleErrors=${runtime.consoleErrors.length}`);
  if(bad.length){console.error(`P2A extraction contract failed: ${bad.join(', ')}`);process.exit(2)}
}

main().catch(error=>{console.error(error.stack||error);process.exit(1)});
