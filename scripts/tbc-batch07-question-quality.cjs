'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { core, readArchive, BATCH07_PREDECESSOR, gitHtml, productHash } = require('./tbc-question-revisions.cjs');

const ID = 'connection.ark-baptism.v20-meaning';
const PROTECTED_NEXT = 'connection.bronze-serpent.meaning';
const OLD_DISTRACTOR = "Peter explicitly uses Noah's rescue as a correspondence when explaining baptism and Christ's resurrection";
const NEW_DISTRACTOR = "Paul contrasts Adam's disobedience and death with Christ's obedience and gift of life";
const OLD_FINGERPRINT = '89a4e9c0f02f3f0c08881d892d33331aacf2928fd7b07cb87b03f2149881c478';
const NEW_FINGERPRINT = 'b6649736bff64adc2818997e8a7e25f3d6c0a578e8d026713431f7143a9d21b1';
const results = [];
function check(name, fn) {
  try { fn(); results.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, passed: false, error: error.stack }); console.error('FAIL', name, error.message); }
}
function read(name) { return JSON.parse(fs.readFileSync(`artifacts/question-revisions/${name}.json`, 'utf8')); }

try {
  const before = read('predecessor-f1f4a8d');
  const after = read('candidate');
  const archive = readArchive();
  assert.equal(before.productSha256, productHash(gitHtml(BATCH07_PREDECESSOR)), 'stale Batch 07 predecessor capture');
  assert.equal(after.productSha256, productHash(fs.readFileSync('index.html')), 'stale candidate capture');
  const oldQuestion = before.sources.find(question => question.itemId === ID);
  const newQuestion = after.sources.find(question => question.itemId === ID);
  const oldPosition = oldQuestion.options.indexOf(oldQuestion.answer);
  const newPosition = newQuestion.options.indexOf(newQuestion.answer);

  check('exact f1f4a8d predecessor is archived with its authoritative fingerprint', () => {
    const row = archive.records.find(record => record.id === ID && record.predecessor === BATCH07_PREDECESSOR);
    assert.ok(row);
    assert.deepEqual(row.snapshot, oldQuestion);
    assert.equal(row.fingerprint, OLD_FINGERPRINT);
    assert.equal(row.fingerprint, core.fingerprint(oldQuestion));
    assert.equal(row.snapshotSha256, core.snapshotHash(oldQuestion));
  });
  check('only the overlapping distractor and its matching rationale change in the question source', () => {
    assert.equal(core.fingerprint(newQuestion), NEW_FINGERPRINT);
    const oldRest = { ...oldQuestion, options: null, distractorRationales: null };
    const newRest = { ...newQuestion, options: null, distractorRationales: null };
    assert.deepEqual(newRest, oldRest);
    assert.equal(oldQuestion.options[1], OLD_DISTRACTOR);
    assert.equal(newQuestion.options[1], NEW_DISTRACTOR);
    assert.deepEqual(newQuestion.options.filter((_, index) => index !== 1), oldQuestion.options.filter((_, index) => index !== 1));
    assert.equal(oldQuestion.distractorRationales[0].startsWith(OLD_DISTRACTOR), true);
    assert.equal(newQuestion.distractorRationales[0].startsWith(`${NEW_DISTRACTOR}.`), true);
    assert.deepEqual(newQuestion.distractorRationales.slice(1), oldQuestion.distractorRationales.slice(1));
  });
  check('stable identity, keyed answer, answer position, tier and four unique choices remain intact', () => {
    assert.equal(newQuestion.itemId, ID);
    assert.equal(newQuestion.answer, oldQuestion.answer);
    assert.equal(oldPosition, 0);
    assert.equal(newPosition, oldPosition);
    assert.equal(newQuestion.difficulty, oldQuestion.difficulty);
    assert.equal(new Set(newQuestion.options).size, 4);
    assert.equal(newQuestion.options.filter(option => option === newQuestion.answer).length, 1);
  });
  check('replacement is the distinct Adam-Christ unit and no longer restates 1 Peter 3:20-21', () => {
    assert.match(newQuestion.options[0], /flood's preservation.*baptism.*resurrection/i);
    assert.match(newQuestion.options[1], /Adam's disobedience and death.*Christ's obedience.*life/i);
    assert.doesNotMatch(newQuestion.options[1], /Noah|ark|flood|baptism/i);
  });
  check('Batch 07 ledger covers exactly entries 301-350 with direct evidence and preserves #351', () => {
    const prior = JSON.parse(execFileSync('git', ['show', `${BATCH07_PREDECESSOR}:docs/TBC_QUESTION_AUDIT.json`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync('docs/TBC_QUESTION_AUDIT.json', 'utf8'));
    assert.deepEqual(ledger.entries.slice(0, 300), prior.entries.slice(0, 300));
    assert.deepEqual(ledger.entries.slice(350), prior.entries.slice(350));
    assert.equal(ledger.entries[350].canonicalId, PROTECTED_NEXT);
    const batch = ledger.entries.slice(300, 350);
    assert.equal(batch.length, 50);
    assert.equal(batch.filter(entry => entry.audit.status === 'unchanged and verified').length, 49);
    assert.deepEqual(batch.filter(entry => entry.audit.status === 'corrected').map(entry => entry.canonicalId), [ID]);
    assert.equal(new Set(batch.map(entry => entry.audit.rationale)).size, 50, 'rationales must be individual');
    for (const entry of batch) {
      assert.ok(entry.audit.evidence.length > 0 && entry.audit.evidence.every(item => item.type === 'Direct Scripture' && /^https:\/\/biblehub\.com\/bsb\//.test(item.url)));
      assert.equal(entry.audit.optionFindings.length, entry.options.length);
      assert.deepEqual(entry.audit.optionFindings.map(item => item.optionIndex), entry.options.map((_, index) => index));
    }
    const corrected = batch.find(entry => entry.canonicalId === ID);
    assert.equal(corrected.source.contentSha256, '323cee1cf9a87f7446379817d1427d76ad52259ef2d8d19d5e4e889e7e1a05bb');
    assert.deepEqual(corrected.options, newQuestion.options);
    assert.equal(corrected.audit.changes[0].oldFingerprint, OLD_FINGERPRINT);
    assert.equal(corrected.audit.changes[0].newFingerprint, NEW_FINGERPRINT);
  });
  check('the correction changes no other f1f4a8d question and leaves protected #351 exact', () => {
    const oldById = new Map(before.sources.map(question => [question.itemId, question]));
    const changed = after.sources.filter(question => core.fingerprint(question) !== core.fingerprint(oldById.get(question.itemId))).map(question => question.itemId);
    assert.deepEqual(changed, [ID]);
    assert.deepEqual(after.sources.find(question => question.itemId === PROTECTED_NEXT), before.sources.find(question => question.itemId === PROTECTED_NEXT));
    for (const key of ['ids', 'aliases', 'tiers', 'schema', 'structuredIds', 'pools']) assert.deepEqual(after[key], before[key]);
  });
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
}

fs.mkdirSync('artifacts/batch07', { recursive: true });
fs.writeFileSync('artifacts/batch07/question-quality.json', `${JSON.stringify({ results }, null, 2)}\n`);
console.log(`BATCH 07 QUESTION QUALITY: ${results.filter(result => result.passed).length}/${results.length}`);
if (results.some(result => !result.passed)) process.exitCode = 1;
