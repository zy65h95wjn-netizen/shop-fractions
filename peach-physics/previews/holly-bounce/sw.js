const CACHE='peaches-holly-bounce-01';
const FILES=['./','./index.html','./app.js','./engine.html','../../v8/assets/holly-heartbreaker.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('peaches-holly-bounce-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.open(CACHE).then(async cache=>await cache.match(e.request,{ignoreSearch:true})||fetch(e.request)))});
