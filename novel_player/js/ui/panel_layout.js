/**
 * プレビュー / エディタの分割 ↔ 各パネル全画面切替
 */
(function () {
    const STORAGE_KEY = "novelPlayerPanelLayout";
    const MODES = new Set(["split", "preview", "editor"]);
    const CYCLE_ORDER = ["split", "preview", "editor"];

    function getLayout() {
        const v = document.body.getAttribute("data-layout");
        return v && MODES.has(v) ? v : "split";
    }

    function setLayout(mode) {
        const next = MODES.has(mode) ? mode : "split";
        if (next === "split") {
            document.body.removeAttribute("data-layout");
        } else {
            document.body.setAttribute("data-layout", next);
        }
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch (_) {
            /* ignore */
        }
        updateExpandButtons();
        window.dispatchEvent(new CustomEvent("panel-layout-change", { detail: { layout: next } }));
    }

    function updateExpandButtons() {
        const layout = getLayout();
        const splitter = document.getElementById("panelSplitter");
        if (splitter) {
            splitter.hidden = layout !== "split";
        }

        document.querySelectorAll("[data-panel-expand]").forEach((btn) => {
            const panel = btn.getAttribute("data-panel-expand");
            const expanded = layout === panel;
            btn.classList.toggle("is-expanded", expanded);
            btn.setAttribute("aria-pressed", expanded ? "true" : "false");
            btn.title = expanded ? "分割表示に戻る" : panel === "preview"
                ? "プレビューを全画面表示"
                : "エディタを全画面表示";
            btn.setAttribute(
                "aria-label",
                expanded ? "分割表示に戻る" : panel === "preview"
                    ? "プレビューを全画面表示"
                    : "エディタを全画面表示"
            );
        });

        const cycleBtn = document.getElementById("panelLayoutToggleButton");
        if (cycleBtn) {
            const isSplit = layout === "split";
            cycleBtn.setAttribute("aria-pressed", isSplit ? "false" : "true");
            const expandIcon = cycleBtn.querySelector(".panel-layout-toggle__icon--expand");
            const restoreIcon = cycleBtn.querySelector(".panel-layout-toggle__icon--restore");
            if (expandIcon) expandIcon.style.display = isSplit ? "block" : "none";
            if (restoreIcon) restoreIcon.style.display = isSplit ? "none" : "block";
        }
    }

    function togglePanel(panel) {
        const layout = getLayout();
        if (layout === panel) {
            setLayout("split");
        } else {
            setLayout(panel);
        }
    }

    function loadInitial() {
        let saved = "split";
        try {
            saved = localStorage.getItem(STORAGE_KEY) || "split";
        } catch (_) {
            /* ignore */
        }
        setLayout(MODES.has(saved) ? saved : "split");
    }

    function init() {
        loadInitial();
        const cycleBtn = document.getElementById("panelLayoutToggleButton");
        if (cycleBtn) {
            cycleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const layout = getLayout();
                const idx = CYCLE_ORDER.indexOf(layout);
                const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length] || "split";
                setLayout(next);
            });
        }

        // 互換: 古いパネル隅ボタンが残っている場合のため
        document.querySelectorAll("[data-panel-expand]").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                togglePanel(btn.getAttribute("data-panel-expand"));
            });
        });
    }

    window.PanelLayout = { getLayout, setLayout, togglePanel };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
