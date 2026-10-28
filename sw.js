'use strict';

// P30: an installed worker serves one verified, immutable release shell.
// Cache keys are release-scoped; never mix a newly fetched document with
// older enhancement assets during an offline transition.
// The shipped v2 worker deletes every "tbc-pwa-*" cache on activation.
// A waiting successor using that namespace can lose its fully installed shell
// if v2 activates late. Use a disjoint namespace for v3 and newer releases.
const CACHE_PREFIX = 'tbc-offline-v';
const CACHE_VERSION = 4;
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const EXPECTED_RELEASE = 'v4.1.0';
const SCOPE = new URL(self.registration.scope);
const DOCUMENT = new URL('./index.html', SCOPE).href;
const STATUS_PATH = new URL('./__tbc_pwa_status', SCOPE).pathname;
const SHELL = [
  './',
  './index.html',
  './release.json',
  './manifest.webmanifest',
  './favicon.svg',
  './assets/pr5-foundation.css',
  './assets/pr5-shell.js',
  './assets/pr6-play-learning.css',
  './assets/pr6-play-learning.js',
  './assets/p0b-player-controls.js',
  './assets/p0c-existing-feature-preservation.js',
  './assets/p1b-pr7-production.js',
  './assets/pr7-library-progress.css',
  './assets/pr7-collections-adapter.js',
  './assets/pr7-library-progress.js',
  './assets/pr7-navigation-guard.js',
  './assets/play-the-bible-challenge.svg',
  './assets/tbc-hero.svg',
  './assets/tbc-stats.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './assets/icons/favicon.ico'
];
const SHELL_URLS = SHELL.map(file => new URL(file, SCOPE).href);
const SHELL_PATHS = new Set(SHELL_URLS.map(url => new URL(url).pathname));

// In-flight fetch handlers from the retiring v2 worker can reopen its cache
// after v3 activation. Reconcile again on new-worker requests, when clients
// have crossed the controller boundary, rather than assuming one delete lasts.
const oldVersion = key => {
  // Never match unrelated caches or an installing successor generation.
  const version = /^tbc-(?:pwa-v|offline-v)(\d+)$/.exec(key);
  return version && Number(version[1]) < CACHE_VERSION;
};
let lastRetirement = {calls: 0, deleted: [], residual: [], matched: false};
async function retireOldCaches() {
  lastRetirement.calls++;
  // v2 performed cache.put() asynchronously outside its fetch event's
  // waitUntil/respondWith lifetime. A late v2 task may reopen its cache just
  // after a v3 sweep. If an old cache exists, finish a bounded quiescence
  // sweep before completing a v3 response. No delay on the normal clean path.
  let sawOld = false;
  for (let sweep = 0; sweep < 4; sweep++) {
    const stale = (await caches.keys()).filter(oldVersion);
    if (stale.length) {
      sawOld = true;
      lastRetirement.matched = true;
      lastRetirement.deleted.push(...stale);
      await Promise.all(stale.map(key => caches.delete(key)));
    }
    if (!sawOld) return;
    if (sweep < 3) await new Promise(resolve => setTimeout(resolve, 75));
  }
  const remaining = (await caches.keys()).filter(oldVersion);
  lastRetirement.residual = remaining;
  if (remaining.length) throw new Error('Old TBC PWA cache kept reopening');
}

// Every install attempt uses a separate temporary cache. The old installer
// removed the shared version cache on a 503, so a failed overlapping update
// could erase bytes written by another successful waiting worker.
const SHELL_REQUESTS = SHELL_URLS.map(url => new Request(url, {
  cache: 'reload', credentials: 'same-origin'
}));
async function shellComplete(cache) {
  for (const url of SHELL_URLS) {
    if (!await cache.match(url)) return false;
  }
  const release = await cache.match(new URL('./release.json', SCOPE).href);
  const identity = release && await release.json();
  return identity?.release === EXPECTED_RELEASE;
}
const STAGE_PREFIX = 'tbc-stage-v' + CACHE_VERSION + '-';
async function stageShell() {
  const stageName = STAGE_PREFIX + Date.now() + '-' +
    Math.random().toString(36).slice(2);
  const staging = await caches.open(stageName);
  try {
    await staging.addAll(SHELL_REQUESTS);
    if (!await shellComplete(staging)) {
      throw new Error('TBC staging shell incomplete or release identity invalid');
    }
    // Installation must not publish into a shared version cache. The
    // attempting worker alone owns this stage until activation.
    return stageName;
  } catch (error) {
    await caches.delete(stageName);
    throw error;
  }
}
async function promoteStagedShell() {
  const names = await caches.keys();
  if (names.includes(CACHE_NAME)) {
    const existing = await caches.open(CACHE_NAME);
    if (await shellComplete(existing)) return existing;
  }
  // Only validated staging caches are eligible. An offline activation can
  // succeed from the complete install-time stage without network access.
  const stages = names.filter(name => name.startsWith(STAGE_PREFIX));
  for (const stageName of stages) {
    const stage = await caches.open(stageName);
    if (!await shellComplete(stage)) continue;
    const published = await caches.open(CACHE_NAME);
    try {
      for (const url of SHELL_URLS) {
        const asset = await stage.match(url);
        if (!asset) throw new Error('Missing staged TBC asset');
        await published.put(url, asset);
      }
      if (!await shellComplete(published)) {
        throw new Error('TBC published shell incomplete');
      }
    } catch (error) {
      // Invalid/partial publication never gets accepted as ready.
      throw error;
    }
    await caches.delete(stageName);
    return published;
  }
  throw new Error('No complete authenticated TBC PWA staged release');
}

let healthyCachePromise = null;
function verifiedCache() {
  if (!healthyCachePromise) {
    healthyCachePromise = (async () => {
      const names = await caches.keys();
      const existing = names.includes(CACHE_NAME) ? await caches.open(CACHE_NAME) : null;
      if (existing && await shellComplete(existing)) return existing;
      // Prefer previously staged assets, including when activation happens
      // without a network. Only an active worker may rebuild a missing shell
      // after verifying the pinned release; never use mixed-version fallback.
      if (names.some(name => name.startsWith(STAGE_PREFIX))) {
        try { return await promoteStagedShell(); } catch { /* fail closed or retry online below */ }
      }
      await stageShell();
      return promoteStagedShell();
    })().catch(error => {
      healthyCachePromise = null;
      throw error;
    });
  }
  return healthyCachePromise;
}

self.addEventListener('install', event => {
  // Keep the verified bytes in a private cache until successor activation.
  // Failed overlapping installs cannot affect this successful attempt.
  event.waitUntil(stageShell().then(() => undefined));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Commit a complete install-time stage before claiming clients; never
    // activate with only a registration marker and an incomplete cache.
    await promoteStagedShell();
    // Retire old versions only after the complete new release exists.
    await retireOldCaches();
    await self.clients.claim();
  })());
});

// Read-only release handshake: a browser must distinguish the installed v3
// controller from a still-active v2 worker sharing the same script URL.
self.addEventListener('message', event => {
  if (event.data?.type !== 'TBC_PWA_VERSION' || !event.ports?.[0]) return;
  event.ports[0].postMessage({
    type: 'TBC_PWA_VERSION', cache: CACHE_NAME,
    retirement: {
      ...lastRetirement,
      cacheKeys: null
    }
  });
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;

  if (url.pathname === STATUS_PATH) {
    // Read-only, origin-scoped offline health proof. No app state or user
    // progress is exposed; unlike an API-presence probe, this verifies the
    // active worker actually handles fetches without network access.
    event.respondWith((async () => {
      await verifiedCache();
      await retireOldCaches();
      const stale = (await caches.keys()).filter(oldVersion);
      return new Response(JSON.stringify({
        cache: CACHE_NAME, stale
      }), {headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }});
    })());
    return;
  }

  if (request.mode === 'navigate') {
    // The document and enhancement modules must come from the same completed
    // release, including on offline refresh. Complete stale-cache retirement
    // before fulfilling the navigation: a separate waitUntil cleanup can race
    // the next loaded document and leave resurrected v2 cache entries behind.
    event.respondWith((async () => {
      const cache = await verifiedCache();
      const response = await cache.match(DOCUMENT);
      if (!response) throw new Error('Offline TBC document missing after cache verification');
      await retireOldCaches();
      return response;
    })());
    return;
  }

  if (!SHELL_PATHS.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await verifiedCache();
    const response = await cache.match(request, { ignoreSearch: true });
    if (!response) throw new Error('Offline TBC asset missing after cache verification');
    await retireOldCaches();
    return response;
  })());
});
