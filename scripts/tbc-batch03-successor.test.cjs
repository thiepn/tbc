'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const id = require('./tbc-product-identity.cjs');
const { validateBatch03Transition } = require('./tbc-batch03-successor-transition.cjs');
const SOURCE = path.resolve(id.ROOT, process.env.P2A_OUT_DIR || 'artifacts/p2a');

test('Batch 03 successor accepts its exact candidate and rejects bounded corruption cases', async t => {
  const boundary = path.join(id.ROOT, 'artifacts/batch03-successor-negative');
  fs.mkdirSync(boundary, { recursive: true });
  const root = fs.mkdtempSync(path.join(boundary, 'negative-'));
  const parent = id.loadManifest();
  const files = [...id.PRODUCT, id.MANIFEST, id.TRANSITION, id.BATCH03_MANIFEST, id.BATCH03_TRANSITION,
    id.P2A, id.ACCEPTANCE, ...Object.keys(parent.historicalEvidence)];
  for (const file of files) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.copyFileSync(path.join(id.ROOT, file), path.join(root, file)); }
  const content = path.join(root, 'content'); fs.mkdirSync(content);
  for (const file of [...id.CONTENT_FILES, 'question-bank-summary.json']) fs.copyFileSync(path.join(SOURCE, file), path.join(content, file));
  const mutate = (name, file, change, check, expected) => t.test(name, () => {
    const before = fs.readFileSync(file); try { fs.writeFileSync(file, change(before)); assert.throws(check, expected); } finally { fs.writeFileSync(file, before); }
  });
  const json = fn => bytes => { const value = JSON.parse(bytes); fn(value); return JSON.stringify(value, null, 2) + '\n'; };
  try {
    await t.test('exact candidate, predecessor reconstruction, and both transition links pass', () => {
      id.validateCurrent(root); validateBatch03Transition(root); id.validateContent(content, root);
    });
    for (const [name, mutateManifest] of [
      ['wrong predecessor chain identity', q => { q.predecessor.indexBlobSha1 = '0'.repeat(40); }],
      ['wrong candidate index identity', q => { q.successor.indexBlobSha1 = '0'.repeat(40); }],
      ['changed corrected-question ID', q => { q.audit.reviewed = 151; }]
    ]) await mutate(name, path.join(root, id.BATCH03_MANIFEST), json(mutateManifest), () => id.loadBatch03Manifest(root), /Batch 03 identity manifest tampered/);
    for (const field of ['id', 'predecessorFingerprint', 'successorFingerprint', 'from', 'to']) {
      await mutate(`rejects altered Batch 03 transition ${field}`, path.join(root, id.BATCH03_TRANSITION), json(q => { q.question[field] = 'tampered'; }), () => id.loadBatch03Transition(root), /Batch 03 transition record altered/);
    }
    for (const [name, file] of [
      ['prior identity rewrite', id.MANIFEST], ['prior transition rewrite', id.TRANSITION], ['historical certificate rewrite', 'certification/p0e-preservation-baseline.json'], ['historical P2A freezer rewrite', id.P2A]
    ]) await mutate(`rejects ${name}`, path.join(root, file), bytes => Buffer.concat([bytes, Buffer.from('\n')]), () => id.validateCurrent(root), /prior successor|protected historical evidence|historical P2A baseline|P2A changes exceed/);
    for (const [name, file, change] of [
      ['second unauthorized canonical question edit', 'question-bank.json', q => { q.questions[1].question += ' tampered'; }],
      ['answer-key change', 'question-bank.json', q => { q.questions[0].correctAnswer = 'tampered'; }],
      ['unrelated distractor change', 'question-bank.json', q => { q.questions[1].distractors[0] = 'tampered'; }],
      ['tier change', 'question-bank.json', q => { q.questions[1].difficulty = 'Expert'; }],
      ['alias change', 'question-registry.json', q => { q.aliases[0].canonicalId = 'tampered'; }],
      ['structured-subset change', 'structured-questions.json', q => { q.questions[0].question += ' tampered'; }]
    ]) await mutate(`rejects ${name}`, path.join(content, file), json(change), () => id.validateContent(content, root), /protected content artifact changed/);
    for (const [name, file] of [['schema/storage-key change', id.MANIFEST], ['supporting deployed-asset change', 'assets/pr5-shell.js']]) {
      await mutate(`rejects ${name}`, path.join(root, file), bytes => Buffer.concat([bytes, Buffer.from('\n')]), () => id.validateCurrent(root), /prior successor identity changed|current product identity changed/);
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
