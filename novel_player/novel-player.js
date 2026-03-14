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

        // イベントリスナーの設定
        this.nextBtn.addEventListener("click", () => this.showLine());
        this.restartBtn.addEventListener("click", () => this.restart());
        this.scriptTextBox.addEventListener("input", () => this.updateScript());
        this.jumpButton.addEventListener("click", () => this.jumpToLabel());
        this.saveButton.addEventListener("click", () => this.saveScriptToFile());
        this.loadButton.addEventListener("click", () => this.fileInput.click());
        this.fileInput.addEventListener("change", (e) => this.loadScriptFromFile(e));
        this.clearButton.addEventListener("click", () => this.clearScriptText());
        this.copyButton.addEventListener("click", () => this.copyToClipboard());

        // テキストクリックで次へ進む機能
        this.textContainer.addEventListener("click", () => {
            if (this.nextBtn.style.display !== "none") {
                this.showLine();
            }
        });

        // 初期スクリプト
        this.defaultScript = `
@start

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
- もう一度やり直す => start
- 終了する => end

@end

`;

        // 初期化
        this.init();
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
        this.showLine();
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
            // 名前が空の場合は名前ボックスを表示しない
            if (line.name.trim() === "") {
                this.nameBox.style.display = "none";
                this.nameBox.textContent = "";
            } else {
                this.nameBox.style.display = "block";
                this.nameBox.textContent = line.name;
            }

            this.textBox.textContent = line.text;
            this.nextBtn.style.display = "block";
            this.choicesBox.innerHTML = ""; // 選択肢をクリア
            // テキスト表示後にコンテナを上部にスクロール
            this.scrollTextContainerToTop();
            this.index++;
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
                        this.index = this.labels[choice.target];
                        this.showLine(); // 選択肢選択後に次のテキストを表示
                    } else {
                        console.error(`ラベル "${choice.target}" が見つかりません`);
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
                this.index = this.labels[line.target];
                this.showLine();
            } else {
                console.error(`ラベル "${line.target}" が見つかりません`);
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
        this.showLine();
    }

    // ラベルジャンプ機能
    jumpToLabel() {
        const labelName = this.labelInput.value.trim();
        if (labelName && this.labels.hasOwnProperty(labelName)) {
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
        this.saveFile(blob, 'scenario');

        // テキストエリアにフォーカスを戻す
        setTimeout(() => this.scriptTextBox.focus(), 200);
    }

    // ファイルを保存するヘルパーメソッド
    saveFile(blob, filenamePrefix) {
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;

        const now = new Date();
        const dateStr = now.getFullYear() +
            ('0' + (now.getMonth() + 1)).slice(-2) +
            ('0' + now.getDate()).slice(-2) +
            ('0' + now.getHours()).slice(-2) +
            ('0' + now.getMinutes()).slice(-2);

        a.download = `${filenamePrefix}_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // 元のテキストをクリップボードにコピー
    copyOriginalText() {
        try {
            this.scriptTextBox.select();
            document.execCommand('copy');
            window.getSelection().removeAllRanges();

            this.showTemporaryNotification("コピーしました");

            setTimeout(() => this.scriptTextBox.focus(), 200);
        } catch (err) {
            console.error('クリップボードへのコピーに失敗しました:', err);
        }
    }

    // 一時的な通知を表示する（数秒後に自動的に消える）
    showTemporaryNotification(message) {
        const existingNotification = document.getElementById('temp-notification');
        if (existingNotification) {
            document.body.removeChild(existingNotification);
        }

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

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
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
