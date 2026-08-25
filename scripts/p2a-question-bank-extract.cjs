#!/usr/bin/env node
'use strict';

/**
 * TBC P2A — Canonical Question Bank Extraction
 *
 * Read-only audit tooling. TBC's production monolith contains both global
 * lexical registries and later audited question layers, so this extractor
 * discovers question-bearing arrays in the initialized browser realm rather
 * than assuming one public `window` array owns all 5,799 playable questions.
 * Generated evidence is written only under artifacts/p2a (or P2A_OUT_DIR).
 */

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const ROOT=path.resolve(__dirname,'..');
const INDEX=path.join(ROOT,'index.html');
const OUT=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const EXPECTED={canonical:5799,registry:6072,structured:203,books:66};
const TIERS=['Beginner','Easy','Standard','Advanced','Expert'];
const EXPECTED_TIERS={Beginner:1338,Easy:1666,Standard:1133,Advanced:1141,Expert:521};
const SCHEMA_VERSION='P2A.1';
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
function clone(v,depth=0){if(depth>10)return'[max-depth]';if(v==null||['string','number','boolean'].includes(typeof v))return v;if(Array.isArray(v))return v.map(x=>clone(x,depth+1));if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort()){const x=v[k];if(typeof x!=='function'&&typeof x!=='symbol')o[k]=clone(x,depth+1)}return o}return String(v)}

const ALIASES={
 id:['id','qid','questionId','question_id','itemId','key','uid'],
 sourceId:['sourceQuestionId','legacyQuestionId','canonicalQuestionId','sourceId'],
 question:['question','q','prompt','stem','text','questionText','label','display'],
 answer:['correctAnswer','correct','answer','a','solution'],
 options:['options','choices','answers','answerOptions'],
 distractors:['distractors','wrongAnswers','incorrectAnswers'],
 reference:['reference','references','ref','scripture','verse','citation','bibleReference'],
 book:['book','bookName','bibleBook','primaryBook'],
 category:['category','topic','theme','domain','skill','family','knowledgeArea'],
 difficulty:['difficulty','level','tier','targetTier','sourceDifficulty'],
 explanation:['explanation','explain','rationale','feedback'],
 evidence:['evidence','support','proof','scriptureEvidence','biblicalEvidence','evidenceRefs'],
 memoryCue:['memoryCue','memory','cue','mnemonic','hint'],
 collections:['collections','collection','collectionIds','tags'],
 modes:['modes','mode','modeEligibility','eligibleModes','allowedModes','d3Modes','d4Modes'],
 type:['type','questionType','interactionType','kind','format','interaction']
};
function get(raw,names){for(const k of names)if(Object.prototype.hasOwnProperty.call(raw,k)&&raw[k]!=null)return{key:k,value:raw[k]};const map=new Map(Object.keys(raw).map(k=>[lower(k),k]));for(const alias of names){const k=map.get(lower(alias));if(k&&raw[k]!=null)return{key:k,value:raw[k]}}return{key:null,value:null}}
function asArray(v){if(v==null)return[];if(Array.isArray(v))return v.map(x=>typeof x==='object'?clone(x):norm(x));return[typeof v==='object'?clone(v):norm(v)]}
function normalizeTier(v){const s=lower(v);if(!s)return null;const exact=TIERS.find(t=>lower(t)===s);if(exact)return exact;const n=Number(s);if(Number.isInteger(n)&&n>=1&&n<=5)return TIERS[n-1];const aliases={novice:'Beginner',beginner:'Beginner',basic:'Beginner',easy:'Easy',medium:'Standard',normal:'Standard',standard:'Standard',hard:'Advanced',advanced:'Advanced',expert:'Expert'};return aliases[s]||norm(v)}
function inferBook(raw,ref){const direct=get(raw,ALIASES.book).value;if(direct){const b=BOOKS.find(x=>lower(x)===lower(direct));if(b)return b}const text=[norm(direct),norm(ref)].join(' ');return BOOKS.slice().sort((a,b)=>b.length-a.length).find(b=>new RegExp(`(^|\\b)${b.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}(?=\\s|\\d|:|$)`,'i').test(text))||null}
function logicalId(raw){const own=get(raw,ALIASES.id);if(own.value!=null&&norm(own.value))return norm(own.value);const src=get(raw,ALIASES.sourceId);if(src.value!=null&&norm(src.value))return norm(src.value);return null}
function normalizedQuestion(raw,index,origin){const f={};for(const [name,aliases] of Object.entries(ALIASES))f[name]=get(raw,aliases);const q=norm(f.question.value);const ans=typeof f.answer.value==='object'?clone(f.answer.value):norm(f.answer.value);const opts=asArray(f.options.value);const explicit=asArray(f.distractors.value);const ansText=typeof ans==='string'?lower(ans):'';const distractors=explicit.length?explicit:opts.filter(v=>typeof v!=='string'||lower(v)!==ansText);const ref=typeof f.reference.value==='object'?clone(f.reference.value):(norm(f.reference.value)||null);const runtimeId=f.id.value==null?'':norm(f.id.value);const sourceId=f.sourceId.value==null?'':norm(f.sourceId.value);const difficulty=normalizeTier(f.difficulty.value);const type=f.type.value==null?null:norm(f.type.value);const book=inferBook(raw,ref);const identity={question:q,correctAnswer:ans,bibleReference:ref,book,difficulty,questionType:type};const canonicalId=runtimeId||sourceId||`p2a-${sha256(identity).slice(0,20)}`;
 const qualityKeys=['reviewStatus','qualityFlags','qualityScore','disputedInterpretation','answerLeak','multipleDefensibleAnswers','esotericOnly','distractorRationales','learningObjective','questionFamily','inferenceSteps','obscurity','distractorSimilarity','contextSupport','chronologySpan','interpretationLoad','structureComplexity','recallSpecificity'];const quality={};for(const k of qualityKeys)if(Object.prototype.hasOwnProperty.call(raw,k))quality[k]=clone(raw[k]);
 const o={canonicalId,idSource:runtimeId?`runtime:${f.id.key}`:sourceId?`source:${f.sourceId.key}`:'derived:sha256',sourceQuestionId:sourceId||null,sourceOrigin:origin,sourceIndex:index,question:q,correctAnswer:ans,distractors,options:opts,bibleReference:ref,book,category:f.category.value==null?null:clone(f.category.value),difficulty,explanation:f.explanation.value==null?null:clone(f.explanation.value),evidence:f.evidence.value==null?null:clone(f.evidence.value),memoryCue:f.memoryCue.value==null?null:clone(f.memoryCue.value),collections:asArray(f.collections.value),modeEligibility:asArray(f.modes.value),questionType:type,qualityMetadata:quality,sourceKeys:Object.keys(raw).sort()};const h={...o};delete h.canonicalId;delete h.idSource;delete h.sourceOrigin;delete h.sourceIndex;o.contentSha256=sha256(h);return o}
function profile(items){const m=new Map();for(const x of items.slice(0,Math.min(items.length,500)))if(x&&typeof x==='object'&&!Array.isArray(x))for(const k of Object.keys(x))m.set(k,(m.get(k)||0)+1);return[...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,70).map(([key,count])=>({key,count}))}
function questionScore(items){if(!Array.isArray(items)||!items.length)return 0;const sample=items.slice(0,Math.min(items.length,400));let objects=0;const keys=new Set();for(const x of sample)if(x&&typeof x==='object'&&!Array.isArray(x)){objects++;Object.keys(x).forEach(k=>keys.add(lower(k)))}const s=[...keys].join('|');let score=(objects/sample.length)*45;if(/question|prompt|stem|label|display/.test(s))score+=15;if(/answer|correct|solution/.test(s))score+=15;if(/option|choice|distractor|answers/.test(s))score+=10;if(/book|reference|verse|scripture/.test(s))score+=6;if(/difficulty|level|tier/.test(s))score+=6;if(/explain|evidence|reviewstatus|quality/.test(s))score+=3;return Math.round(score)}
function distribution(records){const out=Object.fromEntries(TIERS.map(t=>[t,0]));for(const q of records)if(out[q.difficulty]!=null)out[q.difficulty]++;return out}
function tierMatch(d){return TIERS.every(t=>d[t]===EXPECTED_TIERS[t])}
function booksOf(records){return[...new Set(records.map(q=>q.book).filter(Boolean))].sort()}
function dedupe(records){const by=new Map();for(const q of records){let id=q.canonicalId;if(!by.has(id)){by.set(id,q);continue}const prev=by.get(id);if(prev.contentSha256===q.contentSha256)continue;const prevScore=Object.keys(prev.qualityMetadata||{}).length+(prev.explanation?1:0)+(prev.evidence?1:0);const score=Object.keys(q.qualityMetadata||{}).length+(q.explanation?1:0)+(q.evidence?1:0);if(score>=prevScore)by.set(id,q)}return[...by.values()]}
function fixIdCollisions(records){const counts=new Map();for(const q of records)counts.set(q.canonicalId,(counts.get(q.canonicalId)||0)+1);const seen=new Map();for(const q of records){if((counts.get(q.canonicalId)||0)>1){const base=q.canonicalId;const n=(seen.get(base)||0)+1;seen.set(base,n);q.originalCanonicalId=base;q.canonicalId=`${base}#${n}`;q.idSource+=':collision-disambiguated'}}}
function structuredLike(q){const s=[q.questionType,...q.sourceKeys,Object.keys(q.qualityMetadata||{})].filter(Boolean).join(' ');return /structured|sequence|timeline|chain|matrix|ladder|group|ordering|order|sort|match|drag|multi[-_ ]?part/i.test(s)}

function declarationNames(source){const set=new Set();const patterns=[/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,/\bclass\s+([A-Za-z_$][\w$]*)\b/g];for(const re of patterns){let m;while((m=re.exec(source)))set.add(m[1])}return[...set].sort()}

async function discoverRuntime(names){let chromium;try{({chromium}=require('playwright'))}catch{return{arrays:[],diagnostics:{available:false,reason:'playwright-not-installed'}}}const base=process.env.P2A_BASE_URL||'http://127.0.0.1:4173/';const browser=await chromium.launch({headless:true});try{const context=await browser.newContext();const page=await context.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(1400);const result=await page.evaluate((declared)=>{
 const out=[];const discovered=[];const seen=new WeakSet();const roots=[];const keyScore=(keys)=>{const s=keys.map(x=>String(x).toLowerCase()).join('|');let n=0;if(/question|prompt|stem|label|display/.test(s))n+=15;if(/answer|correct|solution/.test(s))n+=15;if(/option|choice|distractor|answers/.test(s))n+=10;if(/book|reference|verse|scripture/.test(s))n+=6;if(/difficulty|level|tier/.test(s))n+=6;if(/explain|evidence|reviewstatus|quality/.test(s))n+=3;return n};
 const inspect=(value,p,depth)=>{if(!value||(typeof value!=='object'&&typeof value!=='function'))return;if(seen.has(value))return;seen.add(value);if(Array.isArray(value)){if(value.length<20||value.length>7000)return;let objects=0;const keys={};for(const x of value.slice(0,400))if(x&&typeof x==='object'&&!Array.isArray(x)){objects++;for(const k of Object.keys(x))keys[k]=(keys[k]||0)+1}const ks=Object.keys(keys);const score=Math.round((objects/Math.min(value.length,400))*45+keyScore(ks));if(score>=60||[5799,6072,203].includes(value.length)){let serial=null;try{serial=structuredClone(value)}catch{try{serial=JSON.parse(JSON.stringify(value))}catch{}}out.push({path:p,length:value.length,score,keys:Object.entries(keys).sort((a,b)=>b[1]-a[1]).slice(0,70),value:serial})}return}if(depth>=6)return;if(typeof Node!=='undefined'&&value instanceof Node)return;if(value===window||value===document)return;let keys=[];try{keys=Object.keys(value).slice(0,1200)}catch{return}for(const k of keys){if(/^(window|self|top|parent|frames|document|location|navigator|history|localStorage|sessionStorage)$/.test(k))continue;try{inspect(value[k],`${p}.${k}`,depth+1)}catch{}}};
 for(const k of Object.getOwnPropertyNames(window)){if(/^TBC_|question|quiz|bank|registry|canonical|structured|pool/i.test(k)){try{roots.push({name:`window.${k}`,value:window[k]})}catch{}}}
 for(const name of declared){if(!/question|quiz|bank|registry|canonical|structured|pool|item|audit|release|curriculum|phase|d\d/i.test(name))continue;try{const value=(0,eval)(name);if(value&&(typeof value==='object'||typeof value==='function')){roots.push({name:`lexical:${name}`,value});discovered.push(name)}}catch{}}
 for(const r of roots)try{inspect(r.value,r.name,0)}catch{}
 return{arrays:out,discoveredLexicals:discovered,rootCount:roots.length};
 },names);await context.close();return{arrays:result.arrays||[],diagnostics:{available:true,base,pageErrors,declaredNames:names.length,discoveredLexicals:result.discoveredLexicals||[],rootCount:result.rootCount||0}}}finally{await browser.close()}}

function makeCandidate(array){const records=array.value.map((raw,i)=>normalizedQuestion(raw,i,array.path));return{path:array.path,length:array.length,score:array.score,raw:array.value,records,dist:distribution(records),books:booksOf(records)}}
function resolveExact(candidates,target,requireTiers=false){for(const c of candidates.filter(c=>c.length===target).sort((a,b)=>b.score-a.score)){const rec=dedupe(c.records);if(rec.length!==target)continue;if(requireTiers&&!tierMatch(distribution(rec)))continue;return{records:rec,strategy:`direct:${c.path}`,paths:[c.path],sourceCount:c.length}}
 return null}
function subsetResolution(candidates,target,requireTiers=false){const usable=candidates.filter(c=>c.length<=target&&c.length>=20).sort((a,b)=>b.score-a.score).slice(0,18);let answer=null;function dfs(i,total,chosen){if(answer)return;if(total===target){const rec=dedupe(chosen.flatMap(c=>c.records));if(rec.length!==target)return;const d=distribution(rec);if(requireTiers&&!tierMatch(d))return;answer={records:rec,strategy:`layer-union:${chosen.map(c=>c.path).join('+')}`,paths:chosen.map(c=>c.path),sourceCount:chosen.reduce((s,c)=>s+c.length,0)};return}if(total>target||i>=usable.length||chosen.length>=8)return;dfs(i+1,total+usable[i].length,[...chosen,usable[i]]);dfs(i+1,total,chosen)}dfs(0,0,[]);if(answer)return answer;
 // Also test deduped unions where overlapping/replacement layers make raw lengths exceed target.
 const top=usable.slice(0,12);for(let mask=1;mask<(1<<top.length);mask++){if((mask&(mask-1))===0)continue;const chosen=[];for(let i=0;i<top.length;i++)if(mask&(1<<i))chosen.push(top[i]);if(chosen.length>7)continue;const rec=dedupe(chosen.flatMap(c=>c.records));if(rec.length!==target)continue;const d=distribution(rec);if(requireTiers&&!tierMatch(d))continue;return{records:rec,strategy:`dedup-layer-union:${chosen.map(c=>c.path).join('+')}`,paths:chosen.map(c=>c.path),sourceCount:chosen.reduce((s,c)=>s+c.length,0)}}return null}
function semanticFilter6072(candidate){const raw=candidate.raw;const keyset=new Set();for(const x of raw.slice(0,1200))if(x&&typeof x==='object')for(const k of Object.keys(x))if(/alias|duplicate|redundant|exclude|deprecated|canonical|playable|active|shadow|supersed/i.test(k))keyset.add(k);for(const k of keyset){const tests=[['null',x=>x?.[k]==null],['not-true',x=>x?.[k]!==true],['not-false',x=>x?.[k]!==false],['truthy',x=>Boolean(x?.[k])],['falsy',x=>!x?.[k]]];for(const [label,test] of tests){const f=raw.filter(test);if(f.length!==EXPECTED.canonical)continue;const rec=f.map((x,i)=>normalizedQuestion(x,i,`${candidate.path}|filter:${k}:${label}`));if(tierMatch(distribution(rec)))return{records:rec,strategy:`registry-filter:${candidate.path}:${k}:${label}`,paths:[candidate.path],sourceCount:raw.length}}}return null}

async function main(){if(!fs.existsSync(INDEX))throw new Error('index.html missing');fs.mkdirSync(OUT,{recursive:true});const sourceBuffer=fs.readFileSync(INDEX);const source=sourceBuffer.toString('utf8');const names=declarationNames(source);const runtime=await discoverRuntime(names);const metadata=runtime.arrays.map(a=>({path:a.path,length:a.length,score:a.score,fieldProfile:(a.keys||[]).map(([key,count])=>({key,count}))}));fs.writeFileSync(path.join(OUT,'candidate-discovery.json'),stableJson({schemaVersion:SCHEMA_VERSION,sourceBytes:sourceBuffer.length,sourceBlobSha1:gitBlobSha1(sourceBuffer),runtime:runtime.diagnostics,arrays:metadata},true)+'\n');
 const candidates=runtime.arrays.filter(a=>Array.isArray(a.value)&&a.value.length).map(makeCandidate);let registry=resolveExact(candidates,EXPECTED.registry,false)||subsetResolution(candidates,EXPECTED.registry,false);let canonical=resolveExact(candidates,EXPECTED.canonical,true);if(!canonical){for(const c of candidates.filter(c=>c.length===EXPECTED.registry)){canonical=semanticFilter6072(c);if(canonical)break}}if(!canonical)canonical=subsetResolution(candidates,EXPECTED.canonical,true);
 if(!canonical){console.error('P2A could not yet reconstruct the exact 5,799-question canonical bank.');console.error('Question-bearing runtime arrays:');for(const m of metadata.sort((a,b)=>b.length-a.length))console.error(`  ${m.length}\t${m.score}\t${m.path}\t${m.fieldProfile.slice(0,12).map(x=>x.key).join(',')}`);process.exit(2)}
 if(!registry){ // The canonical set may be sourced from a 6,072 registry whose alias map is separate; require real evidence rather than hard-coding.
   const exact6072=candidates.find(c=>c.length===EXPECTED.registry);if(exact6072)registry={records:exact6072.records,strategy:`direct-registry:${exact6072.path}`,paths:[exact6072.path],sourceCount:exact6072.length};
 }
 if(!registry){console.error('P2A resolved canonical questions but could not resolve the preserved 6,072-question registry.');console.error(`Canonical strategy: ${canonical.strategy}`);process.exit(3)}
 let questions=canonical.records;fixIdCollisions(questions);questions.sort((a,b)=>a.canonicalId.localeCompare(b.canonicalId,'en'));
 let structured=resolveExact(candidates,EXPECTED.structured,false);let structuredRecords=structured?structured.records:questions.filter(structuredLike);if(structuredRecords.length!==EXPECTED.structured){console.error(`P2A structured-question resolution is ${structuredRecords.length}; expected 203.`);console.error(`Canonical strategy: ${canonical.strategy}`);console.error(`Structured candidates: ${candidates.filter(c=>c.length===EXPECTED.structured).map(c=>c.path).join(', ')||'none'}`);process.exit(4)}fixIdCollisions(structuredRecords);structuredRecords.sort((a,b)=>a.canonicalId.localeCompare(b.canonicalId,'en'));
 const dist=distribution(questions),books=booksOf(questions);const fieldCoverage={};for(const f of ['question','correctAnswer','distractors','options','bibleReference','book','category','difficulty','explanation','evidence','memoryCue','collections','modeEligibility','questionType','qualityMetadata'])fieldCoverage[f]=questions.filter(q=>Array.isArray(q[f])?q[f].length>0:q[f]&&typeof q[f]==='object'?Object.keys(q[f]).length>0:q[f]!=null&&q[f]!=='').length;
 const bankHash=sha256(questions.map(q=>[q.canonicalId,q.contentSha256]));const structuredHash=sha256(structuredRecords.map(q=>[q.canonicalId,q.contentSha256]));const summary={schemaVersion:SCHEMA_VERSION,source:{indexBlobSha1:gitBlobSha1(sourceBuffer),canonicalStrategy:canonical.strategy,canonicalPaths:canonical.paths,registryStrategy:registry.strategy,registryPaths:registry.paths,structuredStrategy:structured?structured.strategy:'canonical-structured-field-hints'},counts:{canonical:questions.length,registry:registry.records.length,structured:structuredRecords.length,books:books.length},expected:EXPECTED,difficultyDistribution:dist,books,fieldCoverage,hashes:{algorithm:'sha256',canonicalBank:bankHash,structuredBank:structuredHash},readOnly:true};fs.writeFileSync(path.join(OUT,'question-bank.json'),stableJson({schemaVersion:SCHEMA_VERSION,questions},true)+'\n');fs.writeFileSync(path.join(OUT,'structured-questions.json'),stableJson({schemaVersion:SCHEMA_VERSION,questions:structuredRecords},true)+'\n');fs.writeFileSync(path.join(OUT,'question-bank-summary.json'),stableJson(summary,true)+'\n');
 console.log('TBC P2A — Question Bank Extraction');console.log(`Canonical: ${questions.length} via ${canonical.strategy}`);console.log(`Registry: ${registry.records.length} via ${registry.strategy}`);console.log(`Structured: ${structuredRecords.length} via ${summary.source.structuredStrategy}`);console.log(`Books: ${books.length}`);console.log(`Difficulty: ${TIERS.map(t=>`${t}=${dist[t]}`).join(', ')}`);console.log(`Canonical SHA-256: ${bankHash}`);console.log(`Structured SHA-256: ${structuredHash}`);if(questions.length!==EXPECTED.canonical||registry.records.length!==EXPECTED.registry||structuredRecords.length!==EXPECTED.structured||books.length!==EXPECTED.books||!tierMatch(dist))process.exit(5)}
main().catch(e=>{console.error(e.stack||e);process.exit(1)});
