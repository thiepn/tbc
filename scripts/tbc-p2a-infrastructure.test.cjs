'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.resolve(ROOT, process.env.P2A_OUT_DIR || 'artifacts/p2a');
const names = ['question-bank.json', 'structured-questions.json', 'question-registry.json', 'question-bank-summary.json', 'candidate-discovery.json'];

test('Git-filtered identity accepts LF/CRLF but rejects substantive changes', () => {
  const hash = input => execFileSync('git', ['hash-object', '--path=index.html', '--stdin'], { cwd: ROOT, input, encoding: 'utf8' }).trim();
  assert.equal(hash('a\nb\n'), hash('a\r\nb\r\n'));
  assert.notEqual(hash('a\nb\n'), hash('a\nc\n'));
});

test('P2A fails closed for missing, corrupted and stale artifacts', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tbc-p2a-negative-'));
  try {
    for (const name of names) fs.copyFileSync(path.join(SOURCE, name), path.join(dir, name));
    const audit = () => spawnSync(process.execPath, [path.join(ROOT, 'scripts/p2a-question-bank-audit.cjs')], {
      cwd: ROOT, env: { ...process.env, P2A_OUT_DIR: dir }, encoding: 'utf8', maxBuffer: 1024 * 1024
    });
    assert.equal(audit().status, 0, 'unaltered extracted artifacts must pass');
    const scenarios = [
      ['question-registry.json', 'missing registry', null, /missing artifact/],
      ['question-registry.json', 'registry content tamper', v => { v.records[0].stage0Tamper = true; }, /registry frozen hash/],
      ['question-registry.json', 'missing alias', v => { v.aliases.pop(); }, /alias count/],
      ['question-registry.json', 'invalid alias target', v => { v.aliases[0].canonicalId = 'stage0-missing-target'; }, /alias identities and canonical targets/],
      ['question-bank.json', 'canonical content tamper', v => { v.questions[0].question += ' tamper'; }, /per-question content hashes recomputed/],
      ['structured-questions.json', 'structured subset tamper', v => { v.questions[0].question += ' tamper'; }, /exact canonical subset/],
      ['question-bank-summary.json', 'stale source identity', v => { v.source.indexBlobSha1 = '0'.repeat(40); }, /current candidate source/],
      ['question-bank-summary.json', 'runtime error', v => { v.runtimeHealth.pageErrors.push('injected'); }, /runtime health/],
      ['candidate-discovery.json', 'stale discovery health', v => { v.runtimeHealth.pageErrors.push('injected'); }, /discovery agrees with summary/]
    ];
    for (const [name, label, mutate, expected] of scenarios) await t.test(label, () => {
      const dest = path.join(dir, name);
      try {
        if (mutate) { const data = JSON.parse(fs.readFileSync(dest, 'utf8')); mutate(data); fs.writeFileSync(dest, JSON.stringify(data)); }
        else fs.unlinkSync(dest);
        const result = audit();
        assert.equal(result.status, 1, label);
        assert.match(result.stdout + result.stderr, expected, label);
      } finally { fs.copyFileSync(path.join(SOURCE, name), dest); }
    });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
