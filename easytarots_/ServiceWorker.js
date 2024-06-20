const cacheName = "DefaultCompany-easy tarots-1.0";
const contentToCache = [
    "Build/easytarots_.loader.js",
    "Build/d09b8d0138472d83519bdcde970be4ae.js",
    "Build/dd2f61256d2addd7a6d51da08381ac36.data",
    "Build/93f628bbce0743b2a166671024b0e7ce.wasm",
    "TemplateData/style.css"

];

self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    
    e.waitUntil((async function () {
      const cache = await caches.open(cacheName);
      console.log('[Service Worker] Caching all: app shell and content');
      await cache.addAll(contentToCache);
    })());
});

self.addEventListener('fetch', function (e) {
    e.respondWith((async function () {
      let response = await caches.match(e.request);
      console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
      if (response) { return response; }

      response = await fetch(e.request);
      const cache = await caches.open(cacheName);
      console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
      cache.put(e.request, response.clone());
      return response;
    })());
});
