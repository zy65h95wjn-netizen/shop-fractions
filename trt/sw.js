const VERSION='trt-calc-v1.4.0';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.svg','./apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(VERSION).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('trt-calc-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    if(req.mode==='navigate'){
      try{const fresh=await fetch(req);if(fresh.ok)await cache.put('./',fresh.clone());return fresh}
      catch{const cached=await cache.match('./');if(cached)return cached;throw new Error('Offline and no cached page')}
    }
    const cached=await cache.match(req);
    if(cached)return cached;
    const fresh=await fetch(req);if(fresh.ok)await cache.put(req,fresh.clone());return fresh;
  })());
});
