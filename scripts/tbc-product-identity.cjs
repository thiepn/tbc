'use strict';
// Trust anchors for the two explicitly authorized, append-only successors.
// Changing these requires a new reviewed authorization, never a freezer run.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { rawTextIdentityMatches } = require('./tbc-source-identity.cjs');
const ROOT = path.resolve(__dirname, '..');
const BASE = 'f84d5eff6a93046642c681e9163baa1b0b6b31a2';
const STAGE0 = '9dbd277da6b8032dd83cd34a850186b06fb1e9fc';
const ORIGINAL_PREDECESSOR = '915ec2f5c4eeb270f63b3a04d442b8a8429c5993';
const PREDECESSOR = 'ce1b30a8fe2c07822001b9542271eea60174f4f1';
const PRODUCTION = 'e09333f1b532ef5fe5d3179335eafbba5e61d53b';
const CONTENT_COMMIT = '1ca52ecb9ba3781c4212610d2b3fff83e2c11b6e';
const SUCCESSOR = '2009bc20e2fb95646ccd54976342d79bbabe0223';
const HISTORICAL_MANIFEST = 'certification/tbc-product-identity.json';
const MANIFEST = 'certification/tbc-question-revision-identity.json';
const TRANSITION = 'certification/tbc-question-revision-transition.json';
const BATCH03_MANIFEST = 'certification/tbc-batch03-question-revision-identity.json';
const BATCH03_TRANSITION = 'certification/tbc-batch03-question-revision-transition.json';
const P2A = 'certification/p2a-question-bank-extraction-baseline.json';
const ACCEPTANCE = 'scripts/tbc-stage0-invariants.cjs';
const HISTORICAL_MANIFEST_SHA256 = 'aea7b85689a2ee39dad4ae0b74ba76a3e707fb1f47a371abcbf329b25f84a773';
const MANIFEST_SHA256 = '4a7223016877c31279b5c22f547accac49594d4498fe6df7ad4900b802784bb7';
const BATCH03_MANIFEST_SHA256 = 'dd0507725e08266ba61dbb54b0378887083d9dc8dcd30ba4b7bfccd33f83e221';
const BATCH03_SUCCESSOR = '29994bf8bf0357a92a9c84bd84d327d3f5538221';
const BATCH03_PREDECESSOR = 'dded986a1fce1683acc04b621939e67288084c17';
const PRODUCT = ['index.html', 'assets/pr5-foundation.css', 'assets/pr5-shell.js',
  'assets/pr6-play-learning.css', 'assets/pr6-play-learning.js', 'assets/p0b-player-controls.js',
  'assets/p0c-existing-feature-preservation.js', 'assets/p1b-pr7-production.js',
  'assets/pr7-library-progress.css', 'assets/pr7-collections-adapter.js',
  'assets/pr7-library-progress.js', 'assets/pr7-navigation-guard.js', 'favicon.svg'];
const CONTENT_FILES = ['question-bank.json', 'structured-questions.json', 'question-registry.json'];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const normalize = bytes => bytes.toString('utf8').replace(/\r\n/g, '\n');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const gitText = (...args) => git(...args).toString('utf8').trim();
const read = (root, file) => fs.readFileSync(path.join(root, file));
function candidateBlob(root, file) {
  return execFileSync('git', ['hash-object', `--path=${file}`, '--stdin'], {
    cwd: ROOT, input: read(root, file), encoding: 'utf8', maxBuffer: 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
}
function loadManifest(root = ROOT) {
  const text = normalize(read(root, MANIFEST));
  assert.equal(sha256(text), MANIFEST_SHA256, 'current identity manifest tampered');
  const manifest = JSON.parse(text);
  assert.deepEqual(manifest.predecessor, { productCommit: PRODUCTION, indexBlobSha1: PREDECESSOR, identityManifest: HISTORICAL_MANIFEST });
  assert.equal(manifest.successor.indexBlobSha1, SUCCESSOR, 'unrecognized successor');
  assert.equal(manifest.successor.contentCommit, CONTENT_COMMIT, 'unrecognized content commit');
  assert.deepEqual(manifest.changedProductFiles, ['index.html']);
  assert.deepEqual(Object.keys(manifest.productFiles), PRODUCT);
  return manifest;
}
function loadHistoricalManifest(root = ROOT) {
  const text = normalize(read(root, HISTORICAL_MANIFEST));
  assert.equal(sha256(text), HISTORICAL_MANIFEST_SHA256, 'protected historical evidence changed: predecessor manifest');
  const manifest = JSON.parse(text);
  assert.equal(manifest.successor.indexBlobSha1, PREDECESSOR);
  return manifest;
}
function loadTransition(root = ROOT) {
  const manifest = loadManifest(root), text = normalize(read(root, TRANSITION));
  assert.equal(sha256(text), manifest.transition.sha256, 'authorized transition record altered');
  return JSON.parse(text);
}
function loadBatch03Manifest(root = ROOT) {
  const text = normalize(read(root, BATCH03_MANIFEST));
  assert.equal(sha256(text), BATCH03_MANIFEST_SHA256, 'Batch 03 identity manifest tampered');
  const manifest = JSON.parse(text);
  assert.deepEqual(manifest.predecessor, { productCommit: BATCH03_PREDECESSOR, indexBlobSha1: SUCCESSOR,
    identityManifest: MANIFEST, identityManifestBlobSha1: '914fa84cf4997a780f5a52a0d7ee11d96c2b09c7' });
  assert.equal(manifest.successor.indexBlobSha1, BATCH03_SUCCESSOR, 'unrecognized Batch 03 successor');
  assert.deepEqual(manifest.changedProductFiles, ['index.html']);
  assert.deepEqual(Object.keys(manifest.productFiles), PRODUCT);
  return manifest;
}
function loadBatch03Transition(root = ROOT) {
  const manifest = loadBatch03Manifest(root), text = normalize(read(root, BATCH03_TRANSITION));
  assert.equal(sha256(text), manifest.transition.sha256, 'Batch 03 transition record altered');
  return JSON.parse(text);
}
function validateProtectedEvidence(root = ROOT, manifest = loadManifest(root)) {
  const files = gitText('ls-tree', '-r', '--name-only', PRODUCTION, 'certification').split('\n').filter(f => f !== P2A);
  assert.deepEqual(Object.keys(manifest.historicalEvidence), files, 'historical evidence inventory changed');
  for (const file of files) {
    assert.equal(manifest.historicalEvidence[file], gitText('rev-parse', `${PRODUCTION}:${file}`));
    assert.equal(candidateBlob(root, file), manifest.historicalEvidence[file], `protected historical evidence changed: ${file}`);
    assert.ok(rawTextIdentityMatches(read(root, file), manifest.historicalEvidence[file]), `protected historical evidence changed: raw ${file}`);
  }
  const previous = normalize(git('show', `${STAGE0}:${P2A}`));
  assert.equal(previous.split(ORIGINAL_PREDECESSOR).length, 2, 'ambiguous predecessor P2A pin');
  assert.equal(normalize(read(root, P2A)), previous.replace(ORIGINAL_PREDECESSOR, SUCCESSOR), 'P2A changes exceed source.indexBlobSha1');
}
// Historical hashes remain on disk. Only this pinned successor supplies the
// current canonical/registry expectations; metadata/count/tier assertions stay.
function currentP2ABaseline(root = ROOT) {
  const manifest = loadBatch03Manifest(root);
  validateProtectedEvidence(root);
  const baseline = JSON.parse(read(root, P2A));
  const hashes = manifest.content.semanticHashes;
  assert.equal(hashes.structuredBank, baseline.hashes.structuredBankSha256, 'structured history changed');
  return { ...baseline, source: { ...baseline.source, indexBlobSha1: manifest.successor.indexBlobSha1 }, hashes: { ...baseline.hashes,
    canonicalBankSha256: hashes.canonicalBank, registryBankSha256: hashes.registry } };
}
function validateCurrent(root = ROOT) {
  const manifest = loadBatch03Manifest(root);
  assert.equal(gitText('rev-parse', `${BASE}:index.html`), ORIGINAL_PREDECESSOR, 'unrecognized original predecessor');
  assert.equal(gitText('rev-parse', `${STAGE0}:index.html`), ORIGINAL_PREDECESSOR);
  assert.equal(gitText('rev-parse', `${PRODUCTION}:index.html`), PREDECESSOR, 'unrecognized predecessor');
  assert.equal(gitText('rev-parse', `${CONTENT_COMMIT}:index.html`), SUCCESSOR);
  assert.equal(gitText('rev-parse', `${BATCH03_PREDECESSOR}:index.html`), SUCCESSOR, 'Batch 03 predecessor is not the certified successor');
  git('merge-base', '--is-ancestor', BASE, STAGE0);
  git('merge-base', '--is-ancestor', STAGE0, 'HEAD');
  git('merge-base', '--is-ancestor', PRODUCTION, CONTENT_COMMIT);
  git('merge-base', '--is-ancestor', CONTENT_COMMIT, 'HEAD');
  for (const file of PRODUCT) {
    const expected = file === 'index.html' ? BATCH03_SUCCESSOR : gitText('rev-parse', `${BASE}:${file}`);
    assert.equal(manifest.productFiles[file], expected, `unauthorized product identity: ${file}`);
    assert.equal(candidateBlob(root, file), expected, `current product identity changed: ${file}`);
    assert.ok(rawTextIdentityMatches(read(root, file), expected), `current product raw identity changed: ${file}`);
  }
  assert.equal(candidateBlob(root, ACCEPTANCE), '8319d90d6ca5d6b85aa8d1b34ce96ed3af96b073', 'Stage 0 acceptance test changed');
  assert.equal(candidateBlob(root, MANIFEST), '914fa84cf4997a780f5a52a0d7ee11d96c2b09c7', 'prior successor identity changed');
  assert.equal(candidateBlob(root, TRANSITION), '8883f8755b21d65c753544692d5c45d37649b7bf', 'prior successor transition changed');
  assert.equal(candidateBlob(root, P2A), '4ebe174db968064df9ce5b3874f2abb7730ab6c4', 'historical P2A baseline changed');
  validateProtectedEvidence(root);
  return manifest;
}
function validateContent(dir, root = ROOT) {
  const manifest = loadBatch03Manifest(root), contract = manifest.content;
  const json = file => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const summary = json('question-bank-summary.json');
  assert.equal(summary.source.indexBlobSha1, manifest.successor.indexBlobSha1, 'content evidence has stale source identity');
  assert.deepEqual(summary.counts, contract.counts, 'content counts changed');
  assert.deepEqual(summary.difficultyDistribution, contract.difficultyDistribution, 'tier distribution changed');
  assert.deepEqual(summary.hashes, contract.semanticHashes, 'semantic aggregate changed');
  assert.equal(summary.source.qb11Freeze.saveSchema, loadManifest(root).persistence.saveSchema, 'save schema changed');
  assert.ok(summary.runtimeHealth.pageErrors.length === 0 && summary.runtimeHealth.consoleErrors.length === 0, 'extraction runtime errors');
  for (const file of CONTENT_FILES) {
    assert.equal(sha256(fs.readFileSync(path.join(dir, file))), contract.artifactSha256[file], `protected content artifact changed: ${file}`);
  }
  const bank = json(CONTENT_FILES[0]), structured = json(CONTENT_FILES[1]), registry = json(CONTENT_FILES[2]);
  assert.equal(sha256(JSON.stringify(bank.questions.map(q => [q.canonicalId, q.contentSha256]))), contract.perQuestionHashesSha256, 'per-question hashes changed');
  assert.equal(sha256(JSON.stringify(structured.questions.map(q => [q.canonicalId, q.contentSha256]))), contract.structuredHashesSha256, 'structured hashes changed');
  assert.equal(sha256(JSON.stringify(registry.aliases)), contract.aliasTargetsSha256, 'alias mappings changed');
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  const parent = loadManifest(root), transition = loadBatch03Transition(root);
  const priorBank = structuredClone(bank), priorRegistry = structuredClone(registry);
  const qi = priorBank.questions.findIndex(q => q.canonicalId === transition.question.id);
  const ri = priorRegistry.records.findIndex(q => q.itemId === transition.question.id);
  assert.ok(qi >= 0 && ri >= 0, 'authorized Batch 03 question ID missing');
  const priorQuestion = priorBank.questions[qi];
  priorQuestion.options[2] = transition.question.from;
  priorQuestion.distractors[2] = transition.question.from;
  priorQuestion.qualityMetadata.qb7Feedback.distractors[2] = {
    kind: 'cross-question-evidence', option: transition.question.from,
    sourceId: '1-samuel-12-22-context', sourceReference: '1 Samuel 12:22',
    text: `“${transition.question.from}” fits 1 Samuel 12:22; this question is anchored in 1 Samuel 12:24, where the reviewed answer is “Samuel concludes his response to Israel’s request for a king.”.`
  };
  priorQuestion.qualityMetadata.registryDifficulty.measuredLoad.maxOptionWords = 12;
  priorQuestion.registryMetadata.difficulty.measuredLoad.maxOptionWords = 12;
  const rawQuestion = { ...priorBank.questions[qi] };
  for (const key of ['canonicalId','idSource','sourceOrigin','sourceIndex','contentSha256']) delete rawQuestion[key];
  priorBank.questions[qi].contentSha256 = sha256(JSON.stringify(stable(rawQuestion)));
  const priorRecord = priorRegistry.records[ri];
  priorRecord.snapshot.options[2] = transition.question.from;
  priorRecord.difficulty.measuredLoad.maxOptionWords = 12;
  priorRecord.identity.exactSurfaceId = 'b3d279e04bbe778a';
  priorRecord.identity.sourceHash = 'c016beb4c965013e';
  priorRecord.roundIsolation.surfaceGroupId = 'b3d279e04bbe778a';
  for (const [file, value] of [[CONTENT_FILES[0], priorBank], [CONTENT_FILES[2], priorRegistry]]) {
    assert.equal(sha256(JSON.stringify(stable(value), null, 2) + '\n'), parent.content.artifactSha256[file], 'content differs beyond the one authorized Batch 03 question');
  }
  assert.equal(contract.artifactSha256[CONTENT_FILES[1]], parent.content.artifactSha256[CONTENT_FILES[1]], 'structured content changed');
  assert.equal(contract.aliasTargetsSha256, parent.content.aliasTargetsSha256, 'historical aliases changed');
  return contract;
}
module.exports = { ROOT, BASE, STAGE0, PRODUCTION, CONTENT_COMMIT, ORIGINAL_PREDECESSOR, PREDECESSOR, SUCCESSOR, BATCH03_SUCCESSOR, BATCH03_PREDECESSOR, HISTORICAL_MANIFEST, MANIFEST, TRANSITION, BATCH03_MANIFEST, BATCH03_TRANSITION, P2A, ACCEPTANCE,
  PRODUCT, CONTENT_FILES, sha256, normalize, git, gitText, read, candidateBlob, loadManifest, loadHistoricalManifest, loadTransition, loadBatch03Manifest, loadBatch03Transition, currentP2ABaseline, validateCurrent, validateContent, validateProtectedEvidence };
if (require.main === module) {
  try {
    validateCurrent();
    if (process.argv[2] === '--content') {
      assert.ok(process.argv[3], 'content directory required'); validateContent(path.resolve(process.argv[3]));
    } else assert.equal(process.argv.length, 2, 'unknown identity-validator argument');
    console.log('CURRENT PRODUCT IDENTITY PASS: recognized Batch 03 successor, 13 product files, immutable prior evidence and baseline, source-only current P2A authority, unchanged acceptance test.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
