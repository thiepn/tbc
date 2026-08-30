'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const identity = require('./tbc-product-identity.cjs');
const { split, storageNames, schemaAssignments } = require('./tbc-successor-transition.cjs');
const revisions = require('./tbc-question-revisions.cjs');

function validateBatch03Transition(root = identity.ROOT) {
  const manifest = identity.validateCurrent(root);
  const transition = identity.loadBatch03Transition(root);
  const before = split(identity.git('show', `${identity.BATCH03_PREDECESSOR}:index.html`));
  const after = split(identity.read(root, 'index.html'));
  assert.equal(transition.predecessor, manifest.predecessor.indexBlobSha1);
  assert.equal(transition.successor, manifest.successor.indexBlobSha1);
  assert.equal(identity.sha256(before.engine), transition.predecessorEngineSha256);
  assert.equal(identity.sha256(after.engine), transition.successorEngineSha256);
  assert.equal(identity.sha256(before.html), transition.productSha256.predecessor);
  assert.equal(identity.sha256(after.html), transition.productSha256.successor);
  assert.equal(after.shell, before.shell, 'Batch 03 changed the outer HTML shell');
  assert.deepEqual(storageNames(after.engine), storageNames(before.engine), 'Batch 03 changed storage keys');
  assert.deepEqual(schemaAssignments(after.engine), schemaAssignments(before.engine), 'Batch 03 changed save schema');
  const archive = revisions.readArchive(identity.read(root, 'index.html'));
  revisions.core.validate(archive);
  assert.equal(archive.records.length, 5, 'Batch 03 archive count changed');
  const record = archive.records.find(row => row.id === transition.question.id);
  assert.ok(record, 'Batch 03 predecessor archive missing');
  assert.equal(record.predecessor, transition.predecessorCommit);
  assert.equal(record.fingerprint, transition.question.predecessorFingerprint);
  assert.equal(record.snapshotSha256, transition.question.predecessorSnapshotSha256);
  assert.equal(revisions.core.fingerprint(record.snapshot), transition.question.predecessorFingerprint);
  assert.notEqual(transition.question.successorFingerprint, transition.question.predecessorFingerprint);
  const priorArchive = revisions.readArchive(identity.git('show', `${identity.BATCH03_PREDECESSOR}:index.html`));
  assert.equal(priorArchive.records.length, 4, 'prior archive changed');
  assert.deepEqual(archive.records.filter(row => row.id !== record.id), priorArchive.records, 'prior archived revisions changed');
  const [append, replacement] = transition.edits;
  assert.equal(before.engine.slice(append.offset, append.offset + append.anchor.length), append.anchor, 'Batch 03 archive anchor changed');
  assert.equal(before.engine.slice(replacement.offset, replacement.offset + replacement.from.length), replacement.from, 'Batch 03 option source changed');
  const archiveText = `,${JSON.stringify(record)}${append.anchor}`;
  let replay = before.engine.slice(0, append.offset) + archiveText + before.engine.slice(append.offset + append.anchor.length);
  const shifted = replacement.offset + archiveText.length - append.anchor.length;
  assert.equal(replay.slice(shifted, shifted + replacement.from.length), replacement.from, 'Batch 03 option replay offset changed');
  replay = replay.slice(0, shifted) + replacement.to + replay.slice(shifted + replacement.from.length);
  assert.equal(replay, after.engine, 'candidate differs from exact authorized Batch 03 replay');
  new vm.Script(after.engine);
  return { edits: transition.edits.length, archivedQuestions: archive.records.length, successor: transition.successor };
}

module.exports = { validateBatch03Transition };
if (require.main === module) {
  try { console.log('BATCH 03 SUCCESSOR TRANSITION PASS:', validateBatch03Transition()); }
  catch (error) { console.error(error.stack); process.exitCode = 1; }
}
