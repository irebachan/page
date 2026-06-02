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

function listGotosInBlock(lines, range) {
    const gotos = [];
    for (let i = range.start + 1; i < range.end; i++) {
        const t = lines[i].trim();
        if (t.startsWith("@goto ")) {
            gotos.push({ lineIndex: i, target: t.split(/\s+/).slice(1).join(" ").trim() });
        }
    }
    return gotos;
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
function patchLabelGoto(text, _script, labels, labelSourceLines, fromLabel, toLabel) {
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

    const gotos = listGotosInBlock(lines, range);
    if (gotos.length > 0) {
        const g = gotos[gotos.length - 1];
        lines[g.lineIndex] = `@goto ${toLabel}`;
    } else {
        lines.splice(range.end, 0, `@goto ${toLabel}`);
    }

    return { ok: true, text: lines.join("\n") };
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

/** グラフ上の辺 1 本に対応する行を削除 */
function removeGraphEdgeFromText(text, script, labels, labelSourceLines, edge) {
    if (!edge) return { ok: false, error: "辺が指定されていません", text };

    const lines = text.split("\n");

    if (edge.kind === "goto" || edge.kind === "call") {
        const i = edge.sourceLine;
        if (i == null || i < 0 || i >= lines.length) {
            return { ok: false, error: "行が見つかりません", text };
        }
        const t = lines[i].trim();
        const expected = edge.kind === "call" ? "@call" : "@goto";
        if (t !== expected && !t.startsWith(expected + " ")) {
            return { ok: false, error: "脚本が変更されています。再読み込みしてください", text };
        }
        lines.splice(i, 1);
        return { ok: true, text: lines.join("\n") };
    }

    if (edge.kind === "fallthrough") {
        return { ok: false, error: "順番の流れはグラフから削除できません", text };
    }

    if (edge.kind === "exit") {
        const i = edge.sourceLine;
        if (i == null || i < 0 || i >= lines.length) {
            return { ok: false, error: "行が見つかりません", text };
        }
        const expected = edge.exitKind === "end" ? "@end" : "@return";
        if (lines[i].trim() !== expected) {
            return {
                ok: false,
                error: "脚本が変更されています。再読み込みしてください",
                text,
            };
        }
        lines.splice(i, 1);
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
