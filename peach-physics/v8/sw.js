// The v0.0.8 cache is independent of all earlier Peach Physics releases.
const CACHE = 'peach-physics-v008-r9';
const FILES = ['./', './index.html', './assets/aurelia-frost.jpg', './assets/holly-heartbreaker.jpg?v=r7', './manifest.webmanifest', './apple-touch-icon.png'];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('peach-physics-v008-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 const req=event.request, u=new URL(req.url);
 if(req.method!=='GET' || u.origin !== self.location.origin || !u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.respondWith((async()=>{
  try {const res=await fetch(req); if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}));}return res;}
  catch(e){return await caches.match(req,{ignoreSearch:true}) || await caches.match('./index.html') || Response.error();}
 })());
});
