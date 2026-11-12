/* Poker Estudio PWA - caché local de recursos estáticos para uso sin conexión. */
const CACHE_NAME = 'poker-estudio-v3-1-20261112';
const APP_SHELL = [
  './', './index.html', './tools.css', './tools.js',
  './visual.css', './visual.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('poker-estudio-') && key !== CACHE_NAME).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(req, {ignoreSearch: true});
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const app = await caches.match('./index.html');
        if (app) return app;
      }
      return Response.error();
    })
  );
});
