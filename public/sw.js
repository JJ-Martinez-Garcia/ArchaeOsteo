const CACHE = 'osteo3d-shell-v7';
const SHELL = ['./', './index.html', './manifest.json', './models/manifest.json', './models/sources.json', './icons/osteo3d-192.png', './icons/osteo3d-512.png', './icons/osteo3d-192.svg', './icons/osteo3d-512.svg'];
function assetPathsFromHtml(html) {
  return [...new Set([...html.matchAll(/(?:src|href)=["'](\.\/assets\/[^"']+)["']/g)].map(match => match[1]))];
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    const indexRequest = new Request('./index.html', { cache: 'reload' });
    const indexResponse = await fetch(indexRequest);
    if (!indexResponse.ok) throw new Error('No se pudo precargar ./index.html');
    await cache.put(indexRequest, indexResponse.clone());
    const html = await indexResponse.text();
    const paths = [...new Set([...SHELL.filter(path => path !== './index.html'), ...assetPathsFromHtml(html)])];
    await Promise.all(paths.map(async path => {
      const request = new Request(path, { cache: 'reload' });
      const response = await fetch(request);
      if (!response.ok) throw new Error(`No se pudo precargar ${path}`);
      await cache.put(request, response);
    }));
  }));
});
self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(
      keys
        .filter(key => key.startsWith('osteo3d-shell-') && key !== CACHE)
        .map(key => caches.delete(key)),
    ))
    .then(() => self.clients.claim()),
));
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
