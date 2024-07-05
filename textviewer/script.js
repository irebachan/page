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
        if (myViewer.GetFormattedText() != "") {
            console.log("開かれてないけどなんかは書かれてるよ");
        } else {
            alert('ファイルが開かれていません。ファイルを選択してください。');
            return;
        }
    }

    myViewer.updateViewer();
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

//ダークモード
const DarkMode = (() => {
    const lightModeRadio = document.getElementById('lightMode');
    const darkModeRadio = document.getElementById('darkMode');

    const init = () => {
        // ローカルストレージからダークモードの状態を取得
        const currentMode = localStorage.getItem('dark-mode');
        if (currentMode === 'enabled') {
            document.body.classList.add('dark-mode');
            darkModeRadio.checked = true;
        } else {
            lightModeRadio.checked = true;
        }

        lightModeRadio.addEventListener('change', handleRadioChange);
        darkModeRadio.addEventListener('change', handleRadioChange);
    };

    const handleRadioChange = () => {
        if (darkModeRadio.checked) {
            enableDarkMode();
        } else {
            disableDarkMode();
        }
    };

    const enableDarkMode = () => {
        document.body.classList.add('dark-mode');
        localStorage.setItem('dark-mode', 'enabled');
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('dark-mode', 'disabled');
    };

    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', (event) => {
    DarkMode.init();
});



//スライド
const ResizerApp = {
    resizer: document.getElementById('resizer'),
    textbox1: document.getElementById('viewer'),
    textbox2: document.getElementById('editor'),
    container: document.querySelector('.container'),
    radioButtons: document.querySelectorAll('input[name="orientation"]'),
    isResizing: false,
    isHorizontal: true,

    init: function () {
        this.resizer.addEventListener('mousedown', this.onMouseDown);
        this.radioButtons.forEach(radio => {
            radio.addEventListener('change', this.onOrientationChange);
        });
    },

    onMouseDown: function (e) {
        ResizerApp.isResizing = true;
        document.addEventListener('mousemove', ResizerApp.onMouseMove);
        document.addEventListener('mouseup', ResizerApp.onMouseUp);
    },

    onMouseMove: function (e) {
        if (!ResizerApp.isResizing) return;

        const containerRect = ResizerApp.container.getBoundingClientRect();
        let offset, size1, size2;

        if (ResizerApp.isHorizontal) {
            offset = e.clientX - containerRect.left;
            size1 = (offset / containerRect.width) * 100;
        } else {
            offset = e.clientY - containerRect.top;
            size1 = (offset / containerRect.height) * 100;
        }

        size2 = 100 - size1;

        ResizerApp.textbox1.style.flexBasis = `${size1}%`;
        ResizerApp.textbox2.style.flexBasis = `${size2}%`;
    },

    onMouseUp: function () {
        ResizerApp.isResizing = false;
        document.removeEventListener('mousemove', ResizerApp.onMouseMove);
        document.removeEventListener('mouseup', ResizerApp.onMouseUp);
    },

    onOrientationChange: function (e) {
        if (e.target.value === 'horizontal') {
            ResizerApp.container.classList.remove('vertical');
            ResizerApp.container.classList.add('horizontal');
            ResizerApp.resizer.style.cursor = 'ew-resize';
            ResizerApp.isHorizontal = true;
        } else {
            ResizerApp.container.classList.remove('horizontal');
            ResizerApp.container.classList.add('vertical');
            ResizerApp.resizer.style.cursor = 'ns-resize';
            ResizerApp.isHorizontal = false;
        }
        ResizerApp.textbox1.style.flexBasis = '';
        ResizerApp.textbox2.style.flexBasis = '';
    }
};

// 初期化
ResizerApp.init();
