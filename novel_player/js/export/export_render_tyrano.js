// ティラノスクリプト形式レンダラ

function renderTyranoItem(settings, script, labels, item) {
    const pageBreak = settings.pageBreakSymbol.value.trim();
    const lineBreak = settings.lineBreakSymbol.value.trim();
    const clickWait =
        settings.useClickWait && settings.useClickWait.checked
            ? settings.clickWaitSymbol.value.trim()
            : "";
    const labelSym = settings.labelSymbol.value.trim() || "*";
    const lines = [];

    if (item.type === "blank") {
        lines.push("");
    } else if (item.type === "line") {
        if (item.name != null && item.name.trim() !== "") {
            lines.push("#" + item.name);
        } else {
            lines.push("#");
        }
        const oneLinePerPage =
            settings.outputUnit && settings.outputUnit.value === "line";
        const formatted = formatLineBlock(
            settings,
            item.name || "",
            item.text || "",
            pageBreak,
            lineBreak,
            clickWait,
            oneLinePerPage
        );
        lines.push(...formatted);
    } else if (item.type === "choice") {
        const tpl =
            (settings.choiceLineTemplate &&
                settings.choiceLineTemplate.value.trim()) ||
            "[link target=@LABEL]@TEXT[endlink][r]";
        const blockEnd =
            (settings.choiceBlockEnd &&
                settings.choiceBlockEnd.value.trim()) ||
            "[s]";
        item.choices.forEach(({ text, target }, idx) => {
            const n = idx + 1;
            const nStr = String(n).replace(/[0-9]/g, (c) =>
                String.fromCharCode(0xff10 + (c.charCodeAt(0) - 0x30))
            );
            const labelValue = labelSym + target;
            const line = tpl
                .replace(/@LABEL/g, labelValue)
                .replace(/@TEXT/g, text)
                .replace(/@N/g, nStr);
            lines.push(line);
        });
        if (blockEnd) lines.push(blockEnd);
    } else if (item.type === "if_chain") {
        item.branches.forEach((branch, branchIndex) => {
            if (
                branch.from == null ||
                branch.to == null ||
                branch.from >= branch.to
            ) {
                return;
            }
            lines.push(tyranoIfOpenTag(branch, branchIndex));
            for (let j = branch.from; j < branch.to; j++) {
                lines.push(
                    ...renderTyranoItem(settings, script, labels, script[j])
                );
            }
        });
        lines.push("[endif]");
    } else if (item.type === "goto") {
        lines.push(formatTyranoJumpTag(settings, item.target));
    } else if (item.type === "call") {
        lines.push(formatTyranoCallTag(settings, item.target));
    } else if (item.type === "return") {
        lines.push(formatTyranoReturnTag(settings));
    } else if (item.type === "end") {
        lines.push(labelSym + "end");
    } else if (item.type === "comment") {
        lines.push(item.text.replace(/^\/\//, ";"));
    }

    return lines;
}

function renderTyrano(settings, script, labels) {
    const labelBelow =
        settings.labelBelowTag && settings.labelBelowTag.value.trim();
    const outputLines = [];
    const skip = buildIfChainSkipSet(script);

    for (let i = 0; i < script.length; i++) {
        const labelsHere = getLabelsAtPosition(labels, i);
        labelsHere.forEach((name) => outputLines.push((settings.labelSymbol.value.trim() || "*") + name));
        if (labelsHere.length > 0 && labelBelow) outputLines.push(labelBelow);
        if (skip.has(i)) continue;
        outputLines.push(...renderTyranoItem(settings, script, labels, script[i]));
    }
    return outputLines.join("\n");
}
