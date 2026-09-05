'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { core, readArchive, BATCH04_PREDECESSOR, gitHtml, productHash } = require('./tbc-question-revisions.cjs');

const ID = '1-timothy-6-6-context';
const PROTECTED_NEXT = '2-corinthians-5-21-meaning';
const OLD_DISTRACTOR = 'Paul warns against false teachers and discontented pursuit of wealth.';
const NEW_DISTRACTOR = 'Paul begins by praising God after severe affliction.';
const OLD_FINGERPRINT = '9857d3803ebca3b2d38580a0f23263fdddaef96ba4e119494bb6aa73ce098377';
const NEW_FINGERPRINT = '37aca4e8b8907af0dc61aeb4dc5b7d9e4734ffc42747d8c2c8fe9c99767be9c7';
const results = [];
function check(name, fn) {
  try { fn(); results.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, passed: false, error: error.stack }); console.error('FAIL', name, error.message); }
}
function read(name) { return JSON.parse(fs.readFileSync(`artifacts/question-revisions/${name}.json`, 'utf8')); }

try {
  const before = read('predecessor-c2a129');
  const after = read('candidate');
  const archive = readArchive();
  assert.equal(before.productSha256, productHash(gitHtml(BATCH04_PREDECESSOR)), 'stale Batch 04 predecessor capture');
  assert.equal(after.productSha256, productHash(fs.readFileSync('index.html')), 'stale candidate capture');
  const oldQuestion = before.sources.find(question => question.itemId === ID);
  const newQuestion = after.sources.find(question => question.itemId === ID);
  const oldPosition = oldQuestion.options.indexOf(oldQuestion.answer);
  const newPosition = newQuestion.options.indexOf(newQuestion.answer);

  check('exact c2a129 predecessor is archived with its authoritative fingerprint', () => {
    const row = archive.records.find(record => record.id === ID && record.predecessor === BATCH04_PREDECESSOR);
    assert.ok(row);
    assert.deepEqual(row.snapshot, oldQuestion);
    assert.equal(row.fingerprint, OLD_FINGERPRINT);
    assert.equal(row.fingerprint, core.fingerprint(oldQuestion));
    assert.equal(row.snapshotSha256, core.snapshotHash(oldQuestion));
  });
  check('only the confirmed overlapping distractor changes in the question source', () => {
    assert.equal(core.fingerprint(newQuestion), NEW_FINGERPRINT);
    assert.deepEqual({ ...newQuestion, options: null }, { ...oldQuestion, options: null });
    assert.equal(oldQuestion.options[0], OLD_DISTRACTOR);
    assert.equal(newQuestion.options[0], NEW_DISTRACTOR);
    assert.deepEqual(newQuestion.options.slice(1), oldQuestion.options.slice(1));
  });
  check('stable identity, keyed answer, answer position, tier and four unique choices remain intact', () => {
    assert.equal(newQuestion.itemId, ID);
    assert.equal(newQuestion.answer, oldQuestion.answer);
    assert.equal(oldPosition, 2);
    assert.equal(newPosition, oldPosition);
    assert.equal(newQuestion.difficulty, oldQuestion.difficulty);
    assert.equal(new Set(newQuestion.options).size, 4);
    assert.equal(newQuestion.options.filter(option => option === newQuestion.answer).length, 1);
  });
  check('replacement belongs to 2 Corinthians 1 and no longer describes 1 Timothy 6:3-10', () => {
    assert.match(newQuestion.options[0], /praising God after severe affliction/i);
    assert.match(newQuestion.options[1], /reject greed and pursue godliness/i);
    assert.match(newQuestion.options[2], /false teachers.*greed.*true gain/i);
    assert.match(newQuestion.options[3], /saving mission of Christ/i);
  });
  check('Batch 04 ledger covers exactly entries 151-200 with direct evidence and preserves #201', () => {
    const prior = JSON.parse(execFileSync('git', ['show', `${BATCH04_PREDECESSOR}:docs/TBC_QUESTION_AUDIT.json`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync('docs/TBC_QUESTION_AUDIT.json', 'utf8'));
    assert.deepEqual(ledger.entries.slice(0, 150), prior.entries.slice(0, 150));
    // Later batches own later ledger rows and verify their ranges independently.
    // This historical gate protects Batch 04's predecessor and its own 151–200 scope.
    assert.equal(ledger.entries[200].canonicalId, PROTECTED_NEXT);
    const batch = ledger.entries.slice(150, 200);
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
    assert.equal(corrected.source.contentSha256, 'ea6aacff900b470299f2cee2529def3838e7f5502bdc5e21a3a128495df56434');
    assert.deepEqual(corrected.options, newQuestion.options);
    assert.equal(corrected.audit.changes[0].oldFingerprint, OLD_FINGERPRINT);
    assert.equal(corrected.audit.changes[0].newFingerprint, NEW_FINGERPRINT);
  });
  check('the Batch 04 correction remains bounded and leaves protected #201 exact', () => {
    // Later certified revisions are covered by their own successor gates. This
    // gate continues to bind the Batch 04 row to its exact predecessor.
    assert.equal(core.fingerprint(newQuestion), NEW_FINGERPRINT);
    assert.deepEqual(after.sources.find(question => question.itemId === PROTECTED_NEXT), before.sources.find(question => question.itemId === PROTECTED_NEXT));
    for (const key of ['ids', 'aliases', 'tiers', 'schema', 'structuredIds', 'pools']) assert.deepEqual(after[key], before[key]);
  });
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
}

fs.mkdirSync('artifacts/batch04', { recursive: true });
fs.writeFileSync('artifacts/batch04/question-quality.json', `${JSON.stringify({ results }, null, 2)}\n`);
console.log(`BATCH 04 QUESTION QUALITY: ${results.filter(result => result.passed).length}/${results.length}`);
if (results.some(result => !result.passed)) process.exitCode = 1;
