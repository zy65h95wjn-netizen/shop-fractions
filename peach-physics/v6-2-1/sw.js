// The v0.0.6.2.1 cache is independent of all earlier Peach Physics releases.
const CACHE = 'peach-physics-v00621-r1';
const FILES = ['./', './index.html', './manifest.webmanifest', '../apple-touch-icon.png'];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('peach-physics-v00621-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 const req=event.request, u=new URL(req.url);
 if(req.method!=='GET' || u.origin !== self.location.origin || !u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.respondWith((async()=>{
  try {const res=await fetch(req); if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}));}return res;}
  catch(e){return await caches.match(req,{ignoreSearch:true}) || await caches.match('./index.html') || Response.error();}
 })());
});
