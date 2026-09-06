const CACHE='huang-workbench-v9';
const ASSETS=['./黄老师工作台.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./favicon-32.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request).then(resp=>{ const cl=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,cl)); return resp; }).catch(()=>caches.match('./黄老师工作台.html'))) );
});