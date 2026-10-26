#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { ready, exact } = require('./tbc-preservation-repair.cjs');

const ROOT = path.resolve(__dirname, '..');
const PRE_P30 = '37d1ddf53a7c4bca128dd60d5c21beeb9383ef25';
const OLD_SW = execFileSync('git', ['show', PRE_P30 + ':sw.js'], { cwd: ROOT, encoding: 'utf8' });
const ACTIVE = 'theBibleChallenge_v21_activeRound';
const SAVE = 'theBibleChallenge_v21';
const CACHE = 'tbc-pwa-v3';
const REQUIRED = [
  'index.html', 'release.json', 'manifest.webmanifest', 'favicon.svg',
  'assets/pr5-foundation.css', 'assets/pr5-shell.js',
  'assets/pr6-play-learning.css', 'assets/pr6-play-learning.js',
  'assets/p0b-player-controls.js', 'assets/p0c-existing-feature-preservation.js',
  'assets/p1b-pr7-production.js', 'assets/pr7-library-progress.css',
  'assets/pr7-collections-adapter.js', 'assets/pr7-library-progress.js',
  'assets/pr7-navigation-guard.js', 'assets/play-the-bible-challenge.svg',
  'assets/tbc-hero.svg', 'assets/tbc-stats.svg',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png',
  'assets/icons/favicon-32.png', 'assets/icons/favicon.ico'
];
const RESULTS = [];
function check(name, value) { assert.ok(value, name); RESULTS.push(name); console.log('PASS', name); }
function inventoryCheck() {
  const worker = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const certifier = fs.readFileSync(path.join(ROOT, 'scripts/p27d-deployment-certification.cjs'), 'utf8');
  const shell = worker.match(/const SHELL = \[([\s\S]*?)\];/);
  const files = certifier.match(/const FILES = \[([\s\S]*?)\];/);
  assert.ok(shell && files, 'worker/certifier inventory missing');
  const extract = text => [...text.matchAll(/'([^']+)'/g)].map(match => match[1]);
  const cached = new Set(extract(shell[1]).map(value => value.replace(/^\.\//, '')));
  const compared = new Set(extract(files[1]));
  for (const file of REQUIRED) {
    assert.ok(cached.has(file), 'offline shell omits ' + file);
    assert.ok(compared.has(file), 'deployment verifier omits ' + file);
    assert.ok(fs.existsSync(path.join(ROOT, file)), 'source asset missing ' + file);
  }
  for (const file of ['sw.js', 'manifest.webmanifest', 'release.json']) {
    assert.ok(compared.has(file), 'deployment verifier omits ' + file);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) {
    const name = icon.src.replace(/^\.\//, '');
    assert.ok(cached.has(name) && compared.has(name), 'manifest icon is not offline/certified: ' + name);
  }
  check('24 runtime/manifest assets exist and match worker/deployment inventories', true);
}
function fixtureServer() {
  let version = 'old', failure = null, rejected = 0;
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
  const server = http.createServer((request, response) => {
    let relative;
    try {
      const uri = new URL(request.url, 'http://localhost');
      relative = decodeURIComponent(uri.pathname).replace(/^\/+/, '') || 'index.html';
      if (relative.split('/').some(segment => segment === '..' || segment.startsWith('.'))) throw Error('unsafe');
      if (failure && relative === failure) {
        rejected += 1; response.writeHead(503); return response.end('P30 intentional offline-shell installation failure');
      }
      if (relative === 'sw.js') {
        response.setHeader('Content-Type', 'text/javascript');
        response.setHeader('Cache-Control', 'no-store');
        return response.end(version === 'old' ? OLD_SW : fs.readFileSync(path.join(ROOT, 'sw.js')));
      }
      const file = path.resolve(ROOT, relative);
      if (!file.startsWith(ROOT + path.sep)) throw Error('unsafe');
      fs.readFile(file, (error, bytes) => {
        if (error) { response.writeHead(404); return response.end(); }
        response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        response.setHeader('Cache-Control', 'no-store');
        response.end(bytes);
      });
    } catch {
      response.writeHead(400);response.end();
    }
  });
  return {
    server,
    setWorker(value) { version = value; },
    failAsset(value) { failure = value; },
    failures() { return rejected; }
  };
}
async function saved(page) {
  return page.evaluate(({SAVE, ACTIVE}) => ({
    round: serializeQuizSession(),
    progress: JSON.parse(localStorage.getItem(SAVE)),
    primary: localStorage.getItem(ACTIVE)
  }), { SAVE, ACTIVE });
}
async function state(page) {
  return page.evaluate(async () => ({
    worker: Boolean(navigator.serviceWorker.controller),
    versions: await caches.keys(),
    keys: (await (await caches.open('tbc-pwa-v3')).keys()).map(request => new URL(request.url).pathname),
    registration: Boolean(await navigator.serviceWorker.getRegistration())
  }));
}
async function main() {
  inventoryCheck();
  const fixture = fixtureServer();
  const browser = await chromium.launch({ headless: true });
  let context;
  try {
    await new Promise((resolve, reject) => { fixture.server.once('error', reject); fixture.server.listen(0, '127.0.0.1', resolve); });
    const base = 'http://127.0.0.1:' + fixture.server.address().port + '/';
    context = await browser.newContext({ acceptDownloads: true, timezoneId: 'Europe/Berlin' });
    let page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' }); await ready(page);
    const modal = page.locator('#modalRoot .modal-backdrop').getByRole('button').filter({ hasText: /Standard/i });
    if (await modal.count()) await modal.first().click();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {timeout:30000});
    check('previous v2 worker controls the original loaded client', (await state(page)).versions.includes('tbc-pwa-v2'));

    await page.evaluate(() => {
      setSetting('difficulty', 'standard');
      setSetting('autoNext', false);
      startQuiz('quick', 10);
      answer(currentQuestion().answer);
      nextQuestion();
      saveQuizSession();
    });
    const before = await saved(page);
    check('round and schema-27 progress exist before worker update', Boolean(before.primary && before.round && before.progress.schemaVersion === 27));

    fixture.setWorker('new');
    fixture.failAsset('assets/pr7-navigation-guard.js');
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    const failureDeadline = Date.now() + 30000;
    while (!fixture.failures() && Date.now() < failureDeadline) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    check('install failure is exercised by the actual fixture server', fixture.failures() > 0);
    await page.waitForFunction(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return !r.installing && !r.waiting && !(await caches.keys()).includes('tbc-pwa-v3');
    }, null, {timeout:30000});
    const failedInstall = await page.evaluate(async () => ({
      keys: await caches.keys(), round: serializeQuizSession(),
      progress: JSON.parse(localStorage.getItem('theBibleChallenge_v21'))
    }));
    check('failed new install preserves the previously active v2 shell', failedInstall.keys.includes('tbc-pwa-v2') && !failedInstall.keys.includes(CACHE));
    assert.deepEqual(exact(failedInstall.round), exact(before.round));
    assert.deepEqual(failedInstall.progress.stats, before.progress.stats);

    fixture.failAsset(null);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting), null, {timeout:30000});
    const waiting = await state(page);
    check('complete v3 shell waits rather than replacing the active v2 round', waiting.versions.includes('tbc-pwa-v2') && waiting.versions.includes(CACHE));
    const during = await saved(page);
    assert.deepEqual(exact(during.round), exact(before.round));
    await page.close();

    page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' }); await ready(page);
    await page.waitForFunction(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return r?.active?.state === 'activated' && (await caches.keys()).includes('tbc-pwa-v3');
    }, null, {timeout:30000});
    // An old worker may finish an in-flight navigation and recreate the v2
    // cache after activation. First prove the actual controller transition,
    // then exercise v3's reconciliation on a genuine controlled asset fetch.
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.active?.state === 'activated' &&
        navigator.serviceWorker.controller === registration.active;
    }, null, {timeout:30000});
    assert.equal(await page.evaluate(async () => (await fetch('./assets/pr6-play-learning.js?p30=controlled')).ok), true);
    const active = await state(page);
    assert.ok(active.worker && active.versions.includes(CACHE),
      'new client must be controlled by the complete v3 release: ' + JSON.stringify(active));
    check('v3 activates after old client closes and controls the successor page', true);
    for (const file of REQUIRED) assert.ok(active.keys.includes('/' + file), 'v3 cache missing ' + file);
    check('every 24 runtime/manifest assets is actually precached', true);

    const restored = await saved(page);
    assert.deepEqual(exact(restored.round), exact(before.round));
    for (const field of ['stats', 'daily', 'weekly', 'gameProgress']) assert.deepEqual(restored.progress[field], before.progress[field]);
    check('schema-27 progress and active round survive worker replacement', true);

    await context.setOffline(true);
    for (let i=0;i<2;i++) {
      await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
      const offline = await saved(page);
      assert.deepEqual(exact(offline.round), exact(before.round));
      for (const field of ['stats', 'daily', 'weekly', 'gameProgress']) assert.deepEqual(offline.progress[field], before.progress[field]);
    }
    check('two genuine Chromium offline reloads restore exactly', true);
    // Old v2's in-flight fetch can recreate its cache after v3 activation.
    // Require retirement after old client traffic drains and v3 handles
    // a stable offline navigation; never accept an orphaned old cache.
    await page.waitForFunction(async () => !(await caches.keys()).includes('tbc-pwa-v2'), null, {timeout:30000});
    assert.deepEqual((await state(page)).versions.filter(key => key.startsWith('tbc-pwa-')), [CACHE]);
    check('stale v2 cache is retired after new-controller navigation', true);
    const fetchResults = await page.evaluate(async files => Promise.all(files.map(async file => {
      const response = await fetch(file + '?p30=offline-test');
      return { file, status: response.status, bytes: (await response.arrayBuffer()).byteLength };
    })), ['assets/pr6-play-learning.js','assets/pr7-library-progress.js','manifest.webmanifest','assets/icons/icon-192.png']);
    assert.ok(fetchResults.every(r => r.status === 200 && r.bytes > 0), JSON.stringify(fetchResults));
    check('offline worker serves game, Library, manifest and icon requests', true);
    await page.evaluate(() => { answer(currentQuestion().answer); nextQuestion(); saveQuizSession(); });
    check('offline round remains answerable without resetting progress', Boolean((await saved(page)).round));
    const afterAnswer = await saved(page);
    await page.close();
    page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' }); await ready(page);
    assert.deepEqual(exact((await saved(page)).round), exact(afterAnswer.round));
    check('fully closed-and-reopened offline browser tab restores active round', true);
    await context.setOffline(false);
    check('no uncaught Chromium page errors', errors.length === 0);
  } finally {
    await context?.close();
    await browser.close();
    await new Promise(resolve => fixture.server.close(resolve));
  }
  console.log('P30 OFFLINE CHROMIUM: ' + RESULTS.length + '/' + RESULTS.length + ' PASS');
}
main().catch(error => { console.error('P30 OFFLINE CHROMIUM: FAIL', error.stack || error); process.exitCode = 1; });
