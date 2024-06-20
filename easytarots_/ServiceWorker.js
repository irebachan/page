const cacheName = "DefaultCompany-easy tarots-1.0";
const contentToCache = [
    "Build/easytarots_.loader.js",
    "Build/f9f74f89994a76b32bd699614e9a771c.js",
    "Build/187d80f35f15347d7eadb287cdeb2ea4.data",
    "Build/128bfa4ee83d74ae6a2529277c1fd883.wasm",
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
