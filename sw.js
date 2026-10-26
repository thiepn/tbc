'use strict';

// P30: an installed worker serves one verified, immutable release shell.
// Cache keys are release-scoped; never mix a newly fetched document with
// older enhancement assets during an offline transition.
const CACHE_PREFIX = 'tbc-pwa-';
const CACHE_NAME = CACHE_PREFIX + 'v3';
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
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;

  if (request.mode === 'navigate') {
    // Cache-first navigation keeps the document, revision archive and
    // separate enhancement scripts from the same successfully installed
    // release. A future release is adopted through the worker update.
    event.respondWith(caches.open(CACHE_NAME)
      .then(cache => cache.match(DOCUMENT))
      .then(response => response || fetch(request)));
    return;
  }

  if (!SHELL_PATHS.has(url.pathname)) return;
  event.respondWith(caches.open(CACHE_NAME)
    .then(cache => cache.match(request, { ignoreSearch: true }))
    .then(response => response || fetch(request)));
});
