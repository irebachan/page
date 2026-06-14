/**
 * テーマエディタ
 */
(function () {
    const FIELD_DEFS = [
        {
            id: "metaColor",
            var: "--theme-meta-color",
            label: "アドレスバー",
            color: true,
            group: "browser",
        },
        {
            id: "syntaxCharacter",
            var: "--syntax-character",
            label: "キャラ名",
            color: true,
            group: "syntax",
        },
        {
            id: "syntaxLabel",
            var: "--syntax-label",
            label: "ラベル",
            color: true,
            group: "syntax",
        },
        {
            id: "syntaxIf",
            var: "--syntax-if",
            label: "if",
            color: true,
            group: "syntax",
        },
        {
            id: "syntaxGoto",
            var: "--syntax-goto",
            label: "goto",
            color: true,
            group: "syntax",
        },
        {
            id: "syntaxCall",
            var: "--syntax-call",
            label: "call",
            color: true,
            group: "syntax",
        },
        {
            id: "syntaxChoice",
            var: "--syntax-choice",
            label: "選択肢",
            color: true,
            group: "syntax",
        },
        {
            id: "syntaxEnd",
            var: "--syntax-end",
            label: "end",
            color: true,
            group: "syntax",
        },
        {
            id: "tBg",
            var: "--t-bg",
            label: "背景",
            color: true,
            group: "palette",
        },
        {
            id: "tFg",
            var: "--t-fg",
            label: "文字",
            color: true,
            group: "palette",
        },
        {
            id: "tSurface",
            var: "--t-surface",
            label: "メニューバー",
            color: true,
            group: "palette",
        },
        {
            id: "tGutter",
            var: "--t-gutter",
            label: "行番号欄",
            color: true,
            group: "palette",
        },
        {
            id: "tPanel",
            var: "--t-panel",
            label: "パネル",
            color: true,
            group: "palette",
        },
        {
            id: "tField",
            var: "--t-field",
            label: "入力欄",
            color: true,
            group: "palette",
        },
        {
            id: "tControl",
            var: "--t-control",
            label: "ボタン",
            color: true,
            group: "palette",
        },
        {
            id: "tControlHover",
            var: "--t-control-hover",
            label: "hover",
            color: true,
            group: "palette",
        },
        {
            id: "tBorder",
            var: "--t-border",
            label: "枠線",
            color: true,
            group: "palette",
        },
        {
            id: "tMuted",
            var: "--t-muted",
            label: "薄文字",
            color: true,
            group: "palette",
        },
        {
            id: "tAccent",
            var: "--t-accent",
            label: "強調",
            color: true,
            group: "palette",
        },
        {
            id: "tDanger",
            var: "--t-danger",
            label: "警告",
            color: true,
            group: "palette",
        },
        {
            id: "tOverlay",
            var: "--t-overlay",
            label: "モーダル背",
            color: false,
            group: "palette",
        },
    ];

    const GROUP_TITLES = {
        palette: "UI",
        syntax: "エディタ",
        browser: "ブラウザ",
    };

    const SYNTAX_PREVIEW_LINES = [
        { text: "#太郎", key: "syntaxCharacter" },
        { text: "@scene1", key: "syntaxLabel" },
        { text: "@if flag", key: "syntaxIf" },
        { text: "@goto next", key: "syntaxGoto" },
        { text: "@call sub", key: "syntaxCall" },
        { text: "* 選択肢", key: "syntaxChoice" },
        { text: "@end", key: "syntaxEnd" },
    ];

    const HISTORY_MAX = 80;
    const HISTORY_DEBOUNCE_MS = 400;

    const state = {
        themeId: "custom",
        themeLabel: "カスタム",
        values: {},
        templateId: "default",
    };

    const presetSelect = document.getElementById("presetSelect");
    const themeIdInput = document.getElementById("themeIdInput");
    const themeLabelInput = document.getElementById("themeLabelInput");
    const exportPreview = document.getElementById("exportPreview");
    const importHint = document.getElementById("importHint");
    const paletteFields = document.getElementById("paletteFields");
    const syntaxPreview = document.getElementById("syntaxPreview");
    const pvCallout = document.getElementById("tePvCallout");
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    const importCssInput = document.getElementById("importCssInput");
    const loadCssBtn = document.getElementById("loadCssBtn");

    let liveStyleEl = null;
    let activeFieldId = null;
    let history = [];
    let historyIndex = -1;
    let historyPaused = false;
    let historyTimer = null;

    function sanitizeId(raw) {
        return String(raw || "custom")
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .replace(/^-+|-+$/g, "") || "custom";
    }

    function snapshotState() {
        return {
            themeId: state.themeId,
            themeLabel: state.themeLabel,
            values: { ...state.values },
            templateId: state.templateId,
        };
    }

    function statesEqual(a, b) {
        if (!a || !b) return false;
        if (a.themeId !== b.themeId || a.themeLabel !== b.themeLabel) return false;
        for (const def of FIELD_DEFS) {
            if (a.values[def.id] !== b.values[def.id]) return false;
        }
        return true;
    }

    function updateUndoRedoButtons() {
        if (undoBtn) undoBtn.disabled = historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
    }

    function commitHistoryNow() {
        if (historyPaused) return;
        const snap = snapshotState();
        if (historyIndex >= 0 && statesEqual(history[historyIndex], snap)) return;
        history = history.slice(0, historyIndex + 1);
        history.push(snap);
        historyIndex = history.length - 1;
        if (history.length > HISTORY_MAX) {
            history.shift();
            historyIndex--;
        }
        updateUndoRedoButtons();
    }

    function scheduleHistoryCommit() {
        if (historyPaused) return;
        clearTimeout(historyTimer);
        historyTimer = setTimeout(commitHistoryNow, HISTORY_DEBOUNCE_MS);
    }

    function flushHistoryCommit() {
        clearTimeout(historyTimer);
        commitHistoryNow();
    }

    function applySnapshot(snap) {
        historyPaused = true;
        state.themeId = snap.themeId;
        state.themeLabel = snap.themeLabel;
        state.values = { ...snap.values };
        state.templateId = snap.templateId;
        themeIdInput.value = state.themeId;
        themeLabelInput.value = state.themeLabel;
        applyValuesToFormFields(state.values);
        applyLivePreview();
        updateExport();
        historyPaused = false;
        updateUndoRedoButtons();
    }

    function undo() {
        if (historyIndex <= 0) return;
        historyIndex--;
        applySnapshot(history[historyIndex]);
    }

    function redo() {
        if (historyIndex >= history.length - 1) return;
        historyIndex++;
        applySnapshot(history[historyIndex]);
    }

    function resetHistoryWithCurrent() {
        clearTimeout(historyTimer);
        history = [snapshotState()];
        historyIndex = 0;
        updateUndoRedoButtons();
    }

    function buildBlockCss(id, themeLabel, values) {
        const lines = [
            `    --theme-label: ${themeLabel || id};`,
            ...FIELD_DEFS.map(
                ({ var: v, id: fid }) => `    ${v}: ${values[fid] || ""};`
            ),
        ];
        return `[data-app-theme="${id}"] {\n${lines.join("\n")}\n}\n`;
    }

    function applyLivePreview() {
        const id = state.themeId;
        document.documentElement.setAttribute("data-app-theme", id);
        if (!liveStyleEl) {
            liveStyleEl = document.createElement("style");
            liveStyleEl.id = "te-live-preview-style";
            document.head.appendChild(liveStyleEl);
        }
        liveStyleEl.textContent = buildBlockCss(
            id,
            state.themeLabel,
            state.values
        );
        updateSyntaxPreview();
        updateMetaPreview();
        if (activeFieldId) highlightPreviewForField(activeFieldId);
    }

    function updateMetaPreview() {
        const hex = state.values.metaColor || "";
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta && hex) meta.setAttribute("content", hex);
    }

    function updateSyntaxPreview() {
        if (!syntaxPreview) return;
        syntaxPreview.innerHTML = "";
        for (const line of SYNTAX_PREVIEW_LINES) {
            const span = document.createElement("div");
            span.textContent = line.text;
            span.style.color = state.values[line.key] || "#ccc";
            span.dataset.teTarget = line.key;
            syntaxPreview.appendChild(span);
        }
    }

    function clearPreviewHighlight(hideCallout = true) {
        document
            .querySelectorAll(".te-pv-highlight")
            .forEach((el) => el.classList.remove("te-pv-highlight"));
        document
            .querySelectorAll(".te-palette-row.te-pv-active")
            .forEach((el) => el.classList.remove("te-pv-active"));
        if (hideCallout && pvCallout) {
            pvCallout.classList.remove("is-visible");
            pvCallout.setAttribute("aria-hidden", "true");
        }
    }

    function highlightPreviewForField(fieldId) {
        clearPreviewHighlight(false);
        activeFieldId = fieldId;
        const def = FIELD_DEFS.find((d) => d.id === fieldId);
        const row = document.querySelector(
            `.te-palette-row[data-te-field="${fieldId}"]`
        );
        if (row) row.classList.add("te-pv-active");
        document
            .querySelectorAll(`[data-te-target="${fieldId}"]`)
            .forEach((el) => el.classList.add("te-pv-highlight"));
        if (pvCallout && def) {
            pvCallout.textContent = `${def.label} · ${def.var}`;
            pvCallout.classList.add("is-visible");
            pvCallout.setAttribute("aria-hidden", "false");
        }
    }

    function bindPreviewHover() {
        for (const def of FIELD_DEFS) {
            const row = document.querySelector(
                `.te-palette-row[data-te-field="${def.id}"]`
            );
            if (!row) continue;
            row.addEventListener("mouseenter", () =>
                highlightPreviewForField(def.id)
            );
            row.addEventListener("mouseleave", () => {
                activeFieldId = null;
                clearPreviewHighlight();
            });
            row.addEventListener("focusin", () =>
                highlightPreviewForField(def.id)
            );
        }
    }

    function updateExport() {
        const css = buildBlockCss(
            state.themeId,
            state.themeLabel,
            state.values
        );
        exportPreview.textContent = css;
        importHint.textContent =
            "themes/presets/" +
            state.themeId +
            ".css に保存し themes/registry.js の themes に id を追加";
    }

    function openAppPreview() {
        const css = exportPreview.textContent;
        if (!css.trim()) return;

        const targetUrl = new URL("../index.html", location.href).href;
        const w = window.open("about:blank", "_blank");
        if (!w) {
            alert("ポップアップがブロックされました。");
            return;
        }

        try {
            w.sessionStorage.setItem(
                window.AppThemes?.PREVIEW_CSS_KEY || "novelPlayer.previewThemeCss",
                css
            );
            w.sessionStorage.setItem(
                window.AppThemes?.PREVIEW_ID_KEY || "novelPlayer.previewThemeId",
                state.themeId
            );
            w.location.replace(targetUrl);
        } catch (_) {
            w.close();
            alert("プレビューを開始できませんでした。");
        }
    }

    function applyValuesToFormFields(values) {
        for (const { id, color } of FIELD_DEFS) {
            const text = document.getElementById(`fld-${id}`);
            const colorEl = document.getElementById(`fld-${id}-color`);
            const v = values[id] || "";
            if (text) text.value = v;
            if (colorEl && color && v.startsWith("#")) {
                colorEl.value = v.length === 4 ? v : v.slice(0, 7);
            }
        }
    }

    function syncFromHeader() {
        state.themeId = sanitizeId(themeIdInput.value);
        state.themeLabel = themeLabelInput.value.trim() || state.themeId;
        themeIdInput.value = state.themeId;
        applyLivePreview();
        updateExport();
        scheduleHistoryCommit();
    }

    function loadValuesIntoForm(values, themeLabel, recordHistory = true) {
        state.values = { ...values };
        if (themeLabel) state.themeLabel = themeLabel;
        themeLabelInput.value = state.themeLabel;
        applyValuesToFormFields(values);
        applyLivePreview();
        updateExport();
        if (recordHistory) flushHistoryCommit();
    }

    function parseCssFromText(cssText) {
        const text = String(cssText || "").trim();
        if (!text) return null;

        const idMatch = /\[data-app-theme="([^"]+)"/i.exec(text);
        const blockMatch = /\[data-app-theme="[^"]+"\]\s*\{([\s\S]*?)\}/i.exec(
            text
        );
        const body = blockMatch ? blockMatch[1] : text;

        const values = {};
        for (const { id, var: v } of FIELD_DEFS) {
            const re = new RegExp(
                `${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+)`,
                "i"
            );
            const m = re.exec(body);
            if (m) values[id] = m[1].trim();
        }

        const labelM = /--theme-label\s*:\s*([^;]+)/i.exec(body);
        let themeLabel = labelM?.[1]?.trim() || "";
        themeLabel = themeLabel.replace(/^["']|["']$/g, "");

        const themeId = idMatch ? sanitizeId(idMatch[1]) : state.themeId;

        if (!Object.keys(values).length) return null;

        return { themeId, themeLabel, values };
    }

    function loadFromCssText(cssText) {
        const parsed = parseCssFromText(cssText);
        if (!parsed) {
            alert("CSS から色を読み取れませんでした。");
            return false;
        }
        state.themeId = parsed.themeId;
        themeIdInput.value = state.themeId;
        loadValuesIntoForm(
            parsed.values,
            parsed.themeLabel || state.themeLabel,
            true
        );
        return true;
    }

    function buildFields() {
        paletteFields.innerHTML = "";
        const groupOrder = ["palette", "syntax", "browser"];
        const byGroup = {};
        for (const def of FIELD_DEFS) {
            (byGroup[def.group] ||= []).push(def);
        }

        for (const group of groupOrder) {
            const defs = byGroup[group];
            if (!defs?.length) continue;

            const h = document.createElement("div");
            h.className = "te-field-group-title";
            h.textContent = GROUP_TITLES[group] || group;
            paletteFields.appendChild(h);

            for (const def of defs) {
                const row = document.createElement("div");
                row.className = "te-palette-row";
                row.dataset.teField = def.id;
                row.innerHTML = `
                    <label for="fld-${def.id}">${def.label}</label>
                    ${def.color ? `<input type="color" id="fld-${def.id}-color">` : ""}
                    <input type="text" id="fld-${def.id}" spellcheck="false">
                `;
                paletteFields.appendChild(row);

                const text = row.querySelector(`#fld-${def.id}`);
                const colorEl = row.querySelector(`#fld-${def.id}-color`);
                const onChange = (immediate) => {
                    state.values[def.id] = text.value.trim();
                    applyLivePreview();
                    updateExport();
                    if (immediate) flushHistoryCommit();
                    else scheduleHistoryCommit();
                };
                text.addEventListener("input", () => onChange(false));
                text.addEventListener("change", () => onChange(true));
                if (colorEl) {
                    colorEl.addEventListener("input", () => {
                        text.value = colorEl.value;
                        onChange(true);
                    });
                }
            }
        }

        bindPreviewHover();
    }

    function readPresetFromRegistry(id) {
        const palette = window.AppThemes?.readPresetPalette?.(id);
        if (palette?.vars) {
            const values = {};
            for (const { id: fid, var: v } of FIELD_DEFS) {
                values[fid] = palette.vars[v] || "";
            }
            return { values, themeLabel: palette.label || id };
        }
        return readValuesFromLoadedCss(id);
    }

    function readValuesFromLoadedCss(id) {
        document.documentElement.setAttribute("data-app-theme", id);
        const s = getComputedStyle(document.documentElement);
        const values = {};
        for (const { id: fid, var: v } of FIELD_DEFS) {
            values[fid] = s.getPropertyValue(v).trim();
        }
        const themeLabel =
            s.getPropertyValue("--theme-label").trim() ||
            window.AppThemes?.getThemeMeta?.(id)?.label ||
            id;
        return { values, themeLabel };
    }

    function isBuiltinThemeId(id) {
        const ids = window.AppThemes?.getOrderedThemeIds?.() || [];
        return ids.includes(id);
    }

    function loadTemplateFromPreset(id) {
        state.templateId = id;
        const parsed = readPresetFromRegistry(id);
        themeIdInput.value = state.themeId;
        themeLabelInput.value = state.themeLabel;
        loadValuesIntoForm(parsed.values, state.themeLabel, true);
    }

    async function populateSelect() {
        await window.AppThemes?.ensureDiscovered?.();
        const themes = window.AppThemes?.APP_THEMES || {};
        const ids = window.AppThemes?.getOrderedThemeIds?.() || Object.keys(themes);
        presetSelect.innerHTML = "";
        for (const id of ids) {
            const opt = document.createElement("option");
            opt.value = id;
            opt.textContent = themes[id]?.label || id;
            presetSelect.appendChild(opt);
        }
        presetSelect.value = state.templateId;
    }

    presetSelect.addEventListener("change", () =>
        loadTemplateFromPreset(presetSelect.value)
    );
    themeIdInput.addEventListener("input", syncFromHeader);
    themeLabelInput.addEventListener("input", syncFromHeader);

    if (undoBtn) undoBtn.addEventListener("click", undo);
    if (redoBtn) redoBtn.addEventListener("click", redo);

    if (loadCssBtn) {
        loadCssBtn.addEventListener("click", () => {
            if (importCssInput) loadFromCssText(importCssInput.value);
        });
    }

    const openAppPreviewBtn = document.getElementById("openAppPreviewBtn");
    if (openAppPreviewBtn) {
        openAppPreviewBtn.addEventListener("click", openAppPreview);
    }

    document.addEventListener("keydown", (e) => {
        if (!(e.metaKey || e.ctrlKey)) return;
        if (e.target === importCssInput) return;

        const key = e.key.toLowerCase();
        if (key === "z" && !e.shiftKey) {
            e.preventDefault();
            undo();
        } else if ((key === "z" && e.shiftKey) || key === "y") {
            e.preventDefault();
            redo();
        }
    });

    document.getElementById("copyExportBtn").addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(exportPreview.textContent);
        } catch (_) {
            /* ignore */
        }
    });

    document.getElementById("downloadCssBtn").addEventListener("click", () => {
        const id = state.themeId;
        if (isBuiltinThemeId(id)) {
            const ok = confirm(
                `「${id}」は組み込みテーマの ID です。\n` +
                    "上書き保存すると default などを壊す可能性があります。\n" +
                    "新しいテーマなら ID を変えてから保存してください。\n\n" +
                    "このまま保存しますか？"
            );
            if (!ok) return;
        }
        const blob = new Blob([exportPreview.textContent], { type: "text/css" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${state.themeId}.css`;
        a.click();
        URL.revokeObjectURL(a.href);
    });

    buildFields();
    document.addEventListener("DOMContentLoaded", async () => {
        themeIdInput.value = state.themeId;
        themeLabelInput.value = state.themeLabel;
        await populateSelect();
        presetSelect.value = state.templateId;
        historyPaused = true;
        loadTemplateFromPreset(state.templateId);
        historyPaused = false;
        resetHistoryWithCurrent();
    });
})();
