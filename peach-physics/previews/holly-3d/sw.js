const CACHE='peaches-holly-3d-study-01';
const FILES=['./','./index.html','./app.js','./holly.json','./holly.bin','./vendor/three.module.min.js','../../v8/assets/holly-heartbreaker.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('peaches-holly-3d-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.open(CACHE).then(async cache=>{const hit=await cache.match(e.request,{ignoreSearch:true});return hit||fetch(e.request)}))});
