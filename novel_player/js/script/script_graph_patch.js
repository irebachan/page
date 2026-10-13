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
 * fromLabel ブロック末尾の @goto / @end / @return を @goto toLabel に置き換え（なければ追加）
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

    const ending = analyzeBlockEnding(lines, sourceLines, fromLabel);
    if (ending && !ending.endsWithChoices) {
        lines.splice(ending.tailStart, ending.contentEnd - ending.tailStart, `${cmd} ${toLabel}`);
        return { ok: true, text: lines.join("\n") };
    }

    const existing = listJumpLinesInBlock(lines, range, "goto");
    if (existing.length > 0) {
        const g = existing[existing.length - 1];
        lines[g.lineIndex] = `${cmd} ${toLabel}`;
    } else {
        lines.splice(ending ? ending.contentEnd : range.end, 0, `${cmd} ${toLabel}`);
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
    let hasTarget = false;
    if (arrow >= 0) {
        const targetRaw = body.slice(arrow + 2).trim();
        hasTarget = targetRaw.length > 0;
    }
    return { indent, textPart, hasTarget };
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

/** 選択肢行の => 先を差し替え */
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

    lines[lineIdx] = `${parts.indent}- ${parts.textPart} => ${toLabel}`;

    return { ok: true, text: lines.join("\n") };
}

/** パーサーと衝突する @ 命令行にならないか */
function validateLabelName(name, labels, excludeName) {
    const n = (name || "").trim();
    if (!n) {
        return { ok: false, error: "ラベル名を入力してください" };
    }
    if (n.includes("\n") || n.includes("\r")) {
        return { ok: false, error: "改行は使えません" };
    }
    const defLine = `@${n}`;
    if (defLine.startsWith("@goto")) {
        return { ok: false, error: "「goto」で始まる名前は使えません（@goto と解釈されます）" };
    }
    if (defLine.startsWith("@call")) {
        return { ok: false, error: "「call」で始まる名前は使えません（@call と解釈されます）" };
    }
    if (defLine === "@return" || defLine === "@end") {
        return { ok: false, error: "予約語のため使えません" };
    }
    if (defLine.startsWith("@meta") || defLine === "@endmeta") {
        return { ok: false, error: "メタ記法と衝突する名前は使えません" };
    }
    if (/^@set(\s|$)/.test(defLine)) {
        return { ok: false, error: "「set」は @set（変数）と解釈されるため使えません" };
    }
    if (labels.hasOwnProperty(n) && n !== excludeName) {
        return { ok: false, error: `ラベル「${n}」は既にあります` };
    }
    return { ok: true, name: n };
}

function suggestNewLabelName(labels) {
    let n = 1;
    let name;
    do {
        name = `label_${n++}`;
    } while (labels.hasOwnProperty(name));
    return name;
}

function replaceLabelDefLine(line, newName) {
    const indent = line.match(/^\s*/)[0];
    return `${indent}@${newName}`;
}

/** 脚本パーサーと同様に @ラベル定義行か（@goto / @call 等は除く） */
function labelNameFromDefinitionLine(trimmed) {
    if (!trimmed.startsWith("@")) return null;
    if (trimmed.startsWith("@goto") || trimmed.startsWith("@call")) return null;
    if (trimmed === "@return" || trimmed === "@end") return null;
    if (trimmed.startsWith("@meta") || trimmed === "@endmeta") return null;
    if (/^@set(\s|$)/.test(trimmed)) return null;
    return trimmed.slice(1);
}

function parseChoiceLineTarget(line) {
    const parts = parseChoiceLineParts(line);
    if (!parts?.hasTarget) return null;
    const raw = line.trim().slice(1).trim();
    const arrow = raw.indexOf("=>");
    if (arrow < 0) return null;
    let targetRaw = raw.slice(arrow + 2).trim();
    if (targetRaw.startsWith("@call ")) targetRaw = targetRaw.slice(6).trim();
    else if (targetRaw.startsWith("call ")) targetRaw = targetRaw.slice(5).trim();
    return { target: targetRaw };
}

function isSkippableTailLine(trimmed) {
    return trimmed === "" || trimmed.startsWith("//");
}

function isBlockExitLine(trimmed) {
    return (
        trimmed === "@end" ||
        trimmed === "@return" ||
        parseJumpLineTarget(trimmed, "goto") !== null
    );
}

function nextLabelInDefinitionOrder(labelSourceLines, labelName) {
    const start = labelSourceLines[labelName];
    if (start == null) return null;
    let best = null;
    let bestPos = Infinity;
    for (const [name, pos] of Object.entries(labelSourceLines)) {
        if (pos > start && pos < bestPos) {
            best = name;
            bestPos = pos;
        }
    }
    return best;
}

/**
 * ラベルブロック末尾の構造を調べる
 * - tail: 末尾に連続する @goto / @end / @return 行（空行・コメントは飛ばす）
 * - continuation: このブロックの「続き」（tail、なければ次ラベルへの @goto、最後のブロックなら @end）
 */
function analyzeBlockEnding(lines, labelSourceLines, labelName) {
    const range = getLabelBlockRange(labelSourceLines, labelName, lines.length);
    if (!range) return null;

    let i = range.end - 1;
    while (i > range.start && isSkippableTailLine(lines[i].trim())) i--;
    const contentEnd = i + 1;

    let tailStart = contentEnd;
    while (i > range.start && isBlockExitLine(lines[i].trim())) {
        tailStart = i;
        i--;
    }
    const tailLines = lines.slice(tailStart, contentEnd).map((l) => l.trim());

    let lastChoiceEnd = null;
    for (let j = range.start + 1; j < contentEnd; j++) {
        if (lines[j].trim().startsWith("-")) lastChoiceEnd = j + 1;
    }
    const endsWithChoices =
        lastChoiceEnd != null && lastChoiceEnd === contentEnd;

    let continuation;
    if (endsWithChoices) {
        continuation = [];
    } else if (tailLines.length) {
        continuation = tailLines;
    } else {
        const next = nextLabelInDefinitionOrder(labelSourceLines, labelName);
        continuation = next ? [`@goto ${next}`] : ["@end"];
    }

    return {
        range,
        contentEnd,
        tailStart,
        tailLines,
        lastChoiceEnd,
        endsWithChoices,
        continuation,
    };
}

/** 既存の選択肢の行き先がすべて同じラベルへ @goto で終わっていれば、その合流先 */
function findCommonChoiceMerge(lines, labelSourceLines, range) {
    let common = null;
    for (let j = range.start + 1; j < range.end; j++) {
        if (!lines[j].trim().startsWith("-")) continue;
        const raw = splitChoiceLine(lines[j]).target;
        const target = choiceTargetLabelName(raw);
        if (!target || target !== raw) continue;
        if (labelSourceLines[target] == null) return null;
        const info = analyzeBlockEnding(lines, labelSourceLines, target);
        if (!info || info.tailLines.length !== 1) return null;
        const to = parseJumpLineTarget(info.tailLines[0], "goto");
        if (!to || (common && common !== to)) return null;
        common = to;
    }
    return common;
}

/** 選択肢行を { indent, text, target } に分解（target は `@call x` 等も含む生の文字列） */
function splitChoiceLine(line) {
    const raw = line.trim();
    if (!raw.startsWith("-")) return null;
    const body = raw.slice(1).trim();
    const arrow = body.indexOf("=>");
    return {
        indent: line.match(/^\s*/)[0],
        text: arrow >= 0 ? body.slice(0, arrow).trim() : body,
        target: arrow >= 0 ? body.slice(arrow + 2).trim() : "",
    };
}

/** 選択肢の行き先からラベル名を取り出す（`@call x` / `call x` → x） */
function choiceTargetLabelName(target) {
    let t = (target || "").trim();
    if (t.startsWith("@call ")) t = t.slice(6).trim();
    else if (t.startsWith("call ")) t = t.slice(5).trim();
    return t;
}

/** ブロック内の連続した選択肢行のまとまりを列挙 */
function listChoiceGroups(lines, range) {
    const groups = [];
    let j = range.start + 1;
    while (j < range.end) {
        if (!lines[j].trim().startsWith("-")) {
            j++;
            continue;
        }
        const start = j;
        const choices = [];
        while (j < range.end && lines[j].trim().startsWith("-")) {
            const c = splitChoiceLine(lines[j]);
            choices.push({ text: c.text, target: c.target });
            j++;
        }
        groups.push({ start, end: j, choices });
    }
    return groups;
}

/** 選択肢ダイアログ用: 起点ラベルの末尾状態と既存の選択肢 */
function describeBranchContext(text, labelSourceLines, labelName) {
    const lines = text.split("\n");
    const info = analyzeBlockEnding(lines, labelSourceLines, labelName);
    if (!info) return null;
    const hasChoices = info.lastChoiceEnd != null;
    const groups = listChoiceGroups(lines, info.range).map((g) => ({
        line: g.start,
        choices: g.choices,
    }));
    return {
        hasChoices,
        groups,
        continuation: info.continuation,
        commonMerge: hasChoices
            ? findCommonChoiceMerge(lines, labelSourceLines, info.range)
            : null,
    };
}

/** `${base}_1`, `${base}_2` … で未使用の名前 */
function suggestBranchLabelName(labels, base, taken) {
    const used = (name) =>
        labels.hasOwnProperty(name) || (taken && taken.has(name));
    let n = 1;
    let name;
    do {
        name = `${base}_${n++}`;
    } while (used(name));
    return name;
}

function insertLabelBlocksAt(lines, index, blocks) {
    const out = [];
    if (index > 0 && lines[index - 1].trim() !== "") out.push("");
    blocks.forEach((block) => {
        out.push(...block);
        if (out[out.length - 1] !== "") out.push("");
    });
    lines.splice(index, 0, ...out);
}

function newBranchBlock(name, bodyLines) {
    const block = [`@${name}`, ""];
    if (bodyLines.length) block.push(...bodyLines);
    return block;
}

/**
 * 起点ラベルの選択肢を追加・編集する。
 * 行き先が未定義なら起点ブロックの直後に新ラベルを作り、merge に従って各枝の末尾を書く。
 * spec: {
 *   choices: [{ text, target }],   // target 空なら未接続の選択肢
 *   merge: { mode: "keep" | "none" | "label", label? },
 *   groupLine?: number,            // 指定時はその選択肢グループを choices で丸ごと置き換える
 * }
 */
function patchAddChoiceBranches(text, _script, labels, labelSourceLines, fromLabel, spec) {
    const choices = spec?.choices || [];
    const editing = spec?.groupLine != null;
    if (!fromLabel || !labels.hasOwnProperty(fromLabel)) {
        return { ok: false, error: `ラベル「${fromLabel}」が見つかりません`, text };
    }
    if (choices.length === 0 && !editing) {
        return { ok: false, error: "選択肢がありません", text };
    }

    const newNames = [];
    const callNames = new Set();
    const taken = new Set();
    for (const c of choices) {
        const t = (c.text || "").trim();
        if (!t) return { ok: false, error: "選択肢の文言を入力してください", text };
        if (t.includes("=>")) {
            return { ok: false, error: "選択肢の文言に「=>」は使えません", text };
        }
        const name = choiceTargetLabelName(c.target);
        if (!name || labels.hasOwnProperty(name) || taken.has(name)) continue;
        const v = validateLabelName(name, labels);
        if (!v.ok) return { ok: false, error: v.error, text };
        taken.add(v.name);
        newNames.push(v.name);
        if (name !== (c.target || "").trim()) callNames.add(v.name);
    }

    const lines = text.split("\n");
    const info = analyzeBlockEnding(lines, labelSourceLines, fromLabel);
    if (!info) {
        return { ok: false, error: `ラベル「${fromLabel}」が見つかりません`, text };
    }

    let group = null;
    if (editing) {
        group = listChoiceGroups(lines, info.range).find(
            (g) => g.start === spec.groupLine
        );
        if (!group) {
            return {
                ok: false,
                error: "選択肢の行が見つかりません（脚本が変更されています）",
                text,
            };
        }
    }

    const merge = spec.merge || { mode: "keep" };
    let branchTail = [];
    if (merge.mode === "keep") {
        branchTail = info.continuation;
    } else if (merge.mode === "label") {
        const to = (merge.label || "").trim();
        if (!labels.hasOwnProperty(to) && !taken.has(to)) {
            return { ok: false, error: `合流先「${to}」が見つかりません`, text };
        }
        branchTail = [`@goto ${to}`];
    }

    const indent = group ? lines[group.start].match(/^\s*/)[0] : "";
    const choiceLines = choices.map((c) => {
        const target = (c.target || "").trim();
        return target
            ? `${indent}- ${c.text.trim()} => ${target}`
            : `${indent}- ${c.text.trim()}`;
    });

    let delta;
    if (group) {
        const removeCount = group.end - group.start;
        lines.splice(group.start, removeCount, ...choiceLines);
        delta = choiceLines.length - removeCount;
    } else if (info.lastChoiceEnd != null) {
        lines.splice(info.lastChoiceEnd, 0, ...choiceLines);
        delta = choiceLines.length;
    } else {
        const removeCount = info.contentEnd - info.tailStart;
        lines.splice(info.tailStart, removeCount, ...choiceLines);
        delta = choiceLines.length - removeCount;
    }

    if (newNames.length) {
        const blocks = newNames.map((name) =>
            newBranchBlock(
                name,
                callNames.has(name)
                    ? ["@return"]
                    : branchTail.filter((l) => l !== `@goto ${name}`)
            )
        );
        insertLabelBlocksAt(lines, info.range.end + delta, blocks);
    }

    return { ok: true, text: lines.join("\n"), createdLabels: newNames };
}

/**
 * 起点の直後に新ラベルを作って @goto / @call でつなぐ。
 * goto: 起点の「続き」を新ラベルへ移す（間に1ノード挟む）
 * call: 新ラベルは @return で戻り、起点の続きは明示的に残す
 */
function patchJumpToNewLabel(text, _script, labels, labelSourceLines, fromLabel, newName, kind) {
    if (!labels.hasOwnProperty(fromLabel)) {
        return { ok: false, error: `ラベル「${fromLabel}」が見つかりません`, text };
    }
    const v = validateLabelName(newName, labels);
    if (!v.ok) return { ok: false, error: v.error, text };
    const name = v.name;

    const lines = text.split("\n");
    const info = analyzeBlockEnding(lines, labelSourceLines, fromLabel);
    if (!info) {
        return { ok: false, error: `ラベル「${fromLabel}」が見つかりません`, text };
    }

    let fromTail;
    let body;
    if (kind === "call") {
        fromTail = [`@call ${name}`, ...info.continuation];
        body = ["@return"];
    } else {
        fromTail = [`@goto ${name}`];
        body = info.continuation;
    }

    const removeCount = info.contentEnd - info.tailStart;
    lines.splice(info.tailStart, removeCount, ...fromTail);
    const delta = fromTail.length - removeCount;
    insertLabelBlocksAt(lines, info.range.end + delta, [newBranchBlock(name, body)]);

    return { ok: true, text: lines.join("\n"), createdLabels: [name] };
}

/** ブロック末尾の @goto / @end / @return を @goto toLabel に置き換える（合流） */
function patchMergeInto(text, _script, labels, labelSourceLines, fromLabel, toLabel) {
    if (!fromLabel || !toLabel) {
        return { ok: false, error: "合流元・合流先のラベルが必要です", text };
    }
    if (fromLabel === toLabel) {
        return { ok: false, error: "合流先と同じラベルです", text };
    }
    if (!labels.hasOwnProperty(toLabel)) {
        return { ok: false, error: `ラベル「${toLabel}」が見つかりません`, text };
    }
    const lines = text.split("\n");
    const info = analyzeBlockEnding(lines, labelSourceLines, fromLabel);
    if (!info) {
        return { ok: false, error: `ラベル「${fromLabel}」が見つかりません`, text };
    }
    if (info.endsWithChoices) {
        return {
            ok: false,
            error: `「${fromLabel}」は選択肢で終わっているため合流できません（枝のラベルをタップしてください）`,
            text,
        };
    }
    const removeCount = info.contentEnd - info.tailStart;
    lines.splice(info.tailStart, removeCount, `@goto ${toLabel}`);
    return { ok: true, text: lines.join("\n") };
}

/** ファイル末尾に空のラベルブロックを追加 */
function patchAddLabel(text, _script, labels, _labelSourceLines, labelName) {
    const v = validateLabelName(labelName, labels);
    if (!v.ok) {
        return { ok: false, error: v.error, text };
    }
    const lines = appendLabelStub(text.split("\n"), v.name);
    return { ok: true, text: lines.join("\n"), labelName: v.name };
}

/** 定義行と @goto / @call / 選択肢の参照をまとめて改名 */
function patchRenameLabel(text, _script, labels, labelSourceLines, oldName, newName) {
    const v = validateLabelName(newName, labels, oldName);
    if (!v.ok) {
        return { ok: false, error: v.error, text };
    }
    if (!labels.hasOwnProperty(oldName)) {
        return { ok: false, error: `ラベル「${oldName}」が見つかりません`, text };
    }
    newName = v.name;
    if (oldName === newName) {
        return { ok: true, text };
    }

    const lines = text.split("\n");
    let defCount = 0;
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (labelNameFromDefinitionLine(trimmed) === oldName) {
            lines[i] = replaceLabelDefLine(lines[i], newName);
            defCount++;
        }
    }
    if (defCount === 0) {
        return { ok: false, error: "ラベル定義行が見つかりません", text };
    }

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (labelNameFromDefinitionLine(trimmed) === newName) {
            continue;
        }
        const gotoTarget = parseJumpLineTarget(trimmed, "goto");
        if (gotoTarget === oldName) {
            const indent = lines[i].match(/^\s*/)[0];
            lines[i] = `${indent}@goto ${newName}`;
            continue;
        }
        const callTarget = parseJumpLineTarget(trimmed, "call");
        if (callTarget === oldName) {
            const indent = lines[i].match(/^\s*/)[0];
            lines[i] = `${indent}@call ${newName}`;
            continue;
        }
        if (!trimmed.startsWith("-")) continue;
        const choice = parseChoiceLineTarget(lines[i]);
        if (!choice || choice.target !== oldName) continue;
        const parts = parseChoiceLineParts(lines[i]);
        if (!parts) continue;
        lines[i] = `${parts.indent}- ${parts.textPart} => ${newName}`;
    }

    return { ok: true, text: lines.join("\n"), oldName, newName };
}

/** 脚本内の参照件数（確認ダイアログ用） */
function countLabelReferences(script, labelName) {
    let goto = 0;
    let call = 0;
    let choice = 0;
    if (!script || !labelName) {
        return { goto, call, choice, total: 0 };
    }
    for (const item of script) {
        if (item.type === "goto" && item.target === labelName) goto++;
        if (item.type === "call" && item.target === labelName) call++;
        if (item.type === "choice") {
            for (const c of item.choices || []) {
                if ((c.target || "").trim() === labelName) choice++;
            }
        }
    }
    return { goto, call, choice, total: goto + call + choice };
}

function lineInRanges(i, ranges) {
    return ranges.some((r) => i >= r.start && i < r.end);
}

/** 同名の @ラベル ブロック範囲をすべて列挙 */
function findLabelBlockRanges(lines, labelName) {
    const ranges = [];
    for (let start = 0; start < lines.length; start++) {
        if (labelNameFromDefinitionLine(lines[start].trim()) !== labelName) continue;
        let end = lines.length;
        for (let i = start + 1; i < lines.length; i++) {
            if (labelNameFromDefinitionLine(lines[i].trim()) !== null) {
                end = i;
                break;
            }
        }
        ranges.push({ start, end });
        start = end - 1;
    }
    return ranges;
}

function stripReferencesToLabel(lines, labelName, skipRanges) {
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lineInRanges(i, skipRanges)) continue;
        const trimmed = lines[i].trim();
        const gotoTarget = parseJumpLineTarget(trimmed, "goto");
        if (gotoTarget === labelName) {
            lines.splice(i, 1);
            continue;
        }
        const callTarget = parseJumpLineTarget(trimmed, "call");
        if (callTarget === labelName) {
            lines.splice(i, 1);
            continue;
        }
        if (!trimmed.startsWith("-")) continue;
        const choice = parseChoiceLineTarget(lines[i]);
        if (!choice || choice.target !== labelName) continue;
        const parts = parseChoiceLineParts(lines[i]);
        if (!parts) continue;
        lines[i] = `${parts.indent}- ${parts.textPart}`;
    }
}

/** ラベルブロック削除＋他からの参照を外す */
function patchDeleteLabel(text, script, labels, _labelSourceLines, labelName) {
    if (!labelName) {
        return { ok: false, error: "ラベルが指定されていません", text };
    }
    if (!labels.hasOwnProperty(labelName)) {
        return { ok: false, error: `ラベル「${labelName}」が見つかりません`, text };
    }

    const lines = text.split("\n");
    const ranges = findLabelBlockRanges(lines, labelName);
    if (ranges.length === 0) {
        return { ok: false, error: "ラベル定義行が見つかりません", text };
    }

    stripReferencesToLabel(lines, labelName, ranges);
    for (let r = ranges.length - 1; r >= 0; r--) {
        lines.splice(ranges[r].start, ranges[r].end - ranges[r].start);
    }

    return {
        ok: true,
        text: lines.join("\n"),
        deletedLabel: labelName,
        refsCleared: countLabelReferences(script, labelName).total,
    };
}

const FLOW_EDGE_KIND_RANK = { goto: 0, choice: 1, call: 2, fallthrough: 3 };

/** goto / 選択肢 / call / 定義順の流れからラベルブロックの並べ順を決める */
function computeFlowLabelOrder(script, labels, edges) {
    const names =
        typeof labelNamesInScriptOrder === "function"
            ? labelNamesInScriptOrder(labels)
            : Object.keys(labels).sort((a, b) => labels[a] - labels[b]);
    if (names.length === 0) return [];

    const succ = new Map();
    const incoming = new Map();
    for (const name of names) {
        succ.set(name, []);
        incoming.set(name, 0);
    }

    for (const edge of edges || []) {
        if (!edge.from || !edge.to) continue;
        if (edge.kind === "exit") continue;
        if (edge.kind === "choice" && edge.disconnected) continue;
        if (!labels.hasOwnProperty(edge.from) || !labels.hasOwnProperty(edge.to)) {
            continue;
        }
        succ.get(edge.from).push({
            to: edge.to,
            kind: edge.kind,
            choiceIndex: edge.choiceIndex ?? 0,
        });
        incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    }

    for (const [from, list] of succ) {
        const byTo = new Map();
        for (const item of list) {
            const cur = byTo.get(item.to);
            if (!cur) {
                byTo.set(item.to, item);
                continue;
            }
            const curRank = FLOW_EDGE_KIND_RANK[cur.kind] ?? 9;
            const newRank = FLOW_EDGE_KIND_RANK[item.kind] ?? 9;
            if (newRank < curRank) {
                byTo.set(item.to, item);
            } else if (
                newRank === curRank &&
                item.kind === "choice" &&
                item.choiceIndex < cur.choiceIndex
            ) {
                byTo.set(item.to, item);
            }
        }
        const merged = Array.from(byTo.values());
        merged.sort((a, b) => {
            const dr =
                (FLOW_EDGE_KIND_RANK[a.kind] ?? 9) -
                (FLOW_EDGE_KIND_RANK[b.kind] ?? 9);
            if (dr !== 0) return dr;
            return (a.choiceIndex ?? 0) - (b.choiceIndex ?? 0);
        });
        succ.set(from, merged);
    }

    const starts = names.filter((n) => (incoming.get(n) || 0) === 0);
    const visitOrder = starts.length ? starts : [names[0]];
    const visited = new Set();
    const order = [];

    function visit(name) {
        if (!name || visited.has(name) || !labels.hasOwnProperty(name)) return;
        visited.add(name);
        order.push(name);
        for (const { to } of succ.get(name) || []) {
            visit(to);
        }
    }

    for (const start of visitOrder) {
        visit(start);
    }
    for (const name of names) {
        if (!visited.has(name)) order.push(name);
    }
    return order;
}

/**
 * @ラベル ブロックを goto / 選択肢 / call / 定義順の流れに沿って並べ替える（非可逆寄りの特殊操作）
 */
function reorderScriptByFlow(text, script, labels, labelSourceLines) {
    const names = Object.keys(labels || {});
    if (names.length === 0) {
        return { ok: false, error: "ラベルがありません", text };
    }
    if (typeof buildLabelGraphData !== "function") {
        return { ok: false, error: "グラフデータを構築できません", text };
    }

    const lines = text.split("\n");
    const positions = Object.values(labelSourceLines || {});
    if (!positions.length) {
        return { ok: false, error: "ラベル位置を取得できません", text };
    }

    const data = buildLabelGraphData(script, labels, labelSourceLines);
    const order = computeFlowLabelOrder(script, labels, data.edges);
    const scriptOrder =
        typeof labelNamesInScriptOrder === "function"
            ? labelNamesInScriptOrder(labels)
            : names.sort((a, b) => labels[a] - labels[b]);

    if (order.join("\0") === scriptOrder.join("\0")) {
        return {
            ok: true,
            text,
            order,
            unchanged: true,
        };
    }

    const firstLabelLine = Math.min(...positions);
    const preamble = lines.slice(0, firstLabelLine);
    const blocks = [];

    for (const name of order) {
        const range = getLabelBlockRange(labelSourceLines, name, lines.length);
        if (!range) {
            return { ok: false, error: `ラベル「${name}」のブロックが見つかりません`, text };
        }
        blocks.push(lines.slice(range.start, range.end));
    }

    const out = [...preamble];
    if (blocks.length) {
        if (out.length && out[out.length - 1].trim() !== "") {
            out.push("");
        }
        blocks.forEach((block, i) => {
            if (i > 0 && out.length && out[out.length - 1].trim() !== "") {
                out.push("");
            }
            out.push(...block);
        });
    }

    while (out.length > 1 && out[out.length - 1] === "" && out[out.length - 2] === "") {
        out.pop();
    }

    return {
        ok: true,
        text: out.join("\n"),
        order,
        unchanged: false,
    };
}
