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
        this.labelSymbol = document.getElementById("labelSymbol");
        this.jumpTag = document.getElementById("jumpTag");
        this.replaceList = document.getElementById("replaceList");
        this.addReplaceButton = document.getElementById("addReplace");
        this.scriptTextBox = document.getElementById("scriptText");

        // イベントリスナーの設定
        this.exportSettingsButton.addEventListener("click", () => this.showModal());
        this.exportButton.addEventListener("click", () => this.exportScript());
        this.copyFormattedButton.addEventListener("click", () => this.copyFormattedText());
        this.addReplaceButton.addEventListener("click", () => this.addReplaceItem());

        // 置換リストの初期化
        this.initReplaceList();
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
        
        // ラベル記号の置換（改ページなどの処理の後に実行）
        const labelSymbol = this.labelSymbol.value || "@";
        console.log("ラベル記号:", labelSymbol);
        if (labelSymbol !== "@") {
            // @で始まる行を新しい記号に置換（@gotoは除外）
            outputText = outputText.replace(/^@(?!goto\s)/gm, labelSymbol);
            console.log("ラベル記号置換後:", outputText);
        }

        // ジャンプタグの置換（ラベル記号の置換の後に実行）
        const jumpTag = this.jumpTag.value || "[jump target=@]";
        console.log("ジャンプタグ:", jumpTag);
        if (jumpTag.includes("@")) {
            // @goto ラベル名 をジャンプタグに置換
            outputText = outputText.replace(/@goto\s+(\w+)/g, (match, labelName) => {
                const replaced = jumpTag.replace("@", labelSymbol + labelName);
                console.log("置換:", match, "→", replaced);
                return replaced;
            });
            console.log("ジャンプタグ置換後:", outputText);
        }

        // 文字列置換の実行
        const replaceItems = this.replaceList.querySelectorAll(".replace-item");
        replaceItems.forEach(item => {
            const from = item.querySelector(".replace-from").value;
            const to = item.querySelector(".replace-to").value;
            if (from && to) {
                outputText = outputText.replace(new RegExp(from, "g"), to);
                console.log("文字列置換:", from, "→", to);
            }
        });
        
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

    // 句読点で分割する関数
    splitByPunctuation(text) {
        const result = [];
        const punctuationMarks = ["。", "！", "!", "？", "?", ".", ","];
        
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
    
    // 特殊形式でスクリプトをエクスポート
    exportScript() {
        const rawScript = this.scriptTextBox.value;
        
        // 特殊記号を取得
        const pageBreak = this.pageBreakSymbol.value || "[p]";
        const lineBreak = this.lineBreakSymbol.value || "[r]";
        const clickWait = this.clickWaitSymbol.value || "[l]";
        
        console.log("特殊テキスト出力開始");
        console.log("使用する記号:", { pageBreak, lineBreak, clickWait });
        
        // シナリオテキストを解析して特殊記号を追加
        let exportText = this.processScriptForExport(rawScript, pageBreak, lineBreak, clickWait);
        
        // 出力テキストの確認
        const sampleLines = exportText.split('\n').slice(0, 10);
        console.log("出力テキストサンプル (最初の10行):");
        sampleLines.forEach((line, i) => console.log(`行${i+1}: ${line}`));
        
        // ファイルとして保存
        const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
        this.saveFile(blob, 'scenario_formatted');
        
        // エクスポート設定モーダルを閉じる
        const exportSettingsModal = document.getElementById("exportSettingsModal");
        exportSettingsModal.style.display = "none";
        
        // テキストエリアにフォーカスを戻す
        setTimeout(() => this.scriptTextBox.focus(), 200);
    }
    
    // 特殊テキストをクリップボードにコピー
    copyFormattedText() {
        const rawScript = this.scriptTextBox.value;
        
        // 特殊記号を取得
        const pageBreak = this.pageBreakSymbol.value || "[p]";
        const lineBreak = this.lineBreakSymbol.value || "[r]";
        const clickWait = this.clickWaitSymbol.value || "[l]";
        
        console.log("特殊テキストコピー開始");
        console.log("使用する記号:", { pageBreak, lineBreak, clickWait });
        
        // シナリオテキストを解析して特殊記号を追加
        let formattedText = this.processScriptForExport(rawScript, pageBreak, lineBreak, clickWait);
        
        // 出力テキストの確認
        const sampleLines = formattedText.split('\n').slice(0, 10);
        console.log("コピーするテキストサンプル (最初の10行):");
        sampleLines.forEach((line, i) => console.log(`行${i+1}: ${line}`));
        
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
    saveFile(blob, filenamePrefix) {
        const url = URL.createObjectURL(blob);
        
        // ダウンロードリンクを作成して自動クリック
        const a = document.createElement('a');
        a.href = url;
        
        // 現在の日時を含むファイル名を生成
        const now = new Date();
        const dateStr = now.getFullYear() +
            ('0' + (now.getMonth() + 1)).slice(-2) +
            ('0' + now.getDate()).slice(-2) +
            ('0' + now.getHours()).slice(-2) +
            ('0' + now.getMinutes()).slice(-2);
            
        a.download = `${filenamePrefix}_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();
        
        // クリーンアップ
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
} 