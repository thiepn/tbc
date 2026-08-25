#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const BOOKS=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
const TIERS=new Set(['Beginner','Easy','Standard','Advanced','Expert']);
const EXPECTED={canonical:5799,registry:6072,aliases:273,structured:203,books:66};
const INTERACTIONS=new Set(['choice','sequence','chain','grouping','insertion','matrix','ladder']);
const bad=[];const warnings=[];
const fail=(code,id,detail)=>bad.push({code,id:id||null,detail});
const warn=(code,id,detail)=>warnings.push({code,id:id||null,detail});
const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
const normChoice=v=>norm(v).normalize('NFC').toLowerCase();
const hasCorruption=s=>/\uFFFD|Ã|Â|â€|â€™|â€œ|â€˜/.test(s)||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s);
function load(name){const p=path.join(DIR,name);if(!fs.existsSync(p))throw new Error(`P2B missing artifact: ${p}`);return JSON.parse(fs.readFileSync(p,'utf8'))}
const bank=load('question-bank.json');const structured=load('structured-questions.json');const registry=load('question-registry.json');const summary=load('question-bank-summary.json');
const qs=bank.questions||[];const sq=structured.questions||[];const records=registry.records||[];const aliases=registry.aliases||[];

if(qs.length!==EXPECTED.canonical)fail('COUNT_CANONICAL',null,`${qs.length} != ${EXPECTED.canonical}`);
if(records.length!==EXPECTED.registry)fail('COUNT_REGISTRY',null,`${records.length} != ${EXPECTED.registry}`);
if(aliases.length!==EXPECTED.aliases)fail('COUNT_ALIASES',null,`${aliases.length} != ${EXPECTED.aliases}`);
if(sq.length!==EXPECTED.structured)fail('COUNT_STRUCTURED',null,`${sq.length} != ${EXPECTED.structured}`);
if(summary?.counts?.books!==EXPECTED.books)fail('COUNT_BOOKS',null,`${summary?.counts?.books} != ${EXPECTED.books}`);

const ids=new Set();const sourceIndexes=new Set();
for(const q of qs){
  const id=q.canonicalId;
  if(typeof id!=='string'||!id||!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id))fail('BAD_ID',id,JSON.stringify(id));
  if(ids.has(id))fail('DUPLICATE_ID',id,'canonical ID repeated');else ids.add(id);
  if(!Number.isInteger(q.sourceIndex)||q.sourceIndex<0||q.sourceIndex>=EXPECTED.canonical)fail('BAD_SOURCE_INDEX',id,String(q.sourceIndex));
  else if(sourceIndexes.has(q.sourceIndex))fail('DUP_SOURCE_INDEX',id,String(q.sourceIndex));else sourceIndexes.add(q.sourceIndex);
  if(!TIERS.has(q.difficulty))fail('BAD_DIFFICULTY',id,String(q.difficulty));
  if(q.book!=null&&!BOOKS.includes(q.book))fail('BAD_BOOK',id,String(q.book));
  if(!norm(q.question))fail('EMPTY_QUESTION',id,'question is empty');
  if(q.correctAnswer==null||(typeof q.correctAnswer==='string'&&!norm(q.correctAnswer)))fail('EMPTY_ANSWER',id,'correct answer is empty');
  if(!INTERACTIONS.has(q.interactionType))fail('BAD_INTERACTION',id,String(q.interactionType));
  const opts=Array.isArray(q.options)?q.options:[];
  if(opts.length!==4)fail('BAD_OPTION_COUNT',id,`expected 4, got ${opts.length}`);
  const optNorm=opts.map(v=>normChoice(typeof v==='string'?v:JSON.stringify(v)));
  if(optNorm.some(x=>!x))fail('EMPTY_OPTION',id,JSON.stringify(opts));
  if(new Set(optNorm).size!==optNorm.length)fail('DUPLICATE_OPTIONS',id,JSON.stringify(opts));
  const ansNorm=normChoice(typeof q.correctAnswer==='string'?q.correctAnswer:JSON.stringify(q.correctAnswer));
  if(!optNorm.includes(ansNorm))fail('ANSWER_NOT_IN_OPTIONS',id,`answer=${JSON.stringify(q.correctAnswer)} options=${JSON.stringify(opts)}`);
  const ds=Array.isArray(q.distractors)?q.distractors:[];
  if(ds.length!==3)fail('BAD_DISTRACTOR_COUNT',id,`expected 3, got ${ds.length}`);
  const dNorm=ds.map(v=>normChoice(typeof v==='string'?v:JSON.stringify(v)));
  if(new Set(dNorm).size!==dNorm.length)fail('DUPLICATE_DISTRACTORS',id,JSON.stringify(ds));
  if(dNorm.includes(ansNorm))fail('ANSWER_IN_DISTRACTORS',id,JSON.stringify(ds));
  if(q.interactionType==='insertion'){
    const domain=new Set(opts.map(String));
    if(opts.length!==4||domain.size!==4||[...domain].some(x=>!['0','1','2','3'].includes(x)))fail('BAD_INSERTION_DOMAIN',id,JSON.stringify(opts));
    if(!['0','1','2','3'].includes(String(q.correctAnswer)))fail('BAD_INSERTION_ANSWER',id,String(q.correctAnswer));
  }
  const rendered=JSON.stringify([q.question,q.correctAnswer,q.bibleReference,q.explanation,q.evidence,q.memoryCue,q.options,q.distractors]);
  if(hasCorruption(rendered))fail('CORRUPTED_TEXT',id,'control/mojibake/replacement character detected');
  if(/\b(?:undefined|NaN)\b/.test(norm(q.bibleReference)))fail('MALFORMED_REFERENCE',id,String(q.bibleReference));
  if(q.book==null){
    if(id==='phase11.match.letters'&&String(q.bibleReference)==='Romans; Galatians; Hebrews; James')warn('CROSS_BOOK_REFERENCE',id,'intentional multi-book matrix item has no single book');
    else fail('ORPHAN_BOOK',id,String(q.bibleReference));
  }
}
if(sourceIndexes.size!==EXPECTED.canonical)fail('SOURCE_INDEX_COVERAGE',null,`${sourceIndexes.size}/${EXPECTED.canonical}`);
const registryIds=new Set();
for(const row of records){const id=norm(row?.itemId);if(!id)fail('REGISTRY_EMPTY_ID',null,'registry record missing itemId');else if(registryIds.has(id))fail('REGISTRY_DUP_ID',id,'registry itemId repeated');else registryIds.add(id)}
for(const id of ids)if(!registryIds.has(id))fail('ORPHAN_CANONICAL',id,'canonical question absent from source registry');
for(const a of aliases){
  const src=norm(a?.itemId),target=norm(a?.canonicalId);
  if(!src||!registryIds.has(src))fail('BROKEN_ALIAS_SOURCE',src||null,JSON.stringify(a));
  if(!target||!ids.has(target))fail('BROKEN_ALIAS_TARGET',src||null,JSON.stringify(a));
  if(src===target)fail('SELF_ALIAS',src,'alias points to itself');
}
const sids=new Set();for(const q of sq){if(sids.has(q.canonicalId))fail('DUP_STRUCTURED_ID',q.canonicalId,'structured ID repeated');sids.add(q.canonicalId);if(!ids.has(q.canonicalId))fail('ORPHAN_STRUCTURED',q.canonicalId,'structured question absent from canonical bank')}
for(const q of qs)if(String(q.bibleReference)==='Gospel Passion narratives')warn('DESCRIPTIVE_REFERENCE',q.canonicalId,'descriptive reference retained for later factual/editorial audit');

console.log('TBC P2B — Mechanical Integrity Audit');
console.log(`Canonical=${qs.length}; Registry=${records.length}; Aliases=${aliases.length}; Structured=${sq.length}`);
console.log(`Warnings=${warnings.length}; Confirmed defects=${bad.length}`);
for(const w of warnings)console.log(`WARN  ${w.code} ${w.id||''} — ${w.detail}`);
for(const x of bad)console.error(`FAIL  ${x.code} ${x.id||''} — ${x.detail}`);
if(bad.length){console.error(`P2B FAILED: ${bad.length} mechanically confirmed defect(s).`);process.exit(1)}
console.log('P2B PASSED: 0 mechanically confirmed defects across all 5,799 canonical questions.');
