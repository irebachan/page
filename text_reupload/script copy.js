document.getElementById('fileInput').addEventListener('change', readFile);
document.getElementById('processButton').addEventListener('click', processText);
document.getElementById('copyButton').addEventListener('click', copyToClipboard);
document.getElementById('downloadButton').addEventListener('click', downloadProcessedText);

function readFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('fileContent').value = e.target.result;
        };
        reader.readAsText(file);
    }
}

function processText() {
    
    let content = document.getElementById('fileContent').value;

    // Remove text within brackets and ［＃...］ sections
    content = content.replace(/\[.*?\]/g, '').replace(/［＃.*?］/g, '');

    // Add empty lines before and after quotes, except for consecutive quotes
    content = content.replace(/(「.*?」)(?!「.*?」)/g, '\n\n$1\n\n').replace(/\n{3,}/g, '\n\n');

    // Display processed content
    document.getElementById('processedContent').value = content;
}

const originalText = `

「なんだお前」 
腹いてえ「かわいそう」と思った
「そうかもな」
「ほんまかいな」



おれんち
「気まぐれ」`;

function Start() {
    document.getElementById('fileContent').value = originalText;
}

Start();



function formatText(text) {
    // 「」で囲まれた部分を抽出する正規表現
    const regex = /([^「]*)「([^」]*)」([^「]*)/g;

    // 正規表現にマッチする部分を全て取得
    let match;
    let formattedText = '';
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
        // 「」で囲まれた部分の前後に改行と空行を追加する
        const before = match[1];
        const inside = match[2];
        const after = match[3];

        // 改行を挿入する際、前後が空文字列でないことを確認してから挿入する
        formattedText += (before.trim() !== '' ? before + '\n\n' : '') + '「' + inside + '」' + '\n\n' + (after.trim() !== '' ? after + '\n' : '');

        lastIndex = regex.lastIndex;
    }

    // 残りの部分を追加する
    formattedText += text.substring(lastIndex);

    return formattedText;
}

function replace(text) {
    // 文字列全体を保持する変数
    let result = '';

    // 文字列を改行で分割
    let lines = text.split('\n');

    // 各行に対して処理を行う
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.includes('「') && !line.startsWith('「')) {
            line = line.replace(/([^「])「/g, '$1\n「');
        }

        if (line.includes('」') && !line.endsWith('」')) {
            line = line.replace(/([^」])」/g, '$1」\n');
        }


        result += line;

    }

    // 最終的な結果をcontentに代入する
    return result;
}

function copyToClipboard() {
    const processedContent = document.getElementById('processedContent');
    processedContent.select();
    processedContent.setSelectionRange(0, 99999); // For mobile devices

    try {
        document.execCommand('copy');
        //alert('Copied to clipboard!');
    } catch (err) {
        alert('Failed to copy text');
    }
}

function downloadProcessedText() {
    const processedContent = document.getElementById('processedContent').value;
    const blob = new Blob([processedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
