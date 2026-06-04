// Ren'Py 形式レンダラ

function renderRenpyItem(settings, script, labels, item, indent) {
    const pad = "    ".repeat(indent);
    const style = settings.renpyDialogueStyle ? settings.renpyDialogueStyle.value : "name_quote";
    const lines = [];

    if (item.type === "blank") {
        lines.push("");
    } else if (item.type === "line") {
        const name = item.name && item.name.trim() !== "" ? item.name : "";
        const oneLinePerSay = settings.outputUnit && settings.outputUnit.value === "line";
        if (oneLinePerSay) {
            (item.text || "").split("\n").forEach((oneLine) => {
                const text = oneLine.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                if (style === "name_quote" && name) {
                    lines.push(pad + name + ' "' + text + '"');
                } else if (style === "name_quote_both" && name) {
                    const nameEsc = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                    lines.push(pad + '"' + nameEsc + '" "' + text + '"');
                } else {
                    lines.push(pad + '"' + text + '"');
                }
            });
        } else {
            const blockText = (item.text || "")
                .replace(/\\/g, "\\\\")
                .replace(/"/g, '\\"')
                .replace(/\n/g, "\\n");
            if (style === "name_quote" && name) {
                lines.push(pad + name + ' "' + blockText + '"');
            } else if (style === "name_quote_both" && name) {
                const nameEsc = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                lines.push(pad + '"' + nameEsc + '" "' + blockText + '"');
            } else {
                lines.push(pad + '"' + blockText + '"');
            }
        }
    } else if (item.type === "choice") {
        lines.push(pad + "menu:");
        item.choices.forEach(({ text, target }) => {
            const escaped = (text || "").replace(/"/g, '\\"');
            lines.push(pad + '    "' + escaped + '":');
            lines.push(pad + "        jump " + target);
        });
    } else if (item.type === "if_chain") {
        item.branches.forEach((branch, branchIndex) => {
            if (branch.from == null || branch.to == null || branch.from >= branch.to) {
                return;
            }
            if (branch.condition == null) {
                lines.push(pad + "else:");
            } else if (branchIndex === 0) {
                lines.push(pad + "if " + branch.condition + ":");
            } else {
                lines.push(pad + "elif " + branch.condition + ":");
            }
            for (let j = branch.from; j < branch.to; j++) {
                lines.push(
                    ...renderRenpyItem(settings, script, labels, script[j], indent + 1)
                );
            }
        });
    } else if (item.type === "goto") {
        lines.push(pad + "jump " + item.target);
    } else if (item.type === "call") {
        lines.push(pad + "call " + item.target);
    } else if (item.type === "return") {
        lines.push(pad + "return");
    } else if (item.type === "end") {
        lines.push("label end:");
        lines.push(pad + "return");
    } else if (item.type === "comment") {
        lines.push(item.text.replace(/^\/\//, "#"));
    }

    return lines;
}

function renderRenpy(settings, script, labels) {
    const outputLines = [];
    const skip = buildIfChainSkipSet(script);

    for (let i = 0; i < script.length; i++) {
        const labelsHere = getLabelsAtPosition(labels, i);
        labelsHere.forEach((name) => outputLines.push("label " + name + ":"));
        if (skip.has(i)) continue;
        outputLines.push(...renderRenpyItem(settings, script, labels, script[i], 1));
    }
    return outputLines.join("\n");
}
