// Offline support: keep a copy of the app on the phone, serve it from there, refresh the copy when online.
const CACHE = "shop-fractions-v6";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  const scopePath = new URL(self.registration.scope).pathname;
  const relativePath = url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : "";
  const isNestedApp = relativePath.includes("/");
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isNestedApp) {
      // This root worker also controls /pulse/, /island/, /books/, etc.
      // Nested apps must get current network files. Query strings identify distinct
      // assets; ignoreSearch + cache-first previously returned stale app.js.
      try {
        const response = await fetch(req);
        if (response && response.ok) {
          event.waitUntil(cache.put(req, response.clone()).catch(() => {}));
        }
        return response;
      } catch (error) {
        const offline = await cache.match(req);
        if (offline) return offline;
        throw error;
      }
    }
    // Preserve the original calculator's established cache-first/offline behavior.
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    });
    if (hit) { event.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh;
  })());
});
