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
    document.getElementById('processedContent').value = content.trim();
}

function copyToClipboard() {
    const processedContent = document.getElementById('processedContent');
    processedContent.select();
    processedContent.setSelectionRange(0, 99999); // For mobile devices

    try {
        document.execCommand('copy');
        alert('Copied to clipboard!');
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