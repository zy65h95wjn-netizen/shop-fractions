// One-version scope isolates v0.0.2 from the existing working Peach Physics v0.0.1.
const CACHE = 'peach-physics-v0-0-2-20261110';
const ASSETS = ['./', './index.html', './manifest.webmanifest', '../apple-touch-icon.png'];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('peach-physics-v0-0-2-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 const req=event.request, url=new URL(req.url);
 if(req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(self.registration.scope.slice(self.location.origin.length)))return;
 event.respondWith((async()=>{
  try { const res=await fetch(req); if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{}));}return res; }
  catch(e){ return await caches.match(req,{ignoreSearch:true}) || await caches.match('./index.html') || Response.error(); }
 })());
});
