/**
 * 静的アセットのオフライン用キャッシュ（作品データは IndexedDB）。
 */
const CACHE_NAME = "novel-player-shell-v1";

const SHELL_FILES = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./styles.css",
    "./icons/icon.svg",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./editor/scenario_editor.bundle.js",
    "./novel_player_utils.js",
    "./project_storage.js",
    "./panel_resizer.js",
    "./panel_layout.js",
    "./export_helpers.js",
    "./export_format_custom.js",
    "./export_render_tyrano.js",
    "./export_render_renpy.js",
    "./script_expr.js",
    "./script-parser.js",
    "./script_diagnostics.js",
    "./export_settings.js",
    "./novel-player.js",
    "./main.js",
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
