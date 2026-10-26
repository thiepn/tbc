'use strict';

// P30: an installed worker serves one verified, immutable release shell.
// Cache keys are release-scoped; never mix a newly fetched document with
// older enhancement assets during an offline transition.
const CACHE_PREFIX = 'tbc-pwa-';
const CACHE_VERSION = 3;
const CACHE_NAME = CACHE_PREFIX + 'v' + CACHE_VERSION;
const SCOPE = new URL(self.registration.scope);
const DOCUMENT = new URL('./index.html', SCOPE).href;
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
async function retireOldCaches() {
  const keys = await caches.keys();
  // A newer worker may already be installing its own cache while this worker
  // still controls existing tabs. Never erase that newer, not-yet-active shell.
  const oldKeys = keys.filter(key => {
    if (!key.startsWith(CACHE_PREFIX)) return false;
    const version = /^tbc-pwa-v(\d+)$/.exec(key);
    return version && Number(version[1]) < CACHE_VERSION;
  });
  await Promise.all(oldKeys.map(key => caches.delete(key)));
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
    const cache = await caches.open(CACHE_NAME);
    for (const url of SHELL_URLS) {
      if (!await cache.match(url)) throw new Error('TBC shell activation denied');
    }
    // Retire old versions only after the complete new release exists.
    await retireOldCaches();
    await self.clients.claim();
  })());
});

// Read-only release handshake: a browser must distinguish the installed v3
// controller from a still-active v2 worker sharing the same script URL.
self.addEventListener('message', event => {
  if (event.data?.type !== 'TBC_PWA_VERSION' || !event.ports?.[0]) return;
  event.ports[0].postMessage({type: 'TBC_PWA_VERSION', cache: CACHE_NAME});
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;

  if (request.mode === 'navigate') {
    // The document and enhancement modules must come from the same completed
    // release, including on offline refresh. Complete stale-cache retirement
    // before fulfilling the navigation: a separate waitUntil cleanup can race
    // the next loaded document and leave resurrected v2 cache entries behind.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(DOCUMENT) || await fetch(request);
      await retireOldCaches();
      return response;
    })());
    return;
  }

  if (!SHELL_PATHS.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(request, { ignoreSearch: true }) || await fetch(request);
    await retireOldCaches();
    return response;
  })());
});
