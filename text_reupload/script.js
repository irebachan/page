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

    content = content.replace(/\[.*?\]/g, '').replace(/［＃.*?］/g, '');//[]に囲まれた部分を取り除く

    content = ss(content);

    // Display processed content
    document.getElementById('processedContent').value = content;
}



function ss(text) {

    text = text.replace(/([^「\n])「/g, '$1\n「') // 「の前に文字がある（\nは例外）「を \n「に置き換える
        .replace(/」([^」\n])/g, '」\n$1') // 」の後に文字がある（\nは例外）を 」\nに置き換える
        .replace(/([^\n」])\n「/g, '$1\n\n「') // 手前に \n と 」以外の文字がある \n「 を \n\n「 に置き換える
        .replace(/」\n([^\n「])/g, '」\n\n$1'); // 後ろに \n と 「以外の文字がある 」\n を 」\n\n に置き換える

    //let escapedText =line.replace(/\n/g, "\\n");//改行チェック用
    //console.log(escapedText);
    
    return text;
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
