#!/usr/bin/env node
'use strict';

/**
 * TBC P2A — Canonical Question Bank Extraction
 *
 * Read-only audit tooling. It never edits index.html, browser persistence, or
 * gameplay state. The extractor derives a deterministic, machine-readable
 * snapshot from the frozen production source/runtime and writes it only under
 * artifacts/p2a (or P2A_OUT_DIR).
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const OUT = path.resolve(ROOT, process.env.P2A_OUT_DIR || 'artifacts/p2a');
const EXPECTED_CANONICAL = 5799;
const EXPECTED_REGISTRY = 6072;
const EXPECTED_STRUCTURED = 203;
const EXPECTED_BOOKS = 66;
const TIERS = ['Beginner', 'Easy', 'Standard', 'Advanced', 'Expert'];
const SCHEMA_VERSION = 'P2A.1';

const BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther',
  'Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel',
  'Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians',
  'Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
    return out;
  }
  if (typeof value === 'undefined') return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  return value;
}
function stableJson(value, pretty = false) { return JSON.stringify(stable(value), null, pretty ? 2 : 0); }
function sha256(value) { return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex'); }
function norm(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return norm(value).toLowerCase(); }
function safeClone(value, depth = 0) {
  if (depth > 8) return '[max-depth]';
  if (value === null || ['string','number','boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(v => safeClone(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const v = value[key];
      if (typeof v !== 'function' && typeof v !== 'symbol') out[key] = safeClone(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

function findClosingBracket(source, start) {
  let depth = 0, quote = null, escape = false, lineComment = false, blockComment = false, templateDepth = 0;
  for (let i = start; i < source.length; i++) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (quote === '`' && c === '$' && n === '{') { templateDepth++; i++; continue; }
      if (quote === '`' && templateDepth && c === '}') { templateDepth--; continue; }
      if (c === quote && templateDepth === 0) quote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function sourceArrayCandidates(source) {
  const decl = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[/g;
  const candidates = [];
  let match;
  while ((match = decl.exec(source))) {
    const name = match[1];
    const start = source.indexOf('[', match.index);
    const end = findClosingBracket(source, start);
    if (end < 0) continue;
    const literal = source.slice(start, end + 1);
    if (literal.length < 5000) { decl.lastIndex = end + 1; continue; }
    let value = null, error = null;
    try { value = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 2500 }); }
    catch (err) { error = String(err && err.message || err); }
    if (Array.isArray(value)) candidates.push({ origin: `source:${name}`, name, value, literalBytes: Buffer.byteLength(literal), error: null });
    else candidates.push({ origin: `source:${name}`, name, value: null, literalBytes: Buffer.byteLength(literal), error });
    decl.lastIndex = end + 1;
  }
  return candidates;
}

function objectFieldProfile(items) {
  const map = new Map();
  const sample = items.slice(0, Math.min(items.length, 750));
  for (const item of sample) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    for (const key of Object.keys(item)) map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,80).map(([key,count])=>({key,count}));
}
function questionLikeScore(items) {
  if (!Array.isArray(items) || !items.length) return 0;
  const sample = items.slice(0, Math.min(items.length, 400));
  const keys = new Set();
  let objects = 0;
  for (const item of sample) {
    if (item && typeof item === 'object' && !Array.isArray(item)) { objects++; Object.keys(item).forEach(k=>keys.add(lower(k))); }
  }
  const keyText = [...keys].join('|');
  let score = objects / sample.length * 50;
  if (/question|prompt|stem|text/.test(keyText)) score += 15;
  if (/answer|correct|choice|option/.test(keyText)) score += 15;
  if (/book|reference|verse|chapter/.test(keyText)) score += 8;
  if (/difficulty|level|tier/.test(keyText)) score += 8;
  if (/explain|evidence|rationale/.test(keyText)) score += 4;
  return Math.round(score);
}

function canonicalizeRegistry(items) {
  if (items.length === EXPECTED_CANONICAL) return { items, strategy: 'direct-5799-array' };
  if (items.length !== EXPECTED_REGISTRY) return null;
  const semantic = /(?:alias|duplicate|redundant|exclude|deprecated|canonical|playable|active)/i;
  const keys = new Set();
  items.slice(0,1000).forEach(item => { if (item && typeof item === 'object') Object.keys(item).forEach(k => { if (semantic.test(k)) keys.add(k); }); });
  for (const key of keys) {
    const tests = [
      { label:`${key}==null`, keep:item=>item?.[key] == null },
      { label:`${key}!==true`, keep:item=>item?.[key] !== true },
      { label:`${key}!==false`, keep:item=>item?.[key] !== false },
      { label:`${key} truthy`, keep:item=>Boolean(item?.[key]) },
      { label:`${key} falsy`, keep:item=>!item?.[key] },
    ];
    for (const test of tests) {
      const filtered = items.filter(test.keep);
      if (filtered.length === EXPECTED_CANONICAL) return { items: filtered, strategy: `registry-6072-filter:${test.label}` };
    }
  }
  return null;
}

const ALIASES = {
  id:['id','qid','questionId','question_id','key','uid'],
  question:['question','q','prompt','stem','text','questionText'],
  answer:['correctAnswer','correct','answer','a','solution'],
  options:['options','choices','answers','answerOptions'],
  distractors:['distractors','wrongAnswers','incorrectAnswers'],
  reference:['reference','ref','scripture','verse','citation','bibleReference'],
  book:['book','bookName','bibleBook'],
  category:['category','topic','theme','domain','knowledgeArea'],
  difficulty:['difficulty','level','tier'],
  explanation:['explanation','explain','rationale','feedback'],
  evidence:['evidence','support','proof','scriptureEvidence'],
  memoryCue:['memoryCue','memory','cue','mnemonic'],
  collections:['collections','collection','collectionIds','tags'],
  modes:['modes','mode','modeEligibility','eligibleModes','allowedModes'],
  type:['type','questionType','interactionType','kind','format'],
};
function getField(raw, aliases) {
  for (const key of aliases) if (Object.prototype.hasOwnProperty.call(raw,key) && raw[key] != null) return { key, value: raw[key] };
  const lowerMap = new Map(Object.keys(raw).map(k=>[lower(k),k]));
  for (const alias of aliases) {
    const actual = lowerMap.get(lower(alias));
    if (actual && raw[actual] != null) return { key:actual, value:raw[actual] };
  }
  return { key:null, value:null };
}
function inferBook(raw, reference) {
  const direct = getField(raw, ALIASES.book).value;
  if (direct) {
    const found = BOOKS.find(b=>lower(b)===lower(direct));
    if (found) return found;
    return norm(direct);
  }
  const ref = norm(reference);
  return BOOKS.slice().sort((a,b)=>b.length-a.length).find(book => lower(ref).startsWith(lower(book))) || null;
}
function normalizeArrayValue(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(v=>typeof v === 'object' ? safeClone(v) : norm(v));
  return [typeof value === 'object' ? safeClone(value) : norm(value)];
}
function normalizeQuestion(raw, index) {
  const fields = {};
  for (const [name, aliases] of Object.entries(ALIASES)) fields[name] = getField(raw, aliases);
  const question = norm(fields.question.value);
  const answer = typeof fields.answer.value === 'object' ? safeClone(fields.answer.value) : norm(fields.answer.value);
  const options = normalizeArrayValue(fields.options.value);
  const explicitDistractors = normalizeArrayValue(fields.distractors.value);
  const answerText = typeof answer === 'string' ? lower(answer) : '';
  const distractors = explicitDistractors.length ? explicitDistractors : options.filter(v=>typeof v !== 'string' || lower(v)!==answerText);
  const reference = typeof fields.reference.value === 'object' ? safeClone(fields.reference.value) : norm(fields.reference.value) || null;
  const difficultyRaw = norm(fields.difficulty.value);
  const difficulty = TIERS.find(t=>lower(t)===lower(difficultyRaw)) || difficultyRaw || null;
  const runtimeId = fields.id.value == null ? '' : norm(fields.id.value);
  const identityBasis = { question, answer, reference, book:inferBook(raw,reference), difficulty, type:norm(fields.type.value) || null };
  const canonicalId = runtimeId || `p2a-${sha256(identityBasis).slice(0,20)}`;
  const normalized = {
    canonicalId,
    idSource: runtimeId ? `runtime:${fields.id.key}` : 'derived:sha256',
    sourceIndex:index,
    question,
    correctAnswer:answer,
    distractors,
    options,
    bibleReference:reference,
    book:inferBook(raw,reference),
    category:fields.category.value == null ? null : safeClone(fields.category.value),
    difficulty,
    explanation:fields.explanation.value == null ? null : safeClone(fields.explanation.value),
    evidence:fields.evidence.value == null ? null : safeClone(fields.evidence.value),
    memoryCue:fields.memoryCue.value == null ? null : safeClone(fields.memoryCue.value),
    collections:normalizeArrayValue(fields.collections.value),
    modeEligibility:normalizeArrayValue(fields.modes.value),
    questionType:fields.type.value == null ? null : norm(fields.type.value),
    sourceKeys:Object.keys(raw).sort(),
  };
  const contentForHash = {...normalized}; delete contentForHash.canonicalId; delete contentForHash.idSource; delete contentForHash.sourceIndex;
  normalized.contentSha256 = sha256(contentForHash);
  return normalized;
}

function structuredHints(question) {
  const text = [question.questionType, ...question.sourceKeys].filter(Boolean).join(' ');
  return /structured|sequence|timeline|chain|matrix|ladder|group|ordering|order|sort|match|drag|multi[-_ ]?part/i.test(text);
}
function findStructured(candidates, canonical) {
  const direct = candidates.filter(c=>Array.isArray(c.value) && c.value.length===EXPECTED_STRUCTURED && questionLikeScore(c.value)>=55).sort((a,b)=>questionLikeScore(b.value)-questionLikeScore(a.value))[0];
  if (direct) {
    const ids = new Set(direct.value.map((raw,i)=>normalizeQuestion(raw,i).canonicalId));
    const subset = canonical.filter(q=>ids.has(q.canonicalId));
    if (subset.length===EXPECTED_STRUCTURED) return { items:subset, strategy:`direct-203-array:${direct.origin}` };
    return { items:direct.value.map((raw,i)=>normalizeQuestion(raw,i)), strategy:`separate-203-array:${direct.origin}` };
  }
  const hinted = canonical.filter(structuredHints);
  if (hinted.length===EXPECTED_STRUCTURED) return { items:hinted, strategy:'canonical-structured-field-hints' };
  return { items:hinted, strategy:`unresolved-hints-${hinted.length}` };
}

async function runtimeCandidates() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return { candidates:[], diagnostics:{available:false,reason:'playwright-not-installed'} }; }
  const base = process.env.P2A_BASE_URL || 'http://127.0.0.1:4173/';
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(1200);
    const raw = await page.evaluate(() => {
      const out=[]; const seen=new WeakSet();
      const inspect=(value,path,depth)=>{
        if (!value || (typeof value!=='object'&&typeof value!=='function')) return;
        if (seen.has(value)) return; seen.add(value);
        if (Array.isArray(value)) {
          if (value.length>=150 && value.length<=7000) {
            let objectCount=0; const keys={};
            for (const item of value.slice(0,300)) if(item&&typeof item==='object'&&!Array.isArray(item)){objectCount++;for(const k of Object.keys(item))keys[k]=(keys[k]||0)+1;}
            if(objectCount>=Math.min(50,value.length*0.5)) out.push({path,length:value.length,keys:Object.entries(keys).sort((a,b)=>b[1]-a[1]).slice(0,50),value:(value.length===5799||value.length===6072||value.length===203)?value:null});
          }
          return;
        }
        if(depth>=2 || value instanceof Node || value===window || value===document) return;
        let keys=[]; try{keys=Object.keys(value).slice(0,800)}catch{return}
        for(const key of keys){try{inspect(value[key],`${path}.${key}`,depth+1)}catch{}}
      };
      for(const key of Object.getOwnPropertyNames(window)) {
        if(['window','self','top','parent','frames','document'].includes(key))continue;
        try{inspect(window[key],`window.${key}`,0)}catch{}
      }
      return out;
    });
    await context.close();
    const candidates = raw.filter(x=>Array.isArray(x.value)).map(x=>({origin:`runtime:${x.path}`,name:x.path,value:x.value,literalBytes:null,error:null}));
    return {candidates,diagnostics:{available:true,base,pageErrors:errors,arrays:raw.map(({path,length,keys})=>({path,length,keys}))}};
  } finally { await browser.close(); }
}

async function main() {
  if (!fs.existsSync(INDEX)) throw new Error(`Missing ${INDEX}`);
  fs.mkdirSync(OUT,{recursive:true});
  const source = fs.readFileSync(INDEX,'utf8');
  const sourceCandidates = sourceArrayCandidates(source);
  const runtime = await runtimeCandidates();
  const candidates = [...sourceCandidates, ...runtime.candidates];
  const diagnostics = candidates.map(c=>({origin:c.origin,length:Array.isArray(c.value)?c.value.length:null,literalBytes:c.literalBytes,error:c.error,questionLikeScore:Array.isArray(c.value)?questionLikeScore(c.value):0,fieldProfile:Array.isArray(c.value)?objectFieldProfile(c.value):[]}));
  const ranked = candidates.filter(c=>Array.isArray(c.value) && [EXPECTED_CANONICAL,EXPECTED_REGISTRY].includes(c.value.length)).sort((a,b)=>questionLikeScore(b.value)-questionLikeScore(a.value));
  let chosen=null, canonicalRaw=null, canonicalStrategy=null;
  for(const candidate of ranked) {
    const resolved=canonicalizeRegistry(candidate.value);
    if(resolved && questionLikeScore(resolved.items)>=55) { chosen=candidate; canonicalRaw=resolved.items; canonicalStrategy=resolved.strategy; break; }
  }
  fs.writeFileSync(path.join(OUT,'candidate-discovery.json'),stableJson({schemaVersion:SCHEMA_VERSION,sourceBytes:Buffer.byteLength(source),runtime:runtime.diagnostics,candidates:diagnostics},true)+'\n');
  if (!canonicalRaw) {
    console.error('P2A could not resolve a 5,799-question canonical runtime/source array.');
    console.error('Candidate diagnostics written to candidate-discovery.json.');
    for(const d of diagnostics.filter(x=>x.length>=5000)) console.error(`  ${d.origin}: len=${d.length} score=${d.questionLikeScore} fields=${d.fieldProfile.slice(0,12).map(x=>x.key).join(',')}`);
    process.exit(2);
  }
  const canonical = canonicalRaw.map((raw,i)=>normalizeQuestion(raw,i));
  const idCounts=new Map(); canonical.forEach(q=>idCounts.set(q.canonicalId,(idCounts.get(q.canonicalId)||0)+1));
  const duplicateIds=[...idCounts].filter(([,n])=>n>1).map(([id,count])=>({id,count}));
  if(duplicateIds.length) {
    canonical.forEach((q,i)=>{if((idCounts.get(q.canonicalId)||0)>1){q.originalCanonicalId=q.canonicalId;q.canonicalId=`${q.canonicalId}#${i+1}`;q.idSource+=':collision-disambiguated';}});
  }
  canonical.sort((a,b)=>a.canonicalId.localeCompare(b.canonicalId,'en'));
  const structured = findStructured(candidates,canonical);
  structured.items.sort((a,b)=>a.canonicalId.localeCompare(b.canonicalId,'en'));
  const difficultyDistribution=Object.fromEntries(TIERS.map(t=>[t,canonical.filter(q=>q.difficulty===t).length]));
  const books=[...new Set(canonical.map(q=>q.book).filter(Boolean))].sort();
  const fieldCoverage={};
  for(const field of ['question','correctAnswer','distractors','options','bibleReference','book','category','difficulty','explanation','evidence','memoryCue','collections','modeEligibility','questionType']) {
    fieldCoverage[field]=canonical.filter(q=>Array.isArray(q[field])?q[field].length>0:q[field]!=null&&q[field]!=='' ).length;
  }
  const bankHash=sha256(canonical.map(q=>[q.canonicalId,q.contentSha256]));
  const structuredHash=sha256(structured.items.map(q=>[q.canonicalId,q.contentSha256]));
  const summary={
    schemaVersion:SCHEMA_VERSION,
    source:{indexBlobSha1:crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(source)}\0`),Buffer.from(source)])).digest('hex'),candidate:chosen.origin,canonicalStrategy,structuredStrategy:structured.strategy},
    counts:{canonical:canonical.length,registry:chosen.value.length,structured:structured.items.length,books:books.length},
    expected:{canonical:EXPECTED_CANONICAL,registry:EXPECTED_REGISTRY,structured:EXPECTED_STRUCTURED,books:EXPECTED_BOOKS},
    difficultyDistribution,
    books,
    fieldCoverage,
    duplicateRuntimeIds:duplicateIds,
    hashes:{algorithm:'sha256',canonicalBank:bankHash,structuredBank:structuredHash},
    readOnly:true,
  };
  fs.writeFileSync(path.join(OUT,'question-bank.json'),stableJson({schemaVersion:SCHEMA_VERSION,questions:canonical},true)+'\n');
  fs.writeFileSync(path.join(OUT,'structured-questions.json'),stableJson({schemaVersion:SCHEMA_VERSION,questions:structured.items},true)+'\n');
  fs.writeFileSync(path.join(OUT,'question-bank-summary.json'),stableJson(summary,true)+'\n');
  console.log('TBC P2A — Question Bank Extraction');
  console.log(`Source candidate: ${chosen.origin}`);
  console.log(`Canonical strategy: ${canonicalStrategy}`);
  console.log(`Structured strategy: ${structured.strategy}`);
  console.log(`Canonical questions: ${canonical.length}`);
  console.log(`Structured questions: ${structured.items.length}`);
  console.log(`Books observed: ${books.length}`);
  console.log(`Difficulty: ${TIERS.map(t=>`${t}=${difficultyDistribution[t]}`).join(', ')}`);
  console.log(`Canonical SHA-256: ${bankHash}`);
  console.log(`Structured SHA-256: ${structuredHash}`);
  if(canonical.length!==EXPECTED_CANONICAL) process.exitCode=3;
  if(structured.items.length!==EXPECTED_STRUCTURED) process.exitCode=4;
}

main().catch(error=>{console.error(error.stack||error);process.exit(1)});
