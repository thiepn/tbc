#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const load=n=>JSON.parse(fs.readFileSync(path.join(DIR,n),'utf8'));
const bank=load('question-bank.json');
const registry=load('question-registry.json');
const structured=load('structured-questions.json');
const qs=bank.questions||[];
const fail=[];const warn=[];
const bad=(code,id,detail)=>fail.push({code,id,detail});
const warning=(code,id,detail)=>warn.push({code,id,detail});
const byId=new Map(qs.map(q=>[q.canonicalId,q]));
const EXPECTED={canonical:5799,registry:6072,aliases:273,structured:203};
const BOOKS=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
const REF_BOOKS=[...BOOKS,'Psalm','Song of Solomon'].sort((a,b)=>b.length-a.length);
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const bookPattern=new RegExp(`\\b(?:${REF_BOOKS.map(esc).join('|')})\\b`,'gi');
function residue(ref){return String(ref||'').replace(bookPattern,'').replace(/[0-9\s:;,.[\]()–—-]/g,'');}
function booksIn(ref){
  const found=[];const s=String(ref||'');
  for(const b of REF_BOOKS){if(new RegExp(`\\b${esc(b)}\\b`,'i').test(s))found.push(b==='Psalm'?'Psalms':b==='Song of Solomon'?'Song of Songs':b)}
  return [...new Set(found)];
}

if(qs.length!==EXPECTED.canonical)bad('COUNT_CANONICAL',null,`${qs.length} != ${EXPECTED.canonical}`);
if((registry.records||[]).length!==EXPECTED.registry)bad('COUNT_REGISTRY',null,`${(registry.records||[]).length} != ${EXPECTED.registry}`);
if((registry.aliases||[]).length!==EXPECTED.aliases)bad('COUNT_ALIASES',null,`${(registry.aliases||[]).length} != ${EXPECTED.aliases}`);
if((structured.questions||[]).length!==EXPECTED.structured)bad('COUNT_STRUCTURED',null,`${(structured.questions||[]).length} != ${EXPECTED.structured}`);

for(const q of qs){
  const refResidue=residue(q.bibleReference);
  if(refResidue)bad('NONFORMAL_REFERENCE',q.canonicalId,`${q.bibleReference} -> residue ${refResidue}`);
  for(const e of q.evidence||[]){const r=residue(e);if(r)bad('NONFORMAL_EVIDENCE',q.canonicalId,`${e} -> residue ${r}`)}
  const refBooks=booksIn(q.bibleReference);
  if(q.canonicalId==='phase11.match.letters'){
    if(q.book!=null)bad('CROSS_BOOK_METADATA',q.canonicalId,'cross-book matrix must not pretend to have one primary book');
    const expected=['Romans','Galatians','Hebrews','James'];
    if(expected.some(b=>!refBooks.includes(b)))bad('CROSS_BOOK_REFERENCE',q.canonicalId,JSON.stringify(refBooks));
    else warning('CROSS_BOOK_REFERENCE',q.canonicalId,'intentional four-letter matrix retained without a single book');
  }else if(q.book && !refBooks.includes(q.book)){
    bad('REFERENCE_BOOK_MISMATCH',q.canonicalId,`book=${q.book}; reference=${q.bibleReference}`);
  }
}

const promptExpectations={
  'd4.easy.mode.parables.luke-good-samaritan.16':'Which statement best captures the closing challenge of the cited parable?',
  'd4.easy.mode.parables.matt-tenants.09':'Which parable is associated with the cited passage?',
  'phase6.jesus.luke.cross.criminal':'What assurance is given to the criminal who asks to be remembered?',
  'phase8.wp.joel.spirit.scope':'What is notable about the people who receive the Spirit in Joel’s promise?',
  'phase9.nt.2-peter.2.meaning':'What contradiction does 2 Peter 2 expose in the false teachers’ condition?',
  'd4.easy.major.1-chronicles-inventory-1.01':'Which statement best summarizes the significance of the genealogies in 1 Chronicles 1–9?',
  'phase9.nt.1-timothy.2.context':'How does 1 Timothy 2 connect public intercession with the letter’s wider mission?',
  'v402.miracle.feeding-bread-discourse':'How does John connect the feeding sign with the discourse that follows?',
  'v21.clueReduction.39':'Which person is identified by the cited evidence?'
};
for(const [id,prompt] of Object.entries(promptExpectations)){
  const q=byId.get(id);if(!q)bad('MISSING_REVIEWED_QUESTION',id,'question absent');
  else if(q.question!==prompt)bad('STEM_DOMAIN_MISMATCH',id,`expected ${JSON.stringify(prompt)}, got ${JSON.stringify(q.question)}`);
}
for(const q of qs)if(q.question==='Which option identifies the person associated with the cited passage?')bad('GENERIC_PERSON_STEM_MISMATCH',q.canonicalId,'confirmed-invalid QB1 person template remains');

const r7=byId.get('phase9.nt.romans.7.structure');
if(!r7||!r7.evidence?.includes('Romans 7')||!r7.evidence?.includes('Romans 8'))bad('EVIDENCE_GAP','phase9.nt.romans.7.structure',JSON.stringify(r7?.evidence));
const r8=byId.get('phase9.nt.romans.8.book-understanding');
if(!r8||!r8.evidence?.includes('Romans 8')||!r8.evidence?.includes('Romans 9-11'))bad('EVIDENCE_GAP','phase9.nt.romans.8.book-understanding',JSON.stringify(r8?.evidence));
const passover=byId.get('phase11.connection.passover-christ');
const passoverRef='Exodus 12; 1 Corinthians 5:7; John 19:14, 36';
if(!passover||passover.bibleReference!==passoverRef||!passover.evidence?.includes(passoverRef))bad('PASSOVER_REFERENCE','phase11.connection.passover-christ',`${passover?.bibleReference} / ${JSON.stringify(passover?.evidence)}`);

console.log('TBC P2C — Biblical & Semantic Accuracy Audit');
console.log(`Canonical=${qs.length}; Registry=${(registry.records||[]).length}; Aliases=${(registry.aliases||[]).length}; Structured=${(structured.questions||[]).length}`);
console.log(`Accepted warnings=${warn.length}; Confirmed semantic defects=${fail.length}`);
for(const w of warn)console.log(`WARN  ${w.code} ${w.id||''} — ${w.detail}`);
for(const x of fail)console.error(`FAIL  ${x.code} ${x.id||''} — ${x.detail}`);
if(fail.length){console.error(`P2C FAILED: ${fail.length} confirmed semantic/reference defect(s).`);process.exit(1)}
console.log('P2C PASSED: semantic stem domains, Scripture anchors, and reviewed evidence align across the certified 5,799-question representation.');
