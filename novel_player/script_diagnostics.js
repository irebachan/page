// シナリオの参照エラー（未定義ラベル）を収集
function collectReferenceErrors(script, labels) {
    const errors = [];
    const hasLabel = (name) => name && labels.hasOwnProperty(name);

    for (const item of script) {
        if (item.type === "choice") {
            for (const c of item.choices) {
                if (!hasLabel(c.target)) {
                    errors.push({
                        sourceLine: item.sourceLine,
                        message: `選択肢「${c.text}」→ 未定義「${c.target}」`,
                    });
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
                        kind: "choice",
                        target: c.target,
                        detail: c.text,
                        mode: c.mode || "goto",
                    });
                }
            } else if (item.type === "goto") {
                outgoing.push({ kind: "goto", target: item.target });
            } else if (item.type === "call") {
                outgoing.push({ kind: "call", target: item.target });
            } else if (item.type === "end") {
                outgoing.push({ kind: "end" });
            }
        }

        return { name, incoming: incoming[name] || [], outgoing };
    });
}

function formatLabelFlowRef(ref, direction) {
    return getLabelFlowRefParts(ref, direction)
        .map((p) => p.value)
        .join("");
}

/** ラベル名だけリンク化するためのセグメント列 */
function getLabelFlowRefParts(ref, direction) {
    const parts = [];
    if (ref.kind === "choice") {
        if (direction === "out") {
            parts.push({ type: "text", value: `選択「${ref.detail}」→ ` });
            if (ref.mode === "call") parts.push({ type: "text", value: "call " });
            parts.push({ type: "label", value: ref.target });
        } else {
            parts.push({ type: "text", value: `「${ref.detail}」` });
            if (ref.from) {
                parts.push({ type: "text", value: " ← " });
                parts.push({ type: "label", value: ref.from });
            } else {
                parts.push({ type: "text", value: " ← （冒頭）" });
            }
        }
    } else if (ref.kind === "goto" || ref.kind === "call") {
        if (direction === "out") {
            parts.push({ type: "text", value: `@${ref.kind} ` });
            parts.push({ type: "label", value: ref.target });
        } else {
            parts.push({ type: "text", value: `@${ref.kind} ` });
            if (ref.from) {
                parts.push({ type: "text", value: "← " });
                parts.push({ type: "label", value: ref.from });
            } else {
                parts.push({ type: "text", value: "← （冒頭）" });
            }
        }
    } else if (ref.kind === "end") {
        parts.push({ type: "text", value: "@end" });
    }
    return parts;
}
