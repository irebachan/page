// ティラノスクリプト形式レンダラ

function renderTyrano(settings, script, labels) {
    const pageBreak = settings.pageBreakSymbol.value.trim();
    const lineBreak = settings.lineBreakSymbol.value.trim();
    const clickWait = (settings.useClickWait && settings.useClickWait.checked) ? settings.clickWaitSymbol.value.trim() : "";
    const labelSym = settings.labelSymbol.value.trim() || "*";
    const jumpTag = settings.jumpTag.value.trim();
    const outputLines = [];
    for (let i = 0; i < script.length; i++) {
        const labelsHere = getLabelsAtPosition(labels, i);
        labelsHere.forEach(name => outputLines.push(labelSym + name));
        const labelBelow = settings.labelBelowTag && settings.labelBelowTag.value.trim();
        if (labelsHere.length > 0 && labelBelow) outputLines.push(labelBelow);
        const item = script[i];
        if (item.type === "blank") {
            outputLines.push("");
        } else if (item.type === "line") {
            if (item.name != null && item.name.trim() !== "") {
                outputLines.push("#" + item.name);
            } else {
                outputLines.push("#");
            }
            const oneLinePerPage = settings.outputUnit && settings.outputUnit.value === "line";
            const formatted = formatLineBlock(settings, item.name || "", item.text || "", pageBreak, lineBreak, clickWait, oneLinePerPage);
            outputLines.push(...formatted);
        } else if (item.type === "choice") {
            const tpl = (settings.choiceLineTemplate && settings.choiceLineTemplate.value.trim()) || "[link target=@LABEL]@TEXT[endlink][r]";
            const blockEnd = (settings.choiceBlockEnd && settings.choiceBlockEnd.value.trim()) || "[s]";
            item.choices.forEach(({ text, target }, idx) => {
                const n = idx + 1;
                const nStr = String(n).replace(/[0-9]/g, c => String.fromCharCode(0xFF10 + (c.charCodeAt(0) - 0x30)));
                const labelValue = labelSym + target;
                const line = tpl.replace(/@LABEL/g, labelValue).replace(/@TEXT/g, text).replace(/@N/g, nStr);
                outputLines.push(line);
            });
            if (blockEnd) outputLines.push(blockEnd);
        } else if (item.type === "goto") {
            if (jumpTag && (jumpTag.includes("@LABEL") || jumpTag.includes("@"))) {
                const repl = jumpTag.includes("@LABEL")
                    ? jumpTag.replace(/@LABEL/g, labelSym + item.target)
                    : jumpTag.replace("@", labelSym + item.target);
                outputLines.push(repl);
            } else {
                outputLines.push("@goto " + item.target);
            }
        } else if (item.type === "end") {
            outputLines.push(labelSym + "end");
        } else if (item.type === "comment") {
            outputLines.push(item.text.replace(/^\/\//, ";"));
        }
    }
    return outputLines.join("\n");
}
