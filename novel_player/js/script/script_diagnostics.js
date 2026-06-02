// シナリオの参照エラー・変数・条件式を収集
function collectReferenceErrors(script, labels) {
    const errors = [];
    const hasLabel = (name) => name && labels.hasOwnProperty(name);
    const declaredVars = new Set();

    for (const item of script) {
        if (item.type === "var_init") {
            declaredVars.add(item.name);
        }
        if (item.type === "parse_error") {
            errors.push({
                sourceLine: item.sourceLine,
                message: item.message,
            });
        }
        if (item.type === "set") {
            if (!declaredVars.has(item.name)) {
                errors.push({
                    sourceLine: item.sourceLine,
                    message: `@set ${item.name} — @var で宣言されていません`,
                });
            }
        }
        if (item.type === "if_chain") {
            item.branches.forEach((b, bi) => {
                if (b.condition != null && window.ScriptExpr) {
                    try {
                        ScriptExpr.parseCondition(b.condition);
                    } catch (e) {
                        errors.push({
                            sourceLine: item.sourceLine,
                            message: `@if/@elseif の式: ${e.message}`,
                        });
                    }
                }
                if (b.from == null || b.to == null || b.from >= b.to) {
                    errors.push({
                        sourceLine: item.sourceLine,
                        message: `条件分岐の枝 ${bi + 1} が空です`,
                    });
                }
            });
        }
        if (item.type === "choice") {
            for (const c of item.choices) {
                if (c.parseError) {
                    errors.push({
                        sourceLine: item.sourceLine,
                        message: `選択肢: ${c.parseError}`,
                    });
                }
                if (!hasLabel(c.target)) {
                    errors.push({
                        sourceLine: item.sourceLine,
                        message: `選択肢「${c.text}」→ 未定義「${c.target}」`,
                    });
                }
                if (c.condition && window.ScriptExpr) {
                    try {
                        ScriptExpr.parseCondition(c.condition);
                    } catch (e) {
                        errors.push({
                            sourceLine: item.sourceLine,
                            message: `選択肢「${c.text}」の条件: ${e.message}`,
                        });
                    }
                }
            }
        } else if (item.type === "goto" || item.type === "call") {
            if (!hasLabel(item.target)) {
                errors.push({
                    sourceLine: item.sourceLine,
                    message: `@${item.type} ${item.target} — ラベルが見つかりません`,
                });
            }
        }
    }
    return errors;
}

function getContainingLabel(labels, scriptIndex) {
    let best = null;
    let bestPos = -1;
    for (const [name, pos] of Object.entries(labels)) {
        if (pos <= scriptIndex && pos > bestPos) {
            bestPos = pos;
            best = name;
        }
    }
    return best;
}

function getNextLabelBlockEnd(labels, scriptLength, labelStart) {
    let end = scriptLength;
    for (const pos of Object.values(labels)) {
        if (pos > labelStart && pos < end) end = pos;
    }
    return end;
}

/** 各ラベルの入出力参照を収集（グラフ UI 用ではなくテキスト一覧用） */
function buildLabelFlow(script, labels) {
    const names = Object.keys(labels).sort((a, b) => labels[a] - labels[b]);
    const incoming = {};
    names.forEach((n) => {
        incoming[n] = [];
    });

    for (let i = 0; i < script.length; i++) {
        const item = script[i];
        const from = getContainingLabel(labels, i);

        if (item.type === "choice") {
            for (const c of item.choices) {
                if (!incoming[c.target]) incoming[c.target] = [];
                incoming[c.target].push({
                    from,
                    kind: "choice",
                    detail: c.text,
                    mode: c.mode || "goto",
                });
            }
        } else if (item.type === "goto" || item.type === "call") {
            const target = item.target;
            if (!incoming[target]) incoming[target] = [];
            incoming[target].push({ from, kind: item.type });
        }
    }

    return names.map((name) => {
        const start = labels[name];
        const end = getNextLabelBlockEnd(labels, script.length, start);
        const outgoing = [];
        for (let i = start; i < end; i++) {
            const item = script[i];
            if (item.type === "choice") {
                for (const c of item.choices) {
                    outgoing.push({
                        to: c.target,
                        kind: "choice",
                        detail: c.text,
                        mode: c.mode || "goto",
                    });
                }
            } else if (item.type === "goto" || item.type === "call") {
                outgoing.push({ to: item.target, kind: item.type });
            }
        }
        return { name, start, end, incoming: incoming[name] || [], outgoing };
    });
}
