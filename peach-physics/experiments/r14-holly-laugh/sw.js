// This preview cache and scope are independent of production and other experiments.
const CACHE = 'peach-preview-r14-holly-laugh-v2';
const FILES = ['./', './index.html', './motion.js?v=r14-auto2', './holly-audio.js?v=r14-laugh2', './assets/audio/holly-giggle.wav', './assets/aurelia-frost.jpg', './assets/holly-heartbreaker.png', './assets/santa-claus.jpg', './manifest.webmanifest', './apple-touch-icon.png'];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('peach-preview-r14-holly-laugh-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 const req=event.request, u=new URL(req.url);
 if(req.method!=='GET' || u.origin !== self.location.origin || !u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.respondWith((async()=>{
  try {const res=await fetch(req); if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}));}return res;}
  // An old worker's in-flight write can recreate its retired cache after activation.
  // Read only this release's complete cache, never a stale sibling release.
  catch(e){const cache=await caches.open(CACHE);return await cache.match(req,{ignoreSearch:true}) || (req.mode==='navigate'?await cache.match('./index.html'):null) || Response.error();}
 })());
});
