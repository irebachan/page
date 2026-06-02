// カスタム形式エクスポート（行ベース＋記号置換）

function processBlockCustom(settings, block, outputLines, pageBreak, lineBreak, clickWait, currentName) {
    if (block.length === 0) return;
    if (block[0].startsWith("@") || block[0].startsWith("*") || block[0].startsWith("-")) {
        block.forEach(line => outputLines.push(line));
        return;
    }
    if (block[0].startsWith("#")) {
        outputLines.push(block[0]);
        block = block.slice(1);
    }
    if (block.length === 0) {
        outputLines.push(pageBreak);
        return;
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
                    processedLine += clickWait;
                }
            }
        });
        if (!isLastValidLine) {
            processedLine += lineBreak;
        } else {
            processedLine += pageBreak;
        }
        outputLines.push(processedLine);
    });
}

function processScriptForExport(settings, rawScript, pageBreak, lineBreak, clickWait) {
    const lines = rawScript.split("\n");
    const outputLines = [];
    let currentBlock = [];
    let currentName = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") {
            if (currentBlock.length > 0) {
                processBlockCustom(settings, currentBlock, outputLines, pageBreak, lineBreak, clickWait, currentName);
                currentBlock = [];
            }
            outputLines.push("");
        } else if (line.startsWith("//")) {
            if (currentBlock.length > 0) {
                processBlockCustom(settings, currentBlock, outputLines, pageBreak, lineBreak, clickWait, currentName);
                currentBlock = [];
            }
            outputLines.push(line);
        } else if (line.startsWith("#")) {
            if (currentBlock.length > 0) {
                processBlockCustom(settings, currentBlock, outputLines, pageBreak, lineBreak, clickWait, currentName);
                currentBlock = [];
            }
            currentName = line.slice(1);
            currentBlock.push(line);
        } else if (line.startsWith("@") || line.startsWith("*") || line.startsWith("-")) {
            if (currentBlock.length > 0) {
                processBlockCustom(settings, currentBlock, outputLines, pageBreak, lineBreak, clickWait, currentName);
                currentBlock = [];
            }
            outputLines.push(line);
        } else {
            currentBlock.push(line);
        }
    }

    if (currentBlock.length > 0) {
        processBlockCustom(settings, currentBlock, outputLines, pageBreak, lineBreak, clickWait, currentName);
    }

    let outputText = outputLines.join("\n");
    const labelSymbol = settings.labelSymbol.value.trim();
    if (labelSymbol && labelSymbol !== "@") {
        outputText = outputText.replace(/^@(?!goto\s)/gm, labelSymbol);
    }
    const jumpTag = settings.jumpTag.value.trim();
    if (jumpTag) {
        const effectiveLabel = labelSymbol || "*";
        const repl = (name) => jumpTag.includes("@LABEL")
            ? jumpTag.replace(/@LABEL/g, effectiveLabel + name)
            : jumpTag.replace("@", effectiveLabel + name);
        if (jumpTag.includes("@LABEL") || jumpTag.includes("@")) {
            outputText = outputText.replace(/@goto\s+(\w+)/g, (match, labelName) => repl(labelName));
        }
    }
    return outputText;
}
