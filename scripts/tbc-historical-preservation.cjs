'use strict';
// Run unmodified historical gates on their historical Git sources, never on
// successor bytes. All writes are isolated checkouts or the P2E temporary proof.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { ROOT, validateCurrent, gitText } = require('./tbc-product-identity.cjs');
const { validateTransition } = require('./tbc-successor-transition.cjs');
function main() {
  validateCurrent();
  const manifest = require('./tbc-product-identity.cjs').loadManifest();
  validateTransition();
  const out = path.join(ROOT, 'artifacts/product-identity');
  fs.mkdirSync(out, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(out, 'historical-'));
  const results = [];
  const env = { ...process.env, NODE_OPTIONS: '' };
  delete env.P2E_INDEX; // The original comparator supplies its own isolated file.
  try {
    for (const source of manifest.historicalSources) {
      const checkout = path.join(scratch, source.phase);
      const git = (...args) => execFileSync('git', args, { cwd: ROOT, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1024 * 1024 });
      git('clone', '--quiet', '--shared', '--no-checkout', ROOT, checkout);
      git('-C', checkout, 'config', 'core.autocrlf', 'false');
      git('-C', checkout, 'checkout', '--quiet', '--detach', source.commit);
      assert.equal(git('-C', checkout, 'rev-parse', 'HEAD').trim(), source.commit);
      if (source.productCommit) assert.equal(git('-C', checkout, 'rev-parse', 'HEAD:index.html').trim(), gitText('rev-parse', `${source.productCommit}:index.html`));
      console.log(`HISTORICAL ${source.phase}: ${source.commit} / ${source.script}`);
      const log = fs.openSync(path.join(out, `historical-${source.phase}.log`), 'w');
      let result;
      try {
        result = spawnSync(process.execPath, [path.join(checkout, source.script)], {
          cwd: checkout, env, windowsHide: true, stdio: ['ignore', log, log], timeout: 120000
        });
      } finally { fs.closeSync(log); }
      assert.equal(git('-C', checkout, 'status', '--porcelain', '--untracked-files=no').trim(), '', `${source.phase} modified historical files`);
      results.push({ ...source, exitCode: result.status, error: result.error?.message });
      console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} historical ${source.phase}: exit ${result.status}`);
    }
    assert.ok(results.every(r => r.exitCode === 0), 'historical gate failure; inspect artifacts/product-identity/historical-*.log');
  } finally {
    fs.writeFileSync(path.join(out, 'historical-report.json'), JSON.stringify(results, null, 2) + '\n');
    const resolved = fs.realpathSync(scratch), boundary = fs.realpathSync(out) + path.sep;
    assert.ok(resolved.startsWith(boundary) && path.basename(resolved).startsWith('historical-'), 'unsafe scratch cleanup');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  console.log('HISTORICAL PRESERVATION PASS: original P0E/P0F/P1A/P1B/P2E gates, original sources, no evidence rewritten.');
}
if (require.main === module) try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
