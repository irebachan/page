let currentFile = null; // 現在開いているファイル
const myViewer = new Viewer();

// ファイルの読み込みと表示を行う関数
function loadFile(file) {
    if (!file) return;

    currentFile = file; // 現在開いているファイルを保存
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        myViewer.setEditor(text);
        myViewer.updateViewer();
    };
    reader.readAsText(file);
}

//ファイルの保存
function saveEditorContent() {
    if (!currentFile) {
        alert('ファイルが開かれていません。ファイルを選択してください。');
        return;
    }
    const processedText = myViewer.GetFormattedText(useEndOflineProcessing = false);

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
}

//ボタン
document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    loadFile(file);
});

document.getElementById('saveButton').addEventListener('click', function () {
    saveEditorContent();
});

document.getElementById('updateButton').addEventListener('click', function () {
    myViewer.updateViewer();
});

// ショートカット
//inputボタンにキーボードショートカット（Cmd+O）を設定
document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'o') {
        event.preventDefault(); // デフォルトのショートカット動作を無効化
        document.getElementById('fileInput').click(); // ファイル入力をクリック
    }
});

//保存
document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault(); // デフォルトのショートカット動作を無効化
        saveEditorContent();
    }
});

// 更新ボタンにキーボードショートカット（Cmd+R）を設定
document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'r') {
        event.preventDefault(); // デフォルトのショートカット動作を無効化
        myViewer.updateViewer();
    }
});

//インプット
fontSizeInput.addEventListener('input', function () {
    myViewer.UpdateStyle();
});

lineHeightInput.addEventListener('input', function () {
    myViewer.UpdateStyle();
});

lineLengthInput.addEventListener('input', function () {
    myViewer.updateViewer();
});


// コンストラクタ関数
function Viewer() {
    this.editor = document.getElementById('editor');
    this.viewer = document.getElementById('viewer');

    this.fontSizeInput = document.getElementById('fontSizeInput');
    this.lineHeightInput = document.getElementById('lineheightinput');
}
 
Viewer.prototype.UpdateStyle = function () {
    // フォントサイズと行間を更新する関数
    const fontSize = fontSizeInput.value + 'px';
    const lineHeight = lineHeightInput.value;

    editor.style.fontSize = fontSize;
    editor.style.lineHeight = lineHeight;
    viewer.style.fontSize = fontSize;
    viewer.style.lineHeight = lineHeight;

    this.updateViewer();
}

Viewer.prototype.setEditor = function (text) {
    this.editor.value = text;
 }

Viewer.prototype.GetFormattedText = function (useEndOflineProcessing = true) {
    const text = this.editor.value;
    let t = new TextFormatter(text).SpaceDeleate();

    if (useEndOflineProcessing) {
        t = t.EndOflineProcessing();
    }

    return t.value;
}


Viewer.prototype.updateViewer = function () {
    //viewの中を書き換える
    this.viewer.textContent = this.GetFormattedText();
    this.editor.value = this.GetFormattedText(useEndOflineProcessing = false);
};

// プロトタイプのメソッドをラップする
const originalUpdateViewer = Viewer.prototype.updateViewer;
Viewer.prototype.updateViewer = function () {
    // 元の updateViewer を呼び出す
    originalUpdateViewer.call(this);

    // テキストエリアの内容をカウントして表示する関数
    function countCharacters() {
        const text = this.editor.value.replace(/[\n\s]/g, ''); // 改行とスペースを除去してテキストを取得
        const length = text.length;
        const count = document.getElementById('char-count');
        count.textContent = length;
    }

    // countCharacters を先に実行
    countCharacters();
};


//テキストの変換
class TextFormatter {
    constructor(value) {
        this.value = value;
        this.lineLengthElement = document.getElementById('lineLengthInput');
    }

    SetText(text) {
        this.value = text;
    }

    // 文頭以外および!?！？の直後以外のスペースを削除
    SpaceDeleate() {
        const isChecked = document.getElementById("space").checked;
        if (isChecked) {
            this.value = this.value.replace(/(?<=.)(?<![!?！？])[ 　]/g, '');
        }
        return this;
    }

    //行末処理 
    EndOflineProcessing() {
        const len = Number(this.lineLengthElement.value); // 数値に変換する
        if (isNaN(len) || len <= 0) {
            console.error('Invalid line length');
            return this;
        }

        const lines = this.value.split('\n');
        let formattedText = '';

        lines.forEach(line => {
            while (line.length > len) {
                let substring = line.slice(0, len);
                let remaining = line.slice(len);

                // 次の文字が特定の文字で始まる場合、その部分まで含む
                const match = remaining.match(/^([。、「」『』（）])/);
                if (match) {
                    substring = line.slice(0, len + match[0].length);
                    remaining = line.slice(len + match[0].length);
                }

                formattedText += substring + '\n';

                line = remaining.trim(); // 残りの部分をトリムして改行に対応する
            }
            formattedText += line + '\n';
        });

        this.value = formattedText;
        return this;
    }
}
