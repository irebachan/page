// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    const novelPlayer = new NovelPlayer();
    const exportSettings = new ExportSettings();

    // ヘルプモーダル制御
    const helpModal = document.getElementById("helpModal");
    const helpBtn = document.getElementById("helpButton");
    const closeBtn = document.querySelector(".close");

    // 出力設定モーダル制御
    const exportSettingsModal = document.getElementById("exportSettingsModal");
    const exportSettingsBtn = document.getElementById("exportSettingsButton");
    const exportCloseBtn = document.querySelector(".export-close");

    // このツールについてモーダル制御
    const aboutModal = document.getElementById("aboutModal");
    const aboutBtn = document.getElementById("aboutButton");
    const aboutCloseBtn = document.querySelector(".about-close");

    // ヘルプボタンクリックでモーダルを表示
    helpBtn.addEventListener("click", () => {
        helpModal.style.display = "block";
    });

    // 出力設定ボタンクリックでモーダルを表示
    exportSettingsBtn.addEventListener("click", () => {
        exportSettingsModal.style.display = "block";
    });

    // このツールについてボタンクリックでモーダルを表示
    aboutBtn.addEventListener("click", () => {
        aboutModal.style.display = "block";
    });

    // 閉じるボタンでモーダルを非表示（ヘルプモーダル）
    closeBtn.addEventListener("click", () => {
        helpModal.style.display = "none";
    });

    // 閉じるボタンでモーダルを非表示（出力設定モーダル）
    exportCloseBtn.addEventListener("click", () => {
        exportSettingsModal.style.display = "none";
    });

    // 閉じるボタンでモーダルを非表示（このツールについて）
    aboutCloseBtn.addEventListener("click", () => {
        aboutModal.style.display = "none";
    });

    // モーダル外クリックでも閉じる
    window.addEventListener("click", (event) => {
        if (event.target === helpModal) {
            helpModal.style.display = "none";
        }
        if (event.target === exportSettingsModal) {
            exportSettingsModal.style.display = "none";
        }
        if (event.target === aboutModal) {
            aboutModal.style.display = "none";
        }
    });
});
