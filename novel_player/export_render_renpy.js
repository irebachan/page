// Ren'Py 形式レンダラ

function renderRenpy(settings, script, labels) {
    const style = settings.renpyDialogueStyle ? settings.renpyDialogueStyle.value : "name_quote";
    const outputLines = [];
    for (let i = 0; i < script.length; i++) {
        const labelsHere = getLabelsAtPosition(labels, i);
        labelsHere.forEach(name => outputLines.push("label " + name + ":"));
        const item = script[i];
        if (item.type === "blank") {
            outputLines.push("");
        } else if (item.type === "line") {
            const name = item.name && item.name.trim() !== "" ? item.name : "";
            const oneLinePerSay = settings.outputUnit && settings.outputUnit.value === "line";
            if (oneLinePerSay) {
                const lines = (item.text || "").split("\n");
                lines.forEach(oneLine => {
                    const text = oneLine.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                    if (style === "name_quote" && name) {
                        outputLines.push('    ' + name + ' "' + text + '"');
                    } else if (style === "name_quote_both" && name) {
                        const nameEsc = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                        outputLines.push('    "' + nameEsc + '" "' + text + '"');
                    } else {
                        outputLines.push('    "' + text + '"');
                    }
                });
            } else {
                const blockText = (item.text || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
                if (style === "name_quote" && name) {
                    outputLines.push('    ' + name + ' "' + blockText + '"');
                } else if (style === "name_quote_both" && name) {
                    const nameEsc = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                    outputLines.push('    "' + nameEsc + '" "' + blockText + '"');
                } else {
                    outputLines.push('    "' + blockText + '"');
                }
            }
        } else if (item.type === "choice") {
            outputLines.push("    menu:");
            item.choices.forEach(({ text, target }) => {
                const escaped = (text || "").replace(/"/g, '\\"');
                outputLines.push('        "' + escaped + '":');
                outputLines.push("            jump " + target);
            });
        } else if (item.type === "goto") {
            outputLines.push("    jump " + item.target);
        } else if (item.type === "end") {
            outputLines.push("label end:");
            outputLines.push("    return");
        } else if (item.type === "comment") {
            outputLines.push(item.text.replace(/^\/\//, "#"));
        }
    }
    return outputLines.join("\n");
}
