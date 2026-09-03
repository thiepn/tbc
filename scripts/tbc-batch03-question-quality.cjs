'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { core, readArchive, BATCH03_PREDECESSOR, gitHtml, productHash } = require('./tbc-question-revisions.cjs');

const ID = '1-samuel-12-24-context';
const OLD_DISTRACTOR = 'Samuel reassures Israel after they confess the sin of demanding a king.';
const NEW_DISTRACTOR = 'Samuel sets up the Ebenezer stone after God gives Israel victory over the Philistines.';
const results = [];
function check(name, fn) {
  try { fn(); results.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, passed: false, error: error.stack }); console.error('FAIL', name, error.message); }
}
function read(name) { return JSON.parse(fs.readFileSync(`artifacts/question-revisions/${name}.json`, 'utf8')); }

try {
  const before = read('predecessor-dded986');
  const after = read('candidate');
  const archive = readArchive();
  assert.equal(before.productSha256, productHash(gitHtml(BATCH03_PREDECESSOR)), 'stale Batch 03 predecessor capture');
  assert.equal(after.productSha256, productHash(fs.readFileSync('index.html')), 'stale candidate capture');
  const oldQuestion = before.sources.find(question => question.itemId === ID);
  const newQuestion = after.sources.find(question => question.itemId === ID);
  const oldPosition = oldQuestion.options.indexOf(oldQuestion.answer);
  const newPosition = newQuestion.options.indexOf(newQuestion.answer);

  check('exact certified predecessor is archived with its authoritative fingerprint', () => {
    const row = archive.records.find(record => record.id === ID && record.predecessor === BATCH03_PREDECESSOR);
    assert.ok(row);
    assert.deepEqual(row.snapshot, oldQuestion);
    assert.equal(row.fingerprint, core.fingerprint(oldQuestion));
    assert.equal(row.snapshotSha256, core.snapshotHash(oldQuestion));
  });
  check('only the confirmed overlapping distractor changes', () => {
    const oldWithoutOptions = { ...oldQuestion, options: null };
    const newWithoutOptions = { ...newQuestion, options: null };
    assert.deepEqual(newWithoutOptions, oldWithoutOptions);
    assert.equal(oldQuestion.options[2], OLD_DISTRACTOR);
    assert.equal(newQuestion.options[2], NEW_DISTRACTOR);
    assert.deepEqual(newQuestion.options.filter((_, index) => index !== 2), oldQuestion.options.filter((_, index) => index !== 2));
  });
  check('the keyed answer and its position remain unchanged', () => {
    assert.equal(newQuestion.answer, oldQuestion.answer);
    assert.equal(oldPosition, 3);
    assert.equal(newPosition, oldPosition);
    assert.equal(newQuestion.options.filter(option => option === newQuestion.answer).length, 1);
  });
  check('all four contexts are textually distinct and the new distractor belongs to 1 Samuel 7', () => {
    assert.equal(new Set(newQuestion.options).size, 4);
    assert.match(newQuestion.options[0], /choosing David/);
    assert.match(newQuestion.options[1], /Saul/);
    assert.match(newQuestion.options[2], /Ebenezer/);
    assert.match(newQuestion.options[3], /request for a king/);
  });
  check('audit ledger changes exactly entries 101–150 with individual evidence and option findings', () => {
    const prior = JSON.parse(execFileSync('git', ['show', `${BATCH03_PREDECESSOR}:docs/TBC_QUESTION_AUDIT.json`], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync('docs/TBC_QUESTION_AUDIT.json', 'utf8'));
    assert.deepEqual(ledger.entries.slice(0, 100), prior.entries.slice(0, 100));
    // Batch 04 owns entries 151-200 and verifies that range independently.
    // Everything after that bounded range must remain identical to Batch 03.
    assert.deepEqual(ledger.entries.slice(200), prior.entries.slice(200));
    const batch = ledger.entries.slice(100, 150);
    assert.equal(batch.length, 50);
    assert.equal(batch.filter(entry => entry.audit.status === 'unchanged and verified').length, 49);
    assert.deepEqual(batch.filter(entry => entry.audit.status === 'corrected').map(entry => entry.canonicalId), [ID]);
    assert.equal(new Set(batch.map(entry => entry.audit.rationale)).size, 50, 'rationales must be individual');
    for (const entry of batch) {
      assert.ok(entry.audit.evidence.length > 0 && entry.audit.evidence.every(item => item.type === 'Direct Scripture' && /^https:\/\/biblehub\.com\/bsb\//.test(item.url)));
      assert.equal(entry.audit.optionFindings.length, entry.options.length);
      assert.deepEqual(entry.audit.optionFindings.map(item => item.optionIndex), entry.options.map((_, index) => index));
    }
  });
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
}

fs.mkdirSync('artifacts/batch03', { recursive: true });
fs.writeFileSync('artifacts/batch03/question-quality.json', `${JSON.stringify({ results }, null, 2)}\n`);
console.log(`BATCH 03 QUESTION QUALITY: ${results.filter(result => result.passed).length}/${results.length}`);
if (results.some(result => !result.passed)) process.exitCode = 1;
