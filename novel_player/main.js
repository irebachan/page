// アプリケーション開始
document.addEventListener("DOMContentLoaded", () => {
    const novelPlayer = new NovelPlayer();
    const exportSettings = new ExportSettings();

    const helpModal = document.getElementById("helpModal");
    const helpBtn = document.getElementById("helpButton");
    const closeBtn = document.querySelector(".close");

    const exportSettingsModal = document.getElementById("exportSettingsModal");
    const exportSettingsBtn = document.getElementById("exportSettingsButton");
    const exportCloseBtn = document.querySelector(".export-close");

    const aboutModal = document.getElementById("aboutModal");
    const aboutBtn = document.getElementById("aboutButton");
    const aboutCloseBtn = document.querySelector(".about-close");

    const novelMenuPanel = document.getElementById("novelMenuPanel");
    const novelMenuButton = document.getElementById("novelMenuButton");
    const scenarioMenuPanel = document.getElementById("scenarioMenuPanel");
    const scenarioMenuButton = document.getElementById("scenarioMenuButton");

    function setMenuOpen(panel, button, open) {
        if (!panel || !button) return;
        panel.classList.toggle("is-open", open);
        panel.setAttribute("aria-hidden", open ? "false" : "true");
        button.setAttribute("aria-expanded", open ? "true" : "false");
        syncBodyMenuClass();
    }

    function syncBodyMenuClass() {
        const any =
            (novelMenuPanel && novelMenuPanel.classList.contains("is-open")) ||
            (scenarioMenuPanel && scenarioMenuPanel.classList.contains("is-open"));
        document.body.classList.toggle("menu-drawer-open", any);
    }

    function closeNovelMenu() {
        setMenuOpen(novelMenuPanel, novelMenuButton, false);
    }

    function closeScenarioMenu() {
        setMenuOpen(scenarioMenuPanel, scenarioMenuButton, false);
    }

    function closeAllMenus() {
        closeNovelMenu();
        closeScenarioMenu();
    }

    function toggleNovelMenu() {
        const open = !(novelMenuPanel && novelMenuPanel.classList.contains("is-open"));
        if (open) closeScenarioMenu();
        setMenuOpen(novelMenuPanel, novelMenuButton, open);
    }

    function toggleScenarioMenu() {
        const open = !(scenarioMenuPanel && scenarioMenuPanel.classList.contains("is-open"));
        if (open) closeNovelMenu();
        setMenuOpen(scenarioMenuPanel, scenarioMenuButton, open);
    }

    if (novelMenuButton && novelMenuPanel) {
        novelMenuButton.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleNovelMenu();
        });
    }

    if (scenarioMenuButton && scenarioMenuPanel) {
        scenarioMenuButton.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleScenarioMenu();
        });
    }

    document.querySelectorAll("[data-menu-close]").forEach((el) => {
        el.addEventListener("click", (e) => {
            const which = el.getAttribute("data-menu-close");
            if (which === "novel") closeNovelMenu();
            if (which === "scenario") closeScenarioMenu();
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAllMenus();
    });

    if (helpBtn && helpModal) {
        helpBtn.addEventListener("click", () => {
            closeScenarioMenu();
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
    const copyBtn = document.getElementById("copyButton");
    [saveBtn, loadBtn, clearBtn, copyBtn].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener("click", () => closeScenarioMenu());
    });

    const restartBtn = document.getElementById("restart");
    const jumpBtn = document.getElementById("jumpButton");
    [restartBtn, jumpBtn].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener("click", () => closeNovelMenu());
    });

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
    });
});
