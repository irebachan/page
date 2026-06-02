// スクリプトパーサー - シナリオテキストを解析する
class ScriptParser {
    /** 選択肢の => 右側を解析（goto / call / 条件 if） */
    parseChoiceLine(rawLine) {
        const body = rawLine.trim().slice(1);
        const arrow = body.indexOf("=>");
        if (arrow < 0) {
            return { text: body, target: "", mode: "goto", condition: null };
        }
        let text = body.slice(0, arrow).trim();
        let right = body.slice(arrow + 2).trim();
        let condition = null;
        const ifMatch = right.match(/\s+if\s+(.+)$/i);
        if (ifMatch) {
            condition = ifMatch[1].trim();
            right = right.slice(0, ifMatch.index).trim();
        }
        const { mode, target } = this.parseChoiceTarget(right);
        return { text, target, mode, condition };
    }

    parseChoiceTarget(raw) {
        const t = (raw || "").trim();
        if (t.startsWith("@call ")) {
            return { mode: "call", target: t.slice(6).trim() };
        }
        if (t.startsWith("call ")) {
            return { mode: "call", target: t.slice(5).trim() };
        }
        return { mode: "goto", target: t };
    }

    parseIfCondition(line, prefix) {
        const cond = line.slice(prefix.length).trim();
        if (!cond) throw new Error("条件が空です");
        return cond;
    }

    parseVarLine(line) {
        const rest = line.slice("@var".length).trim();
        const parts = rest.split(/\s+/);
        if (parts.length < 2) throw new Error("@var には名前と初期値が必要です");
        const name = parts[0];
        const value = parseInt(parts[1], 10);
        if (Number.isNaN(value)) throw new Error(`初期値が数値ではありません: ${parts[1]}`);
        return { name, value };
    }

    parseSetLine(line) {
        const rest = line.slice("@set".length).trim();
        const m = rest.match(/^(.+?)\s*(\+=|-=|=)\s*(-?\d+)\s*$/);
        if (!m) throw new Error("@set の書式: @set 変数名 = 数値 （+= -= も可）");
        return { name: m[1].trim(), op: m[2], value: parseInt(m[3], 10) };
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
        script.push({
            type: "if_chain",
            branches: ifChain.branches,
            endifAt: script.length,
            sourceLine: ifChain.sourceLine,
        });
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
                if (line === "@endmeta") inMetaBlock = false;
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

                if (line.startsWith("@if ")) {
                    if (ifChain) this.pushIfChain(script, ifChain);
                    ifChain = {
                        sourceLine: i,
                        branches: [{ condition: this.parseIfCondition(line, "@if "), from: null, to: null }],
                    };
                    i++;
                    continue;
                }
                if (line.startsWith("@elseif ") || line.startsWith("@else if ")) {
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
                    const prefix = line.startsWith("@elseif ") ? "@elseif " : "@else if ";
                    ifChain.branches.push({
                        condition: this.parseIfCondition(line, prefix),
                        from: null,
                        to: null,
                    });
                    i++;
                    continue;
                }
                if (line === "@else") {
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
                    ifChain.branches.push({ condition: null, from: null, to: null });
                    i++;
                    continue;
                }
                if (line === "@endif") {
                    if (!ifChain) {
                        script.push({
                            type: "parse_error",
                            message: "@endif に対応する @if がありません",
                            sourceLine: i,
                        });
                        i++;
                        continue;
                    }
                    this.pushIfChain(script, ifChain);
                    ifChain = null;
                    i++;
                    continue;
                }
                if (line.startsWith("@var ")) {
                    ensureBranchFrom();
                    try {
                        const v = this.parseVarLine(line);
                        script.push({ type: "var_init", name: v.name, value: v.value, sourceLine });
                    } catch (e) {
                        script.push({ type: "parse_error", message: e.message, sourceLine });
                    }
                    i++;
                    continue;
                }
                if (line.startsWith("@set ")) {
                    ensureBranchFrom();
                    try {
                        const s = this.parseSetLine(line);
                        script.push({ type: "set", name: s.name, op: s.op, value: s.value, sourceLine });
                    } catch (e) {
                        script.push({ type: "parse_error", message: e.message, sourceLine });
                    }
                    i++;
                    continue;
                }
                if (line.startsWith("@goto")) {
                    ensureBranchFrom();
                    script.push({ type: "goto", target: line.split(/\s+/)[1], sourceLine });
                    i++;
                    continue;
                }
                if (line.startsWith("@call")) {
                    ensureBranchFrom();
                    script.push({ type: "call", target: line.split(/\s+/)[1], sourceLine });
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
                if (i > 0 && !lines[i - 1].trim().startsWith("@") && !lines[i - 1].trim().startsWith("#")) {
                    description = lines[i - 1].trim();
                }
                while (i < lines.length && lines[i].trim().startsWith("-")) {
                    try {
                        const c = this.parseChoiceLine(lines[i].trim());
                        choices.push(c);
                    } catch (e) {
                        choices.push({
                            text: lines[i].trim().slice(1),
                            target: "",
                            mode: "goto",
                            condition: null,
                            parseError: e.message,
                        });
                    }
                    i++;
                }
                if (choices.length > 0) {
                    script.push({ type: "choice", description, choices, sourceLine: choiceStart });
                }
                continue;
            }

            if (line.startsWith("#")) {
                ensureBranchFrom();
                const sourceLine = i;
                currentName = line.slice(1);
                let textLines = [];
                i++;
                while (i < lines.length) {
                    line = lines[i].trim();
                    if (line === "" || line.startsWith("#") || line.startsWith("@") || line.startsWith("//")) {
                        break;
                    }
                    textLines.push(line);
                    i++;
                }
                script.push({ type: "line", name: currentName, text: textLines.join("\n"), sourceLine });
                continue;
            }

            ensureBranchFrom();
            const sourceLine = i;
            let textLines = [line];
            i++;
            while (i < lines.length) {
                line = lines[i].trim();
                if (line === "" || line.startsWith("#") || line.startsWith("@") || line.startsWith("//")) {
                    break;
                }
                textLines.push(line);
                i++;
            }
            script.push({ type: "line", name: currentName, text: textLines.join("\n"), sourceLine });
        }

        if (ifChain) {
            script.push({
                type: "parse_error",
                message: "@if に対応する @endif がありません",
                sourceLine: ifChain.sourceLine,
            });
        }

        return { script, labels, labelSourceLines };
    }
}
