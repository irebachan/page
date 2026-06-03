/**
 * Service Worker 登録（HTTPS / localhost のみ有効）
 */
(function () {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
        return;
    }

    let reloadOnControllerChange = false;

    window.addEventListener("load", () => {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (reloadOnControllerChange) return;
            reloadOnControllerChange = true;
            window.location.reload();
        });

        navigator.serviceWorker
            .register("sw.js")
            .then((reg) => {
                reg.update().catch(() => {});
            })
            .catch((err) => {
                console.warn("Service Worker の登録に失敗:", err);
            });
    });
})();
