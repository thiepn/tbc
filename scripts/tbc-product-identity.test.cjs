'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const id = require('./tbc-product-identity.cjs');
const { validateTransition } = require('./tbc-successor-transition.cjs');
const SOURCE = path.resolve(id.ROOT, process.env.P2A_OUT_DIR || 'artifacts/p2a');

test('successor identity and transition reject unauthorized mutations', async t => {
  const boundary = path.join(id.ROOT, 'artifacts/product-identity');
  fs.mkdirSync(boundary, { recursive: true });
  const root = fs.mkdtempSync(path.join(boundary, 'negative-'));
  const manifest = id.loadManifest();
  const files = [...id.PRODUCT, id.MANIFEST, id.TRANSITION, id.BATCH03_MANIFEST, id.BATCH03_TRANSITION, id.BATCH04_MANIFEST, id.BATCH04_TRANSITION, id.P2A, id.ACCEPTANCE, ...Object.keys(manifest.historicalEvidence)];
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(id.ROOT, file), path.join(root, file));
  }
  const content = path.join(root, 'content'); fs.mkdirSync(content);
  for (const file of [...id.CONTENT_FILES, 'question-bank-summary.json']) fs.copyFileSync(path.join(SOURCE, file), path.join(content, file));
  const mutate = async (name, file, change, validate, expected) => t.test(name, () => {
    const before = fs.readFileSync(file);
    try { fs.writeFileSync(file, change(before)); assert.throws(validate, expected); }
    finally { fs.writeFileSync(file, before); }
  });
  const json = fn => bytes => { const value = JSON.parse(bytes); fn(value); return JSON.stringify(value, null, 2) + '\n'; };
  try {
    await t.test('unaltered successor, exact repair replay, and content evidence pass', () => {
      id.validateCurrent(root); validateTransition(root); id.validateContent(content, root);
    });
    for (const [name, file, change] of [
      ['question prompt', 'question-bank.json', q => { q.questions[0].question += ' tampered'; }],
      ['correct answer', 'question-bank.json', q => { q.questions[0].correctAnswer = 'tampered'; }],
      ['distractor', 'question-bank.json', q => { q.questions[0].distractors[0] = 'tampered'; }],
      ['question ID', 'question-bank.json', q => { q.questions[0].canonicalId += '.tampered'; }],
      ['alias target', 'question-registry.json', q => { q.aliases[0].canonicalId = q.aliases.find(a => a.canonicalId !== q.aliases[0].canonicalId).canonicalId; }],
      ['difficulty assignment', 'question-bank.json', q => { q.questions[0].difficulty = q.questions[0].difficulty === 'Expert' ? 'Beginner' : 'Expert'; }],
      ['per-question hash', 'question-bank.json', q => { q.questions[0].contentSha256 = '0'.repeat(64); }],
      ['structured subset', 'structured-questions.json', q => { q.questions[0].question += ' tampered'; }]
    ]) await mutate(`rejects changed ${name}`, path.join(content, file), json(change), () => id.validateContent(content, root), /protected content artifact changed/);
    for (const count of ['canonical', 'structured', 'registry', 'aliases']) await mutate(`rejects ${count} count change`, path.join(content, 'question-bank-summary.json'),
      json(q => { q.counts[count]++; }), () => id.validateContent(content, root), /content counts changed/);
    await mutate('rejects tier total change', path.join(content, 'question-bank-summary.json'), json(q => { q.difficultyDistribution.Easy++; }), () => id.validateContent(content, root), /tier distribution changed/);
    for (const hash of ['canonicalBank', 'structuredBank', 'registry']) await mutate(`rejects ${hash} semantic aggregate change`, path.join(content, 'question-bank-summary.json'),
      json(q => { q.hashes[hash] = '0'.repeat(64); }), () => id.validateContent(content, root), /semantic aggregate changed/);
    await mutate('rejects save schema change', path.join(content, 'question-bank-summary.json'), json(q => { q.source.qb11Freeze.saveSchema = 28; }), () => id.validateContent(content, root), /save schema changed/);
    for (const [name, file] of [['supporting asset', 'assets/pr5-shell.js'], ['acceptance test', id.ACCEPTANCE], ['unrelated index edit', 'index.html']]) {
      await mutate(`rejects ${name} change`, path.join(root, file), bytes => Buffer.concat([bytes, Buffer.from('\n/* unauthorized */\n')]), () => id.validateCurrent(root), /identity changed|acceptance test changed/);
    }
    for (const field of ['predecessor', 'successor']) await mutate(`rejects wrong ${field} identity`, path.join(root, id.MANIFEST),
      json(q => { q[field].indexBlobSha1 = '0'.repeat(40); }), () => id.validateCurrent(root), /manifest tampered|prior successor identity changed/);
    await mutate('rejects authorized transition alteration', path.join(root, id.TRANSITION), json(q => { q.edits[0].to += ' '; }), () => validateTransition(root), /transition record altered/);
    await mutate('rejects manifest tampering', path.join(root, id.MANIFEST), json(q => { q.changedProductFiles.push('assets/pr5-shell.js'); }), () => id.validateCurrent(root), /manifest tampered|prior successor identity changed/);
    await mutate('rejects storage key contract change', path.join(root, id.MANIFEST), json(q => { q.persistence.canonicalStateKeys[0] += '_new'; }), () => id.validateCurrent(root), /manifest tampered|prior successor identity changed/);
    for (const [name, change] of [
      ['content hash', q => { q.hashes.canonicalBankSha256 = '0'.repeat(64); }],
      ['distribution', q => { q.expected.difficultyDistribution.Easy++; }],
      ['phase evidence', q => { q.p2e.recalibratedQuestions++; }]
    ]) await mutate(`rejects broad freezer ${name} rewrite`, path.join(root, id.P2A), json(change), () => id.validateCurrent(root), /P2A changes exceed|historical P2A baseline changed/);
    await mutate('rejects rewritten historical certificate', path.join(root, 'certification/p0e-preservation-baseline.json'), json(q => { q.frozenProductFiles['index.html'] = id.SUCCESSOR; }), () => id.validateCurrent(root), /protected historical evidence changed/);
  } finally {
    const resolved = fs.realpathSync(root);
    assert.ok(resolved.startsWith(fs.realpathSync(boundary) + path.sep) && path.basename(resolved).startsWith('negative-'), 'unsafe negative-fixture cleanup');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
