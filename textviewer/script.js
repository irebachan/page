let currentFile = null; // 現在開いているファイル

document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        currentFile = file; // 現在開いているファイルを保存
        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            const formattedText = formatText(text, 47);
            document.getElementById('viewer').textContent = formattedText;
            document.getElementById('editor').value = text;
        };
        reader.readAsText(file);
    }
});

document.getElementById('saveButton').addEventListener('click', function () {
    const text = document.getElementById('editor').value;
    const processedText = processText(text);
    updateViewer(processedText);

    if (!currentFile) {
        alert('ファイルが開かれていません。ファイルを選択してください。');
        return;
    }

    // ファイル名を元のファイル名に設定
    const filename = currentFile.name;
    const file = new Blob([processedText], { type: 'text/plain' });

    // ファイルを保存するためのダウンロード用リンクを作成
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = filename;

    // クリックして保存ダイアログを開く
    a.click();
    URL.revokeObjectURL(a.href);
});

document.getElementById('updateButton').addEventListener('click', function () {
    const text = document.getElementById('editor').value;
    const processedText = processText(text);
    updateViewer(processedText);
    document.getElementById('editor').value = processedText;
});

function updateViewer(text) {
    const charCountInputValue = document.getElementById('charCountInput').value;
    const formattedText = formatText(text, charCountInputValue);
    document.getElementById('viewer').textContent = formattedText;
}

function formatText(text, lineLength) {
    const lines = text.split('\n');
    let formattedText = '';

    lines.forEach(line => {
        while (line.length > lineLength) {
            formattedText += line.slice(0, lineLength) + '\n';
            line = line.slice(lineLength);
        }
        formattedText += line + '\n';
    });

    return formattedText;
}

function processText(text) {
    // 文頭以外および!?！？の直後以外のスペースを削除
    return text.replace(/(?<=.)(?<![!?！？])[ 　]/g, '');
}
