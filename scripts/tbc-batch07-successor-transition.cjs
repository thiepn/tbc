'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const identity = require('./tbc-product-identity.cjs');
const { split, storageNames, schemaAssignments } = require('./tbc-successor-transition.cjs');
const revisions = require('./tbc-question-revisions.cjs');

function validateBatch07Transition(root = identity.ROOT) {
  const manifest = identity.validateCurrent(root);
  const transition = identity.loadBatch07Transition(root);
  const before = split(identity.git('show', `${identity.BATCH07_PREDECESSOR}:index.html`));
  const after = split(identity.read(root, 'index.html'));
  assert.equal(transition.predecessor, manifest.predecessor.indexBlobSha1);
  assert.equal(transition.successor, manifest.successor.indexBlobSha1);
  assert.equal(identity.sha256(before.engine), transition.predecessorEngineSha256);
  assert.equal(identity.sha256(after.engine), transition.successorEngineSha256);
  assert.equal(identity.sha256(before.html), transition.productSha256.predecessor);
  assert.equal(identity.sha256(after.html), transition.productSha256.successor);
  assert.equal(after.shell, before.shell, 'Batch 07 changed the outer HTML shell');
  assert.deepEqual(storageNames(after.engine), storageNames(before.engine), 'Batch 07 changed storage keys');
  assert.deepEqual(schemaAssignments(after.engine), schemaAssignments(before.engine), 'Batch 07 changed save schema');
  const archive = revisions.readArchive(identity.read(root, 'index.html'));
  revisions.core.validate(archive);
  assert.equal(archive.records.length, 7, 'Batch 07 archive count changed');
  const record = archive.records.find(row => row.id === transition.question.id);
  assert.ok(record, 'Batch 07 predecessor archive missing');
  assert.equal(record.predecessor, transition.predecessorCommit);
  assert.equal(record.fingerprint, transition.question.predecessorFingerprint);
  assert.equal(record.snapshotSha256, transition.question.predecessorSnapshotSha256);
  assert.equal(revisions.core.fingerprint(record.snapshot), transition.question.predecessorFingerprint);
  assert.notEqual(transition.question.successorFingerprint, transition.question.predecessorFingerprint);
  const priorArchive = revisions.readArchive(identity.git('show', `${identity.BATCH07_PREDECESSOR}:index.html`));
  assert.equal(priorArchive.records.length, 6, 'prior Batch 04 archive changed');
  assert.deepEqual(archive.records.filter(row => row.id !== record.id), priorArchive.records, 'prior archived revisions changed');
  const [append, ...replacements] = transition.edits;
  assert.equal(before.engine.slice(append.offset, append.offset + append.anchor.length), append.anchor, 'Batch 07 archive anchor changed');
  let replay = before.engine.slice(0, append.offset) + `,${JSON.stringify(record)}` + before.engine.slice(append.offset);
  let shift = JSON.stringify(record).length + 1;
  for (const replacement of replacements) {
    const offset = replacement.offset + shift;
    assert.equal(replay.slice(offset, offset + replacement.from.length), replacement.from, `Batch 07 ${replacement.kind} source changed`);
    replay = replay.slice(0, offset) + replacement.to + replay.slice(offset + replacement.from.length);
    shift += replacement.to.length - replacement.from.length;
  }
  assert.equal(replay, after.engine, 'candidate differs from exact authorized Batch 07 replay');
  new vm.Script(after.engine);
  return { edits: transition.edits.length, archivedQuestions: archive.records.length, successor: transition.successor };
}

module.exports = { validateBatch07Transition };
if (require.main === module) {
  try { console.log('BATCH 07 SUCCESSOR TRANSITION PASS:', validateBatch07Transition()); }
  catch (error) { console.error(error.stack); process.exitCode = 1; }
}
