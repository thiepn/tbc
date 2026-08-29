#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { worktreeBlob } = require('./tbc-source-identity.cjs');
const { validateTransition } = require('./tbc-successor-transition.cjs');
const ROOT = path.resolve(__dirname, '..');
const BASELINE = 'f84d5eff6a93046642c681e9163baa1b0b6b31a2';
const PRODUCT = ['index.html', 'assets/pr5-foundation.css', 'assets/pr5-shell.js',
  'assets/pr6-play-learning.css', 'assets/pr6-play-learning.js', 'assets/p0b-player-controls.js',
  'assets/p0c-existing-feature-preservation.js', 'assets/p1b-pr7-production.js',
  'assets/pr7-library-progress.css', 'assets/pr7-collections-adapter.js',
  'assets/pr7-library-progress.js', 'assets/pr7-navigation-guard.js', 'favicon.svg'];
const ARTIFACTS = ['question-bank.json', 'structured-questions.json', 'question-registry.json',
  'question-bank-summary.json', 'candidate-discovery.json'];
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blob = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const evidence = { schemaVersion: 1, baseline: BASELINE, startedAt: new Date().toISOString(),
  testedWorktreeHead: git('rev-parse', 'HEAD'), node: process.version, platform: process.platform,
  browserChannel: ['build', 'deploy-check'].includes(process.argv[2]) ? 'not used' : process.env.TBC_BROWSER_CHANNEL || 'bundled Chromium', results: [] };

function build() {
  evidence.successor = validateTransition();
  git('merge-base', '--is-ancestor', '25d2ff4975e91c031a78ba07ce57fab4c46d80f0', 'HEAD');
  console.log(`BUILD PASS: ${PRODUCT.length} deployed files match the authorized successor; exact repair replay, protected evidence, schema/keys and acceptance test preserved; no bundle emitted.`);
}

function server() {
  const srv = http.createServer((req, res) => {
    let file;
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      file = path.resolve(ROOT, pathname === '/' ? 'index.html' : `.${pathname}`);
      if (!file.startsWith(ROOT + path.sep) || pathname.includes('\\') || pathname.split('/').some(p => p.startsWith('.'))) {
        res.writeHead(403); return res.end();
      }
    } catch { res.writeHead(400); return res.end(); }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404); return res.end(); }
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.end(bytes);
    });
  });
  return new Promise((resolve, reject) => {
    srv.once('error', reject);
    srv.listen(4173, '127.0.0.1', () => resolve(srv));
  });
}

async function run(script, env = {}, args = [], scriptArgs = []) {
  console.log(`\n=== ${script} ${[...args, ...scriptArgs].join(' ')} ===`);
  const started = Date.now();
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...args, path.join(ROOT, script), ...scriptArgs], {
      cwd: ROOT, env: { ...process.env, ...env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require="${path.join(__dirname, 'tbc-browser-runtime.cjs').replace(/\\/g, '/')}"`.trim()
      }, stdio: 'inherit', windowsHide: true
    });
    child.once('error', reject);
    child.once('exit', (status, signal) => resolve(status ?? (signal ? 1 : 0)));
  });
  evidence.results.push({ script, args: [...args, ...scriptArgs], exitCode: code, milliseconds: Date.now() - started });
  return code === 0;
}

async function tests() {
  await run('scripts/tbc-reconciliation.test.cjs', {}, ['--test']);
  for (const script of ['p0a-preservation-audit', 'p0b-player-controls-audit',
    'p0c-existing-feature-preservation-audit', 'p0d-visual-preservation-audit',
    'p1b-pr7-activation-audit', 'tbc-historical-preservation', 'tbc-stage0-invariants',
    'tbc-preservation-repair', 'tbc-session-compatibility',
    'tbc-question-revision-tests', 'tbc-four-question-quality',
    'p0e-browser-certification', 'p1b-pr7-browser-smoke', 'validate-release']) {
    await run(`scripts/${script}.cjs`);
  }
}

async function audit() {
  // Clear inherited overrides: these gates verify the committed baseline, never a candidate freeze.
  const env = { P2A_EXPECTED_TIERS: '', P2A_BASE_URL: 'http://127.0.0.1:4173/' };
  const dirs = ['artifacts/p2a', 'artifacts/p2a-repeat'];
  for (let i = 0; i < dirs.length; i++) {
    const passEnv = { ...env, P2A_OUT_DIR: dirs[i], P2D_OUT_DIR: `artifacts/p2d${i ? '-repeat' : ''}`,
      P2E_OUT_DIR: `artifacts/p2e${i ? '-repeat' : ''}` };
    assert.ok(await run('scripts/p2a-question-bank-extract-certified.cjs', passEnv), `extraction pass ${i + 1} failed`);
    assert.ok(await run('scripts/p2a-question-bank-audit.cjs', passEnv), `P2A audit pass ${i + 1} failed`);
    await run('scripts/tbc-product-identity.cjs', passEnv, [], ['--content', dirs[i]]);
    for (const script of ['p2b-mechanical-integrity-audit', 'p2c-semantic-accuracy-audit',
      'p2d-question-quality-audit', 'p2e-difficulty-calibration-audit']) await run(`scripts/${script}.cjs`, passEnv);
  }
  evidence.artifactSha256 = {};
  for (const file of ARTIFACTS) {
    const a = fs.readFileSync(path.join(ROOT, dirs[0], file));
    const b = fs.readFileSync(path.join(ROOT, dirs[1], file));
    assert.ok(a.equals(b), `non-deterministic artifact: ${file}`);
    evidence.artifactSha256[file] = sha256(a);
    console.log(`DETERMINISTIC PASS: ${file}`);
  }
  await run('scripts/tbc-p2a-infrastructure.test.cjs', { P2A_OUT_DIR: dirs[0] }, ['--test']);
  await run('scripts/tbc-product-identity.test.cjs', { P2A_OUT_DIR: dirs[0] }, ['--test']);
  await run('scripts/tbc-question-successor.test.cjs', {}, ['--test']);
}

async function deployment() {
  const arg = process.argv.find(x => x.startsWith('--url='));
  const base = new URL(arg ? arg.slice(6) : 'https://thiepn.github.io/tbc/');
  assert.equal(base.protocol, 'https:', 'deployment verification requires HTTPS');
  evidence.deployment = [];
  for (const file of PRODUCT) {
    const expected = git('rev-parse', `HEAD:${file}`);
    assert.equal(worktreeBlob(file), expected, `deployment check requires product bytes matching HEAD: ${file}`);
    const url = new URL(file === 'index.html' ? './' : file, base);
    url.searchParams.set('stage0', Date.now());
    const response = await fetch(url, { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `${file}: HTTP ${response.status}`);
    assert.equal(new URL(response.url).protocol, 'https:', 'redirect downgraded HTTPS');
    const bytes = Buffer.from(await response.arrayBuffer());
    const actual = blob(bytes);
    evidence.deployment.push({ file, expected, actual, finalUrl: response.url, bytes: bytes.length });
    assert.equal(actual, expected, `deployed bytes differ from HEAD: ${file}`);
    console.log(`DEPLOYMENT PASS: ${file} ${actual}`);
  }
}

async function main() {
  const command = process.argv[2] || 'verify';
  assert.ok(['build', 'test', 'audit', 'verify', 'deploy-check', 'serve', 'invariants'].includes(command), 'unknown command');
  let srv;
  try {
    if (['build', 'verify'].includes(command)) build();
    if (['test', 'audit', 'verify', 'serve', 'invariants'].includes(command)) srv = await server();
    if (command === 'serve') { console.log('Serving read-only candidate at http://127.0.0.1:4173/'); return; }
    if (['test', 'verify'].includes(command)) await tests();
    if (command === 'invariants') await run('scripts/tbc-stage0-invariants.cjs');
    if (['audit', 'verify'].includes(command)) await audit();
    if (command === 'deploy-check') await deployment();
    if (command === 'verify') build(); // Detect any test accidentally changing the product.
    assert.ok(evidence.results.every(x => x.exitCode === 0), 'one or more preservation suites failed');
    evidence.passed = true;
  } catch (error) {
    evidence.passed = false;
    evidence.error = error.message;
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    if (srv && command !== 'serve') { srv.closeAllConnections(); await new Promise(resolve => srv.close(resolve)); }
    if (command !== 'serve') {
      evidence.finishedAt = new Date().toISOString();
      const out = path.join(ROOT, 'artifacts/recovery-stage0');
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, `${command}-report.json`), JSON.stringify(evidence, null, 2) + '\n');
      console.log(`\nRECOVERY STAGE 0 ${command}: ${evidence.passed ? 'PASS' : 'FAIL'}`);
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
