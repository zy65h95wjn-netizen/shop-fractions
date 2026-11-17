const cacheName='peaches-four-portraits-02';
const files=['./','./index.html','./app.js','./engine.html','../../v8/index.html','../../v8/assets/holly-heartbreaker.png','../../v8/assets/aurelia-frost.jpg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(files.map(file=>new Request(file,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.delete('peaches-four-portraits-01').then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method==='GET'&&new URL(event.request.url).origin===location.origin){
  event.respondWith(caches.open(cacheName).then(async cache=>await cache.match(event.request,{ignoreSearch:true})||fetch(event.request)));
 }
});
