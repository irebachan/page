document.getElementById('uploadForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const file = document.getElementById('fileInput').files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        const code = event.target.result;
        const comments = extractComments(code);
        displayComments(comments);
    };

    reader.readAsText(file);
});

function extractComments(code) {
    const comments = [];
    const lines = code.split('\n');

    for (let line of lines) {
        const commentMatch = line.match(/\/\/(.*)/);
        if (commentMatch) {
            comments.push(commentMatch[1].trim());
        }
    }

    return comments;
}

function displayComments(comments) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<h2>抽出されたコメント:</h2><pre>' + comments.join('\n') + '</pre>';
}
