// Minimal offline cache. Bump CACHE when you deploy changes so clients
// pick up the new build.
const CACHE = 'sticker-tracker-v3';

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

// Only cache successful same-origin responses at runtime.
function putIfOk(request, res) {
  if (res && res.ok && new URL(request.url).origin === self.location.origin) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // The shell and catalog aren't fingerprinted, so serve them network-first
  // (revalidate on every load) and fall back to cache offline. Everything
  // else — hashed /assets/*, icons — stays cache-first for speed/offline.
  const networkFirst =
    req.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/catalog.json');

  if (networkFirst) {
    event.respondWith(
      fetch(req)
        .then((res) => putIfOk(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => putIfOk(req, res))
          .catch(() => caches.match('./index.html'))
    )
  );
});
