'use strict';
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const vm = require('node:vm');
const identity = require('./tbc-product-identity.cjs');
const { ROOT, BASE, TRANSITION, read, normalize, sha256, git, validateCurrent } = identity;
const PACKAGE = /(<script id="tbc-engine-package" type="application\/octet-stream">)([A-Za-z0-9+/=\r\n]+)(<\/script>)/;
function split(bytes) {
  const html = normalize(bytes), match = html.match(PACKAGE);
  assert.ok(match, 'embedded core missing');
  return { html, shell: html.replace(PACKAGE, '$1__ENGINE__$3'), engine: zlib.gunzipSync(Buffer.from(match[2].replace(/\s/g, ''), 'base64')).toString('utf8') };
}
const storageNames = engine => [...new Set(engine.match(/theBibleChallenge_[a-zA-Z0-9_]+/g))].sort();
const schemaAssignments = engine => [...engine.matchAll(/\bschemaVersion\s*(?::|=(?!=))\s*\d+/g)].map(m => m[0]);
function validateTransition(root = ROOT) {
  const manifest = validateCurrent(root), text = normalize(read(root, TRANSITION));
  assert.equal(sha256(text), manifest.transition.sha256, 'authorized transition record altered');
  const transition = JSON.parse(text);
  assert.equal(transition.predecessor, manifest.predecessor.indexBlobSha1);
  assert.equal(transition.successor, manifest.successor.indexBlobSha1);
  const before = split(git('show', `${BASE}:index.html`)), after = split(read(root, 'index.html'));
  assert.ok(after.shell === before.shell, 'unrelated outer HTML edit');
  assert.equal(sha256(before.engine), transition.predecessorEngineSha256);
  assert.equal(sha256(after.engine), transition.successorEngineSha256);
  let replay = before.engine;
  for (const [i, edit] of transition.edits.entries()) {
    assert.ok(typeof edit.from === 'string' && edit.from.length > 0 && typeof edit.to === 'string');
    assert.ok(Number.isInteger(edit.count) && edit.count > 0);
    assert.equal(replay.split(edit.from).length - 1, edit.count, `repair edit ${i + 1} cardinality changed`);
    replay = replay.split(edit.from).join(edit.to);
  }
  assert.ok(replay === after.engine, 'candidate differs from exact authorized repair replay');
  assert.deepEqual(storageNames(after.engine), storageNames(before.engine), 'storage key names changed');
  assert.deepEqual(storageNames(after.engine), manifest.persistence.literalStorageNames);
  assert.deepEqual(schemaAssignments(after.engine), schemaAssignments(before.engine), 'save schema assignments changed');
  assert.ok(after.engine.includes('DEFAULT.schemaVersion=27'), 'current schema 27 declaration missing');
  new vm.Script(after.engine);
  for (const match of after.html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/application\/octet-stream|\bsrc=/.test(match[1])) new vm.Script(match[2]);
  }
  for (const file of manifest.supportingJavaScript) new vm.Script(read(root, file).toString('utf8'));
  return { edits: transition.edits.length, successor: transition.successor };
}
module.exports = { validateTransition, split, storageNames, schemaAssignments };
if (require.main === module) {
  try { console.log('SUCCESSOR TRANSITION PASS:', validateTransition()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
