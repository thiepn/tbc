'use strict';

// P30: an installed worker serves one verified, immutable release shell.
// Cache keys are release-scoped; never mix a newly fetched document with
// older enhancement assets during an offline transition.
const CACHE_PREFIX = 'tbc-pwa-';
const CACHE_VERSION = 3;
const CACHE_NAME = CACHE_PREFIX + 'v' + CACHE_VERSION;
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
  const version = /^tbc-pwa-v(\d+)$/.exec(key);
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

let healthyCachePromise = null;
function verifiedCache() {
  if (!healthyCachePromise) {
    healthyCachePromise = (async () => {
      const cache = await caches.open(CACHE_NAME);
      const missing = [];
      for (const url of SHELL_URLS) {
        if (!await cache.match(url)) missing.push(url);
      }
      if (missing.length) {
        // Chromium may retain registration + localStorage across a full
        // restart while discarding an installed-but-waiting cache. Repair the
        // whole shell atomically while online, never serve a partial release.
        await cache.addAll(SHELL_URLS.map(url => new Request(url,{
          cache:'reload',credentials:'same-origin'
        })));
      }
      for (const url of SHELL_URLS) {
        if (!await cache.match(url)) throw new Error('Incomplete TBC offline release');
      }
      const release = await cache.match(new URL('./release.json',SCOPE).href);
      const identity = release && await release.json();
      if (identity?.release !== EXPECTED_RELEASE) {
        throw new Error('Refusing mixed TBC release after PWA cache recovery');
      }
      return cache;
    })().catch(error => {
      healthyCachePromise = null;
      throw error;
    });
  }
  return healthyCachePromise;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // addAll fails atomically on a missing/invalid asset. Do not activate a
      // release with only its HTML or only some of its scripts available.
      await cache.addAll(SHELL_URLS.map(url => new Request(url, {
        cache: 'reload',
        credentials: 'same-origin'
      })));
      for (const url of SHELL_URLS) {
        if (!await cache.match(url)) throw new Error('Incomplete TBC offline shell');
      }
      // Do not skipWaiting: an active round stays on its current version
      // until the older client closes, rather than changing engines mid-quiz.
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await verifiedCache();
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
