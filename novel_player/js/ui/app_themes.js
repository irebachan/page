/**
 * 表示テーマ — themes/registry.js が候補の登録先（file:// 対応）
 */
(function () {
    const STORAGE_KEY = "novelPlayer.appTheme";
    const PREVIEW_CSS_KEY = "novelPlayer.previewThemeCss";
    const PREVIEW_ID_KEY = "novelPlayer.previewThemeId";
    const PREVIEW_STYLE_ID = "novel-player-preview-theme";
    const LEGACY_CUSTOM_CSS_KEY = "novelPlayer.customThemeCss";
    const LEGACY_CUSTOM_STYLE_ID = "novel-player-custom-themes";
    const SYNTAX_KEYS = [
        "character",
        "label",
        "if",
        "goto",
        "call",
        "choice",
        "end",
    ];

    const FALLBACK_SYNTAX = {
        character: "#9cf",
        label: "#c0b0e8",
        if: "#e8a55c",
        goto: "#5ec8e8",
        call: "#e8d060",
        choice: "#bdc",
        end: "#a8a8a8",
    };

    const REGISTRY_FALLBACK = ["default"];

    /** @type {Record<string, object>} */
    let APP_THEMES = {};
    let registryIds = [];
    let discovered = false;
    let bootPromise = null;

    function clearLegacyCustomThemeOverride() {
        try {
            localStorage.removeItem(LEGACY_CUSTOM_CSS_KEY);
        } catch (_) {
            /* ignore */
        }
        const el = document.getElementById(LEGACY_CUSTOM_STYLE_ID);
        if (el) el.remove();
    }

    clearLegacyCustomThemeOverride();

    function getRegistryIdsSync() {
        const ids = parseManifestIds(window.__NOVEL_THEME_MANIFEST__);
        return ids.length ? ids : [...REGISTRY_FALLBACK];
    }

    function getSessionPreview() {
        try {
            const css = sessionStorage.getItem(PREVIEW_CSS_KEY);
            const id = sessionStorage.getItem(PREVIEW_ID_KEY);
            if (css && id) return { css, id };
        } catch (_) {
            /* ignore */
        }
        return null;
    }

    function isPreviewActive() {
        return Boolean(getSessionPreview());
    }

    function injectPreviewThemeCss(css) {
        let el = document.getElementById(PREVIEW_STYLE_ID);
        if (!el) {
            el = document.createElement("style");
            el.id = PREVIEW_STYLE_ID;
            document.head.appendChild(el);
        }
        el.textContent = css;
    }

    function dismissPreview() {
        try {
            sessionStorage.removeItem(PREVIEW_CSS_KEY);
            sessionStorage.removeItem(PREVIEW_ID_KEY);
        } catch (_) {
            /* ignore */
        }
        const el = document.getElementById(PREVIEW_STYLE_ID);
        if (el) el.remove();
        const banner = document.getElementById("themePreviewBanner");
        if (banner) banner.hidden = true;
    }

    function showPreviewBanner() {
        const banner = document.getElementById("themePreviewBanner");
        if (banner) banner.hidden = false;
        const btn = document.getElementById("themePreviewDismiss");
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = "1";
            btn.addEventListener("click", () => {
                dismissPreview();
                applyAppTheme(getThemeId());
            });
        }
    }

    function isThemeEditorPage() {
        return Boolean(document.querySelector(".te-app"));
    }

    function withThemeOverridesHidden(fn) {
        const live = document.getElementById("te-live-preview-style");
        const preview = document.getElementById(PREVIEW_STYLE_ID);
        const liveText = live ? live.textContent : null;
        const previewText = preview ? preview.textContent : null;
        if (live) live.textContent = "";
        if (preview) preview.textContent = "";
        try {
            return fn();
        } finally {
            if (live && liveText !== null) live.textContent = liveText;
            if (preview && previewText !== null) preview.textContent = previewText;
        }
    }

    function readPresetVarsFromSheet(id) {
        const link = document.querySelector(`link[data-theme-preset="${id}"]`);
        if (!link?.sheet) return null;
        try {
            const rules = link.sheet.cssRules;
            for (let i = 0; i < rules.length; i++) {
                const rule = rules[i];
                if (rule.type !== CSSRule.STYLE_RULE) continue;
                const sel = rule.selectorText || "";
                if (!sel.includes(`data-app-theme="${id}"`)) continue;
                const vars = {};
                for (let j = 0; j < rule.style.length; j++) {
                    const name = rule.style[j];
                    vars[name] = rule.style.getPropertyValue(name).trim();
                }
                let label = vars["--theme-label"] || id;
                label = label.replace(/^["']|["']$/g, "");
                return { label, vars };
            }
        } catch (_) {
            return null;
        }
        return null;
    }

    function readThemeMetaFromComputed(id) {
        document.documentElement.setAttribute("data-app-theme", id);
        const s = getComputedStyle(document.documentElement);
        const syntax = {};
        for (const key of SYNTAX_KEYS) {
            const v = s.getPropertyValue(`--syntax-${key}`).trim();
            syntax[key] = v || FALLBACK_SYNTAX[key];
        }
        return {
            id,
            label: s.getPropertyValue("--theme-label").trim() || id,
            metaColor: s.getPropertyValue("--theme-meta-color").trim(),
            syntax,
        };
    }

    function readThemeMetaFromPreset(id) {
        const sheet = readPresetVarsFromSheet(id);
        if (sheet) {
            const syntax = {};
            for (const key of SYNTAX_KEYS) {
                syntax[key] =
                    sheet.vars[`--syntax-${key}`] || FALLBACK_SYNTAX[key];
            }
            return {
                id,
                label: sheet.label || id,
                metaColor: sheet.vars["--theme-meta-color"] || "",
                syntax,
            };
        }
        return withThemeOverridesHidden(() => readThemeMetaFromComputed(id));
    }

    function readPresetPalette(id) {
        const sheet = readPresetVarsFromSheet(id);
        if (sheet) return sheet;
        return withThemeOverridesHidden(() => {
            document.documentElement.setAttribute("data-app-theme", id);
            const s = getComputedStyle(document.documentElement);
            const vars = {};
            for (const key of [
                "--theme-label",
                "--theme-meta-color",
                ...SYNTAX_KEYS.map((k) => `--syntax-${k}`),
                "--t-bg",
                "--t-fg",
                "--t-surface",
                "--t-panel",
                "--t-field",
                "--t-control",
                "--t-control-hover",
                "--t-border",
                "--t-muted",
                "--t-accent",
                "--t-danger",
                "--t-overlay",
            ]) {
                const v = s.getPropertyValue(key).trim();
                if (v) vars[key] = v;
            }
            let label = vars["--theme-label"] || id;
            label = label.replace(/^["']|["']$/g, "");
            return { label, vars };
        });
    }

    function applyPreviewThemeVisual(id) {
        document.documentElement.setAttribute("data-app-theme", id);
        const meta = readThemeMetaFromComputed(id);
        APP_THEMES[id] = meta;
        applyMetaColor(meta.metaColor);
        notifyEditor(id);
        return id;
    }

    function getThemesDirUrl() {
        for (const link of document.querySelectorAll(
            'link[rel="stylesheet"]'
        )) {
            const href = link.getAttribute("href") || "";
            if (/base\.css/i.test(href)) {
                return link.href.replace(/[^/]+$/, "");
            }
        }
        return new URL("themes/", document.baseURI || location.href).href;
    }

    function parseManifestIds(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.themes)) return data.themes;
        return [];
    }

    function loadRegistryIds() {
        registryIds = [...new Set(getRegistryIdsSync().map((id) => String(id).trim()).filter(Boolean))];
        return registryIds;
    }

    async function ensurePresetLinksLoaded(ids) {
        const themesDir = getThemesDirUrl();
        const pending = [];

        for (const id of ids) {
            if (document.querySelector(`link[data-theme-preset="${id}"]`)) {
                continue;
            }
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = `${themesDir}presets/${id}.css`;
            link.setAttribute("data-theme-preset", id);
            pending.push(
                new Promise((resolve) => {
                    link.addEventListener("load", resolve, { once: true });
                    link.addEventListener("error", resolve, { once: true });
                })
            );
            document.head.appendChild(link);
        }

        if (pending.length) await Promise.all(pending);
    }

    function discoverThemes() {
        const ids = registryIds.length ? registryIds : ["default"];
        const themes = {};
        const restoreId = isThemeEditorPage() ? "default" : getThemeId();

        for (const id of ids) {
            themes[id] = readThemeMetaFromPreset(id);
        }

        document.documentElement.setAttribute("data-app-theme", restoreId);

        if (!themes.default && ids.length) {
            themes.default = themes[ids[0]];
        }
        if (!Object.keys(themes).length) {
            themes.default = {
                id: "default",
                label: "標準（ダーク）",
                metaColor: "#1a1a1a",
                syntax: { ...FALLBACK_SYNTAX },
            };
        }

        APP_THEMES = themes;
        discovered = true;
        return APP_THEMES;
    }

    async function boot() {
        loadRegistryIds();
        await ensurePresetLinksLoaded(registryIds);

        const inEditor = isThemeEditorPage();
        const preview = inEditor ? null : getSessionPreview();
        if (preview) injectPreviewThemeCss(preview.css);

        discoverThemes();

        if (preview) {
            applyPreviewThemeVisual(preview.id);
            showPreviewBanner();
        } else if (inEditor) {
            document.documentElement.setAttribute("data-app-theme", "default");
            applyMetaColor(APP_THEMES.default?.metaColor);
        } else {
            applyAppTheme(getThemeId());
        }
    }

    function ensureDiscovered() {
        if (discovered) return Promise.resolve(APP_THEMES);
        if (!bootPromise) bootPromise = boot().then(() => APP_THEMES);
        return bootPromise;
    }

    function getOrderedThemeIds() {
        return [...registryIds];
    }

    function getThemeId() {
        const ids = registryIds.length ? registryIds : getRegistryIdsSync();
        let stored = "default";
        try {
            stored = localStorage.getItem(STORAGE_KEY) || "default";
        } catch (_) {
            /* ignore */
        }

        if (!ids.includes(stored)) {
            stored = ids.includes("default") ? "default" : ids[0] || "default";
            try {
                localStorage.setItem(STORAGE_KEY, stored);
            } catch (_) {
                /* ignore */
            }
        }
        return stored;
    }

    function storeThemeId(id) {
        try {
            localStorage.setItem(STORAGE_KEY, id);
        } catch (_) {
            /* ignore */
        }
    }

    function getThemeMeta(themeId) {
        return APP_THEMES[themeId] || APP_THEMES.default;
    }

    function getSyntaxColors(themeId) {
        const theme = getThemeMeta(themeId);
        return theme?.syntax || FALLBACK_SYNTAX;
    }

    function applyMetaColor(metaColor) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta && metaColor) meta.setAttribute("content", metaColor);
    }

    function notifyEditor(themeId) {
        const editor = window.novelPlayer?.scenarioEditor;
        if (editor?.setAppTheme) editor.setAppTheme(themeId);
    }

    function applyAppTheme(themeId) {
        if (isPreviewActive()) dismissPreview();

        const ids = registryIds.length ? registryIds : getRegistryIdsSync();
        let id = themeId;
        if (!ids.includes(id)) {
            id = ids.includes("default") ? "default" : ids[0] || "default";
        }

        const theme = APP_THEMES[id] || APP_THEMES.default;
        document.documentElement.setAttribute("data-app-theme", id);
        storeThemeId(id);
        applyMetaColor(theme?.metaColor);
        notifyEditor(id);
        return id;
    }

    function initAppThemeSelect(selectEl) {
        if (!selectEl) return;

        const run = async () => {
            await ensureDiscovered();
            const row =
                selectEl.closest(".preview-unit-row") ||
                document.getElementById("appThemeRow");
            const ids = getOrderedThemeIds();
            const preview = getSessionPreview();
            const manifestIds = getRegistryIdsSync();

            if (manifestIds.length <= 1 && !preview) {
                if (row) row.hidden = true;
                applyAppTheme("default");
                return;
            }

            if (row) row.hidden = false;
            selectEl.innerHTML = "";

            if (preview && !ids.includes(preview.id)) {
                const opt = document.createElement("option");
                opt.value = preview.id;
                opt.textContent = `${preview.id}（プレビュー）`;
                selectEl.appendChild(opt);
            }

            for (const id of ids) {
                const opt = document.createElement("option");
                opt.value = id;
                opt.textContent = APP_THEMES[id]?.label || id;
                selectEl.appendChild(opt);
            }

            if (preview) {
                selectEl.value = preview.id;
            } else {
                selectEl.value = getThemeId();
                applyAppTheme(selectEl.value);
            }

            if (!selectEl.dataset.themeBound) {
                selectEl.dataset.themeBound = "1";
                selectEl.addEventListener("change", () => {
                    applyAppTheme(selectEl.value);
                });
            }
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => void run());
        } else {
            void run();
        }
    }

    function applyStoredThemeEarly() {
        const preview = getSessionPreview();
        if (preview) {
            injectPreviewThemeCss(preview.css);
            document.documentElement.setAttribute("data-app-theme", preview.id);
            return;
        }

        const ids = getRegistryIdsSync();
        let id = "default";
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && ids.includes(stored)) id = stored;
        } catch (_) {
            /* ignore */
        }
        document.documentElement.setAttribute("data-app-theme", id);
    }

    function startBoot() {
        void boot();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startBoot, { once: true });
    } else {
        startBoot();
    }

    window.AppThemes = {
        STORAGE_KEY,
        PREVIEW_CSS_KEY,
        PREVIEW_ID_KEY,
        get APP_THEMES() {
            return APP_THEMES;
        },
        ensureDiscovered,
        getThemeId,
        getThemeMeta,
        getSyntaxColors,
        applyAppTheme,
        initAppThemeSelect,
        applyStoredThemeEarly,
        getOrderedThemeIds,
        isPreviewActive,
        dismissPreview,
        readPresetPalette,
        isThemeEditorPage,
        rediscoverThemes() {
            discovered = false;
            bootPromise = null;
            return ensureDiscovered();
        },
    };
})();
