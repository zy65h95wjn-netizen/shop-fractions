// The v0.0.8 cache is independent of all earlier Peach Physics releases.
const CACHE = 'peach-physics-v008-r15-four';
const FILES = ['./', './index.html', './motion.js?v=r15-four', './assets/aurelia-frost.jpg', './assets/holly-heartbreaker.png', './manifest.webmanifest', './apple-touch-icon.png'];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(url=>new Request(url,{cache:'reload'})))).then(() => self.skipWaiting()));
});
async function clearRetiredCaches(){
 const keys=await caches.keys();
 await Promise.all(keys.filter(key=>key.startsWith('peach-physics-v008-')&&key!==CACHE).map(key=>caches.delete(key)));
}
self.addEventListener('activate', event => {
 event.waitUntil(clearRetiredCaches().then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
 const req=event.request, u=new URL(req.url);
 if(req.method!=='GET' || u.origin !== self.location.origin || !u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 // A retired worker can finish a portrait write after this worker activates.
 if(req.mode==='navigate')event.waitUntil(caches.delete('peach-physics-v008-r14-ember1'));
 event.respondWith((async()=>{
  try {const res=await fetch(req); if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}));}return res;}
  // An old worker's in-flight write can recreate its retired cache after activation.
  // Read only this release's complete cache, never a stale sibling release.
  catch(e){
   const cache=await caches.open(CACHE),exact=await cache.match(req);
   if(exact)return exact;
   if(req.mode==='navigate')return await cache.match('./index.html')||Response.error();
   return Response.error();
  }
 })());
});
