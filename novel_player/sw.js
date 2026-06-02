/**
 * 静的アセットのオフライン用キャッシュ（作品データは IndexedDB）。
 */
const CACHE_NAME = "novel-player-shell-v29";

const SHELL_FILES = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./styles.css",
    "./pwa.js",
    "./icons/icon.svg",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./editor/scenario_editor.bundle.js",
    "./js/lib/novel_player_utils.js",
    "./js/storage/project_storage.js",
    "./js/ui/panel_resizer.js",
    "./js/ui/panel_layout.js",
    "./js/export/export_helpers.js",
    "./js/export/export_format_custom.js",
    "./js/export/export_render_tyrano.js",
    "./js/export/export_render_renpy.js",
    "./js/script/script-parser.js",
    "./js/lib/graphlib.min.js",
    "./js/lib/dagre.min.js",
    "./js/script/script_diagnostics.js",
    "./js/script/script_graph_patch.js",
    "./js/ui/label_graph_view.js",
    "./js/export/export_settings.js",
    "./js/core/novel-player.js",
    "./js/core/main.js",
];

function assetUrl(path) {
    return new URL(path, self.location).href;
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await Promise.allSettled(
                SHELL_FILES.map((p) => cache.add(assetUrl(p)))
            );
            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    const scopePath = new URL("./", self.location).pathname;
    if (!url.pathname.startsWith(scopePath)) return;

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() =>
                caches.match(assetUrl("./index.html")).then((r) => r || caches.match(assetUrl("./")))
            )
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== "basic") {
                    return response;
                }
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                return response;
            });
        })
    );
});
