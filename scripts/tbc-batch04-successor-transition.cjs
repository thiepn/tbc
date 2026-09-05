'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const identity = require('./tbc-product-identity.cjs');
const { split, storageNames, schemaAssignments } = require('./tbc-successor-transition.cjs');
const revisions = require('./tbc-question-revisions.cjs');

function validateBatch04Transition(root = identity.ROOT) {
  identity.validateCurrent(root);
  const manifest = identity.loadBatch04Manifest(root);
  const transition = identity.loadBatch04Transition(root);
  const before = split(identity.git('show', `${identity.BATCH04_PREDECESSOR}:index.html`));
  // Batch 04 is historical once a later successor exists. Replay its exact
  // product from the last ledger-only Batch 06 checkpoint, not today's tree.
  const after = split(identity.git('show', `${identity.BATCH07_PREDECESSOR}:index.html`));
  assert.equal(transition.predecessor, manifest.predecessor.indexBlobSha1);
  assert.equal(transition.successor, manifest.successor.indexBlobSha1);
  assert.equal(identity.sha256(before.engine), transition.predecessorEngineSha256);
  assert.equal(identity.sha256(after.engine), transition.successorEngineSha256);
  assert.equal(identity.sha256(before.html), transition.productSha256.predecessor);
  assert.equal(identity.sha256(after.html), transition.productSha256.successor);
  assert.equal(after.shell, before.shell, 'Batch 04 changed the outer HTML shell');
  assert.deepEqual(storageNames(after.engine), storageNames(before.engine), 'Batch 04 changed storage keys');
  assert.deepEqual(schemaAssignments(after.engine), schemaAssignments(before.engine), 'Batch 04 changed save schema');
  const archive = revisions.readArchive(identity.git('show', `${identity.BATCH07_PREDECESSOR}:index.html`));
  revisions.core.validate(archive);
  assert.equal(archive.records.length, 6, 'Batch 04 archive count changed');
  const record = archive.records.find(row => row.id === transition.question.id);
  assert.ok(record, 'Batch 04 predecessor archive missing');
  assert.equal(record.predecessor, transition.predecessorCommit);
  assert.equal(record.fingerprint, transition.question.predecessorFingerprint);
  assert.equal(record.snapshotSha256, transition.question.predecessorSnapshotSha256);
  assert.equal(revisions.core.fingerprint(record.snapshot), transition.question.predecessorFingerprint);
  assert.notEqual(transition.question.successorFingerprint, transition.question.predecessorFingerprint);
  const priorArchive = revisions.readArchive(identity.git('show', `${identity.BATCH04_PREDECESSOR}:index.html`));
  assert.equal(priorArchive.records.length, 5, 'prior Batch 03 archive changed');
  assert.deepEqual(archive.records.filter(row => row.id !== record.id), priorArchive.records, 'prior archived revisions changed');
  const [append, replacement] = transition.edits;
  assert.equal(before.engine.slice(append.offset, append.offset + append.anchor.length), append.anchor, 'Batch 04 archive anchor changed');
  const target = '{"itemId":"1-timothy-6-6-context","fields":{"display":"Cited reference: 1 Timothy 6:6","options":["' + replacement.from + '","Paul urges Timothy to reject greed and pursue godliness.","Paul contrasts false teachers’ greed with true gain","Paul summarizes the saving mission of Christ"],"answer":"Paul contrasts false teachers’ greed with true gain"}';
  assert.equal(before.engine.slice(replacement.offset, replacement.offset + target.length), target, 'Batch 04 option source changed');
  const archiveText = `,${JSON.stringify(record)}${append.anchor}`;
  let replay = before.engine.slice(0, append.offset) + archiveText + before.engine.slice(append.offset + append.anchor.length);
  const shifted = replacement.offset + archiveText.length - append.anchor.length;
  assert.equal(replay.slice(shifted, shifted + target.length), target, 'Batch 04 option replay offset changed');
  replay = replay.slice(0, shifted) + target.replace(replacement.from, replacement.to) + replay.slice(shifted + target.length);
  assert.equal(replay, after.engine, 'candidate differs from exact authorized Batch 04 replay');
  new vm.Script(after.engine);
  return { edits: transition.edits.length, archivedQuestions: archive.records.length, successor: transition.successor };
}

module.exports = { validateBatch04Transition };
if (require.main === module) {
  try { console.log('BATCH 04 SUCCESSOR TRANSITION PASS:', validateBatch04Transition()); }
  catch (error) { console.error(error.stack); process.exitCode = 1; }
}
