/**
 * プレビュー（.novel-viewer）とシナリオ（.scenario-box）の分割をドラッグで調整。
 * 縦積み時は高さ比、横並び時は幅比として同じパーセント値を使う。
 */
(function () {
    const STORAGE_KEY = "novelPlayerPanelSplitPct";
    const MIN_PCT = 18;
    const MAX_PCT = 82;
    const DEFAULT_PCT = 50;
    const MQ = window.matchMedia("(max-width: 768px)");

    function isStacked() {
        return MQ.matches;
    }

    function getPct() {
        const raw = getComputedStyle(document.body).getPropertyValue("--panel-split-pct").trim();
        const n = parseFloat(raw);
        return Number.isFinite(n) ? n : DEFAULT_PCT;
    }

    function setPct(pct) {
        const v = Math.max(MIN_PCT, Math.min(MAX_PCT, pct));
        document.body.style.setProperty("--panel-split-pct", String(v));
        try {
            localStorage.setItem(STORAGE_KEY, String(v));
        } catch (_) {
            /* ignore */
        }
        const sp = document.getElementById("panelSplitter");
        if (sp) {
            sp.setAttribute("aria-valuenow", String(Math.round(v)));
            sp.setAttribute("aria-orientation", isStacked() ? "horizontal" : "vertical");
        }
    }

    function loadInitial() {
        let pct = DEFAULT_PCT;
        try {
            const s = localStorage.getItem(STORAGE_KEY);
            if (s !== null) {
                const n = parseFloat(s);
                if (Number.isFinite(n)) pct = n;
            }
        } catch (_) {
            /* ignore */
        }
        setPct(pct);
    }

    function init() {
        const splitter = document.getElementById("panelSplitter");
        if (!splitter) return;

        splitter.setAttribute("aria-valuemin", String(MIN_PCT));
        splitter.setAttribute("aria-valuemax", String(MAX_PCT));
        loadInitial();

        let dragging = false;
        let startMain = 0;
        let startPct = DEFAULT_PCT;
        let containerSize = 1;

        function mainSize() {
            const r = document.body.getBoundingClientRect();
            return isStacked() ? r.height : r.width;
        }

        function pointerFromEvent(e) {
            const r = document.body.getBoundingClientRect();
            if (isStacked()) {
                return e.clientY - r.top;
            }
            return e.clientX - r.left;
        }

        function onPointerDown(e) {
            if (e.button !== 0) return;
            e.preventDefault();
            dragging = true;
            startMain = pointerFromEvent(e);
            startPct = getPct();
            containerSize = Math.max(1, mainSize());
            document.body.classList.add("is-panel-dragging");
            splitter.setPointerCapture(e.pointerId);
        }

        function onPointerMove(e) {
            if (!dragging) return;
            e.preventDefault();
            const now = pointerFromEvent(e);
            const delta = now - startMain;
            const deltaPct = (delta / containerSize) * 100;
            /* 第1パネル比率: 横＝右へ／縦＝下へドラッグで増える（境界が進行方向へ動くイメージ） */
            const next = startPct + deltaPct;
            setPct(next);
        }

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            document.body.classList.remove("is-panel-dragging");
            try {
                if (e && splitter.hasPointerCapture(e.pointerId)) {
                    splitter.releasePointerCapture(e.pointerId);
                }
            } catch (_) {
                /* ignore */
            }
        }

        splitter.addEventListener("pointerdown", onPointerDown);
        splitter.addEventListener("pointermove", onPointerMove);
        splitter.addEventListener("pointerup", endDrag);
        splitter.addEventListener("pointercancel", endDrag);
        splitter.addEventListener("lostpointercapture", endDrag);

        splitter.addEventListener("dblclick", function (e) {
            e.preventDefault();
            setPct(DEFAULT_PCT);
        });

        splitter.addEventListener("keydown", function (e) {
            const step = e.shiftKey ? 5 : 2;
            let p = getPct();
            if (isStacked()) {
                if (e.key === "ArrowDown" || e.key === "ArrowRight") p += step;
                if (e.key === "ArrowUp" || e.key === "ArrowLeft") p -= step;
            } else {
                if (e.key === "ArrowLeft" || e.key === "ArrowUp") p -= step;
                if (e.key === "ArrowRight" || e.key === "ArrowDown") p += step;
            }
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
                setPct(p);
            }
        });

        function onMqChange() {
            const sp = document.getElementById("panelSplitter");
            if (sp) sp.setAttribute("aria-orientation", isStacked() ? "horizontal" : "vertical");
        }
        /* Safari 13 以前は addEventListener が無く addListener のみ */
        if (typeof MQ.addEventListener === "function") {
            MQ.addEventListener("change", onMqChange);
        } else if (typeof MQ.addListener === "function") {
            MQ.addListener(onMqChange);
        }

        window.addEventListener("resize", function () {
            /* レイアウト切替後も同じ比率を維持（setPct は既に保存値を body に反映済み） */
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
