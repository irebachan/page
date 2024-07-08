const myViewer = new Viewer();

const SaveFiles = {
    currentFile: null, // 現在開いているファイル
    
    loadFile: function (file) {
        if (!file) return;
        this.currentFile = file; // 現在開いているファイルを保存

        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            myViewer.setEditor(text);
            myViewer.updateViewer();
        };
        reader.onerror = function (e) {
            console.error('Error reading file:', e);
        };
        reader.readAsText(file);
    },


    newFile: function () {
        /*if (myViewer.GetEditorTrim()) {
            // ユーザーにYes/Noを尋ねる確認ダイアログを表示
            let userResponse = confirm("エディタを初期化しますか？");
            if (userResponse) {
            } 
        }*/
        
        this.currentFile = null;
        myViewer.setEditor("");
        myViewer.updateViewer();
        document.getElementById('fileInput').value = null;// ファイル入力フィールドの表示をリセット

    },

    
    saveFile: function () {
        if (!this.currentFile)
        {
            if (!myViewer.GetEditorTrim()) {
                alert('ファイルが開かれていません。ファイルを選択してください。');
                return;
            }   
        }
        
        //更新
        myViewer.updateViewer();

        // ファイル名を設定
        const filename = this.getFineName();
        //ファイルを生成
        const file = this.createFile(filename);

        if (this.currentFile == null) {
            this.loadFile(file);
            // ファイル入力フィールドの表示を更新
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            document.getElementById('fileInput').files = dataTransfer.files;
        }
    },

    getFineName: function () {
        if (this.currentFile ==null) return TextFormat.sanitizeFilename();
        return this.currentFile.name;
    },

    getText: function () {
        return myViewer.GetFormattedText(useEndOflineProcessing = false);
    },

    createFile: function (filename) {
        const blob = new Blob([this.getText()], { type: 'text/plain' });
        const generatedFile = new File([blob], filename, { type: 'text/plain' });

        // ファイルを保存するためのダウンロード用リンクを作成
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        // クリックして保存ダイアログを開く
        a.click();
        URL.revokeObjectURL(a.href);
        return generatedFile;
    },

    
};

const optModal = {
    modal: document.getElementById("optModal"),
    openModalBtn : document.getElementById("optionButton"),
    closeModalBtn : document.querySelector(".close"),

}


// オプションボタンをクリックしたときにモーダルを開く
optModal.openModalBtn.addEventListener("click", function () {
    optModal.modal.style.display = "block";
});

// 閉じるボタンをクリックしたときにモーダルを閉じる
optModal.closeModalBtn.addEventListener("click", function () {
    optModal.modal.style.display = "none";
});

// モーダルの外側をクリックしたときにモーダルを閉じる
window.addEventListener("click", function (event) {
    if (event.target === optModal.modal) {
        optModal.modal.style.display = "none";
    }
});


//ボタン


fileInput.addEventListener('click', function () {
    this.value = ''; // クリアすることで同じファイルが再選択されたときに変更と見なされる
});

document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    SaveFiles.loadFile(file);

});


document.getElementById('newButton').addEventListener('click', function () {
    SaveFiles.newFile();
});


document.getElementById('spaceDeleteButton').addEventListener('click', function () {
    myViewer.SpaceDelete();
});

document.getElementById('saveButton').addEventListener('click', function () {
    SaveFiles.saveFile();
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

//新規　cmd n
document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
        event.preventDefault(); // デフォルトのショートカット動作を無効化
        event.stopPropagation(); // イベントの伝播を停止
        document.getElementById('newButton').click(); // ファイル入力をクリック
    }
});

//設定
document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault(); // デフォルトのショートカット動作を無効化
        document.getElementById('optionButton').click(); // ファイル入力をクリック
    }
});

//保存
document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault(); // デフォルトのショートカット動作を無効化
        document.getElementById('saveButton').click(); // ファイル入力をクリック
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

    //this.spaceDeleteButton = document.getElementById('spaceDeleteButton');
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
 
Viewer.prototype.SpaceDelete = function () {
    const text = this.GetFormattedText( useEndOflineProcessing = false,useSpaceDelete = true);
    this.setEditor(text);
    this.updateViewer();
    
}

Viewer.prototype.GetFormattedText = function (useEndOflineProcessing = true, useSpaceDelete = false) {
    const text = this.editor.value;
    let t = TextFormat.init(text);

    if (useSpaceDelete) t.SpaceDeleate();

    if (useEndOflineProcessing) t.EndOflineProcessing();

    return t.text;
}

//エディタの中身に何か入っているのか
Viewer.prototype.GetEditorTrim = function () {
    return this.editor.value.trim() !== '';
}

Viewer.prototype.updateViewer = function () {
    //viewの中を書き換える
    this.viewer.textContent = this.GetFormattedText();
    this.setEditor(this.GetFormattedText(useEndOflineProcessing = false));
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
const TextFormat = {
    text: "",
    lineLengthElement: document.getElementById('lineLengthInput'),
    
    init: function (text) {
        this.text = text;
        return this;
    },

    SpaceDeleate: function () {
        this.text = this.text.replace(/(?<=.)(?<![!?！？])[ 　]/g, '');
        return this;
    },

    EndOflineProcessing:function() {
        const len = Number(this.lineLengthElement.value); // 数値に変換する
        if (isNaN(len) || len <= 0) {
            console.error('Invalid line length');
            return this;
        }

        const lines = this.text.split('\n');
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

        this.text = formattedText;
        return this;
    },

    sanitizeFilename: function () {
        if (this.text == "") return "タイトル";
        // 取り除く記号の正規表現パターン
        const illegalChars = /[\/\\\:\*\?\"\<\>\|]/g;

        // 入力文字列から一行目を取得
        const firstLine = this.text.split('\n')[0];

        // 取り除いた後のファイル名に使えない記号を取り除く
        const sanitizedFilename = firstLine.replace(illegalChars, '');

        return sanitizedFilename;
    }
}

//一列文字数のプリセット
const LineLengthPreset = {
    // オブジェクトの配列を保持するプロパティ
    items: [
        { name: "47:Privatter、PictBlandなど", value: 47 },
        { name: "39:pixiv", value: 39 }
    ],

    // プルダウンリストを動的に生成する関数
    createDropdownList: function () {
        const select = document.getElementById("itemSelect");

        // オプションをクリア（初期化）
        select.innerHTML = "";

        // 各オブジェクトをプルダウンリストのオプションに追加
        this.items.forEach(item => {
            const option = document.createElement("option");
            option.textContent = item.name;
            option.value = item.value;
            select.appendChild(option);
        });

        // プルダウンリストが変更されたときの処理を設定
        select.addEventListener("change", function () {
            const selectedValue = parseInt(this.value); // 選択された値を取得し数値に変換
            const selectedItem = LineLengthPreset.items.find(item => item.value === selectedValue); // 選択されたオブジェクトを取得
            // ここに選択されたアイテムに対する処理を記述
            // 選択されたアイテムの数値をinput要素に表示
            const selectedValueInput = document.getElementById("lineLengthInput");
            selectedValueInput.value = selectedItem.value;
            selectedValueInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }
};

// ページの読み込みが完了したらプルダウンリストを生成する
document.addEventListener("DOMContentLoaded", function () {
    LineLengthPreset.createDropdownList();
});

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
        this.resizer.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.radioButtons.forEach(radio => {
            radio.addEventListener('change', this.onOrientationChange);
        });

        this.loadRadioButtonState(); // ラジオボタンの状態をロード
    },

    loadRadioButtonState: function () {
        const selectedValue = localStorage.getItem('selectedOrientation');
        if (selectedValue) {
            const radioButton = document.querySelector(`input[name="orientation"][value="${selectedValue}"]`);
            if (radioButton) {
                radioButton.checked = true;
                // 必要なら変更処理を呼び出す
                this.onOrientationChange({ target: radioButton });
            }
        }
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

        // ラジオボタンの選択状態をローカルストレージに保存
        localStorage.setItem('selectedOrientation', e.target.value);
    },

    onMouseDown: function (e) {
        ResizerApp.isResizing = true;
        document.addEventListener('mousemove', ResizerApp.onMouseMove);
        document.addEventListener('mouseup', ResizerApp.onMouseUp);
    },

    onMouseUp: function () {
        ResizerApp.isResizing = false;
        document.removeEventListener('mousemove', ResizerApp.onMouseMove);
        document.removeEventListener('mouseup', ResizerApp.onMouseUp);
    },

    onTouchStart: function (e) {
        e.preventDefault(); // Prevent default touch behavior like scrolling
        ResizerApp.isResizing = true;
        document.addEventListener('touchmove', ResizerApp.onTouchMove, { passive: false });
        document.addEventListener('touchend', ResizerApp.onTouchEnd);
    },

    onTouchEnd: function () {
        ResizerApp.isResizing = false;
        document.removeEventListener('touchmove', ResizerApp.onTouchMove);
        document.removeEventListener('touchend', ResizerApp.onTouchEnd);
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


    onTouchMove: function (e) {
        if (!ResizerApp.isResizing) return;

        const containerRect = ResizerApp.container.getBoundingClientRect();
        let offset, size1, size2;

        if (ResizerApp.isHorizontal) {
            offset = e.touches[0].clientX - containerRect.left;
            size1 = (offset / containerRect.width) * 100;
        } else {
            offset = e.touches[0].clientY - containerRect.top;
            size1 = (offset / containerRect.height) * 100;
        }

        size2 = 100 - size1;

        ResizerApp.textbox1.style.flexBasis = `${size1}%`;
        ResizerApp.textbox2.style.flexBasis = `${size2}%`;
    }

};
// 初期化
ResizerApp.init();


const Padding = {
    viewerTextarea: document.getElementById('viewer'),
    editorTextarea: document.getElementById('editor'),

    init: function () {
        // 初期設定としてupdatePaddingを呼び出します
        this.updatePadding(this.viewerTextarea);
        this.updatePadding(this.editorTextarea);

        // リサイズ時のイベントリスナーを追加します
        window.addEventListener('resize', () => {
            this.updatePadding(this.viewerTextarea);
            this.updatePadding(this.editorTextarea);
        })
    },

    // テキストエリアのサイズに応じてパディングを更新する関数
    updatePadding: function (textarea) {
        // テキストエリアの現在の幅と高さを取得します
        const textareaWidth = textarea.clientWidth;
        const textareaHeight = textarea.clientHeight;

        // 例: パディングをテキストエリアの幅と高さの5%に設定します
        const paddingPercentage = 10; // 必要に応じて調整してください

        const horizontalPadding = (textareaWidth * paddingPercentage / 100) + 'px';
        const verticalPadding = (textareaHeight * 2 / 100) + 'px';

        textarea.style.padding = `${verticalPadding} ${horizontalPadding}`;
    }
}

//Padding.init();