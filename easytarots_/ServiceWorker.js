const cacheName = "DefaultCompany-easy tarots-1.0";
const contentToCache = [
    "Build/easytarots_.loader.js",
    "Build/d09b8d0138472d83519bdcde970be4ae.js",
    "Build/62c4169c4b2b4bb116ec96cf8ef5ca71.data",
    "Build/ff6307caf92eacda13ee412a73975ee4.wasm",
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
