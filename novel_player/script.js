// スクリプトパーサー - シナリオテキストを解析する
class ScriptParser {
    parse(rawScript) {
        const lines = rawScript.trim().split("\n");
        let script = [];
        let labels = {};
        let i = 0;

        while (i < lines.length) {
            let line = lines[i].trim();
            if (line === "") { i++; continue; }

            if (line.startsWith("@")) {
                // @から始まる行を解析
                if (line.startsWith("@goto")) {
                    // @goto ラベル名 構文を解析
                    const labelName = line.split(" ")[1];
                    script.push({ type: "goto", target: labelName });
                } else if (line === "@end") {
                    script.push({ type: "end" });
                } else {
                    // @ラベル名 形式のラベル定義
                    const labelName = line.substring(1); // @を除いた部分をラベル名とする
                    labels[labelName] = script.length;
                }
                i++;
            } else if (line === "*choice") {
                i++;
                let choices = [];
                while (i < lines.length && lines[i].startsWith("-")) {
                    let [text, target] = lines[i].slice(1).split("=>").map(s => s.trim());
                    choices.push({ text, target });
                    i++;
                }
                script.push({ type: "choice", choices });
            } else if (line.startsWith("#")) {
                const name = line.slice(1);
                // 複数行テキストのサポート
                let textLines = [];
                i++;

                // 次の#または*choiceまでの全テキストを収集
                while (i < lines.length) {
                    line = lines[i].trim();
                    if (line === "" || line.startsWith("#") || line.startsWith("*") ||
                        line.startsWith("@")) {
                        break;
                    }
                    textLines.push(line);
                    i++;
                }

                const text = textLines.join("\n");
                script.push({ type: "line", name, text });
            } else {
                i++;
            }
        }
        return { script, labels };
    }
}

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

        // イベントリスナーの設定
        this.nextBtn.addEventListener("click", () => this.showLine());
        this.restartBtn.addEventListener("click", () => this.restart());
        this.scriptTextBox.addEventListener("input", () => this.updateScript());
        this.jumpButton.addEventListener("click", () => this.jumpToLabel());
        this.saveButton.addEventListener("click", () => this.saveScriptToFile());
        this.loadButton.addEventListener("click", () => this.fileInput.click());
        this.fileInput.addEventListener("change", (e) => this.loadScriptFromFile(e));
        // テキストクリックで次へ進む機能
        this.textContainer.addEventListener("click", () => {
            if (this.nextBtn.style.display !== "none") {
                this.showLine();
            }
        });

        // 初期スクリプト
        this.defaultScript = `
@start
#ユウ
おはよう。今日はいい天気だね。
散歩でもしようか。
どこに行きたい？

*choice
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

*choice
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

*choice
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

*choice
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
これは非常に長いテキストサンプルです。
スクロールが必要かどうかを確認するために、
いくつかの行を追加しています。
このテキストは、テキストエリアがスクロール可能であることを
示すためのものです。
長いテキストでもスクロールできることを確認しましょう。

*choice
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

    // シナリオをテキストファイルとして保存
    saveScriptToFile() {
        const scriptContent = this.scriptTextBox.value;
        const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
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

        a.download = `scenario_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();

        // クリーンアップ
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
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

            // ファイル選択をリセット（同じファイルを再選択できるように）
            this.fileInput.value = '';
        };
        reader.readAsText(file);
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    const novelPlayer = new NovelPlayer();

    // ヘルプモーダル制御
    const modal = document.getElementById("helpModal");
    const helpBtn = document.getElementById("helpButton");
    const closeBtn = document.querySelector(".close");

    // ヘルプボタンクリックでモーダルを表示
    helpBtn.addEventListener("click", () => {
        modal.style.display = "block";
    });

    // 閉じるボタンでモーダルを非表示
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // モーダル外クリックでも閉じる
    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
}); 