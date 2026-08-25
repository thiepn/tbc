const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'certification/p0f-production-baseline.json'), 'utf8'));
const BASE = process.env.TBC_PRODUCTION_URL || baseline.productionUrl;
const ATTEMPTS = Number(process.env.P0F_LIVE_ATTEMPTS || 36);
const DELAY_MS = Number(process.env.P0F_LIVE_DELAY_MS || 5000);

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto.createHash('sha1').update(Buffer.concat([header, buffer])).digest('hex');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFile(file, attempt) {
  const url = new URL(file === 'index.html' ? './' : file, BASE);
  url.searchParams.set('p0f', `${Date.now()}-${attempt}`);
  const response = await fetch(url, {
    redirect: 'follow',
    cache: 'no-store',
    headers: {
      'cache-control': 'no-cache',
      'user-agent': 'TBC-P0F-production-certification'
    }
  });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { file, sha: gitBlobSha(bytes), bytes: bytes.length, finalUrl: response.url };
}

async function inspect(attempt) {
  const entries = Object.entries(baseline.deployedProductFiles);
  const results = await Promise.all(entries.map(([file]) => fetchFile(file, attempt)));
  const mismatches = results.filter(result => result.sha !== baseline.deployedProductFiles[result.file]);
  return { results, mismatches };
}

(async () => {
  console.log(`TBC P0F live-byte certification: ${BASE}`);
  let lastError = null;
  let last = null;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      last = await inspect(attempt);
      if (last.mismatches.length === 0) {
        for (const result of last.results) {
          console.log(`PASS  ${result.file} — ${result.sha} (${result.bytes} bytes)`);
        }
        console.log(`\nP0F LIVE BYTES PASSED: all ${last.results.length} deployed product files match the P0E freeze.`);
        return;
      }
      console.log(`Attempt ${attempt}/${ATTEMPTS}: deployment not synchronized yet.`);
      for (const mismatch of last.mismatches) {
        console.log(`  WAIT  ${mismatch.file}: live ${mismatch.sha}, expected ${baseline.deployedProductFiles[mismatch.file]}`);
      }
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt}/${ATTEMPTS}: ${error.message}`);
    }

    if (attempt < ATTEMPTS) await sleep(DELAY_MS);
  }

  if (lastError && !last) console.error(lastError);
  console.error('P0F LIVE BYTES FAILED: production did not converge to the frozen P0E product within the certification window.');
  process.exit(1);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
