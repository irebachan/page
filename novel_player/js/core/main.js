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

    const nodeGraphButton = document.getElementById("nodeGraphButton");
    const nodeGraphCloseBtn = document.querySelector(".node-graph-panel__close");

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

    function closeModal(modal) {
        if (modal) modal.style.display = "none";
    }

    function bindModalBackdropClose(modal, onClose) {
        if (!modal) return;
        modal.addEventListener("click", (e) => {
            if (e.target === modal) onClose();
        });
    }

    function isModalOpen(modal) {
        return modal && modal.style.display === "block";
    }

    bindModalBackdropClose(helpModal, () => closeModal(helpModal));
    bindModalBackdropClose(aboutModal, () => closeModal(aboutModal));
    bindModalBackdropClose(exportSettingsModal, () => closeModal(exportSettingsModal));

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (novelPlayer.isNodeGraphOpen()) {
                if (novelPlayer.labelGraphView?.closeOverlays()) return;
                novelPlayer.closeNodeGraph();
                return;
            }
            const importChoiceModal = document.getElementById("importChoiceModal");
            if (importChoiceModal && importChoiceModal.style.display === "block") {
                importChoiceModal.style.display = "none";
                if (window.novelPlayer) window.novelPlayer.pendingImport = null;
                return;
            }
            if (isModalOpen(exportSettingsModal)) {
                closeModal(exportSettingsModal);
                return;
            }
            if (isModalOpen(helpModal)) {
                closeModal(helpModal);
                return;
            }
            if (isModalOpen(aboutModal)) {
                closeModal(aboutModal);
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
    const reorderFlowBtn = document.getElementById("reorderFlowButton");
    const metaPreviewUnit = document.getElementById("metaPreviewUnit");
    const metaMaxCharsPerLine = document.getElementById("metaMaxCharsPerLine");
    const metaMaxLines = document.getElementById("metaMaxLines");
    const metaPreviewOverflow = document.getElementById("metaPreviewOverflow");
    const metaReloadButton = document.getElementById("metaReloadButton");
    const metaApplyButton = document.getElementById("metaApplyButton");
    const pasteLoadBtn = document.getElementById("pasteLoadButton");
    const copyBtn = document.getElementById("copyButton");
    [saveBtn, loadBtn, pasteLoadBtn, clearBtn, copyBtn, reorderFlowBtn].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener("click", () => closeScenarioMenu());
    });

    if (reorderFlowBtn) {
        reorderFlowBtn.addEventListener("click", () => {
            novelPlayer.promptReorderScriptByFlow();
        });
    }

    /** 空欄・未設定の項目は @meta に書かない（既にあれば消す） */
    function readMetaToForm() {
        if (!metaPreviewUnit || !metaMaxCharsPerLine || !metaMaxLines || !metaPreviewOverflow) return;
        const parsed = parseMetaBlock(novelPlayer.getScriptText()) || {};
        const unit = parsed["preview.unit"];
        const overflow = parsed["preview.overflow"];
        metaPreviewUnit.value = unit === "line" || unit === "block" ? unit : "";
        metaMaxCharsPerLine.value = parsed["preview.maxCharsPerLine"] || "";
        metaMaxLines.value = parsed["preview.maxLines"] || "";
        metaPreviewOverflow.value = overflow === "truncate" || overflow === "wrap" ? overflow : "";
    }

    function positiveIntOrNull(input) {
        const n = parseInt(input?.value || "", 10);
        return Number.isFinite(n) && n > 0 ? String(n) : null;
    }

    function buildMetaValuesFromForm() {
        return [
            ["preview.unit", metaPreviewUnit?.value || null],
            ["preview.maxCharsPerLine", positiveIntOrNull(metaMaxCharsPerLine)],
            ["preview.maxLines", positiveIntOrNull(metaMaxLines)],
            ["preview.overflow", metaPreviewOverflow?.value || null],
        ];
    }

    function applyMetaFromForm() {
        const current = novelPlayer.getScriptText();
        let next = current;
        for (const [key, value] of buildMetaValuesFromForm()) {
            next = setMetaValue(next, key, value);
        }
        if (next === current) {
            novelPlayer.focusEditor();
            return;
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
    [restartBtn, prevChoiceBtn].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener("click", () => closeNovelMenu());
    });
    document
        .querySelectorAll(".preview-sync-menu__btn[data-action]")
        .forEach((btn) => {
            btn.addEventListener("click", () => closeNovelMenu());
        });

    if (nodeGraphButton) {
        nodeGraphButton.addEventListener("click", (e) => {
            e.stopPropagation();
            closeAllMenus();
            novelPlayer.openNodeGraph();
        });
    }

    if (closeBtn && helpModal) {
        closeBtn.addEventListener("click", () => closeModal(helpModal));
    }

    if (exportCloseBtn && exportSettingsModal) {
        exportCloseBtn.addEventListener("click", () => closeModal(exportSettingsModal));
    }

    if (aboutCloseBtn && aboutModal) {
        aboutCloseBtn.addEventListener("click", () => closeModal(aboutModal));
    }

    if (nodeGraphCloseBtn) {
        nodeGraphCloseBtn.addEventListener("click", () => {
            novelPlayer.closeNodeGraph();
        });
    }

    const nodeGraphFilterToggle = document.getElementById("nodeGraphFilterToggle");
    const nodeGraphFilterRow = document.getElementById("nodeGraphFilterRow");
    const nodeGraphFilter = document.getElementById("nodeGraphFilter");
    if (nodeGraphFilterToggle && nodeGraphFilterRow) {
        nodeGraphFilterToggle.addEventListener("click", () => {
            const open = nodeGraphFilterRow.classList.toggle("is-open");
            nodeGraphFilterToggle.setAttribute("aria-expanded", open ? "true" : "false");
            if (open) nodeGraphFilter?.focus({ preventScroll: true });
        });
    }

    const nodeGraphHelpToggle = document.getElementById("nodeGraphHelpToggle");
    const nodeGraphHelpOverlay = document.getElementById("nodeGraphHelpOverlay");
    const nodeGraphHelpClose = document.getElementById("nodeGraphHelpClose");
    const setNodeGraphHelpOpen = (open) => {
        if (!nodeGraphHelpOverlay) return;
        nodeGraphHelpOverlay.hidden = !open;
        nodeGraphHelpToggle?.setAttribute("aria-expanded", open ? "true" : "false");
    };
    if (nodeGraphHelpToggle && nodeGraphHelpOverlay) {
        nodeGraphHelpToggle.addEventListener("click", () => {
            setNodeGraphHelpOpen(nodeGraphHelpOverlay.hidden);
        });
        nodeGraphHelpClose?.addEventListener("click", () => setNodeGraphHelpOpen(false));
        nodeGraphHelpOverlay.addEventListener("click", (e) => {
            if (e.target === nodeGraphHelpOverlay) setNodeGraphHelpOpen(false);
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (nodeGraphHelpOverlay && !nodeGraphHelpOverlay.hidden) {
            setNodeGraphHelpOpen(false);
            e.preventDefault();
        }
    });
});
