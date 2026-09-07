const CACHE = 'osteo3d-shell-v4';
const SHELL = ['./', './index.html', './manifest.json'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await Promise.all(SHELL.map(async path => {
      const request = new Request(path, { cache: 'reload' });
      const response = await fetch(request);
      if (!response.ok) throw new Error(`No se pudo precargar ${path}`);
      await cache.put(request, response);
    }));
  }));
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
