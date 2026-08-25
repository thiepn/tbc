const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const P0E = JSON.parse(fs.readFileSync(path.join(ROOT, 'certification/p0e-preservation-baseline.json'), 'utf8'));
const P0F = JSON.parse(fs.readFileSync(path.join(ROOT, 'certification/p0f-production-baseline.json'), 'utf8'));
const EXPECTED_FREEZE = '41732fa118154e007549e9094f31b515acfa9e2a';

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto.createHash('sha1').update(Buffer.concat([header, buffer])).digest('hex');
}

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

console.log('TBC P0F — Production Deployment & Live-Site Certification');
console.log('');

const p0e = spawnSync(process.execPath, [path.join(ROOT, 'scripts/p0e-final-certification.cjs')], {
  cwd: ROOT,
  stdio: 'inherit'
});
if (p0e.status !== 0) {
  console.error('\nP0F BLOCKED: P0E frozen preservation gate failed.');
  process.exit(p0e.status || 1);
}

console.log('\n=== P0F PRODUCTION CONTRACT ===');
check('P0F baseline version', P0F.version === 'P0F.0');
check('P0E release freeze commit pinned', P0F.p0eFreezeCommit === EXPECTED_FREEZE);
check('production URL is canonical GitHub Pages URL', P0F.productionUrl === 'https://thiepn.github.io/tbc/');
check('question count carried from P0E', P0F.contract.questions === P0E.contract.questions && P0F.contract.questions === 5799);
check('structured-question count carried from P0E', P0F.contract.structuredQuestions === P0E.contract.structuredQuestions && P0F.contract.structuredQuestions === 203);
check('66-book contract carried from P0E', P0F.contract.books === P0E.contract.books && P0F.contract.books === 66);
check('all five difficulty levels carried from P0E', JSON.stringify(P0F.contract.difficultyLevels) === JSON.stringify(P0E.contract.difficultyLevels));
check('canonical state keys carried from P0E', JSON.stringify(P0F.contract.canonicalStateKeys) === JSON.stringify(P0E.contract.canonicalStateKeys));
check('seven-suite browser certification remains required', P0F.contract.requiredBrowserSuites === 7);

for (const [file, expected] of Object.entries(P0F.deployedProductFiles)) {
  const p0eExpected = P0E.frozenProductFiles[file];
  check(`deployed hash matches P0E freeze: ${file}`, expected === p0eExpected, expected);
  const full = path.join(ROOT, file);
  const actual = fs.existsSync(full) ? gitBlobSha(fs.readFileSync(full)) : null;
  check(`local release file unchanged: ${file}`, actual === expected, actual || 'missing');
}

const requiredAssets = [
  'scripts/p0f-live-byte-certification.cjs',
  'scripts/p0f-live-browser-smoke.cjs',
  '.github/workflows/p0f-production-certification.yml',
  'docs/P0F-PRODUCTION-DEPLOYMENT-CONTRACT.md'
];
for (const file of requiredAssets) {
  check(`P0F certification asset exists: ${file}`, fs.existsSync(path.join(ROOT, file)));
}

const failed = checks.filter(item => !item.ok);
console.log(`\nP0F static certification: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) {
  console.error('P0F STATIC FAILED: production release contract is not intact.');
  process.exit(1);
}
console.log('P0F STATIC PASSED: the production candidate is byte-identical to the P0E-frozen product locally.');
