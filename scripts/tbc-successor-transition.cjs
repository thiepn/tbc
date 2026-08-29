'use strict';
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const vm = require('node:vm');
const identity = require('./tbc-product-identity.cjs');
const { ROOT, BASE, PRODUCTION, read, normalize, sha256, git, validateCurrent, loadHistoricalManifest, loadTransition } = identity;
const PACKAGE = /(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
function split(bytes) {
  const html = normalize(bytes), match = html.match(PACKAGE);
  assert.ok(match, 'embedded core missing');
  return { html, shell: html.replace(PACKAGE, '$1__ENGINE__$3'), engine: zlib.gunzipSync(Buffer.from(match[2].replace(/\s/g, ''), 'base64')).toString('utf8') };
}
const storageNames = engine => [...new Set(engine.match(/theBibleChallenge_[a-zA-Z0-9_]+/g))].sort();
const schemaAssignments = engine => [...engine.matchAll(/\bschemaVersion\s*(?::|=(?!=))\s*\d+/g)].map(m => m[0]);
function validateTransition(root = ROOT) {
  const manifest = validateCurrent(root), transition = loadTransition(root);
  assert.equal(transition.predecessor, manifest.predecessor.indexBlobSha1);
  assert.equal(transition.successor, manifest.successor.indexBlobSha1);
  assert.equal(transition.candidateContentCommit, manifest.successor.contentCommit);
  const original = split(git('show', `${BASE}:index.html`));
  const before = split(git('show', `${PRODUCTION}:index.html`)), after = split(read(root, 'index.html'));
  // The original forty-edit transition is still replayed against its own
  // predecessor, with both historical record bytes and digests unchanged.
  const historical = loadHistoricalManifest(root);
  const historicalText = normalize(read(root, historical.transition.file));
  assert.equal(sha256(historicalText), historical.transition.sha256, 'historical transition record altered');
  const prior = JSON.parse(historicalText);
  assert.equal(prior.predecessor, historical.predecessor.indexBlobSha1);
  assert.equal(prior.successor, historical.successor.indexBlobSha1);
  assert.equal(sha256(original.engine), prior.predecessorEngineSha256);
  assert.equal(sha256(before.engine), prior.successorEngineSha256);
  let historicalReplay = original.engine;
  for (const [i, edit] of prior.edits.entries()) {
    assert.ok(typeof edit.from === 'string' && edit.from.length > 0 && typeof edit.to === 'string');
    assert.ok(Number.isInteger(edit.count) && edit.count > 0);
    assert.equal(historicalReplay.split(edit.from).length - 1, edit.count, `historical repair edit ${i + 1} cardinality changed`);
    historicalReplay = historicalReplay.split(edit.from).join(edit.to);
  }
  assert.equal(historicalReplay, before.engine, 'historical repair replay changed');
  assert.equal(original.shell, before.shell, 'historical outer HTML changed');
  assert.deepEqual(storageNames(original.engine), storageNames(before.engine));
  assert.deepEqual(schemaAssignments(original.engine), schemaAssignments(before.engine));
  assert.ok(after.shell === before.shell, 'unrelated outer HTML edit');
  assert.equal(sha256(before.engine), transition.predecessorEngineSha256);
  assert.equal(sha256(after.engine), transition.successorEngineSha256);
  assert.equal(sha256(before.html), transition.productSha256.predecessor);
  assert.equal(sha256(after.html), transition.productSha256.successor);
  let replay = '', cursor = 0;
  for (const [i, edit] of transition.edits.entries()) {
    assert.ok(Number.isInteger(edit.offset) && edit.offset >= cursor && edit.offset <= before.engine.length);
    assert.ok(typeof edit.from === 'string' && edit.from.length <= 2000 && typeof edit.to === 'string' && edit.to.length <= 50000);
    assert.equal(before.engine.slice(edit.offset, edit.offset + edit.from.length), edit.from, `revision edit ${i + 1} source changed`);
    replay += before.engine.slice(cursor, edit.offset) + edit.to;
    cursor = edit.offset + edit.from.length;
  }
  replay += before.engine.slice(cursor);
  assert.ok(replay === after.engine, 'candidate differs from exact authorized repair replay');
  const {readArchive, core} = require('./tbc-question-revisions.cjs');
  const archive = readArchive(read(root, 'index.html'));
  core.validate(archive);
  assert.equal(archive.records.length, 4);
  assert.deepEqual(transition.questions.map(q => q.id), transition.changedStableIds);
  assert.deepEqual(archive.records.map(r => r.id).sort(), transition.changedStableIds.slice().sort());
  for (const row of transition.questions) {
    const record = archive.records.find(r => r.id === row.id);
    assert.equal(record.predecessor, PRODUCTION);
    assert.equal(record.fingerprint, row.predecessorFingerprint);
    assert.equal(record.snapshotSha256, row.archiveSnapshotSha256);
    assert.equal(core.fingerprint({...record.snapshot, options:row.successorQuestion.options}), row.successorFingerprint);
    assert.notEqual(row.successorFingerprint, row.predecessorFingerprint);
  }
  assert.deepEqual(storageNames(after.engine), storageNames(before.engine), 'storage key names changed');
  assert.deepEqual(storageNames(after.engine), manifest.persistence.literalStorageNames);
  assert.deepEqual(schemaAssignments(after.engine), schemaAssignments(before.engine), 'save schema assignments changed');
  assert.ok(after.engine.includes('DEFAULT.schemaVersion=27'), 'current schema 27 declaration missing');
  new vm.Script(after.engine);
  for (const match of after.html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/application\/octet-stream|\bsrc=/.test(match[1])) new vm.Script(match[2]);
  }
  for (const file of manifest.supportingJavaScript) new vm.Script(read(root, file).toString('utf8'));
  return { historicalEdits: prior.edits.length, edits: transition.edits.length, successor: transition.successor, archivedQuestions: archive.records.length };
}
module.exports = { validateTransition, split, storageNames, schemaAssignments };
if (require.main === module) {
  try { console.log('SUCCESSOR TRANSITION PASS:', validateTransition()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
