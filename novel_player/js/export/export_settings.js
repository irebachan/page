// 特殊出力設定の管理クラス（UI・エクスポート実行。レンダラは export_render_*.js / export_format_custom.js を参照）

class ExportSettings {
    constructor() {
        this.exportSettingsButton = document.getElementById("exportSettingsButton");
        this.exportButton = document.getElementById("exportButton");
        this.copyFormattedButton = document.getElementById("copyFormattedButton");
        this.pageBreakSymbol = document.getElementById("pageBreakSymbol");
        this.lineBreakSymbol = document.getElementById("lineBreakSymbol");
        this.clickWaitSymbol = document.getElementById("clickWaitSymbol");
        this.punctuationMarksInput = document.getElementById("punctuationMarks");
        this.labelSymbol = document.getElementById("labelSymbol");
        this.jumpTag = document.getElementById("jumpTag");
        this.callTag = document.getElementById("callTag");
        this.returnTag = document.getElementById("returnTag");
        this.exportFormat = document.getElementById("exportFormat");
        this.formatOptionsTyrano = document.getElementById("formatOptionsTyrano");
        this.formatOptionsRenpy = document.getElementById("formatOptionsRenpy");
        this.renpyDialogueStyle = document.getElementById("renpyDialogueStyle");
        this.choiceLineTemplate = document.getElementById("choiceLineTemplate");
        this.choiceBlockEnd = document.getElementById("choiceBlockEnd");
        this.labelBelowTag = document.getElementById("labelBelowTag");
        this.exportExtension = document.getElementById("exportExtension");
        this.useClickWait = document.getElementById("useClickWait");
        this.outputUnit = document.getElementById("outputUnit");

        this.exportSettingsButton.addEventListener("click", () => this.showModal());
        this.exportButton.addEventListener("click", () => this.exportScript());
        this.copyFormattedButton.addEventListener("click", () => this.copyFormattedText());
        if (this.exportFormat) {
            this.exportFormat.addEventListener("change", () => this.updateFormatVisibility());
        }

        this.updateFormatVisibility();
    }

    getDefaultExtension(format) {
        if (format === "tyrano") return "ks";
        if (format === "renpy") return "rpy";
        return "txt";
    }

    updateFormatVisibility() {
        const format = this.exportFormat ? this.exportFormat.value : "tyrano";
        if (this.formatOptionsTyrano) {
            this.formatOptionsTyrano.style.display = (format === "tyrano" || format === "custom") ? "" : "none";
        }
        if (this.formatOptionsRenpy) {
            this.formatOptionsRenpy.style.display = format === "renpy" ? "" : "none";
        }
        if (this.exportExtension) {
            this.exportExtension.value = this.getDefaultExtension(format);
        }
    }

    showModal() {
        const modal = document.getElementById("exportSettingsModal");
        modal.style.display = "block";
    }

    getScriptText() {
        if (window.novelPlayer && typeof window.novelPlayer.getScriptText === "function") {
            return window.novelPlayer.getScriptText();
        }
        if (window.ScenarioEditor && document.getElementById("scriptEditorHost")) {
            return "";
        }
        return "";
    }

    getExportText() {
        const rawScript = this.getScriptText();
        const format = this.exportFormat ? this.exportFormat.value : "tyrano";
        let text;
        if (format === "tyrano") {
            const parser = new ScriptParser();
            const { script, labels } = parser.parse(rawScript);
            text = typeof renderTyrano === "function" ? renderTyrano(this, script, labels) : "";
        } else if (format === "renpy") {
            const parser = new ScriptParser();
            const { script, labels } = parser.parse(rawScript);
            text = typeof renderRenpy === "function" ? renderRenpy(this, script, labels) : "";
        } else {
            const parser = new ScriptParser();
            const { script, labels } = parser.parse(rawScript);
            text =
                typeof renderTyrano === "function"
                    ? renderTyrano(this, script, labels)
                    : rawScript;
        }
        const metaRules =
            typeof parseExportReplaceFromScript === "function"
                ? parseExportReplaceFromScript(rawScript)
                : [];
        return applyStringReplacements(text || rawScript, metaRules);
    }

    exportScript() {
        const exportText = this.getExportText();
        let ext = (this.exportExtension && this.exportExtension.value.trim()) || "txt";
        ext = ext.replace(/^\.+/, "");
        if (!ext) ext = "txt";
        const prefix =
            window.novelPlayer && window.novelPlayer.activeProjectTitle
                ? window.novelPlayer.activeProjectTitle
                : "scenario_formatted";
        if (typeof exportTextFile === "function") {
            void exportTextFile(exportText, prefix, ext);
        } else if (typeof saveFileBlob === "function" && typeof createUtf8TextBlob === "function") {
            saveFileBlob(createUtf8TextBlob(exportText), prefix, ext);
        }
        const exportSettingsModal = document.getElementById("exportSettingsModal");
        exportSettingsModal.style.display = "none";
        setTimeout(() => window.novelPlayer?.focusEditor(), 200);
    }

    copyFormattedText() {
        const formattedText = this.getExportText();
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = formattedText;
        tempTextArea.style.position = 'fixed';
        tempTextArea.style.left = '-9999px';
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        try {
            document.execCommand('copy');
            if (typeof showTemporaryNotification === "function") showTemporaryNotification("コピーしました");
        } catch (err) {
            console.error('クリップボードへのコピーに失敗しました:', err);
        }
        document.body.removeChild(tempTextArea);
    }
}
