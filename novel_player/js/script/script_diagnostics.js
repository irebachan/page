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

function openChoiceNodeId(sourceLine, choiceIndex) {
    return `__open__${sourceLine}_${choiceIndex}`;
}

function isOpenChoiceNodeId(name) {
    return typeof name === "string" && name.startsWith("__open__");
}

function labelNamesInScriptOrder(labels) {
    return Object.keys(labels).sort((a, b) => labels[a] - labels[b]);
}

function analyzeLabelBlockExit(script, labels, labelName) {
    const start = labels[labelName];
    const end = getNextLabelBlockEnd(labels, script.length, start);
    let hasEndCmd = false;
    let endSourceLine = null;
    let lastSig = null;

    for (let i = start; i < end; i++) {
        const item = script[i];
        if (item.type === "blank" || item.type === "comment") continue;
        if (item.type === "end") {
            hasEndCmd = true;
            endSourceLine = item.sourceLine;
        }
        lastSig = item;
    }
    return { hasEndCmd, endSourceLine, lastSig };
}

function hasExplicitEdgeBetween(edges, from, to) {
    return edges.some(
        (e) =>
            e.from === from &&
            e.to === to &&
            e.kind !== "fallthrough"
    );
}

/** ブロック末尾が index++ で定義順の次ラベルへ落ちるか（@goto 等がなければ true） */
function labelHasImplicitFallthrough(script, labels, labelName) {
    const { hasEndCmd, lastSig } = analyzeLabelBlockExit(script, labels, labelName);
    if (hasEndCmd) return false;
    if (!lastSig) return true;
    if (
        lastSig.type === "choice" ||
        lastSig.type === "goto" ||
        lastSig.type === "call" ||
        lastSig.type === "return"
    ) {
        return false;
    }
    return true;
}

function previewMaxCharsForWidth(widthPx) {
    return Math.max(6, Math.floor((widthPx - 16) / 5.5));
}

function measureNodeWidth(name, preview) {
    return Math.min(
        220,
        Math.max(88, name.length * 7.5 + 24, (preview || "").length * 5.5 + 20)
    );
}

function truncatePreviewText(text, maxLen) {
    const s = String(text).replace(/\s+/g, " ").trim();
    if (!s) return "";
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen - 1) + "…";
}

function previewFromChoiceBlock(item, maxLen) {
    const desc = (item.description || "").trim();
    if (desc) return truncatePreviewText(desc, maxLen);

    const texts = item.choices.map((c) => (c.text || "").trim()).filter(Boolean);
    if (texts.length === 0) return "";
    if (texts.length <= 2) {
        return truncatePreviewText(texts.join(" / "), maxLen);
    }
    return truncatePreviewText(`${texts[0]} 他${texts.length - 1}`, maxLen);
}

/**
 * ラベルブロックのプレビュー（プレイヤー向け本文優先。命令は出さない）
 */
function buildLabelPreviewSnippet(script, labels, labelName, maxLen = 22) {
    const start = labels[labelName];
    if (start == null) return "";
    const end = getNextLabelBlockEnd(labels, script.length, start);

    for (let i = start; i < end; i++) {
        const item = script[i];
        if (item.type === "blank" || item.type === "comment") continue;

        if (item.type === "line") {
            const t = (item.text || "").replace(/\s+/g, " ").trim();
            if (!t) continue;
            const body = item.name?.trim() ? `${item.name}: ${t}` : t;
            return truncatePreviewText(body, maxLen);
        }

        if (item.type === "choice") {
            return previewFromChoiceBlock(item, maxLen);
        }

        if (
            item.type === "goto" ||
            item.type === "call" ||
            item.type === "end" ||
            item.type === "return"
        ) {
            continue;
        }
    }

    return "";
}

/** ノードグラフ描画用: ノード・辺のスナップショット（正本はテキスト） */
function buildLabelGraphData(script, labels, labelSourceLines) {
    const nodeMap = new Map();
    const edges = [];

    function ensureNode(name, asGhost) {
        if (!name) return;
        const defined = labels.hasOwnProperty(name);
        if (!nodeMap.has(name)) {
            nodeMap.set(name, {
                name,
                ghost: asGhost && !defined,
                sourceLine:
                    labelSourceLines && labelSourceLines[name] != null
                        ? labelSourceLines[name]
                        : undefined,
                scriptIndex: defined ? labels[name] : undefined,
            });
        } else if (asGhost && !defined) {
            nodeMap.get(name).ghost = true;
        }
    }

    for (const name of Object.keys(labels)) {
        ensureNode(name, false);
        const n = nodeMap.get(name);
        const rawPreview = buildLabelPreviewSnippet(script, labels, name, 80);
        let preview = "";
        if (rawPreview) {
            let w = measureNodeWidth(name, "");
            preview = truncatePreviewText(rawPreview, previewMaxCharsForWidth(w));
            w = measureNodeWidth(name, preview);
            preview = truncatePreviewText(preview, previewMaxCharsForWidth(w));
        }
        n.preview = preview;
    }

    for (let i = 0; i < script.length; i++) {
        const item = script[i];
        const from = getContainingLabel(labels, i);

        if (item.type === "choice") {
            const groupSize = item.choices.length;
            item.choices.forEach((c, choiceIndex) => {
                const target = (c.target || "").trim();
                const disconnected = !target;
                if (!disconnected) ensureNode(target, true);
                if (!from) return;
                edges.push({
                    id: `choice-${item.sourceLine}-${choiceIndex}`,
                    from,
                    to: disconnected ? null : target,
                    kind: "choice",
                    sourceLine: item.sourceLine,
                    choiceIndex,
                    choiceGroupSize: groupSize,
                    detail: c.text,
                    mode: c.mode || "goto",
                    disconnected,
                });
            });
        } else if (item.type === "goto" || item.type === "call") {
            ensureNode(item.target, true);
            if (!from) continue;
            edges.push({
                id: `${item.type}-${item.sourceLine}`,
                from,
                to: item.target,
                kind: item.type,
                sourceLine: item.sourceLine,
            });
        }
    }

    // 選択肢の分岐先かどうかは不問。定義順で隣り合うラベル同士だけ。
    const ordered = labelNamesInScriptOrder(labels);
    for (let i = 0; i + 1 < ordered.length; i++) {
        const from = ordered[i];
        const to = ordered[i + 1];
        if (!labelHasImplicitFallthrough(script, labels, from)) continue;
        if (hasExplicitEdgeBetween(edges, from, to)) continue;
        edges.push({
            id: `fallthrough-${from}-${to}`,
            from,
            to,
            kind: "fallthrough",
        });
    }

    const nodes = Array.from(nodeMap.values()).sort((a, b) => {
        const ai = a.scriptIndex;
        const bi = b.scriptIndex;
        if (ai != null && bi != null) return ai - bi;
        if (ai != null) return -1;
        if (bi != null) return 1;
        return a.name.localeCompare(b.name, "ja");
    });

    return { nodes, edges };
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
