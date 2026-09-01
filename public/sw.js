const CACHE='xr1-shell-v0.14'
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/','/manifest.webmanifest','/joint-x-logo.png'])));self.skipWaiting()})
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()})
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put('/',copy));return response}).catch(()=>caches.match('/')));return}event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)))})
