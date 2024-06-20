const cacheName = "DefaultCompany-easy tarots-1.0";
const contentToCache = [
    "Build/easytarots_.loader.js",
    "Build/f9f74f89994a76b32bd699614e9a771c.js",
    "Build/7c953fe603ca15caa658c92f623b2cd8.data",
    "Build/6627118cec5ebbf3cc629891a4e1af2d.wasm",
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
