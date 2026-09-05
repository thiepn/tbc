'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const id = require('./tbc-product-identity.cjs');
const { validateBatch04Transition } = require('./tbc-batch04-successor-transition.cjs');
const SOURCE = path.resolve(id.ROOT, process.env.P2A_OUT_DIR || 'artifacts/p2a');

test('Batch 04 successor accepts its exact candidate and rejects bounded corruption cases', async t => {
  const boundary = path.join(id.ROOT, 'artifacts/batch04-successor-negative');
  fs.mkdirSync(boundary, { recursive: true });
  const root = fs.mkdtempSync(path.join(boundary, 'negative-'));
  const parent = id.loadBatch03Manifest();
  const files = [...id.PRODUCT, id.MANIFEST, id.TRANSITION, id.BATCH03_MANIFEST, id.BATCH03_TRANSITION,
    id.BATCH04_MANIFEST, id.BATCH04_TRANSITION, id.BATCH07_MANIFEST, id.BATCH07_TRANSITION, id.P2A, id.ACCEPTANCE,
    ...Object.keys(id.loadManifest().historicalEvidence)];
  for (const file of files) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.copyFileSync(path.join(id.ROOT, file), path.join(root, file)); }
  const content = path.join(root, 'content'); fs.mkdirSync(content);
  for (const file of [...id.CONTENT_FILES, 'question-bank-summary.json']) fs.copyFileSync(path.join(SOURCE, file), path.join(content, file));
  const mutate = (name, file, change, check, expected) => t.test(name, () => {
    const before = fs.readFileSync(file); try { fs.writeFileSync(file, change(before)); assert.throws(check, expected); } finally { fs.writeFileSync(file, before); }
  });
  const json = fn => bytes => { const value = JSON.parse(bytes); fn(value); return JSON.stringify(value, null, 2) + '\n'; };
  try {
    await t.test('exact candidate, all predecessor transitions, and current content pass', () => {
      id.validateCurrent(root); validateBatch04Transition(root); id.validateContent(content, root);
    });
    for (const [name, mutateManifest] of [
      ['wrong predecessor chain identity', q => { q.predecessor.indexBlobSha1 = '0'.repeat(40); }],
      ['wrong candidate index identity', q => { q.successor.indexBlobSha1 = '0'.repeat(40); }],
      ['changed corrected-question count', q => { q.audit.corrected = 5; }]
    ]) await mutate(name, path.join(root, id.BATCH04_MANIFEST), json(mutateManifest), () => id.loadBatch04Manifest(root), /Batch 04 identity manifest tampered/);
    for (const field of ['id', 'predecessorFingerprint', 'successorFingerprint', 'from', 'to']) {
      await mutate(`rejects altered Batch 04 transition ${field}`, path.join(root, id.BATCH04_TRANSITION), json(q => { q.question[field] = 'tampered'; }), () => id.loadBatch04Transition(root), /Batch 04 transition record altered/);
    }
    for (const [name, file] of [
      ['first successor identity rewrite', id.MANIFEST], ['first successor transition rewrite', id.TRANSITION],
      ['Batch 03 identity rewrite', id.BATCH03_MANIFEST], ['Batch 03 transition rewrite', id.BATCH03_TRANSITION],
      ['historical certificate rewrite', 'certification/p0e-preservation-baseline.json'], ['historical P2A freezer rewrite', id.P2A]
    ]) await mutate(`rejects ${name}`, path.join(root, file), bytes => Buffer.concat([bytes, Buffer.from('\n')]), () => id.validateCurrent(root), /prior successor|prior Batch 03|protected historical evidence|historical P2A baseline|P2A changes exceed/);
    for (const [name, file, change] of [
      ['second unauthorized canonical question edit', 'question-bank.json', q => { q.questions[1].question += ' tampered'; }],
      ['answer-key change', 'question-bank.json', q => { q.questions[0].correctAnswer = 'tampered'; }],
      ['unrelated distractor change', 'question-bank.json', q => { q.questions[1].distractors[0] = 'tampered'; }],
      ['tier change', 'question-bank.json', q => { q.questions[1].difficulty = 'Expert'; }],
      ['alias change', 'question-registry.json', q => { q.aliases[0].canonicalId = 'tampered'; }],
      ['structured-subset change', 'structured-questions.json', q => { q.questions[0].question += ' tampered'; }]
    ]) await mutate(`rejects ${name}`, path.join(content, file), json(change), () => id.validateContent(content, root), /protected content artifact changed/);
    for (const [name, file] of [['schema/storage-key change', id.BATCH04_MANIFEST], ['supporting deployed-asset change', 'assets/pr5-shell.js']]) {
      await mutate(`rejects ${name}`, path.join(root, file), bytes => Buffer.concat([bytes, Buffer.from('\n')]), () => id.validateCurrent(root), /Batch 04 identity manifest tampered|prior Batch 04 successor identity changed|current product identity changed/);
    }
    assert.equal(parent.successor.indexBlobSha1, id.BATCH03_SUCCESSOR);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
