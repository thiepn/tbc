#!/usr/bin/env node
'use strict';

// Maintains the non-certification content-audit inventory. The authoritative
// input remains the runtime-derived P2A artifact; this tool never alters it.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const BANK = path.join(ROOT, process.env.P2A_OUT_DIR || 'artifacts/p2a', 'question-bank.json');
const REGISTRY = path.join(ROOT, process.env.P2A_OUT_DIR || 'artifacts/p2a', 'question-registry.json');
const LEDGER = path.join(ROOT, 'docs', 'TBC_QUESTION_AUDIT.json');
const LEDGER_MD = path.join(ROOT, 'docs', 'TBC_QUESTION_AUDIT.md');
const COMPLETE = new Set([
  'unchanged and verified', 'corrected', 'rewritten for ambiguity',
  'answer key corrected', 'distractors improved', 'duplicate replaced', 'tier changed'
]);
const PENDING = 'pending individual review';

function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
function write(file, value) { fs.writeFileSync(file, `${JSON.stringify(stable(value), null, 2)}\n`); }
function inventoryQuestion(question, aliases) {
  return {
    canonicalId: question.canonicalId,
    source: { origin: question.sourceOrigin, index: question.sourceIndex, contentSha256: question.contentSha256 },
    book: question.book,
    category: question.category,
    difficulty: question.difficulty,
    question: question.question,
    options: question.options,
    canonicalAnswer: question.correctAnswer,
    bibleReference: question.bibleReference,
    evidence: question.evidence,
    explanation: question.explanation,
    aliases,
    collections: question.collections,
    modeEligibility: question.modeEligibility,
    questionType: question.questionType,
    interactionType: question.interactionType,
    structured: question.structured,
    audit: { status: PENDING, evidence: [], rationale: 'Inventory created; individual review not yet performed.', changes: [] }
  };
}
function renderMarkdown(ledger) {
  const complete = ledger.entries.filter(entry => COMPLETE.has(entry.audit.status)).length;
  const unresolved = ledger.entries.filter(entry => entry.audit.status === 'unresolved—human decision required').length;
  const pending = ledger.entries.length - complete - unresolved;
  const lines = [
    '# TBC canonical-question audit ledger', '',
    'This is a non-certification audit inventory. Runtime authority is `TBC_QB6.activeQuestions()` as extracted by P2A; aliases are compatibility mappings, not additional questions.', '',
    `- Canonical runtime questions: **${ledger.entries.length}**`,
    `- Individually completed: **${complete}**`,
    `- Pending individual review: **${pending}**`,
    `- Unresolved human decisions: **${unresolved}**`,
    '- Complete inventory fields, aliases, mode eligibility, and per-entry audit evidence are in [`TBC_QUESTION_AUDIT.json`](TBC_QUESTION_AUDIT.json).',
    '- Validate against a fresh P2A extraction with `node scripts/tbc-question-audit-ledger.cjs check`; use `--require-complete` only after every entry is reviewed.', '',
    '## Primary entry index', '',
    '| Canonical ID | Runtime source index | Bible reference | Tier | Audit status |',
    '| --- | ---: | --- | --- | --- |'
  ];
  for (const entry of ledger.entries) lines.push(`| \`${entry.canonicalId}\` | ${entry.source.index} | ${entry.bibleReference || ''} | ${entry.difficulty || ''} | ${entry.audit.status} |`);
  return `${lines.join('\n')}\n`;
}
function loadRuntime() {
  assert.ok(fs.existsSync(BANK), `missing P2A artifact: ${path.relative(ROOT, BANK)}`);
  assert.ok(fs.existsSync(REGISTRY), `missing P2A artifact: ${path.relative(ROOT, REGISTRY)}`);
  const questions = read(BANK).questions;
  const aliases = read(REGISTRY).aliases;
  assert.ok(Array.isArray(questions) && Array.isArray(aliases), 'invalid P2A artifact shape');
  const aliasMap = new Map();
  for (const alias of aliases) {
    assert.equal(typeof alias.itemId, 'string', 'invalid alias ID');
    assert.equal(typeof alias.canonicalId, 'string', 'invalid alias canonical target');
    const list = aliasMap.get(alias.canonicalId) || [];
    list.push({ itemId: alias.itemId, canonicalId: alias.canonicalId });
    aliasMap.set(alias.canonicalId, list);
  }
  return { questions, aliasMap };
}
function initialise() {
  const { questions, aliasMap } = loadRuntime();
  const ids = questions.map(question => question.canonicalId);
  assert.equal(new Set(ids).size, ids.length, 'runtime canonical IDs are not unique');
  const ledger = {
    schemaVersion: 'TBC-QUESTION-AUDIT.1',
    authority: 'P2A runtime extraction of TBC_QB6.activeQuestions()',
    canonicalCount: questions.length,
    entries: questions.slice().sort((a, b) => a.canonicalId.localeCompare(b.canonicalId, 'en')).map(question => inventoryQuestion(question, (aliasMap.get(question.canonicalId) || []).sort((a, b) => a.itemId.localeCompare(b.itemId, 'en'))))
  };
  write(LEDGER, ledger);
  fs.writeFileSync(LEDGER_MD, renderMarkdown(ledger));
  console.log(`QUESTION AUDIT INVENTORY: initialized ${ledger.entries.length} canonical entries.`);
}
function check(requireComplete) {
  assert.ok(fs.existsSync(LEDGER), 'question audit ledger missing');
  const ledger = read(LEDGER);
  const { questions, aliasMap } = loadRuntime();
  assert.equal(ledger.schemaVersion, 'TBC-QUESTION-AUDIT.1', 'unsupported ledger schema');
  assert.equal(ledger.canonicalCount, questions.length, 'ledger count does not equal runtime count');
  assert.ok(Array.isArray(ledger.entries), 'ledger entries missing');
  assert.equal(ledger.entries.length, questions.length, 'ledger entry count does not equal runtime count');
  const runtimeById = new Map(questions.map(question => [question.canonicalId, question]));
  const ledgerIds = ledger.entries.map(entry => entry.canonicalId);
  const ledgerIdSet = new Set(ledgerIds);
  assert.equal(ledgerIdSet.size, ledgerIds.length, 'ledger has duplicate canonical IDs');
  assert.equal(ledgerIdSet.size, runtimeById.size, 'ledger/runtime canonical ID count mismatch');
  for (const id of ledgerIdSet) assert.ok(runtimeById.has(id), `ledger refers to absent question: ${id}`);
  for (const id of runtimeById.keys()) assert.ok(ledgerIdSet.has(id), `runtime question missing from ledger: ${id}`);
  for (const entry of ledger.entries) {
    const question = runtimeById.get(entry.canonicalId);
    assert.ok(question, `ledger refers to absent question: ${entry.canonicalId}`);
    assert.equal(entry.source?.origin, question.sourceOrigin, `${entry.canonicalId}: source origin mismatch`);
    assert.equal(entry.source?.index, question.sourceIndex, `${entry.canonicalId}: source index mismatch`);
    assert.equal(entry.source?.contentSha256, question.contentSha256, `${entry.canonicalId}: inventory content is stale`);
    assert.deepEqual(entry.aliases, (aliasMap.get(entry.canonicalId) || []).sort((a, b) => a.itemId.localeCompare(b.itemId, 'en')), `${entry.canonicalId}: alias inventory is stale`);
    assert.ok(typeof entry.audit?.status === 'string' && entry.audit.status, `${entry.canonicalId}: audit status missing`);
    if (COMPLETE.has(entry.audit.status)) {
      assert.ok(Array.isArray(entry.audit.evidence) && entry.audit.evidence.length, `${entry.canonicalId}: completed audit lacks evidence`);
      assert.ok(typeof entry.audit.rationale === 'string' && entry.audit.rationale.trim(), `${entry.canonicalId}: completed audit lacks rationale`);
    }
  }
  const completed = ledger.entries.filter(entry => COMPLETE.has(entry.audit.status)).length;
  const unresolved = ledger.entries.filter(entry => entry.audit.status === 'unresolved—human decision required').length;
  const pending = ledger.entries.length - completed - unresolved;
  if (requireComplete) assert.equal(pending + unresolved, 0, `${pending} pending and ${unresolved} unresolved audit entries remain`);
  console.log(`QUESTION AUDIT LEDGER: ${ledger.entries.length}/${questions.length} unique canonical IDs; completed=${completed}; pending=${pending}; unresolved=${unresolved}.`);
}
function render() {
  assert.ok(fs.existsSync(LEDGER), 'question audit ledger missing');
  const ledger = read(LEDGER);
  fs.writeFileSync(LEDGER_MD, renderMarkdown(ledger));
  console.log(`QUESTION AUDIT LEDGER: rendered ${ledger.entries.length} primary-entry rows.`);
}

const command = process.argv[2] || 'check';
try {
  if (command === 'init') initialise();
  else if (command === 'check') check(process.argv.includes('--require-complete'));
  else if (command === 'render') render();
  else throw new Error('usage: tbc-question-audit-ledger.cjs [init|render|check] [--require-complete]');
} catch (error) {
  console.error(`QUESTION AUDIT LEDGER FAILED: ${error.stack || error.message}`);
  process.exitCode = 1;
}
