#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const BASE = String(process.env.P27D_DEPLOYMENT_URL || '').trim().replace(/\/+$/, '');
const MAX_ATTEMPTS = Number(process.env.P27D_DEPLOYMENT_ATTEMPTS || 30);
const RETRY_MS = Number(process.env.P27D_DEPLOYMENT_RETRY_MS || 10000);
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'p27d');
const FILES = [
  'index.html',
  'release.json',
  'assets/pr5-foundation.css',
  'assets/pr5-shell.js',
  'assets/pr6-play-learning.css',
  'assets/pr6-play-learning.js',
  'assets/pr7-library-progress.css',
  'assets/pr7-library-progress.js',
  'assets/p1b-pr7-production.js',
];

if (!BASE) {
  console.error('P27D_DEPLOYMENT_URL is required.');
  process.exit(2);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

async function fetchBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function checkOnce() {
  const localRelease = JSON.parse(fs.readFileSync(path.join(ROOT, 'release.json'), 'utf8'));
  const files = {};
  const cacheBust = `p27d=${Date.now()}`;

  for (const relative of FILES) {
    const local = fs.readFileSync(path.join(ROOT, relative));
    const remote = await fetchBuffer(`${BASE}/${relative}?${cacheBust}`);
    files[relative] = {
      localSha256: sha256(local),
      remoteSha256: sha256(remote),
      bytesLocal: local.length,
      bytesRemote: remote.length,
      match: local.equals(remote),
    };
  }

  const remoteReleaseBuffer = await fetchBuffer(`${BASE}/release.json?${cacheBust}-identity`);
  const remoteRelease = JSON.parse(remoteReleaseBuffer.toString('utf8'));
  const identityMatch = remoteRelease.release === localRelease.release && remoteRelease.version === localRelease.version;
  const mismatches = Object.entries(files).filter(([, detail]) => !detail.match).map(([file]) => file);

  return {
    base: BASE,
    localRelease,
    remoteRelease,
    identityMatch,
    files,
    mismatches,
    pass: identityMatch && mismatches.length === 0,
  };
}

(async () => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  let last = null;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await checkOnce();
      last = { ...result, attempt, checkedAt: new Date().toISOString() };
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'deployment-report.json'), `${JSON.stringify(last, null, 2)}\n`);
      if (result.pass) {
        console.log(`P27D deployment certification passed on attempt ${attempt}: ${BASE} matches the merged release byte-for-byte.`);
        return;
      }
      console.log(`P27D deployment not converged on attempt ${attempt}/${MAX_ATTEMPTS}; mismatches: ${result.mismatches.join(', ') || 'identity only'}`);
    } catch (error) {
      lastError = String(error?.stack || error);
      console.log(`P27D deployment probe attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError.split('\n')[0]}`);
    }

    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_MS);
  }

  const failure = {
    base: BASE,
    attempts: MAX_ATTEMPTS,
    last,
    lastError,
    failedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'deployment-report.json'), `${JSON.stringify(failure, null, 2)}\n`);
  console.error(`P27D deployment certification failed: ${BASE} did not converge to the merged release.`);
  process.exit(1);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
