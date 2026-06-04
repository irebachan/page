// シナリオの参照エラー（未定義ラベル）を収集
function collectReferenceErrors(script, labels) {
    const errors = [];
    const hasLabel = (name) => name && labels.hasOwnProperty(name);

    for (const item of script) {
        if (item.type === "parse_error") {
            errors.push({
                sourceLine: item.sourceLine,
                message: item.message,
            });
            continue;
        }
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

function ifBranchLabel(condition) {
    if (condition == null || condition === "") return "それ以外";
    return String(condition);
}

const IF_STUB_BODY_MAX = 8;

function estimateTextWidthPx(text, fontSizePx) {
    let w = 0;
    for (const ch of String(text)) {
        w += ch.charCodeAt(0) > 0xff ? fontSizePx : fontSizePx * 0.55;
    }
    return w;
}

/** if スタブ下の超短い本文（話者名は出さない） */
function previewFromIfBranchBody(script, from, to, maxLen = IF_STUB_BODY_MAX) {
    if (from == null || to == null || from >= to) return "";
    for (let i = from; i < to && i < script.length; i++) {
        const item = script[i];
        if (item.type === "blank" || item.type === "comment") continue;
        if (item.type === "line") {
            const t = (item.text || "").replace(/\s+/g, " ").trim();
            if (!t) continue;
            return truncatePreviewText(t, maxLen);
        }
        if (item.type === "choice") {
            const texts = item.choices
                .map((c) => (c.text || "").trim())
                .filter(Boolean);
            if (texts.length) return truncatePreviewText(texts[0], maxLen);
        }
    }
    return "";
}

function stubLabelWidthPx(edge) {
    const cond = String(edge.detail || "");
    const body = edge.bodyPreview ? String(edge.bodyPreview) : "";
    const w = Math.max(
        estimateTextWidthPx(cond, 10),
        body ? estimateTextWidthPx(body, 9) : 0
    );
    return Math.max(48, w + 16);
}

/** if 枝の中から goto / call / end 参照を収集 */
function collectIfBranchTargets(script, from, to) {
    const targets = [];
    if (from == null || to == null) return targets;
    for (let i = from; i < to && i < script.length; i++) {
        const item = script[i];
        if (item.type === "goto" || item.type === "call") {
            targets.push({ kind: item.type, target: item.target });
        } else if (item.type === "end") {
            targets.push({ kind: "end", target: null });
        }
    }
    return targets;
}

function previewFromIfChain(item, maxLen) {
    const parts = (item.branches || [])
        .map((b) => ifBranchLabel(b.condition))
        .filter(Boolean);
    if (!parts.length) return "if";
    if (parts.length <= 2) {
        return truncatePreviewText(`if: ${parts.join(" / ")}`, maxLen);
    }
    return truncatePreviewText(`if: ${parts[0]} 他${parts.length - 1}`, maxLen);
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

        if (item.type === "if_chain") {
            return previewFromIfChain(item, maxLen);
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
                    disconnected,
                });
            });
        } else if (item.type === "if_chain") {
            if (!from) continue;
            const groupSize = item.branches.length;

            item.branches.forEach((branch, branchIndex) => {
                if (branch.from == null || branch.to == null || branch.from >= branch.to) {
                    return;
                }
                const detail = ifBranchLabel(branch.condition);
                const bodyPreview = previewFromIfBranchBody(
                    script,
                    branch.from,
                    branch.to,
                    IF_STUB_BODY_MAX
                );
                const targets = collectIfBranchTargets(
                    script,
                    branch.from,
                    branch.to
                );
                const external = targets.filter(
                    (t) => t.kind === "goto" || t.kind === "call"
                );

                if (external.length) {
                    external.forEach((t, targetIndex) => {
                        ensureNode(t.target, true);
                        edges.push({
                            id: `if-${item.sourceLine}-${branchIndex}-ext-${targetIndex}`,
                            from,
                            to: t.target,
                            kind: "if_branch",
                            sourceLine: item.sourceLine,
                            branchIndex,
                            branchGroupSize: groupSize,
                            detail,
                            mode: t.kind === "call" ? "call" : "goto",
                            disconnected: false,
                            external: true,
                        });
                    });
                } else {
                    edges.push({
                        id: `if-${item.sourceLine}-${branchIndex}-inline`,
                        from,
                        to: null,
                        kind: "if_inline",
                        sourceLine: item.sourceLine,
                        branchIndex,
                        branchGroupSize: groupSize,
                        detail,
                        bodyPreview: bodyPreview || undefined,
                        disconnected: true,
                        external: false,
                    });
                }
            });

            edges.push({
                id: `if-rejoin-${item.sourceLine}`,
                from,
                to: null,
                kind: "if_rejoin",
                sourceLine: item.sourceLine,
                detail: "@endif",
                disconnected: true,
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

    const exitsByLabel = new Map();
    for (let i = 0; i < script.length; i++) {
        const item = script[i];
        if (item.type !== "end" && item.type !== "return") continue;
        const from = getContainingLabel(labels, i);
        if (!from) continue;
        if (!exitsByLabel.has(from)) exitsByLabel.set(from, []);
        exitsByLabel.get(from).push({
            exitKind: item.type,
            sourceLine: item.sourceLine,
        });
    }
    for (const [from, exits] of exitsByLabel) {
        const groupSize = exits.length;
        exits.forEach((ex, exitIndex) => {
            edges.push({
                id: `exit-${ex.exitKind}-${ex.sourceLine}`,
                from,
                to: null,
                kind: "exit",
                exitKind: ex.exitKind,
                sourceLine: ex.sourceLine,
                disconnected: true,
                detail: ex.exitKind === "end" ? "@end" : "@return",
                exitIndex,
                exitGroupSize: groupSize,
            });
        });
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

    const padBottom = computeNodeLayoutExtras(edges);
    for (const n of nodes) {
        n.layoutPadBottom = padBottom.get(n.name) || 0;
    }

    return { nodes, edges };
}

/** 下端スタブの縦サイズ → layoutPadBottom（if があるラベルだけ dagre 高さが伸びる） */
function computeNodeLayoutExtras(edges) {
    const padBottom = new Map();
    const bumpPad = (from, v) => {
        padBottom.set(from, Math.max(padBottom.get(from) || 0, v));
    };

    const byFrom = new Map();
    for (const e of edges) {
        if (!e.from) continue;
        if (!edgeUsesBottomStub(e)) continue;
        if (!byFrom.has(e.from)) byFrom.set(e.from, []);
        byFrom.get(e.from).push(e);
    }
    for (const [from, group] of byFrom) {
        layoutBottomStubsForNode(from, group, bumpPad);
    }
    return padBottom;
}

function edgeUsesBottomStub(e) {
    return (
        e.kind === "if_rejoin" ||
        e.kind === "if_inline" ||
        e.kind === "exit" ||
        (e.kind === "choice" && e.disconnected)
    );
}

/** 同一ラベル内の @if ブロックごとの縦段間隔 */
const STUB_TIER_GAP = 40;
const STUB_DROP_IF_INLINE = 42;
const STUB_DROP_IF_BODY = 10;
const STUB_DROP_IF_REJOIN = 48;
const STUB_DROP_CHOICE = 40;
const STUB_DROP_EXIT = 28;
const STUB_PAD_TAIL = 12;

function assignStubTiers(group) {
    const lines = [
        ...new Set(
            group
                .filter(edgeUsesBottomStub)
                .map((e) => e.sourceLine)
                .filter((l) => l != null && l !== undefined)
        ),
    ].sort((a, b) => a - b);
    const lineToTier = new Map(lines.map((l, i) => [l, i]));
    for (const e of group) {
        if (!edgeUsesBottomStub(e) || e.sourceLine == null) continue;
        e.stubTier = lineToTier.get(e.sourceLine) ?? 0;
    }
}

/** 1段ぶん: その @if ブロックの枝だけ横並び、@endif はその段の中央 */
function layoutStubTier(tierEdges, labelHasIf) {
    const GAP_CENTER = 10;
    const MIN_GAP = 12;
    const yOff = (tierEdges[0]?.stubTier ?? 0) * STUB_TIER_GAP;
    const markY = (e) => {
        e.stubYOffset = yOff;
    };

    const rejoin = tierEdges.filter((e) => e.kind === "if_rejoin");
    const ifInlines = tierEdges
        .filter((e) => e.kind === "if_inline")
        .sort((a, b) => (a.branchIndex ?? 0) - (b.branchIndex ?? 0));
    const choices = tierEdges
        .filter((e) => e.kind === "choice" && e.disconnected)
        .sort((a, b) => (a.choiceIndex ?? 0) - (b.choiceIndex ?? 0));
    const exits = tierEdges
        .filter((e) => e.kind === "exit")
        .sort((a, b) => (a.exitIndex ?? 0) - (b.exitIndex ?? 0));

    const ifN = ifInlines.length;
    const useIfZones = labelHasIf && (rejoin.length > 0 || ifN > 0);

    if (!useIfZones) {
        layoutStubRowCentered(choices, MIN_GAP, (e) => {
            e.stubDrop =
                STUB_DROP_CHOICE + (e.choiceIndex ?? 0) * 12;
            markY(e);
        });
        let left = -GAP_CENTER;
        for (let i = exits.length - 1; i >= 0; i--) {
            const e = exits[i];
            const w = stubLabelWidthPx(e);
            left -= w / 2;
            e.stubLayoutX = left;
            left -= w / 2 + MIN_GAP;
            e.stubDrop = STUB_DROP_EXIT + i * 8;
            markY(e);
        }
        return;
    }

    for (const e of rejoin) {
        e.stubLayoutX = 0;
        e.stubDrop = STUB_DROP_IF_REJOIN;
        markY(e);
    }

    let left = -GAP_CENTER;
    for (let i = ifN - 1; i >= 0; i--) {
        const e = ifInlines[i];
        const w = stubLabelWidthPx(e);
        left -= w / 2;
        e.stubLayoutX = left;
        left -= w / 2 + MIN_GAP;
        e.stubDrop =
            STUB_DROP_IF_INLINE +
            (e.bodyPreview ? STUB_DROP_IF_BODY : 0);
        markY(e);
    }

    let right = GAP_CENTER;
    for (let i = 0; i < choices.length; i++) {
        const e = choices[i];
        const w = stubLabelWidthPx(e);
        right += w / 2;
        e.stubLayoutX = right;
        right += w / 2 + MIN_GAP;
        e.stubDrop = STUB_DROP_CHOICE + i * 10;
        markY(e);
    }

    for (let i = exits.length - 1; i >= 0; i--) {
        const e = exits[i];
        const w = stubLabelWidthPx(e);
        left -= w / 2;
        e.stubLayoutX = left;
        left -= w / 2 + MIN_GAP;
        e.stubDrop = STUB_DROP_EXIT + i * 8;
        markY(e);
    }
}

function layoutBottomStubsForNode(from, group, bumpPad) {
    assignStubTiers(group);
    const labelHasIf = group.some(
        (e) => e.kind === "if_inline" || e.kind === "if_rejoin"
    );
    const tiers = [
        ...new Set(
            group.filter(edgeUsesBottomStub).map((e) => e.stubTier ?? 0)
        ),
    ].sort((a, b) => a - b);

    for (const tier of tiers) {
        const tierEdges = group.filter(
            (e) => edgeUsesBottomStub(e) && (e.stubTier ?? 0) === tier
        );
        layoutStubTier(tierEdges, labelHasIf);
    }

    finalizeStubLayout(from, group, bumpPad);
}

function layoutStubRowCentered(items, minGap, afterPlace) {
    if (!items.length) return;
    const widths = items.map((e) => stubLabelWidthPx(e));
    const total =
        widths.reduce((a, w) => a + w, 0) + minGap * Math.max(0, items.length - 1);
    let x = -total / 2;
    items.forEach((e, i) => {
        const w = widths[i];
        e.stubLayoutX = x + w / 2;
        x += w + minGap;
        afterPlace?.(e);
    });
}

function finalizeStubLayout(from, group, bumpPad) {
    let maxReach = 0;
    for (const e of group) {
        if (!edgeUsesBottomStub(e)) continue;
        const reach = (e.stubYOffset ?? 0) + (e.stubDrop ?? 30);
        maxReach = Math.max(maxReach, reach);
    }
    bumpPad(from, maxReach + STUB_PAD_TAIL);
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
