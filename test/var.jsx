
// スクリプトパネルの作成
var dialog = new Window('dialog', 'データ入力');

// 入力フィールドの作成
dialog.add('statictext', undefined, 'タイトル:');
var titleInput = dialog.add('edittext', undefined, '');
titleInput.characters = 20;

dialog.add('statictext', undefined, '区分:');
var categoryInput = dialog.add('edittext', undefined, '');
categoryInput.characters = 20;

dialog.add('statictext', undefined, '価格:');
var priceInput = dialog.add('edittext', undefined, '');
priceInput.characters = 20;

dialog.add('statictext', undefined, '年齢指定:');
var ageInput = dialog.add('edittext', undefined, '');
ageInput.characters = 20;

dialog.add('statictext', undefined, 'サイズ:');
var sizeInput = dialog.add('edittext', undefined, '');
sizeInput.characters = 20;

dialog.add('statictext', undefined, '概要:');
var descriptionInput = dialog.add('edittext', undefined, '');
descriptionInput.characters = 20;

// リストの表示
var listBox = dialog.add('listbox', undefined, [], { multiselect: false, numberOfColumns: 6, showHeaders: true, columnTitles: ['タイトル', '区分', '価格', '年齢指定', 'サイズ', '概要'] });

// 追加ボタン
var addButton = dialog.add('button', undefined, '追加');
addButton.onClick = function () {
    var newItem = [
        titleInput.text,
        categoryInput.text,
        priceInput.text,
        ageInput.text,
        sizeInput.text,
        descriptionInput.text
    ];
    listBox.add('item', newItem);

    // フィールドをクリア
    titleInput.text = '';
    categoryInput.text = '';
    priceInput.text = '';
    ageInput.text = '';
    sizeInput.text = '';
    descriptionInput.text = '';
};

// 削除ボタン
var deleteButton = dialog.add('button', undefined, '削除');
deleteButton.onClick = function () {
    var selectedItem = listBox.selection;
    if (selectedItem) {
        listBox.remove(listBox.selection.index);
    }
};
// OKボタン
var okButton = dialog.add('button', undefined, 'OK');
okButton.onClick = function () {
    // 新しいレイヤーを作成
    var doc = app.activeDocument;
    var textLayer = doc.layers.add();
    textLayer.name = '文字';

    // 動的テキストの設定
    var variablePalette = doc.dataSets.add();

    for (var i = 0; i < listBox.items.length; i++) {
        var item = listBox.items[i];

        // 各プロパティをテキスト化してレイヤーに追加
        var titleFrame = textLayer.textFrames.add();
        titleFrame.contents = item.subItems[0].text;
        titleFrame.name = 'タイトル_' + (i + 1);
        titleFrame.position = [0, -i * 100];

        var categoryFrame = textLayer.textFrames.add();
        categoryFrame.contents = item.subItems[1].text;
        categoryFrame.name = '区分_' + (i + 1);
        categoryFrame.position = [150, -i * 100];

        var priceFrame = textLayer.textFrames.add();
        priceFrame.contents = item.subItems[2].text;
        priceFrame.name = '価格_' + (i + 1);
        priceFrame.position = [300, -i * 100];

        var ageFrame = textLayer.textFrames.add();
        ageFrame.contents = item.subItems[3].text;
        ageFrame.name = '年齢指定_' + (i + 1);
        ageFrame.position = [450, -i * 100];

        var sizeFrame = textLayer.textFrames.add();
        sizeFrame.contents = item.subItems[4].text;
        sizeFrame.name = 'サイズ_' + (i + 1);
        sizeFrame.position = [600, -i * 100];

        var descriptionFrame = textLayer.textFrames.add();
        descriptionFrame.contents = item.subItems[5].text;
        descriptionFrame.name = '概要_' + (i + 1);
        descriptionFrame.position = [750, -i * 100];

        // 変数パレットに登録
        var dataSet = variablePalette.dataSets.add('DataSet ' + (i + 1));
        dataSet.textFrames[titleFrame.name] = item.subItems[0].text;
        dataSet.textFrames[categoryFrame.name] = item.subItems[1].text;
        dataSet.textFrames[priceFrame.name] = item.subItems[2].text;
        dataSet.textFrames[ageFrame.name] = item.subItems[3].text;
        dataSet.textFrames[sizeFrame.name] = item.subItems[4].text;
        dataSet.textFrames[descriptionFrame.name] = item.subItems[5].text;
    }

    dialog.close();
};

dialog.show();
