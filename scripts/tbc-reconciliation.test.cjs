'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { rawBlob, rawTextIdentityMatches } = require('./tbc-source-identity.cjs');
const { automaticMainAuthority } = require('./tbc-workflow-authority.cjs');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const baseline = JSON.parse(read('certification/p2a-question-bank-extraction-baseline.json'));
const hash = input => execFileSync('git', ['hash-object', '--path=index.html', '--stdin'], { cwd: ROOT, input, encoding: 'utf8' }).trim();

test('P27B raw identity and Stage 0 Git identity agree for LF/CRLF, not changed content', () => {
  const lf = Buffer.from('alpha\nbeta\n');
  const crlf = Buffer.from('alpha\r\nbeta\r\n');
  const expected = hash(lf);
  assert.equal(rawBlob(lf), expected);
  assert.notEqual(rawBlob(crlf), expected, 'raw bytes are a distinct identity');
  for (const bytes of [lf, crlf]) {
    assert.equal(hash(bytes), expected);
    assert.equal(rawTextIdentityMatches(bytes, expected), true);
  }
  for (const bytes of [Buffer.from('alpha\ngamma\n'), Buffer.from('alpha\r\ngamma\r\n'), Buffer.from('alpha\rbeta\n'), Buffer.from('alpha\nbeta')]) {
    assert.notEqual(hash(bytes), expected);
    assert.equal(rawTextIdentityMatches(bytes, expected), false);
  }
});

test('raw identity independently rejects edits even when a clean filter claims the expected blob', () => {
  const expected = hash('alpha\n');
  assert.equal(rawTextIdentityMatches(Buffer.from('tampered\n'), expected), false);
  assert.equal(rawTextIdentityMatches(Buffer.from('alpha\n'), 'not-a-blob'), false);
});

function runP0A(mutate = () => {}, alterReadme = value => value) {
  const candidate = structuredClone(baseline);
  mutate(candidate);
  const logs = [];
  const processStub = {};
  const fakeFs = { ...fs, readFileSync(file, ...args) {
    if (String(file).endsWith('p2a-question-bank-extraction-baseline.json')) return JSON.stringify(candidate);
    const value = fs.readFileSync(file, ...args);
    return String(file).endsWith('README.md') ? alterReadme(value) : value;
  } };
  vm.runInNewContext(read('scripts/p0a-preservation-audit.cjs'), {
    __dirname: path.join(ROOT, 'scripts'), Buffer, process: processStub,
    console: { log: value => logs.push(value), error: value => logs.push(value) },
    require: name => name === 'fs' ? fakeFs : name.startsWith('./') ? require(path.join(ROOT, 'scripts', name)) : require(name),
  });
  return { code: processStub.exitCode || 0, logs: logs.join('\n') };
}

test('P0A retains certified metadata, integer tiers and both named identity checks', () => {
  const result = runP0A();
  assert.equal(result.code, 0, result.logs);
  assert.match(result.logs, /PASS  git-normalized-certified-source/);
  assert.match(result.logs, /PASS  raw-text-certified-source/);
});

for (const [label, mutate, expected] of [
  ['wrong certification phase', b => { b.p2b.phase = 'other'; }, 'legacy-monolith-frozen'],
  ['mechanical certification removed', b => { b.p2b.mechanicalIntegrity = false; }, 'legacy-monolith-frozen'],
  ['remaining defects', b => { b.p2b.confirmedDefectsRemaining = 1; }, 'legacy-monolith-frozen'],
  ['wrong repair count', b => { b.p2b.repairedQuestions = 29; }, 'legacy-monolith-frozen'],
  ['stale source', b => { b.source.indexBlobSha1 = '0'.repeat(40); }, 'git-normalized-certified-source'],
  ['noninteger certified tier', b => { b.expected.difficultyDistribution.Standard = '1132'; }, 'difficulty-distribution-contract'],
]) test(`P0A rejects ${label}`, () => {
  const result = runP0A(mutate);
  assert.equal(result.code, 1);
  assert.ok(result.logs.includes(`FAIL  ${expected}`), result.logs);
});

test('P0A rejects README tier drift', () => {
  const result = runP0A(undefined, value => value.replaceAll('1,132', '1,133'));
  assert.equal(result.code, 1);
  assert.match(result.logs, /FAIL  difficulty-distribution-contract/);
});

for (const eol of ['LF', 'CRLF']) test(`P27C detects sole and competing PR/main authority with ${eol}`, () => {
  const text = value => eol === 'CRLF' ? value.replace(/\r?\n/g, '\r\n') : value.replace(/\r\n/g, '\n');
  const dir = path.join(ROOT, '.github/workflows');
  const authorities = fs.readdirSync(dir).filter(file => /\.ya?ml$/.test(file)).map(file => automaticMainAuthority(file, text(read(`.github/workflows/${file}`))));
  assert.deepEqual(authorities.filter(a => a.automatic).map(a => a.file), ['release-validate.yml']);
  const canonical = authorities.find(a => a.automatic);
  assert.equal(canonical.pullRequest, true);
  assert.equal(canonical.pushToMain, true);
  for (const trigger of ['  pull_request:\n    branches: [main]', '  push:\n    branches:\n      - main']) {
    assert.equal(automaticMainAuthority('competing.yml', text(`name: competing\non:\n${trigger}\npermissions:\n  contents: read\n`)).automatic, true);
  }
  for (const trigger of ['  workflow_dispatch:', '  push:\n    branches: [pr5-foundation-shell]']) {
    assert.equal(automaticMainAuthority('manual.yml', text(`name: manual\non:\n${trigger}\npermissions:\n  contents: read\n`)).automatic, false);
  }
});

test('every runnable workflow uses the same locked Playwright toolchain', () => {
  const version = JSON.parse(read('package.json')).devDependencies.playwright;
  assert.match(version, /^\d+\.\d+\.\d+$/);
  const lock = JSON.parse(read('package-lock.json')).packages;
  for (const actual of [lock[''].devDependencies.playwright, lock['node_modules/playwright'].version,
    lock['node_modules/playwright'].dependencies['playwright-core'], lock['node_modules/playwright-core'].version,
    require('playwright/package.json').version]) assert.equal(actual, version);
  for (const file of fs.readdirSync(path.join(ROOT, '.github/workflows'))) {
    const workflow = read(`.github/workflows/${file}`);
    assert.doesNotMatch(workflow, /npm install[^\n]*playwright/);
    if (workflow.includes('playwright install')) assert.match(workflow, /\bnpm ci\b/);
  }
});

// Exercise the real release orchestration, with a synthetic extractor result.
// Browser behavior itself is covered by the unchanged browser scripts.
function runRelease(extractionStatus) {
  const calls = [];
  const logs = [];
  const summary = { counts: { canonical: baseline.expected.canonical, registry: baseline.expected.registry,
    structured: baseline.expected.structured, books: baseline.expected.books },
    difficultyDistribution: baseline.expected.difficultyDistribution,
    hashes: { canonicalBank: baseline.hashes.canonicalBankSha256, structuredBank: baseline.hashes.structuredBankSha256, registry: baseline.hashes.registryBankSha256 },
    runtimeHealth: { qb11BankAudit: { passed: true }, qb8SchemaAudit: { passed: true }, qb8InteractionAudit: { passed: true }, pageErrors: [], consoleErrors: [] } };
  const summaryFile = path.join(ROOT, 'artifacts', 'synthetic-release', 'p2a', 'question-bank-summary.json');
  const fakeFs = { ...fs, mkdtempSync: () => path.dirname(path.dirname(summaryFile)), rmSync: () => {},
    existsSync: file => file === summaryFile || fs.existsSync(file),
    readFileSync: (file, ...args) => file === summaryFile ? JSON.stringify(summary) : fs.readFileSync(file, ...args) };
  let code = 0;
  const exit = Symbol('exit');
  try {
    vm.runInNewContext(read('scripts/validate-release.cjs'), {
      __dirname: path.join(ROOT, 'scripts'),
      process: { execPath: process.execPath, env: {}, exit: status => { code = status; throw exit; } },
      console: { log: value => logs.push(value) },
      require: name => name === 'node:fs' ? fakeFs : name === 'node:child_process' ? {
        spawnSync: (exe, args, options) => { calls.push({ args: [...args], env: options.env }); return { status: args[0].includes('extract') ? extractionStatus : 0, stdout: '', stderr: '' }; }
      } : name.startsWith('./') ? require(path.join(ROOT, 'scripts', name)) : require(name),
    });
  } catch (error) { if (error !== exit) throw error; }
  return { code, calls, logs: logs.join('\n') };
}

test('release integration uses certified extraction and retains all four browser children', () => {
  const result = runRelease(0);
  assert.equal(result.code, 0, result.logs);
  assert.deepEqual(result.calls.map(c => c.args[0]), ['scripts/p2a-question-bank-extract-certified.cjs', 'scripts/pr5-browser-smoke.cjs', 'scripts/pr6-browser-smoke.cjs', 'scripts/p1b-pr7-browser-smoke.cjs', 'scripts/p27d-runtime-browser-certification.cjs']);
  assert.equal(result.calls[0].env.P2A_EXPECTED_TIERS, '');
});

test('release integration fails on extractor failure even if a valid-looking snapshot exists', () => {
  const result = runRelease(1);
  assert.equal(result.code, 1);
  assert.equal(result.calls.length, 1);
  assert.match(result.logs, /FAIL  certified runtime extraction exits successfully/);
});
