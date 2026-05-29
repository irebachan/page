// スクリプトパーサー - シナリオテキストを解析する
class ScriptParser {
    parse(rawScript) {
        const lines = rawScript.trim().split("\n");
        let script = [];
        let labels = {};
        let labelSourceLines = {};
        let i = 0;
        let currentName = ""; // 現在の名前を保持

        while (i < lines.length) {
            let line = lines[i].trim();

            // 空行は blank として保持（変換後の見やすさのため）
            if (line === "") {
                script.push({ type: "blank", sourceLine: i });
                i++;
                continue;
            }

            // コメント行（//）はプレビューに表示せず、エクスポート時はそのまま出力
            if (line.startsWith("//")) {
                script.push({ type: "comment", text: line, sourceLine: i });
                i++;
                continue;
            }

            if (line.startsWith("@")) {
                const sourceLine = i;
                // @から始まる行を解析
                if (line.startsWith("@goto")) {
                    // @goto ラベル名 構文を解析
                    const labelName = line.split(" ")[1];
                    script.push({ type: "goto", target: labelName, sourceLine });
                } else if (line === "@end") {
                    script.push({ type: "end", sourceLine });
                } else {
                    // @ラベル名 形式のラベル定義
                    const labelName = line.substring(1); // @を除いた部分をラベル名とする
                    labels[labelName] = script.length;
                    labelSourceLines[labelName] = sourceLine;
                }
                i++;
            } else if (line.startsWith("-")) {
                const choiceStart = i;
                // 選択肢の処理
                let choices = [];
                let description = ""; // 選択肢の説明文

                // 前の行が説明文として扱われる
                if (i > 0 && !lines[i - 1].trim().startsWith("@") && !lines[i - 1].trim().startsWith("#")) {
                    description = lines[i - 1].trim();
                }

                // 選択肢を収集
                while (i < lines.length && lines[i].trim().startsWith("-")) {
                    let [text, target] = lines[i].trim().slice(1).split("=>").map(s => s.trim());
                    choices.push({ text, target });
                    i++;
                }

                // 選択肢がある場合は追加
                if (choices.length > 0) {
                    script.push({ type: "choice", description, choices, sourceLine: choiceStart });
                }
            } else if (line.startsWith("#")) {
                const sourceLine = i;
                // 名前を更新
                currentName = line.slice(1);

                // 複数行テキストのサポート
                let textLines = [];
                i++;

                // 次の空行または#または@までの全テキストを収集
                while (i < lines.length) {
                    line = lines[i].trim();
                    if (line === "" || line.startsWith("#") || line.startsWith("@") || line.startsWith("//")) {
                        break;
                    }
                    textLines.push(line);
                    i++;
                }

                const text = textLines.join("\n");
                script.push({ type: "line", name: currentName, text, sourceLine });
            } else {
                const sourceLine = i;
                // 通常のテキスト行（#で始まらない）
                let textLines = [];

                // 現在の行を追加
                textLines.push(line);
                i++;

                // 次の空行または#または@までの全テキストを収集
                while (i < lines.length) {
                    line = lines[i].trim();
                    if (line === "" || line.startsWith("#") || line.startsWith("@") || line.startsWith("//")) {
                        break;
                    }
                    textLines.push(line);
                    i++;
                }

                const text = textLines.join("\n");
                // 前の名前を使用（なければ空の名前）
                script.push({ type: "line", name: currentName, text, sourceLine });
            }
        }
        return { script, labels, labelSourceLines };
    }
}
