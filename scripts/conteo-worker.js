const CACHE_NAME = __CACHE_NAME__;
const FILES = __PRECACHE_URLS__;
const BASE = __BASE_PATH__;
const routes = new Set([BASE, BASE + 'index.html', BASE + 'conteo-cosecha-movil', BASE + 'registro-cosecha']);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = (await caches.keys()).filter(key => key.startsWith('conteo-app-'));
    // Keep the previous version for tabs still using its asset URLs.
    const previous = keys.filter(key => key !== CACHE_NAME).slice(-1);
    await Promise.all(keys.filter(key => key !== CACHE_NAME && !previous.includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && routes.has(url.pathname)) {
    event.respondWith(fetch(request).catch(async () => {
      const page = await (await caches.open(CACHE_NAME)).match(BASE + 'index.html');
      return page || Response.error();
    }));
  } else if (FILES.includes(url.pathname) && url.pathname !== BASE + 'index.html') {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => (await cache.match(url.pathname)) || fetch(request)));
  }
});
