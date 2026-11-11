// Independent v0.0.4 cache, never overwrite the validated earlier apps.
const CACHE='peach-physics-v0042-r1';
const ASSETS=['./','./index.html','./manifest.webmanifest','../apple-touch-icon.png'];
self.addEventListener('install', event => event.waitUntil(
 caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
 caches.keys().then(keys => Promise.all(keys.filter(key=>key.startsWith('peach-physics-v0042-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch', event => {
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.respondWith((async()=>{
  try{
   const res=await fetch(req);
   if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{}));}
   return res;
  }catch(e){return (await caches.match(req,{ignoreSearch:true})) || (await caches.match('./index.html')) || Response.error();}
 })());
});
