// Minimal offline cache. Bump CACHE when you deploy changes so clients
// pick up the new build.
const CACHE = 'sticker-tracker-v1';

// Cache the app shell on install. Vite fingerprints JS/CSS filenames, so we
// let those fill the cache at runtime rather than listing them here.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(['./', './index.html', './manifest.webmanifest', './catalog.json'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first, falling back to network and caching the result.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(
      (hit) =>
        hit ||
        fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
          return res;
        }).catch(() => caches.match('./index.html'))
    )
  );
});
