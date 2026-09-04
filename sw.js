'use strict';
// Bump this whenever the precached file list changes, so the activate
// handler below cleans out the old cache instead of leaving stale entries
// alongside the new ones.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `riichi-trainer-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/styles.css',
  '/tile-data.js',
  '/utils.js',
  '/tile-graphics.js',
  '/hand-builder.js',
  '/scoring.js',
  '/state.js',
  '/ui.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Network-first: always prefer a fresh copy when online, so a new deploy is
// picked up on the very next load instead of being masked by the cache.
// The cache is purely an offline fallback, kept warm by every successful
// fetch. Navigations (e.g. a hard refresh on /flashcards while offline)
// fall back to the cached "/" shell so the client-side router can still
// render the right page from the URL.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) =>
          cached || (event.request.mode === 'navigate' ? caches.match('/') : undefined)
        )
      )
  );
});
