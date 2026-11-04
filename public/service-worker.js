// ClipEngine service worker: lets the editor open offline after one online visit.
// Network first, so a new deploy is picked up right away; the cache is only a fallback.
// Lives in public/ so Vite copies it to the root of dist/ (served at /js-game-engine/).
const CACHE_NAME = 'clipengine-cache-v3';

// Relative to this file, so it works under the GitHub Pages base path.
const PRECACHE = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Vite names build files like assets/index-AbC123.js. When a new deploy brings a new hash,
// drop the old copy of the same file so the cache doesn't grow with every deploy.
const HASHED = /\/assets\/(.+)-[\w-]{8}(\.\w+)$/;

async function saveToCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  const match = new URL(request.url).pathname.match(HASHED);
  if (match) {
    const [, name, ext] = match;
    const stale = (await cache.keys()).filter((old) => {
      const m = new URL(old.url).pathname.match(HASHED);
      return m && m[1] === name && m[2] === ext && old.url !== request.url;
    });
    await Promise.all(stale.map((old) => cache.delete(old)));
  }
  await cache.put(request, response);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          event.waitUntil(saveToCache(request, response.clone()));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Only page loads fall back to the editor shell; a missing script or scene should fail as a network error.
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }),
  );
});
