// ノベルプレイヤー - ゲームロジックと表示を管理
class NovelPlayer {
    constructor() {
        this.parser = new ScriptParser();
        this.script = [];
        this.labels = {};
        this.index = 0;

        // DOM要素
        this.nameBox = document.getElementById("name");
        this.textBox = document.getElementById("text");
        this.textContainer = document.querySelector(".text-container");
        this.nextBtn = document.getElementById("next");
        this.choicesBox = document.getElementById("choices");
        this.scriptTextBox = document.getElementById("scriptText");
        this.restartBtn = document.getElementById("restart");
        this.labelInput = document.getElementById("labelInput");
        this.jumpButton = document.getElementById("jumpButton");
        this.saveButton = document.getElementById("saveButton");
        this.loadButton = document.getElementById("loadButton");
        this.fileInput = document.getElementById("fileInput");
        this.clearButton = document.getElementById("clearButton");
        this.copyButton = document.getElementById("copyButton");
        this.previewUnit = document.getElementById("previewUnit");
        /** プレビューが「1行ずつ」のとき、現在の script[index] 内の何行目を表示済みか */
        this.lineUnitIndex = 0;

        // イベントリスナーの設定
        this.nextBtn.addEventListener("click", () => this.showLine());
        this.restartBtn.addEventListener("click", () => this.restart());
        this.updateScriptDebounced = this.debounce(() => this.updateScript(), 300);
        this.scriptTextBox.addEventListener("input", () => this.updateScriptDebounced());
        this.jumpButton.addEventListener("click", () => this.jumpToLabel());
        this.saveButton.addEventListener("click", () => this.saveScriptToFile());
        this.loadButton.addEventListener("click", () => this.fileInput.click());
        this.fileInput.addEventListener("change", (e) => this.loadScriptFromFile(e));
        this.clearButton.addEventListener("click", () => this.clearScriptText());
        this.copyButton.addEventListener("click", () => this.copyToClipboard());

        if (this.previewUnit) {
            this.previewUnit.addEventListener("change", () => {
                this.lineUnitIndex = 0;
                this.restart();
            });
        }

        // テキストクリックで次へ進む機能
        this.textContainer.addEventListener("click", () => {
            if (this.nextBtn.style.display !== "none") {
                this.showLine();
            }
        });

        // 初期スクリプト
        this.defaultScript = `
@morning

// この行はプレビューに表示されず、エクスポート後もコメントとして残ります

#ユウ
おはよう。今日はいい天気だね。
散歩でもしようか。
どこに行きたい？

@goto choice_start

@choice_start
- 公園に行く => park
- 図書館に行く => library
- カフェに行く => cafe

@park
#ユウ
公園は静かでいいなあ。
鳥の声が聞こえるね。

#
（周りを見渡すと、人はまばらで静かな公園でした）

#ミナ
ほら、鳩が集まってるよ。
パンをあげてみようか？

@choice_park
- パンをあげる => feed_birds
- やめておく => dont_feed

@feed_birds
#ユウ
鳩にパンをあげたよ。
たくさん集まってきたね。

@goto ending

@dont_feed
#ユウ
やめておこう。
自然の生態系を乱さないほうがいいよね。

@goto ending

@library
#ユウ
本って落ち着くよね。
静かな雰囲気が好きなんだ。

#ミナ
今日の新刊はなんだろう。
ミステリー小説を探してみようか？

@choice_library
- ミステリーを探す => mystery
- 科学の本を探す => science

@mystery
#ユウ
このミステリー小説、面白そうだね。
借りていこうか。

@goto ending

@science
#ユウ
最新の科学の本を見つけたよ。
知識が広がりそうだね。

@goto ending

@cafe
#ユウ
このカフェの雰囲気、好きだな。

#ミナ
コーヒーが美味しいよね。
ケーキも食べてみる？

@choice_cafe
- ケーキを注文する => cake
- コーヒーだけにする => coffee_only

@cake
#ユウ
このショートケーキ、すごく美味しいよ。
また来たいね。

@goto ending

@coffee_only
#ユウ
コーヒーだけで十分だよ。
香りが素晴らしいね。

@goto ending

@ending
#ナレーター
楽しい一日が過ごせました。

@choice_end
- もう一度やり直す => morning
- 終了する => end

@end

`;

        // 初期化
        this.init();
    }

    debounce(fn, ms) {
        let timer = null;
        return () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(fn, ms);
        };
    }

    init() {
        // 初期スクリプトをテキストエリアに表示
        this.scriptTextBox.value = this.defaultScript.trim();
        this.updateScript();

        // 次へボタンの初期状態設定（ゲーム開始時は表示）
        this.nextBtn.style.display = "block";
    }

    updateScript() {
        const rawScript = this.scriptTextBox.value;
        const parseResult = this.parser.parse(rawScript);
        this.script = parseResult.script;
        this.labels = parseResult.labels;
        this.index = 0;
        this.lineUnitIndex = 0;
        this.showLine();
    }

    isPreviewLineUnit() {
        return this.previewUnit && this.previewUnit.value === "line";
    }

    showLine() {
        const line = this.script[this.index];
        if (!line) {
            // 終了した場合
            this.nameBox.textContent = "";
            this.textBox.textContent = "（終わり）";
            this.nextBtn.style.display = "none";
            this.choicesBox.innerHTML = "";
            return;
        }

        if (line.type === "line") {
            const rawText = line.text != null ? line.text : "";
            const parts = rawText.split("\n");
            const useLineUnit = this.isPreviewLineUnit() && parts.length > 1;
            const displayText = useLineUnit ? parts[this.lineUnitIndex] : rawText;

            // 名前が空の場合は名前ボックスを表示しない
            if (line.name.trim() === "") {
                this.nameBox.style.display = "none";
                this.nameBox.textContent = "";
            } else {
                this.nameBox.style.display = "block";
                this.nameBox.textContent = line.name;
            }

            this.textBox.textContent = displayText;
            this.nextBtn.style.display = "block";
            this.choicesBox.innerHTML = ""; // 選択肢をクリア
            // テキスト表示後にコンテナを上部にスクロール
            this.scrollTextContainerToTop();

            if (useLineUnit) {
                if (this.lineUnitIndex < parts.length - 1) {
                    this.lineUnitIndex++;
                } else {
                    this.lineUnitIndex = 0;
                    this.index++;
                }
            } else {
                this.lineUnitIndex = 0;
                this.index++;
            }
        } else if (line.type === "choice") {
            this.nextBtn.style.display = "none";
            this.choicesBox.innerHTML = ""; // 選択肢をクリア

            // 選択肢をテキストエリアの上に表示
            line.choices.forEach(choice => {
                const btn = document.createElement("button");
                btn.textContent = choice.text;
                btn.onclick = () => {
                    // 選択肢クリック時の処理を修正
                    if (this.labels.hasOwnProperty(choice.target)) {
                        this.lineUnitIndex = 0;
                        this.index = this.labels[choice.target];
                        this.showLine(); // 選択肢選択後に次のテキストを表示
                    } else {
                        console.error(`ラベル "${choice.target}" が見つかりません`);
                        this.lineUnitIndex = 0;
                        this.index++; // 選択肢の次に進む
                        this.showLine();
                    }
                };
                this.choicesBox.appendChild(btn);
            });

            // 選択肢表示時にテキストエリアを上部にスクロール
            this.scrollTextContainerToTop();
        } else if (line.type === "goto") {
            // gotoタイプの場合は指定されたラベルに移動
            if (this.labels.hasOwnProperty(line.target)) {
                this.lineUnitIndex = 0;
                this.index = this.labels[line.target];
                this.showLine();
            } else {
                console.error(`ラベル "${line.target}" が見つかりません`);
                this.lineUnitIndex = 0;
                this.index++;
                this.showLine();
            }
        } else if (line.type === "end") {
            this.nameBox.textContent = "";
            this.textBox.textContent = "（終わり）";
            this.nextBtn.style.display = "none";
            this.choicesBox.innerHTML = ""; // 選択肢をクリア
            this.index++;
        } else if (line.type === "blank") {
            this.index++;
            this.showLine(); // 空行はスキップして次へ
        } else if (line.type === "comment") {
            this.index++;
            this.showLine(); // コメントはプレビューに表示しない
        }
    }

    // テキストコンテナを上部にスクロールする
    scrollTextContainerToTop() {
        // 少し遅延させてDOMの更新が完了した後にスクロール
        setTimeout(() => {
            this.textContainer.scrollTop = 0;
        }, 10);
    }

    restart() {
        this.index = 0;
        this.lineUnitIndex = 0;
        this.showLine();
    }

    // ラベルジャンプ機能
    jumpToLabel() {
        const labelName = this.labelInput.value.trim();
        if (labelName && this.labels.hasOwnProperty(labelName)) {
            this.lineUnitIndex = 0;
            this.index = this.labels[labelName];
            this.showLine();
            this.labelInput.value = ""; // 入力フィールドをクリア
        } else {
            alert(`ラベル "${labelName}" が見つかりません`);
        }
    }

    // テキストエリアの内容をクリップボードにコピー
    copyToClipboard() {
        this.copyOriginalText();
    }

    // シナリオをテキストファイルとして保存
    saveScriptToFile() {
        const scriptContent = this.scriptTextBox.value;
        const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
        if (typeof saveFileBlob === "function") saveFileBlob(blob, "scenario", "txt");
        setTimeout(() => this.scriptTextBox.focus(), 200);
    }

    // 元のテキストをクリップボードにコピー
    copyOriginalText() {
        try {
            this.scriptTextBox.select();
            document.execCommand('copy');
            window.getSelection().removeAllRanges();

            if (typeof showTemporaryNotification === "function") showTemporaryNotification("コピーしました");

            setTimeout(() => this.scriptTextBox.focus(), 200);
        } catch (err) {
            console.error('クリップボードへのコピーに失敗しました:', err);
        }
    }

    // ファイルからシナリオを読み込み
    loadScriptFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.scriptTextBox.value = content;
            this.updateScript();

            this.fileInput.value = '';

            setTimeout(() => this.scriptTextBox.focus(), 200);
        };
        reader.readAsText(file);
    }

    clearScriptText() {
        if (confirm('テキストエリアをクリアしますか？')) {
            this.scriptTextBox.value = '';
            this.updateScript();
            this.restart();

            setTimeout(() => this.scriptTextBox.focus(), 200);
        }
    }
}
