// ツールを表示する関数
function renderTools(sortedTools) {
    const container = document.getElementById('tools-container');
    container.style.opacity = 0;

    setTimeout(() => {
        container.innerHTML = '';

        sortedTools.forEach(tool => {
            const toolElement = document.createElement('div');
            toolElement.className = 'tool-container';
            toolElement.innerHTML = `
                <div class="tool-title">${tool.title}</div>
                <a href="${tool.link}" class="tool-link">${tool.link}</a>
                <div class="tool-date">${tool.date}</div>
            `;
            container.appendChild(toolElement);
        });

        container.style.opacity = 1;
    }, 300);
}

// 新しい順にソート（デフォルト）
function sortByNewest() {
    return [...tools].sort((a, b) => b.timestamp - a.timestamp);
}

// 古い順にソート
function sortByOldest() {
    return [...tools].sort((a, b) => a.timestamp - b.timestamp);
}

// ソートボタンのイベントリスナー
document.getElementById('sort-newest').addEventListener('click', function () {
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    this.classList.add('active');
    renderTools(sortByNewest());
});

document.getElementById('sort-oldest').addEventListener('click', function () {
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    this.classList.add('active');
    renderTools(sortByOldest());
});

// 初期表示（新しい順）
renderTools(sortByNewest()); 