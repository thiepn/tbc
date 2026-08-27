'use strict';
// Trust anchors for the single user-authorized preservation-repair transition.
// Changing these requires a new reviewed authorization, never a freezer run.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const BASE = 'f84d5eff6a93046642c681e9163baa1b0b6b31a2';
const STAGE0 = '9dbd277da6b8032dd83cd34a850186b06fb1e9fc';
const PREDECESSOR = '915ec2f5c4eeb270f63b3a04d442b8a8429c5993';
const SUCCESSOR = 'ce1b30a8fe2c07822001b9542271eea60174f4f1';
const MANIFEST = 'certification/tbc-product-identity.json';
const TRANSITION = 'certification/tbc-preservation-repair-transition.json';
const P2A = 'certification/p2a-question-bank-extraction-baseline.json';
const ACCEPTANCE = 'scripts/tbc-stage0-invariants.cjs';
const MANIFEST_SHA256 = 'aea7b85689a2ee39dad4ae0b74ba76a3e707fb1f47a371abcbf329b25f84a773';
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
  assert.deepEqual(manifest.predecessor, { recoveryCommit: BASE, stage0Commit: STAGE0, indexBlobSha1: PREDECESSOR });
  assert.equal(manifest.successor.indexBlobSha1, SUCCESSOR, 'unrecognized successor');
  assert.deepEqual(manifest.changedProductFiles, ['index.html']);
  assert.deepEqual(Object.keys(manifest.productFiles), PRODUCT);
  return manifest;
}
function validateProtectedEvidence(root = ROOT, manifest = loadManifest(root)) {
  const files = gitText('ls-tree', '-r', '--name-only', STAGE0, 'certification').split('\n').filter(f => f !== P2A);
  assert.deepEqual(Object.keys(manifest.historicalEvidence), files, 'historical evidence inventory changed');
  for (const file of files) {
    assert.equal(manifest.historicalEvidence[file], gitText('rev-parse', `${STAGE0}:${file}`));
    assert.equal(candidateBlob(root, file), manifest.historicalEvidence[file], `protected historical evidence changed: ${file}`);
  }
  const previous = normalize(git('show', `${STAGE0}:${P2A}`));
  assert.equal(previous.split(PREDECESSOR).length, 2, 'ambiguous predecessor P2A pin');
  assert.equal(normalize(read(root, P2A)), previous.replace(PREDECESSOR, SUCCESSOR), 'P2A changes exceed source.indexBlobSha1');
}
function validateCurrent(root = ROOT) {
  const manifest = loadManifest(root);
  assert.equal(gitText('rev-parse', `${BASE}:index.html`), PREDECESSOR, 'unrecognized predecessor');
  assert.equal(gitText('rev-parse', `${STAGE0}:index.html`), PREDECESSOR);
  git('merge-base', '--is-ancestor', BASE, STAGE0);
  git('merge-base', '--is-ancestor', STAGE0, 'HEAD');
  for (const file of PRODUCT) {
    const expected = file === 'index.html' ? SUCCESSOR : gitText('rev-parse', `${BASE}:${file}`);
    assert.equal(manifest.productFiles[file], expected, `unauthorized product identity: ${file}`);
    assert.equal(candidateBlob(root, file), expected, `current product identity changed: ${file}`);
  }
  assert.equal(manifest.acceptanceTest.blobSha1, '8319d90d6ca5d6b85aa8d1b34ce96ed3af96b073');
  assert.equal(candidateBlob(root, ACCEPTANCE), manifest.acceptanceTest.blobSha1, 'Stage 0 acceptance test changed');
  validateProtectedEvidence(root, manifest);
  return manifest;
}
function validateContent(dir, root = ROOT) {
  const manifest = loadManifest(root), contract = manifest.content;
  const json = file => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const summary = json('question-bank-summary.json');
  assert.equal(summary.source.indexBlobSha1, SUCCESSOR, 'content evidence has stale source identity');
  assert.deepEqual(summary.counts, contract.counts, 'content counts changed');
  assert.deepEqual(summary.difficultyDistribution, contract.difficultyDistribution, 'tier distribution changed');
  assert.deepEqual(summary.hashes, contract.semanticHashes, 'semantic aggregate changed');
  assert.equal(summary.source.qb11Freeze.saveSchema, manifest.persistence.saveSchema, 'save schema changed');
  assert.ok(summary.runtimeHealth.pageErrors.length === 0 && summary.runtimeHealth.consoleErrors.length === 0, 'extraction runtime errors');
  for (const file of CONTENT_FILES) {
    assert.equal(sha256(fs.readFileSync(path.join(dir, file))), contract.artifactSha256[file], `protected content artifact changed: ${file}`);
  }
  const bank = json(CONTENT_FILES[0]), structured = json(CONTENT_FILES[1]), registry = json(CONTENT_FILES[2]);
  assert.equal(sha256(JSON.stringify(bank.questions.map(q => [q.canonicalId, q.contentSha256]))), contract.perQuestionHashesSha256, 'per-question hashes changed');
  assert.equal(sha256(JSON.stringify(structured.questions.map(q => [q.canonicalId, q.contentSha256]))), contract.structuredHashesSha256, 'structured hashes changed');
  assert.equal(sha256(JSON.stringify(registry.aliases)), contract.aliasTargetsSha256, 'alias mappings changed');
  return contract;
}
module.exports = { ROOT, BASE, STAGE0, PREDECESSOR, SUCCESSOR, MANIFEST, TRANSITION, P2A, ACCEPTANCE,
  PRODUCT, CONTENT_FILES, sha256, normalize, git, gitText, read, candidateBlob, loadManifest, validateCurrent, validateContent, validateProtectedEvidence };
if (require.main === module) {
  try {
    validateCurrent();
    if (process.argv[2] === '--content') {
      assert.ok(process.argv[3], 'content directory required'); validateContent(path.resolve(process.argv[3]));
    } else assert.equal(process.argv.length, 2, 'unknown identity-validator argument');
    console.log('CURRENT PRODUCT IDENTITY PASS: recognized successor, 13 product files, immutable historical evidence, source-only P2A update, unchanged acceptance test.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
