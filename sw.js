/* All shell files are prepared before a new build becomes active. */
const VERSION = '0a825a787a091d6b';
const ROOT = new URL('./', self.registration.scope);
const PREFIX = 'frostline-shell-' + ROOT.pathname + '-';
const CACHE = PREFIX + VERSION;
const SHELL = ['./', './game-config.json', './manifest.webmanifest', './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      for (const path of SHELL) {
        const url = new URL(path, ROOT), response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) throw new Error('Cannot cache ' + path);
        if (path === './' && !(await response.clone().text()).includes('name="frostline-build" content="' + VERSION + '"')) throw new Error('Published shell is not ready yet');
        await cache.put(url, response);
      }
      await self.skipWaiting();
    } catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'FROSTLINE_VERSION') event.ports[0]?.postMessage({ version: VERSION });
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin || url.searchParams.has('dev')) return;
  const home = url.pathname === ROOT.pathname || url.pathname === new URL('index.html', ROOT).pathname;
  if (event.request.mode === 'navigate' && home) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(ROOT)) || fetch(event.request)));
  } else if (SHELL.slice(1).some(path => new URL(path, ROOT).pathname === url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE), key = new URL(url.pathname, ROOT.origin);
      return (await cache.match(key)) || fetch(event.request);
    })());
  }
});
