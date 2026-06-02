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
        this.replaceList = document.getElementById("replaceList");
        this.addReplaceButton = document.getElementById("addReplace");
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
        this.addReplaceButton.addEventListener("click", () => this.addReplaceItem());
        if (this.exportFormat) {
            this.exportFormat.addEventListener("change", () => this.updateFormatVisibility());
        }

        this.initReplaceList();
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

    applyStringReplace(outputText) {
        const replaceItems = this.replaceList.querySelectorAll(".replace-item");
        replaceItems.forEach(item => {
            const from = item.querySelector(".replace-from").value.trim();
            const to = item.querySelector(".replace-to").value;
            if (!from || to === "") return;
            outputText = outputText.replace(new RegExp(from, "g"), to);
        });
        return outputText;
    }

    showModal() {
        const modal = document.getElementById("exportSettingsModal");
        modal.style.display = "block";
    }

    initReplaceList() {
        this.addReplaceButton.addEventListener("click", () => {
            const newItem = document.createElement("div");
            newItem.className = "replace-item";
            newItem.innerHTML = `
                <input type="text" class="replace-from" placeholder="置換前">
                <input type="text" class="replace-to" placeholder="置換後">
                <button class="remove-replace">×</button>
            `;
            this.replaceList.appendChild(newItem);
        });
        this.replaceList.addEventListener("click", (e) => {
            if (e.target.classList.contains("remove-replace")) {
                const item = e.target.closest(".replace-item");
                if (this.replaceList.children.length > 1) {
                    item.remove();
                }
            }
        });
    }

    addReplaceItem() {
        const newItem = document.createElement("div");
        newItem.className = "replace-item";
        newItem.innerHTML = `
            <input type="text" class="replace-from" placeholder="置換前">
            <input type="text" class="replace-to" placeholder="置換後">
            <button class="remove-replace">×</button>
        `;
        this.replaceList.appendChild(newItem);
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
            const pageBreak = this.pageBreakSymbol.value.trim();
            const lineBreak = this.lineBreakSymbol.value.trim();
            const clickWait = this.clickWaitSymbol.value.trim();
            text = typeof processScriptForExport === "function" ? processScriptForExport(this, rawScript, pageBreak, lineBreak, clickWait) : rawScript;
        }
        return this.applyStringReplace(text || rawScript);
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
