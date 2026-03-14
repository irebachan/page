// エクスポート用共通ヘルパー（複数フォーマットで利用）

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
