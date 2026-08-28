#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { automaticMainAuthority } = require('./tbc-workflow-authority.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const release = readJson('release.json');
const baseline = readJson('certification/p2a-question-bank-extraction-baseline.json');
const index = read('index.html');
const readme = read('README.md');
const qa = read('docs/QA.md');
const failures = [];
const LEGACY_APP_VERSION = '1.0.0';
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');
const CANONICAL_WORKFLOW = 'release-validate.yml';

function check(name, pass, detail = '') {
  const ok = Boolean(pass);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push({ name, detail });
}

function identityContexts(text, version) {
  const out = [];
  let from = 0;
  while (true) {
    const at = text.indexOf(version, from);
    if (at < 0) break;
    const context = text.slice(Math.max(0, at - 240), Math.min(text.length, at + version.length + 240));
    if (/(?:app(?:lication)?[\s_-]*version|release[\s_-]*version|\bAPP_VERSION\b|\bappVersion\b|\bapplicationVersion\b|The Bible Challenge|\bTBC\b)[\s\S]{0,240}$/i.test(context.slice(0, 240)) ||
        /^(?:[\s\S]{0,240})(?:app(?:lication)?[\s_-]*version|release[\s_-]*version|\bAPP_VERSION\b|\bappVersion\b|\bapplicationVersion\b|The Bible Challenge|\bTBC\b)/i.test(context.slice(240))) {
      out.push(context.replace(/\s+/g, ' ').trim());
    }
    from = at + version.length;
  }
  return out;
}

function runNode(script, env = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

console.log('TBC — Canonical Release Validation');
console.log(`Release: ${release.release} / application ${release.version}\n`);

check('release identity fields present', typeof release.release === 'string' && release.release.length > 1 && typeof release.version === 'string' && release.version.length > 0);
check('release identity shape', release.release === `v${release.version}`, `${release.release} vs v${release.version}`);
check(
  'README release identity',
  readme.includes(`Current release: **${release.release}**`) &&
    readme.includes(`Application version: **${release.version}**`) &&
    readme.includes('`release.json`'),
);
check(
  'QA release identity',
  qa.includes(`Canonical release: \`${release.release}\``) &&
    qa.includes(`Application version: \`${release.version}\``),
);

const workflowFiles = fs.readdirSync(WORKFLOW_DIR).filter((file) => /\.ya?ml$/i.test(file)).sort();
const workflowAuthorities = workflowFiles.map((file) => automaticMainAuthority(file, fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8')));
const canonicalAuthority = workflowAuthorities.find((entry) => entry.file === CANONICAL_WORKFLOW);
const competingAuthorities = workflowAuthorities.filter((entry) => entry.file !== CANONICAL_WORKFLOW && entry.automatic);
check(
  'canonical release workflow owns PR/main automation',
  canonicalAuthority?.pullRequest === true && canonicalAuthority?.pushToMain === true,
  canonicalAuthority ? JSON.stringify(canonicalAuthority) : `${CANONICAL_WORKFLOW} missing`,
);
check(
  'no competing historical workflow owns PR/main automation',
  competingAuthorities.length === 0,
  competingAuthorities.map((entry) => entry.file).join(', '),
);

const staleIdentity = identityContexts(index, LEGACY_APP_VERSION);
const currentIdentity = identityContexts(index, release.version);
check(`obsolete ${LEGACY_APP_VERSION} application identity absent`, staleIdentity.length === 0, `${staleIdentity.length} identity-context occurrence(s)`);
check('current application identity present', currentIdentity.length > 0, `no ${release.version} application identity found`);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tbc-release-validation-'));
const extractDir = path.join(temp, 'p2a');
const extraction = runNode('scripts/p2a-question-bank-extract-certified.cjs', { P2A_OUT_DIR: extractDir, P2A_EXPECTED_TIERS: '' });
check('certified runtime extraction exits successfully', extraction.status === 0, (extraction.stderr || extraction.stdout || '').slice(-1600));
const summaryPath = path.join(extractDir, 'question-bank-summary.json');
check('runtime question-bank snapshot produced', fs.existsSync(summaryPath), `legacy collector exit=${extraction.status}`);

if (fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const expected = baseline.expected || {};
  const hashes = baseline.hashes || {};
  check('canonical question count preserved', summary.counts?.canonical === expected.canonical, `${summary.counts?.canonical} vs ${expected.canonical}`);
  check('registry count preserved', summary.counts?.registry === expected.registry, `${summary.counts?.registry} vs ${expected.registry}`);
  check('structured question count preserved', summary.counts?.structured === expected.structured, `${summary.counts?.structured} vs ${expected.structured}`);
  check('whole-Bible coverage preserved', summary.counts?.books === expected.books, `${summary.counts?.books} vs ${expected.books}`);
  for (const [tier, count] of Object.entries(expected.difficultyDistribution || {})) {
    check(`${tier} distribution preserved`, summary.difficultyDistribution?.[tier] === count, `${summary.difficultyDistribution?.[tier]} vs ${count}`);
  }
  check('canonical bank hash preserved', summary.hashes?.canonicalBank === hashes.canonicalBankSha256, summary.hashes?.canonicalBank || 'missing');
  check('structured bank hash preserved', summary.hashes?.structuredBank === hashes.structuredBankSha256, summary.hashes?.structuredBank || 'missing');
  check('registry bank hash preserved', summary.hashes?.registry === hashes.registryBankSha256, summary.hashes?.registry || 'missing');
  check('QB11 runtime bank audit healthy', summary.runtimeHealth?.qb11BankAudit?.passed === true);
  check('QB8 schema audit healthy', summary.runtimeHealth?.qb8SchemaAudit?.passed === true);
  check('QB8 interaction audit healthy', summary.runtimeHealth?.qb8InteractionAudit?.passed === true);
  check('runtime extraction has no page errors', (summary.runtimeHealth?.pageErrors || []).length === 0, JSON.stringify(summary.runtimeHealth?.pageErrors || []));
  check('runtime extraction has no console errors', (summary.runtimeHealth?.consoleErrors || []).length === 0, JSON.stringify(summary.runtimeHealth?.consoleErrors || []));
}

if (!failures.length) {
  for (const script of [
    'scripts/pr5-browser-smoke.cjs',
    'scripts/pr6-browser-smoke.cjs',
    'scripts/p1b-pr7-browser-smoke.cjs',
    'scripts/p27d-runtime-browser-certification.cjs',
  ]) {
    const result = runNode(script);
    const pass = result.status === 0;
    check(`browser suite: ${path.basename(script)}`, pass, (result.stderr || result.stdout || '').trim().slice(-1600));
    if (!pass) break;
  }
}

try { fs.rmSync(temp, { recursive: true, force: true }); } catch {}

console.log(`\n${failures.length ? 'RELEASE VALIDATION FAILED' : 'RELEASE VALIDATION PASSED'}: ${failures.length} failure(s).`);
if (failures.length) process.exit(1);
console.log(`${release.release} is internally coherent, CI authority is singular, whole-product browser certification passes, and the certified question bank remains unchanged.`);
