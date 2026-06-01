// アプリケーション開始
document.addEventListener("DOMContentLoaded", () => {
    const novelPlayer = new NovelPlayer();
    window.novelPlayer = novelPlayer;
    const exportSettings = new ExportSettings();

    const helpModal = document.getElementById("helpModal");
    const helpBtn = document.getElementById("helpButton");
    const closeBtn = document.querySelector("#helpModal .close");

    const exportSettingsModal = document.getElementById("exportSettingsModal");
    const exportSettingsBtn = document.getElementById("exportSettingsButton");
    const exportCloseBtn = document.querySelector(".export-close");

    const aboutModal = document.getElementById("aboutModal");
    const aboutBtn = document.getElementById("aboutButton");
    const aboutCloseBtn = document.querySelector(".about-close");

    const labelFlowModal = document.getElementById("labelFlowModal");
    const labelFlowOpenBtn = document.getElementById("labelFlowOpenButton");
    const labelFlowCloseBtn = document.querySelector(".label-flow-close");

    const novelMenuPanel = document.getElementById("novelMenuPanel");
    const novelMenuButton = document.getElementById("novelMenuButton");
    const scenarioMenuPanel = document.getElementById("scenarioMenuPanel");
    const scenarioMenuButton = document.getElementById("scenarioMenuButton");
    const novelMenuButtons = [novelMenuButton].filter(Boolean);
    const scenarioMenuButtons = [scenarioMenuButton].filter(Boolean);

    function setMenuOpen(panel, buttons, open) {
        if (!panel || !buttons.length) return;
        panel.classList.toggle("is-open", open);
        panel.setAttribute("aria-hidden", open ? "false" : "true");
        buttons.forEach((button) => {
            button.setAttribute("aria-expanded", open ? "true" : "false");
        });
        syncBodyMenuClass();
        if (open && panel === novelMenuPanel) {
            novelPlayer.refreshLabelList();
        }
        if (open && panel === scenarioMenuPanel) {
            readMetaToForm();
        }
    }

    function syncBodyMenuClass() {
        const any =
            (novelMenuPanel && novelMenuPanel.classList.contains("is-open")) ||
            (scenarioMenuPanel && scenarioMenuPanel.classList.contains("is-open"));
        document.body.classList.toggle("menu-drawer-open", any);
    }

    function closeNovelMenu() {
        setMenuOpen(novelMenuPanel, novelMenuButtons, false);
    }

    function closeScenarioMenu() {
        setMenuOpen(scenarioMenuPanel, scenarioMenuButtons, false);
    }

    function closeAllMenus() {
        closeNovelMenu();
        closeScenarioMenu();
    }

    function toggleNovelMenu() {
        const open = !(novelMenuPanel && novelMenuPanel.classList.contains("is-open"));
        if (open) closeScenarioMenu();
        setMenuOpen(novelMenuPanel, novelMenuButtons, open);
    }

    function toggleScenarioMenu() {
        const open = !(scenarioMenuPanel && scenarioMenuPanel.classList.contains("is-open"));
        if (open) closeNovelMenu();
        setMenuOpen(scenarioMenuPanel, scenarioMenuButtons, open);
    }

    function bindMenuToggle(buttons, toggleFn) {
        buttons.forEach((button) => {
            button.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleFn();
            });
        });
    }

    bindMenuToggle(novelMenuButtons, toggleNovelMenu);
    bindMenuToggle(scenarioMenuButtons, toggleScenarioMenu);

    document.querySelectorAll("[data-menu-close]").forEach((el) => {
        el.addEventListener("click", (e) => {
            const which = el.getAttribute("data-menu-close");
            if (which === "novel") closeNovelMenu();
            if (which === "scenario") closeScenarioMenu();
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (labelFlowModal && labelFlowModal.style.display === "block") {
                labelFlowModal.style.display = "none";
                return;
            }
            const importChoiceModal = document.getElementById("importChoiceModal");
            if (importChoiceModal && importChoiceModal.style.display === "block") {
                importChoiceModal.style.display = "none";
                if (window.novelPlayer) window.novelPlayer.pendingImport = null;
                return;
            }
            closeAllMenus();
        }
    });

    function setHelpTab(tabId) {
        const tabs = helpModal?.querySelectorAll(".help-tab[role='tab']");
        const panels = helpModal?.querySelectorAll(".help-panel[role='tabpanel']");
        if (!tabs?.length || !panels?.length) return;
        tabs.forEach((tab) => {
            const active = tab.getAttribute("data-help-tab") === tabId;
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
            tab.tabIndex = active ? 0 : -1;
        });
        panels.forEach((panel) => {
            const active = panel.id === (tabId === "format" ? "helpPanelFormat" : "helpPanelOps");
            panel.classList.toggle("is-active", active);
            panel.hidden = !active;
        });
    }

    if (helpModal) {
        helpModal.querySelectorAll(".help-tab[role='tab']").forEach((tab) => {
            tab.addEventListener("click", () => {
                setHelpTab(tab.getAttribute("data-help-tab") || "format");
            });
        });
    }

    if (helpBtn && helpModal) {
        helpBtn.addEventListener("click", () => {
            closeScenarioMenu();
            setHelpTab("format");
            helpModal.style.display = "block";
        });
    }

    /* 出力設定の表示は ExportSettings が担当。メニューを閉じるだけ */
    if (exportSettingsBtn) {
        exportSettingsBtn.addEventListener("click", () => closeScenarioMenu());
    }

    if (aboutBtn && aboutModal) {
        aboutBtn.addEventListener("click", () => {
            closeScenarioMenu();
            aboutModal.style.display = "block";
        });
    }

    const saveBtn = document.getElementById("saveButton");
    const loadBtn = document.getElementById("loadButton");
    const clearBtn = document.getElementById("clearButton");
    const metaPreviewUnit = document.getElementById("metaPreviewUnit");
    const metaMaxCharsPerLine = document.getElementById("metaMaxCharsPerLine");
    const metaMaxLines = document.getElementById("metaMaxLines");
    const metaPreviewOverflow = document.getElementById("metaPreviewOverflow");
    const metaReloadButton = document.getElementById("metaReloadButton");
    const metaApplyButton = document.getElementById("metaApplyButton");
    const pasteLoadBtn = document.getElementById("pasteLoadButton");
    const copyBtn = document.getElementById("copyButton");
    [saveBtn, loadBtn, pasteLoadBtn, clearBtn, copyBtn].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener("click", () => closeScenarioMenu());
    });

    function getMetaDefaults() {
        return {
            unit: "block",
            maxCharsPerLine: "28",
            maxLines: "3",
            overflow: "wrap",
        };
    }

    function parseMetaBlock(scriptText) {
        const m = scriptText.match(/(^|\n)\s*@meta\s*\n([\s\S]*?)\n\s*@endmeta(?:\n|$)/);
        if (!m) return null;
        const body = m[2];
        const parsed = {};
        body.split("\n").forEach((rawLine) => {
            const line = rawLine.trim();
            if (!line || line.startsWith("//")) return;
            const eq = line.indexOf("=");
            if (eq <= 0) return;
            const key = line.slice(0, eq).trim();
            const value = line.slice(eq + 1).trim();
            if (key) parsed[key] = value;
        });
        return parsed;
    }

    function readMetaToForm() {
        if (!metaPreviewUnit || !metaMaxCharsPerLine || !metaMaxLines || !metaPreviewOverflow) return;
        const defaults = getMetaDefaults();
        const parsed = parseMetaBlock(novelPlayer.getScriptText()) || {};
        const unit = parsed["preview.unit"] || defaults.unit;
        const chars = parsed["preview.maxCharsPerLine"] || defaults.maxCharsPerLine;
        const lines = parsed["preview.maxLines"] || defaults.maxLines;
        const overflow = parsed["preview.overflow"] || defaults.overflow;
        metaPreviewUnit.value = (unit === "line") ? "line" : "block";
        metaMaxCharsPerLine.value = chars;
        metaMaxLines.value = lines;
        metaPreviewOverflow.value = overflow === "truncate" ? "truncate" : "wrap";
    }

    function buildMetaBlockFromForm() {
        const defaults = getMetaDefaults();
        const unit = metaPreviewUnit?.value === "line" ? "line" : defaults.unit;
        const maxChars = Math.max(1, parseInt(metaMaxCharsPerLine?.value || defaults.maxCharsPerLine, 10) || 28);
        const maxLines = Math.max(1, parseInt(metaMaxLines?.value || defaults.maxLines, 10) || 3);
        const overflow = metaPreviewOverflow?.value === "truncate" ? "truncate" : defaults.overflow;
        return [
            "@meta",
            `preview.unit=${unit}`,
            `preview.maxCharsPerLine=${maxChars}`,
            `preview.maxLines=${maxLines}`,
            `preview.overflow=${overflow}`,
            "@endmeta",
        ].join("\n");
    }

    function applyMetaFromForm() {
        const current = novelPlayer.getScriptText();
        const block = buildMetaBlockFromForm();
        const re = /(^|\n)\s*@meta\s*\n[\s\S]*?\n\s*@endmeta(?:\n|$)/;
        let next;
        if (re.test(current)) {
            next = current.replace(re, (matched, lead) => `${lead}${block}\n`);
        } else {
            next = `${block}\n\n${current}`;
        }
        novelPlayer.setScriptText(next);
        if (typeof novelPlayer.updateScript === "function") {
            novelPlayer.updateScript();
        }
        novelPlayer.focusEditor();
    }

    if (metaReloadButton) {
        metaReloadButton.addEventListener("click", () => {
            readMetaToForm();
        });
    }
    if (metaApplyButton) {
        metaApplyButton.addEventListener("click", () => {
            applyMetaFromForm();
        });
    }

    const restartBtn = document.getElementById("restart");
    const prevChoiceBtn = document.getElementById("prevChoice");
    const previewFromCursorBtn = document.getElementById("previewFromCursorButton");
    [restartBtn, prevChoiceBtn, previewFromCursorBtn, labelFlowOpenBtn].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener("click", () => closeNovelMenu());
    });

    if (labelFlowOpenBtn && labelFlowModal) {
        labelFlowOpenBtn.addEventListener("click", () => {
            novelPlayer.openLabelFlowModal();
        });
    }

    if (closeBtn && helpModal) {
        closeBtn.addEventListener("click", () => {
            helpModal.style.display = "none";
        });
    }

    if (exportCloseBtn && exportSettingsModal) {
        exportCloseBtn.addEventListener("click", () => {
            exportSettingsModal.style.display = "none";
        });
    }

    if (aboutCloseBtn && aboutModal) {
        aboutCloseBtn.addEventListener("click", () => {
            aboutModal.style.display = "none";
        });
    }

    if (labelFlowCloseBtn && labelFlowModal) {
        labelFlowCloseBtn.addEventListener("click", () => {
            labelFlowModal.style.display = "none";
        });
    }

    window.addEventListener("click", (event) => {
        if (helpModal && event.target === helpModal) {
            helpModal.style.display = "none";
        }
        if (exportSettingsModal && event.target === exportSettingsModal) {
            exportSettingsModal.style.display = "none";
        }
        if (aboutModal && event.target === aboutModal) {
            aboutModal.style.display = "none";
        }
        if (labelFlowModal && event.target === labelFlowModal) {
            labelFlowModal.style.display = "none";
        }
    });
});
