// スクリプトパーサー - シナリオテキストを解析する
class ScriptParser {
    /** 選択肢の => 右側（行き先ラベル）。旧記法の call 接頭辞は無視してラベル名だけ取る */
    parseChoiceTarget(raw) {
        let t = (raw || "").trim();
        if (t.startsWith("@call ")) t = t.slice(6).trim();
        else if (t.startsWith("call ")) t = t.slice(5).trim();
        return { target: t };
    }

    parseIfCondition(line, prefix) {
        return line.slice(prefix.length).trim();
    }

    /** @if / @elseif / @else if / @else / @endif（if と条件の間は半角・全角スペース可） */
    static matchIfDirective(line) {
        if (line === "@else") return { type: "else" };
        if (line === "@endif") return { type: "endif" };
        let m = line.match(/^@else if(\s+)(.*)$/);
        if (m) return { type: "elseif", condition: m[2].trim() };
        m = line.match(/^@elseif(\s+)(.*)$/);
        if (m) return { type: "elseif", condition: m[2].trim() };
        m = line.match(/^@if(\s+)(.*)$/);
        if (m) return { type: "if", condition: m[2].trim() };
        return null;
    }

    closeIfBranch(script, ifChain) {
        if (!ifChain || !ifChain.branches.length) return;
        const last = ifChain.branches[ifChain.branches.length - 1];
        if (last.from == null) {
            last.from = script.length;
            last.to = script.length;
        } else if (last.to == null) {
            last.to = script.length;
        }
    }

    pushIfChain(script, ifChain) {
        this.closeIfBranch(script, ifChain);
        const endifAt = script.length + 1;
        script.push({
            type: "if_chain",
            branches: ifChain.branches,
            endifAt,
            sourceLine: ifChain.sourceLine,
            endifSourceLine: ifChain.endifSourceLine,
        });
    }

    isIfDirective(line) {
        return ScriptParser.matchIfDirective(line) != null;
    }

    isReservedAtLine(line) {
        return (
            line.startsWith("@goto") ||
            line.startsWith("@call") ||
            line === "@return" ||
            line === "@end" ||
            line === "@meta" ||
            line === "@endmeta" ||
            this.isIfDirective(line)
        );
    }

    parse(rawScript) {
        const lines = rawScript.trim().split("\n");
        let script = [];
        let labels = {};
        let labelSourceLines = {};
        let i = 0;
        let currentName = "";
        let inMetaBlock = false;
        let ifChain = null;

        const ensureBranchFrom = () => {
            if (!ifChain || !ifChain.branches.length) return;
            const last = ifChain.branches[ifChain.branches.length - 1];
            if (last.from == null) last.from = script.length;
        };

        while (i < lines.length) {
            let line = lines[i].trim();

            if (inMetaBlock) {
                if (line === "@endmeta") {
                    inMetaBlock = false;
                }
                i++;
                continue;
            }
            if (line === "@meta") {
                inMetaBlock = true;
                i++;
                continue;
            }

            if (line === "") {
                ensureBranchFrom();
                script.push({ type: "blank", sourceLine: i });
                i++;
                continue;
            }

            if (line.startsWith("//")) {
                ensureBranchFrom();
                script.push({ type: "comment", text: line, sourceLine: i });
                i++;
                continue;
            }

            if (line.startsWith("@")) {
                const sourceLine = i;
                const ifDir = ScriptParser.matchIfDirective(line);

                if (ifDir?.type === "if") {
                    if (ifChain) {
                        this.pushIfChain(script, ifChain);
                    }
                    if (!ifDir.condition) {
                        script.push({
                            type: "parse_error",
                            message: "@if の条件が空です",
                            sourceLine: i,
                        });
                    } else {
                        ifChain = {
                            sourceLine: i,
                            branches: [
                                {
                                    condition: ifDir.condition,
                                    from: null,
                                    to: null,
                                    sourceLine: i,
                                },
                            ],
                        };
                    }
                    i++;
                    continue;
                }
                if (ifDir?.type === "elseif") {
                    if (!ifChain) {
                        script.push({
                            type: "parse_error",
                            message: "@elseif に対応する @if がありません",
                            sourceLine: i,
                        });
                        i++;
                        continue;
                    }
                    this.closeIfBranch(script, ifChain);
                    if (!ifDir.condition) {
                        script.push({
                            type: "parse_error",
                            message: "@elseif の条件が空です",
                            sourceLine: i,
                        });
                    } else {
                        ifChain.branches.push({
                            condition: ifDir.condition,
                            from: null,
                            to: null,
                            sourceLine: i,
                        });
                    }
                    i++;
                    continue;
                }
                if (ifDir?.type === "else") {
                    if (!ifChain) {
                        script.push({
                            type: "parse_error",
                            message: "@else に対応する @if がありません",
                            sourceLine: i,
                        });
                        i++;
                        continue;
                    }
                    this.closeIfBranch(script, ifChain);
                    ifChain.branches.push({
                        condition: null,
                        from: null,
                        to: null,
                        sourceLine: i,
                    });
                    i++;
                    continue;
                }
                if (ifDir?.type === "endif") {
                    if (!ifChain) {
                        script.push({
                            type: "parse_error",
                            message: "@endif に対応する @if がありません",
                            sourceLine: i,
                        });
                        i++;
                        continue;
                    }
                    ifChain.endifSourceLine = i;
                    this.pushIfChain(script, ifChain);
                    ifChain = null;
                    i++;
                    continue;
                }
                if (line.startsWith("@goto")) {
                    ensureBranchFrom();
                    const labelName = line.split(/\s+/)[1];
                    script.push({ type: "goto", target: labelName, sourceLine });
                    i++;
                    continue;
                }
                if (line.startsWith("@call")) {
                    ensureBranchFrom();
                    const labelName = line.split(/\s+/)[1];
                    script.push({ type: "call", target: labelName, sourceLine });
                    i++;
                    continue;
                }
                if (line === "@return") {
                    ensureBranchFrom();
                    script.push({ type: "return", sourceLine });
                    i++;
                    continue;
                }
                if (line === "@end") {
                    ensureBranchFrom();
                    script.push({ type: "end", sourceLine });
                    i++;
                    continue;
                }

                ensureBranchFrom();
                const labelName = line.substring(1);
                labels[labelName] = script.length;
                labelSourceLines[labelName] = sourceLine;
                i++;
                continue;
            }

            if (line.startsWith("-")) {
                ensureBranchFrom();
                const choiceStart = i;
                let choices = [];
                let description = "";

                if (
                    i > 0 &&
                    !lines[i - 1].trim().startsWith("@") &&
                    !lines[i - 1].trim().startsWith("#")
                ) {
                    description = lines[i - 1].trim();
                }

                while (i < lines.length && lines[i].trim().startsWith("-")) {
                    let [text, targetRaw] = lines[i]
                        .trim()
                        .slice(1)
                        .split("=>")
                        .map((s) => s.trim());
                    const { target } = this.parseChoiceTarget(targetRaw);
                    choices.push({ text, target });
                    i++;
                }

                if (choices.length > 0) {
                    script.push({
                        type: "choice",
                        description,
                        choices,
                        sourceLine: choiceStart,
                    });
                }
            } else if (line.startsWith("#")) {
                ensureBranchFrom();
                const sourceLine = i;
                currentName = line.slice(1);

                let textLines = [];
                i++;

                while (i < lines.length) {
                    line = lines[i].trim();
                    if (
                        line === "" ||
                        line.startsWith("#") ||
                        line.startsWith("@") ||
                        line.startsWith("//") ||
                        line.startsWith("-")
                    ) {
                        break;
                    }
                    textLines.push(line);
                    i++;
                }

                const text = textLines.join("\n");
                script.push({ type: "line", name: currentName, text, sourceLine });
            } else {
                ensureBranchFrom();
                const sourceLine = i;
                let textLines = [];

                textLines.push(line);
                i++;

                while (i < lines.length) {
                    line = lines[i].trim();
                    if (
                        line === "" ||
                        line.startsWith("#") ||
                        line.startsWith("@") ||
                        line.startsWith("//") ||
                        line.startsWith("-")
                    ) {
                        break;
                    }
                    textLines.push(line);
                    i++;
                }

                const text = textLines.join("\n");
                script.push({ type: "line", name: currentName, text, sourceLine });
            }
        }

        if (ifChain) {
            script.push({
                type: "parse_error",
                message: "@endif が必要です（@if が未閉じ）",
                sourceLine: ifChain.sourceLine,
            });
        }

        return { script, labels, labelSourceLines };
    }
}
