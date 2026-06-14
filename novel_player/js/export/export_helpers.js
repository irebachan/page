// エクスポート用共通ヘルパー（複数フォーマットで利用）

/** if_chain 枝本文の script 添字（親 if_chain でまとめて出力する） */
function buildIfChainSkipSet(script) {
    const skip = new Set();
    for (const item of script) {
        if (item.type !== "if_chain") continue;
        for (const branch of item.branches) {
            if (branch.from == null || branch.to == null) continue;
            for (let j = branch.from; j < branch.to; j++) skip.add(j);
        }
    }
    return skip;
}

/** ティラノ [if exp="…"] 用（属性内の " をエスケープ） */
function escapeTyranoIfExp(condition) {
    return String(condition ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');
}

function tyranoIfOpenTag(branch, branchIndex) {
    if (branch.condition == null) return "[else]";
    const exp = escapeTyranoIfExp(branch.condition);
    if (branchIndex === 0) return `[if exp="${exp}"]`;
    return `[elsif exp="${exp}"]`;
}

function tyranoLabelRef(settings, labelName) {
    return (settings.labelSymbol?.value?.trim() || "*") + labelName;
}

/** ジャンプタグ（@goto → 設定テンプレート） */
function formatTyranoJumpTag(settings, target) {
    const jumpTag = settings.jumpTag?.value?.trim() || "";
    const labelValue = tyranoLabelRef(settings, target);
    if (jumpTag && (jumpTag.includes("@LABEL") || jumpTag.includes("@"))) {
        return jumpTag.includes("@LABEL")
            ? jumpTag.replace(/@LABEL/g, labelValue)
            : jumpTag.replace("@", labelValue);
    }
    return "@goto " + target;
}

/** サブルーチン呼び出し（@call → 設定テンプレート、既定 [call target=@LABEL]） */
function formatTyranoCallTag(settings, target) {
    const callTag = settings.callTag?.value?.trim() || "";
    const labelValue = tyranoLabelRef(settings, target);
    if (callTag && (callTag.includes("@LABEL") || callTag.includes("@"))) {
        return callTag.includes("@LABEL")
            ? callTag.replace(/@LABEL/g, labelValue)
            : callTag.replace("@", labelValue);
    }
    if (callTag) return callTag;
    return "[call target=" + labelValue + "]";
}

/** サブルーチン戻り（@return → 設定テンプレート、既定 [return]） */
function formatTyranoReturnTag(settings) {
    const tag = settings.returnTag?.value?.trim();
    return tag || "[return]";
}

function getLabelsAtPosition(labels, index) {
    return Object.keys(labels).filter(name => labels[name] === index);
}

function splitByPunctuation(settings, text) {
    const result = [];
    const marksStr = (settings.punctuationMarksInput && settings.punctuationMarksInput.value) ? settings.punctuationMarksInput.value : "。！!？?.,";
    const punctuationMarks = Array.from(marksStr);
    let currentText = "";
    let currentIndex = 0;
    while (currentIndex < text.length) {
        const char = text[currentIndex];
        currentText += char;
        if (punctuationMarks.includes(char)) {
            result.push({ text: currentText.slice(0, -1), punctuation: char });
            currentText = "";
        }
        currentIndex++;
    }
    if (currentText) {
        result.push({ text: currentText, punctuation: null });
    }
    return result;
}

/** @meta 〜 @endmeta ブロックを key=value にパース（先頭の1ブロックのみ） */
function parseMetaBlock(scriptText) {
    const m = (scriptText || "").match(/(^|\n)\s*@meta\s*\n([\s\S]*?)\n\s*@endmeta(?:\n|$)/);
    if (!m) return null;
    const parsed = {};
    (m[2] || "").split("\n").forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line || line.startsWith("//")) return;
        const eq = line.indexOf("=");
        if (eq <= 0) return;
        const key = line.slice(0, eq).trim();
        const value = line.slice(eq + 1).trim();
        if (key) parsed[key] = value;
    });
    return parsed;
}

const EXPORT_REPLACE_PREFIX = "export.replace.";

/** @meta 本文から export.replace.<検索>=<置換> 行を上から順に集める */
function parseExportReplaceRulesFromMetaBody(body) {
    const rules = [];
    (body || "").split("\n").forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line || line.startsWith("//")) return;
        const eq = line.indexOf("=");
        if (eq <= 0) return;
        const key = line.slice(0, eq).trim();
        if (!key.startsWith(EXPORT_REPLACE_PREFIX)) return;
        const from = key.slice(EXPORT_REPLACE_PREFIX.length);
        if (!from) return;
        rules.push({ from, to: line.slice(eq + 1).trim() });
    });
    return rules;
}

function parseExportReplaceFromScript(scriptText) {
    const m = (scriptText || "").match(/(^|\n)\s*@meta\s*\n([\s\S]*?)\n\s*@endmeta(?:\n|$)/);
    if (!m) return [];
    return parseExportReplaceRulesFromMetaBody(m[2]);
}

function applyStringReplacements(outputText, rules) {
    if (!rules?.length) return outputText;
    let text = outputText;
    for (const { from, to } of rules) {
        if (!from) continue;
        text = text.replace(new RegExp(from, "g"), to ?? "");
    }
    return text;
}

function formatLineBlock(settings, name, text, pageBreak, lineBreak, clickWait, oneLinePerPage) {
    const outputLines = [];
    const block = text ? text.split("\n") : [];
    if (block.length === 0) {
        if (pageBreak) outputLines.push(pageBreak);
        return outputLines;
    }
    const lastValidLineIndex = [...block].reverse().findIndex(line => line.trim() !== "");
    const lastValidLine = lastValidLineIndex === -1 ? -1 : block.length - 1 - lastValidLineIndex;
    block.forEach((line, index) => {
        if (line.trim() === "") {
            outputLines.push(line);
            return;
        }
        const isLastValidLine = index === lastValidLine;
        let processedLine = "";
        const segments = splitByPunctuation(settings, line);
        segments.forEach((segment, segIndex) => {
            processedLine += segment.text;
            if (segment.punctuation) {
                processedLine += segment.punctuation;
                if (!isLastValidLine || segIndex < segments.length - 1) {
                    if (clickWait) processedLine += clickWait;
                }
            }
        });
        if (oneLinePerPage) {
            if (pageBreak) processedLine += pageBreak;
        } else {
            if (!isLastValidLine) {
                if (lineBreak) processedLine += lineBreak;
            } else {
                if (pageBreak) processedLine += pageBreak;
            }
        }
        outputLines.push(processedLine);
    });
    return outputLines;
}
