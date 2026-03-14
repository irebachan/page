// 特殊出力設定の管理クラス
class ExportSettings {
    constructor() {
        // DOM要素
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
        this.scriptTextBox = document.getElementById("scriptText");
        this.exportFormat = document.getElementById("exportFormat");
        this.formatOptionsTyrano = document.getElementById("formatOptionsTyrano");
        this.formatOptionsRenpy = document.getElementById("formatOptionsRenpy");
        this.renpyDialogueStyle = document.getElementById("renpyDialogueStyle");
        this.choiceLineTemplate = document.getElementById("choiceLineTemplate");
        this.choiceBlockEnd = document.getElementById("choiceBlockEnd");
        this.labelBelowTag = document.getElementById("labelBelowTag");
        this.exportExtension = document.getElementById("exportExtension");
        this.useClickWait = document.getElementById("useClickWait");

        // イベントリスナーの設定
        this.exportSettingsButton.addEventListener("click", () => this.showModal());
        this.exportButton.addEventListener("click", () => this.exportScript());
        this.copyFormattedButton.addEventListener("click", () => this.copyFormattedText());
        this.addReplaceButton.addEventListener("click", () => this.addReplaceItem());
        if (this.exportFormat) {
            this.exportFormat.addEventListener("change", () => this.updateFormatVisibility());
        }

        // 置換リストの初期化
        this.initReplaceList();
        this.updateFormatVisibility();
    }

    // フォーマットに応じた出力拡張子の初期値
    getDefaultExtension(format) {
        if (format === "tyrano") return "ks";
        if (format === "renpy") return "rpy";
        return "txt";
    }

    // フォーマット選択に応じて設定項目の表示を切り替え
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

    // 全フォーマット共通: 文字列置換を適用
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

    // モーダルを表示
    showModal() {
        const modal = document.getElementById("exportSettingsModal");
        modal.style.display = "block";
    }

    // 置換リストの制御
    initReplaceList() {
        // 置換追加ボタンのイベント
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

        // 置換削除ボタンのイベント（イベント委譲）
        this.replaceList.addEventListener("click", (e) => {
            if (e.target.classList.contains("remove-replace")) {
                const item = e.target.closest(".replace-item");
                if (this.replaceList.children.length > 1) { // 最低1つは残す
                    item.remove();
                }
            }
        });
    }

    // 置換項目を追加
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

    // スクリプトを特殊形式で出力
    processScriptForExport(rawScript, pageBreak, lineBreak, clickWait) {
        const lines = rawScript.split("\n");
        const outputLines = [];
        let currentBlock = [];
        let currentName = ""; // 現在の名前を保持
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 空行でブロックを区切る
            if (line === "") {
                // 前のブロックを処理
                if (currentBlock.length > 0) {
                    this.processBlock(currentBlock, outputLines, pageBreak, lineBreak, clickWait, currentName);
                    currentBlock = [];
                }
                // 空行も出力に追加
                outputLines.push("");
            }
            // コメント行はそのまま出力（コメントアウトされたまま）
            else if (line.startsWith("//")) {
                if (currentBlock.length > 0) {
                    this.processBlock(currentBlock, outputLines, pageBreak, lineBreak, clickWait, currentName);
                    currentBlock = [];
                }
                outputLines.push(line);
            }
            // #で始まる行は名前を設定
            else if (line.startsWith("#")) {
                // 前のブロックを処理
                if (currentBlock.length > 0) {
                    this.processBlock(currentBlock, outputLines, pageBreak, lineBreak, clickWait, currentName);
                    currentBlock = [];
                }
                currentName = line.slice(1); // #を除いた部分を名前として設定
                currentBlock.push(line);
            }
            // コマンド行はそのまま出力
            else if (line.startsWith("@") || line.startsWith("*") || line.startsWith("-")) {
                // 前のブロックを処理
                if (currentBlock.length > 0) {
                    this.processBlock(currentBlock, outputLines, pageBreak, lineBreak, clickWait, currentName);
                    currentBlock = [];
                }
                outputLines.push(line);
            }
            // 通常のテキスト行
            else {
                currentBlock.push(line);
            }
        }
        
        // 最後のブロックを処理
        if (currentBlock.length > 0) {
            this.processBlock(currentBlock, outputLines, pageBreak, lineBreak, clickWait, currentName);
        }
        
        // 出力テキストを生成
        let outputText = outputLines.join("\n");
        
        // ラベル記号の置換（空欄の場合は何もしない・初期値は使わない）
        const labelSymbol = this.labelSymbol.value.trim();
        if (labelSymbol && labelSymbol !== "@") {
            outputText = outputText.replace(/^@(?!goto\s)/gm, labelSymbol);
        }

        // ジャンプタグの置換（空欄の場合は何もしない・初期値は使わない）
        const jumpTag = this.jumpTag.value.trim();
        if (jumpTag) {
            const effectiveLabel = labelSymbol || "*";
            const repl = (name) => jumpTag.includes("@LABEL")
                ? jumpTag.replace(/@LABEL/g, effectiveLabel + name)
                : jumpTag.replace("@", effectiveLabel + name);
            if (jumpTag.includes("@LABEL") || jumpTag.includes("@")) {
                outputText = outputText.replace(/@goto\s+(\w+)/g, (match, labelName) => repl(labelName));
            }
        }

        return outputText;
    }

    // テキストブロックを処理
    processBlock(block, outputLines, pageBreak, lineBreak, clickWait, currentName) {
        // 空のブロックは処理しない
        if (block.length === 0) {
            return;
        }
        
        // コマンド行はそのまま出力
        if (block[0].startsWith("@") || block[0].startsWith("*") || block[0].startsWith("-")) {
            block.forEach(line => outputLines.push(line));
            return;
        }
        
        // 名前行がある場合のみ追加
        if (block[0].startsWith("#")) {
            outputLines.push(block[0]);
            block = block.slice(1); // 名前行を除く
        }
        
        // テキスト行を処理
        if (block.length === 0) {
            // テキストがない場合は改ページだけ追加
            outputLines.push(pageBreak);
            return;
        }
        
        // 空でない行を探して最後の有効な行を特定
        const lastValidLineIndex = [...block].reverse().findIndex(line => line.trim() !== "");
        const lastValidLine = lastValidLineIndex === -1 ? -1 : block.length - 1 - lastValidLineIndex;
        
        // 各行を処理
        block.forEach((line, index) => {
            // 空行はそのまま出力
            if (line.trim() === "") {
                outputLines.push(line);
                return;
            }
            
            const isLastValidLine = index === lastValidLine;
            let processedLine = "";
            
            // 句読点で分割して処理
            const segments = this.splitByPunctuation(line);
            segments.forEach((segment, segIndex) => {
                processedLine += segment.text;
                
                // 句読点がある場合の処理
                if (segment.punctuation) {
                    processedLine += segment.punctuation;
                    // 最後の有効行の最後の句読点以外にクリック待ちを追加
                    if (!isLastValidLine || segIndex < segments.length - 1) {
                        processedLine += clickWait;
                    }
                }
            });
            
            // 最後の有効行以外に改行記号を追加
            if (!isLastValidLine) {
                processedLine += lineBreak;
            } else {
                // 最後の有効行には改ページ記号を追加
                processedLine += pageBreak;
            }
            
            outputLines.push(processedLine);
        });
    }

    // 句読点で分割する関数（設定の「句読点」に含まれる文字で区切る）
    splitByPunctuation(text) {
        const result = [];
        const marksStr = (this.punctuationMarksInput && this.punctuationMarksInput.value) ? this.punctuationMarksInput.value : "。！!？?.,";
        const punctuationMarks = Array.from(marksStr);
        
        // テキストを句読点で分割
        let currentText = "";
        let currentIndex = 0;
        
        while (currentIndex < text.length) {
            const char = text[currentIndex];
            currentText += char;
            
            // 句読点が見つかった場合
            if (punctuationMarks.includes(char)) {
                // 句読点の前のテキストを追加
                result.push({
                    text: currentText.slice(0, -1), // 句読点を除いたテキスト
                    punctuation: char // 句読点
                });
                currentText = "";
            }
            
            currentIndex++;
        }
        
        // 残りのテキストがあれば追加
        if (currentText) {
            result.push({
                text: currentText,
                punctuation: null
            });
        }
        
        return result;
    }

    // 指定インデックスに紐づくラベル名の配列を返す
    getLabelsAtPosition(labels, index) {
        return Object.keys(labels).filter(name => labels[name] === index);
    }

    // 1本の line（name + text）を改ページ/改行/クリック待ち付きで整形した行の配列を返す
    formatLineBlock(name, text, pageBreak, lineBreak, clickWait) {
        const outputLines = [];
        const block = text ? text.split("\n") : [];
        if (block.length === 0) {
            if (pageBreak) outputLines.push(pageBreak);
            return outputLines;
        }
        const lastValidLineIndex = [...block].reverse().findIndex(line => line.trim() !== "");
        const lastValidLine = lastValidLineIndex === -1 ? -1 : block.length - 1 - lastValidLineIndex;
        block.forEach((line, index) => {
            if (line.trim() === "") {
                outputLines.push(line);
                return;
            }
            const isLastValidLine = index === lastValidLine;
            let processedLine = "";
            const segments = this.splitByPunctuation(line);
            segments.forEach((segment, segIndex) => {
                processedLine += segment.text;
                if (segment.punctuation) {
                    processedLine += segment.punctuation;
                    if (!isLastValidLine || segIndex < segments.length - 1) {
                        if (clickWait) processedLine += clickWait;
                    }
                }
            });
            if (!isLastValidLine) {
                if (lineBreak) processedLine += lineBreak;
            } else {
                if (pageBreak) processedLine += pageBreak;
            }
            outputLines.push(processedLine);
        });
        return outputLines;
    }

    // 構造ベースでティラノスクリプト形式にレンダラ
    renderTyrano(script, labels) {
        const pageBreak = this.pageBreakSymbol.value.trim();
        const lineBreak = this.lineBreakSymbol.value.trim();
        const clickWait = (this.useClickWait && this.useClickWait.checked) ? this.clickWaitSymbol.value.trim() : "";
        const labelSym = this.labelSymbol.value.trim() || "*";
        const jumpTag = this.jumpTag.value.trim();
        const outputLines = [];
        for (let i = 0; i < script.length; i++) {
            const labelsHere = this.getLabelsAtPosition(labels, i);
            labelsHere.forEach(name => outputLines.push(labelSym + name));
            const labelBelow = this.labelBelowTag && this.labelBelowTag.value.trim();
            if (labelsHere.length > 0 && labelBelow) outputLines.push(labelBelow);
            const item = script[i];
            if (item.type === "blank") {
                outputLines.push("");
            } else if (item.type === "line") {
                // 名前行: 空なら "#" のみ（名前を表示しないの意）。混同しないよう # 自体は残す
                if (item.name != null && item.name.trim() !== "") {
                    outputLines.push("#" + item.name);
                } else {
                    outputLines.push("#");
                }
                const formatted = this.formatLineBlock(item.name || "", item.text || "", pageBreak, lineBreak, clickWait);
                outputLines.push(...formatted);
            } else if (item.type === "choice") {
                const tpl = (this.choiceLineTemplate && this.choiceLineTemplate.value.trim()) || "[link target=@LABEL]@TEXT[endlink][r]";
                const blockEnd = (this.choiceBlockEnd && this.choiceBlockEnd.value.trim()) || "[s]";
                item.choices.forEach(({ text, target }, idx) => {
                    const n = idx + 1;
                    const nStr = String(n).replace(/[0-9]/g, c => String.fromCharCode(0xFF10 + (c.charCodeAt(0) - 0x30)));
                    const labelValue = labelSym + target;
                    const line = tpl.replace(/@LABEL/g, labelValue).replace(/@TEXT/g, text).replace(/@N/g, nStr);
                    outputLines.push(line);
                });
                if (blockEnd) outputLines.push(blockEnd);
            } else if (item.type === "goto") {
                if (jumpTag && (jumpTag.includes("@LABEL") || jumpTag.includes("@"))) {
                    const repl = jumpTag.includes("@LABEL")
                        ? jumpTag.replace(/@LABEL/g, labelSym + item.target)
                        : jumpTag.replace("@", labelSym + item.target);
                    outputLines.push(repl);
                } else {
                    outputLines.push("@goto " + item.target);
                }
            } else if (item.type === "end") {
                outputLines.push(labelSym + "end");
            } else if (item.type === "comment") {
                outputLines.push(item.text.replace(/^\/\//, ";"));
            }
        }
        return outputLines.join("\n");
    }

    // 構造ベースで Ren'Py 形式にレンダラ
    renderRenpy(script, labels) {
        const useNameQuote = this.renpyDialogueStyle && this.renpyDialogueStyle.value === "name_quote";
        const outputLines = [];
        for (let i = 0; i < script.length; i++) {
            const labelsHere = this.getLabelsAtPosition(labels, i);
            labelsHere.forEach(name => outputLines.push("label " + name + ":"));
            const item = script[i];
            if (item.type === "blank") {
                outputLines.push("");
            } else if (item.type === "line") {
                const name = item.name && item.name.trim() !== "" ? item.name : "";
                const lines = (item.text || "").split("\n");
                lines.forEach(oneLine => {
                    const text = oneLine.replace(/"/g, '\\"');
                    if (useNameQuote && name) {
                        outputLines.push('    ' + name + ' "' + text + '"');
                    } else {
                        outputLines.push('    "' + text + '"');
                    }
                });
            } else if (item.type === "choice") {
                outputLines.push("    menu:");
                item.choices.forEach(({ text, target }) => {
                    const escaped = (text || "").replace(/"/g, '\\"');
                    outputLines.push('        "' + escaped + '":');
                    outputLines.push("            jump " + target);
                });
            } else if (item.type === "goto") {
                outputLines.push("    jump " + item.target);
            } else if (item.type === "comment") {
                outputLines.push(item.text);
            }
        }
        return outputLines.join("\n");
    }

    // 現在のフォーマット設定でエクスポート用テキストを生成（最後に文字列置換を適用）
    getExportText() {
        const rawScript = this.scriptTextBox.value;
        const format = this.exportFormat ? this.exportFormat.value : "tyrano";
        let text;
        if (format === "tyrano") {
            const parser = new ScriptParser();
            const { script, labels } = parser.parse(rawScript);
            text = this.renderTyrano(script, labels);
        } else if (format === "renpy") {
            const parser = new ScriptParser();
            const { script, labels } = parser.parse(rawScript);
            text = this.renderRenpy(script, labels);
        } else {
            const pageBreak = this.pageBreakSymbol.value.trim();
            const lineBreak = this.lineBreakSymbol.value.trim();
            const clickWait = this.clickWaitSymbol.value.trim();
            text = this.processScriptForExport(rawScript, pageBreak, lineBreak, clickWait);
        }
        return this.applyStringReplace(text);
    }

    // 特殊形式でスクリプトをエクスポート
    exportScript() {
        const exportText = this.getExportText();
        const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
        let ext = (this.exportExtension && this.exportExtension.value.trim()) || "txt";
        ext = ext.replace(/^\.+/, "");
        if (!ext) ext = "txt";
        this.saveFile(blob, 'scenario_formatted', ext);
        const exportSettingsModal = document.getElementById("exportSettingsModal");
        exportSettingsModal.style.display = "none";
        setTimeout(() => this.scriptTextBox.focus(), 200);
    }

    // 特殊テキストをクリップボードにコピー
    copyFormattedText() {
        const formattedText = this.getExportText();

        // クリップボードにコピー（一時的なテキストエリアを使用）
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = formattedText;
        tempTextArea.style.position = 'fixed';  // 画面外に配置
        tempTextArea.style.left = '-9999px';
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        
        try {
            document.execCommand('copy');
            // 通知を表示する代わりに控えめなフィードバック
            this.showTemporaryNotification("コピーしました");
        } catch (err) {
            console.error('クリップボードへのコピーに失敗しました:', err);
        }
        
        // 一時的なテキストエリアを削除
        document.body.removeChild(tempTextArea);
    }
    
    // 一時的な通知を表示する（数秒後に自動的に消える）
    showTemporaryNotification(message) {
        // すでに通知があれば削除
        const existingNotification = document.getElementById('temp-notification');
        if (existingNotification) {
            document.body.removeChild(existingNotification);
        }
        
        // 新しい通知を作成
        const notification = document.createElement('div');
        notification.id = 'temp-notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notification.style.color = 'white';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '2000';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        
        // 通知を追加
        document.body.appendChild(notification);
        
        // 2秒後に通知を削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
    }
    
    // ファイルを保存するヘルパーメソッド
    saveFile(blob, filenamePrefix, extension) {
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        
        const now = new Date();
        const dateStr = now.getFullYear() +
            ('0' + (now.getMonth() + 1)).slice(-2) +
            ('0' + now.getDate()).slice(-2) +
            ('0' + now.getHours()).slice(-2) +
            ('0' + now.getMinutes()).slice(-2);
        
        const ext = extension || "txt";
        a.download = `${filenamePrefix}_${dateStr}.${ext}`;
        document.body.appendChild(a);
        a.click();
        
        // クリーンアップ
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
} 