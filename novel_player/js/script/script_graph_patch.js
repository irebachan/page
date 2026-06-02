/** ノードグラフ操作 → 脚本テキストへの行単位パッチ（正本は .txt 記法） */

function getLabelBlockRange(labelSourceLines, labelName, lineCount) {
    const start = labelSourceLines[labelName];
    if (start == null) return null;
    let end = lineCount;
    for (const pos of Object.values(labelSourceLines)) {
        if (pos > start && pos < end) end = pos;
    }
    return { start, end };
}

function listJumpLinesInBlock(lines, range, kind) {
    const expected = kind === "call" ? "@call" : "@goto";
    const out = [];
    for (let i = range.start + 1; i < range.end; i++) {
        const t = lines[i].trim();
        if (t === expected || t.startsWith(expected + " ")) {
            out.push({
                lineIndex: i,
                target: parseJumpLineTarget(t, kind) || "",
            });
        }
    }
    return out;
}

function listGotosInBlock(lines, range) {
    return listJumpLinesInBlock(lines, range, "goto");
}

function appendLabelStub(lines, labelName) {
    if (lines.length && lines[lines.length - 1].trim() !== "") {
        lines.push("");
    }
    lines.push(`@${labelName}`, "");
    return lines;
}

/**
 * fromLabel ブロックに @goto toLabel を追加、または既存 @goto の先を差し替え
 */
function patchLabelGoto(text, script, labels, labelSourceLines, fromLabel, toLabel) {
    return patchLabelJump(
        text,
        script,
        labels,
        labelSourceLines,
        fromLabel,
        toLabel,
        "goto"
    );
}

function patchLabelJump(text, _script, labels, labelSourceLines, fromLabel, toLabel, kind) {
    if (!fromLabel || !toLabel) {
        return { ok: false, error: "接続元・先のラベルが必要です", text };
    }
    if (fromLabel === toLabel) {
        return { ok: false, error: "同じラベルには接続できません", text };
    }

    let lines = text.split("\n");
    let sourceLines = { ...labelSourceLines };

    if (!sourceLines.hasOwnProperty(toLabel)) {
        lines = appendLabelStub(lines, toLabel);
        sourceLines[toLabel] = lines.length - 2;
    }

    const range = getLabelBlockRange(sourceLines, fromLabel, lines.length);
    if (!range) {
        return { ok: false, error: `ラベル「${fromLabel}」が見つかりません`, text };
    }

    const cmd = kind === "call" ? "@call" : "@goto";

    if (kind === "call") {
        lines.splice(range.end, 0, `${cmd} ${toLabel}`);
        return { ok: true, text: lines.join("\n") };
    }

    const existing = listJumpLinesInBlock(lines, range, "goto");
    if (existing.length > 0) {
        const g = existing[existing.length - 1];
        lines[g.lineIndex] = `${cmd} ${toLabel}`;
    } else {
        lines.splice(range.end, 0, `${cmd} ${toLabel}`);
    }

    return { ok: true, text: lines.join("\n") };
}

/** fromLabel ブロックに @call 行を都度追加（差し替えしない） */
function patchLabelCall(text, script, labels, labelSourceLines, fromLabel, toLabel) {
    return patchLabelJump(
        text,
        script,
        labels,
        labelSourceLines,
        fromLabel,
        toLabel,
        "call"
    );
}

/** ラベルブロック末尾に @end または @return を追加 */
function patchLabelExit(text, _script, labels, labelSourceLines, labelName, exitKind) {
    if (!labelName) {
        return { ok: false, error: "ラベルが指定されていません", text };
    }
    const line = exitKind === "end" ? "@end" : "@return";
    if (line !== "@end" && line !== "@return") {
        return { ok: false, error: "不明な終了種別です", text };
    }

    const lines = text.split("\n");
    const range = getLabelBlockRange(labelSourceLines, labelName, lines.length);
    if (!range) {
        return { ok: false, error: `ラベル「${labelName}」が見つかりません`, text };
    }

    lines.splice(range.end, 0, line);
    return { ok: true, text: lines.join("\n") };
}

function removeExitLineFromText(lines, labelSourceLines, edge) {
    const expected = edge.exitKind === "end" ? "@end" : "@return";

    const tryRemoveAt = (i) => {
        if (i == null || i < 0 || i >= lines.length) return false;
        if (lines[i].trim() !== expected) return false;
        lines.splice(i, 1);
        return true;
    };

    if (tryRemoveAt(edge.sourceLine)) return true;

    const from = edge.from;
    if (!from || labelSourceLines[from] == null) return false;
    const range = getLabelBlockRange(labelSourceLines, from, lines.length);
    if (!range) return false;
    for (let i = range.start + 1; i < range.end; i++) {
        if (tryRemoveAt(i)) return true;
    }
    return false;
}

function findChoiceLineIndex(lines, startLine, choiceIndex) {
    let count = 0;
    for (let i = startLine; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t.startsWith("-")) {
            if (count === choiceIndex) return i;
            count++;
        } else if (count > 0) {
            break;
        }
    }
    return null;
}

function parseChoiceLineParts(line) {
    const raw = line.trim();
    if (!raw.startsWith("-")) return null;
    const indent = line.match(/^\s*/)[0];
    const body = raw.slice(1).trim();
    const arrow = body.indexOf("=>");
    const textPart = arrow >= 0 ? body.slice(0, arrow).trim() : body;
    let mode = "goto";
    let hasTarget = false;
    if (arrow >= 0) {
        const targetRaw = body.slice(arrow + 2).trim();
        hasTarget = targetRaw.length > 0;
        if (targetRaw.startsWith("@call ")) mode = "call";
        else if (targetRaw.startsWith("call ")) mode = "call";
    }
    return { indent, textPart, mode, hasTarget };
}

/** 選択肢の => 先だけ外す（- 文 は残す） */
function disconnectChoiceTarget(text, _script, _labels, _labelSourceLines, edge) {
    if (!edge || edge.kind !== "choice") {
        return { ok: false, error: "選択肢の辺ではありません", text };
    }

    const lines = text.split("\n");
    const lineIdx = findChoiceLineIndex(
        lines,
        edge.sourceLine,
        edge.choiceIndex ?? 0
    );
    if (lineIdx == null) {
        return { ok: false, error: "選択肢の行が見つかりません", text };
    }

    const parts = parseChoiceLineParts(lines[lineIdx]);
    if (!parts) {
        return { ok: false, error: "脚本が変更されています", text };
    }

    lines[lineIdx] = `${parts.indent}- ${parts.textPart}`;
    return { ok: true, text: lines.join("\n") };
}

function parseJumpLineTarget(trimmedLine, kind) {
    const expected = kind === "call" ? "@call" : "@goto";
    if (trimmedLine === expected) return "";
    if (!trimmedLine.startsWith(expected + " ")) return null;
    return trimmedLine.slice(expected.length + 1).trim();
}

function removeJumpLineFromText(lines, labels, labelSourceLines, edge) {
    const kind = edge.kind;
    const expected = kind === "call" ? "@call" : "@goto";
    const want = (edge.to || "").trim();

    const tryRemoveAt = (i) => {
        if (i == null || i < 0 || i >= lines.length) return false;
        const t = lines[i].trim();
        if (t !== expected && !t.startsWith(expected + " ")) return false;
        if (want) {
            const target = parseJumpLineTarget(t, kind);
            if (target !== want) return false;
        }
        lines.splice(i, 1);
        return true;
    };

    if (tryRemoveAt(edge.sourceLine)) return true;

    const from = edge.from;
    if (!from || labelSourceLines[from] == null) return false;
    const range = getLabelBlockRange(labelSourceLines, from, lines.length);
    if (!range) return false;
    for (let i = range.start + 1; i < range.end; i++) {
        if (tryRemoveAt(i)) return true;
    }
    return false;
}

/** @goto / @call 行の行き先だけ差し替え */
function patchJumpEdgeTarget(text, _script, labels, labelSourceLines, edge, toLabel) {
    if (!edge || (edge.kind !== "goto" && edge.kind !== "call")) {
        return { ok: false, error: "この辺は付け替えできません", text };
    }
    if (!toLabel) {
        return { ok: false, error: "行き先ラベルが必要です", text };
    }

    let lines = text.split("\n");
    let sourceLines = { ...labelSourceLines };

    if (!sourceLines.hasOwnProperty(toLabel)) {
        lines = appendLabelStub(lines, toLabel);
        sourceLines[toLabel] = lines.length - 2;
    }

    const i = edge.sourceLine;
    if (i == null || i < 0 || i >= lines.length) {
        return { ok: false, error: "行が見つかりません", text };
    }
    const t = lines[i].trim();
    const expected = edge.kind === "call" ? "@call" : "@goto";
    if (t !== expected && !t.startsWith(expected + " ")) {
        return { ok: false, error: "脚本が変更されています。再読み込みしてください", text };
    }
    lines[i] = `${expected} ${toLabel}`;
    return { ok: true, text: lines.join("\n") };
}

/** グラフ上の辺 1 本に対応する行を削除 */
function removeGraphEdgeFromText(text, script, labels, labelSourceLines, edge) {
    if (!edge) return { ok: false, error: "辺が指定されていません", text };

    const lines = text.split("\n");

    if (edge.kind === "goto" || edge.kind === "call") {
        const removed = removeJumpLineFromText(
            lines,
            labels,
            labelSourceLines,
            edge
        );
        if (!removed) {
            return {
                ok: false,
                error: "接続行が見つかりません。再読み込みしてください",
                text,
            };
        }
        return { ok: true, text: lines.join("\n") };
    }

    if (edge.kind === "fallthrough") {
        return { ok: false, error: "順番の流れはグラフから削除できません", text };
    }

    if (edge.kind === "exit") {
        if (!removeExitLineFromText(lines, labelSourceLines, edge)) {
            return {
                ok: false,
                error: "命令行が見つかりません。再読み込みしてください",
                text,
            };
        }
        return { ok: true, text: lines.join("\n") };
    }

    if (edge.kind === "choice") {
        const lineIdx = findChoiceLineIndex(lines, edge.sourceLine, edge.choiceIndex ?? 0);
        if (lineIdx == null) {
            return { ok: false, error: "選択肢の行が見つかりません", text };
        }
        // 接続済み → 行き先だけ外す（選択肢コマンドは残す）
        if (!edge.disconnected) {
            return disconnectChoiceTarget(text, script, labels, labelSourceLines, edge);
        }
        // もともと未接続（途中までの線）→ 選択肢行ごと削除
        lines.splice(lineIdx, 1);
        return { ok: true, text: lines.join("\n") };
    }

    return { ok: false, error: "この辺は削除できません", text };
}

/** 選択肢行の => 先を差し替え（call 記法は維持） */
function patchChoiceTarget(text, _script, labels, labelSourceLines, edge, toLabel) {
    if (!edge || edge.kind !== "choice") {
        return { ok: false, error: "選択肢の辺ではありません", text };
    }
    if (!toLabel) {
        return { ok: false, error: "行き先ラベルが必要です", text };
    }

    let lines = text.split("\n");
    let sourceLines = { ...labelSourceLines };

    if (!sourceLines.hasOwnProperty(toLabel)) {
        lines = appendLabelStub(lines, toLabel);
        sourceLines[toLabel] = lines.length - 2;
    }

    const lineIdx = findChoiceLineIndex(
        lines,
        edge.sourceLine,
        edge.choiceIndex ?? 0
    );
    if (lineIdx == null) {
        return { ok: false, error: "選択肢の行が見つかりません", text };
    }

    const parts = parseChoiceLineParts(lines[lineIdx]);
    if (!parts) {
        return { ok: false, error: "脚本が変更されています", text };
    }

    const mode = edge.mode || parts.mode || "goto";
    const targetPart = mode === "call" ? `call ${toLabel}` : toLabel;
    lines[lineIdx] = `${parts.indent}- ${parts.textPart} => ${targetPart}`;

    return { ok: true, text: lines.join("\n") };
}
