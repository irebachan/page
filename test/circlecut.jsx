function main() {
    // ダイアログボックスの作成
    var dialog = new Window('dialog', 'サークルカット設定');

    // アートボードサイズの入力
    dialog.add('statictext', undefined, 'アートボードの幅（ピクセル）:');
    var widthInput = dialog.add('edittext', undefined, '500');
    widthInput.characters = 10;

    dialog.add('statictext', undefined, 'アートボードの高さ（ピクセル）:');
    var heightInput = dialog.add('edittext', undefined, '500');
    heightInput.characters = 10;

    // インプットの取得
    dialog.add('statictext', undefined, 'スペースNo.:');
    var spaceNoInput = dialog.add('edittext', undefined, '');
    spaceNoInput.characters = 20;

    dialog.add('statictext', undefined, 'サークル名:');
    var circleNameInput = dialog.add('edittext', undefined, 'くくくぶぶぶ');
    circleNameInput.characters = 20;

    dialog.add('statictext', undefined, '概要:');
    var descriptionInput = dialog.add('edittext', undefined, '漫画');
    descriptionInput.characters = 20;

    // 画像ファイルパスの入力
    dialog.add('statictext', undefined, '近景画像を選択:');
    var fgImageButton = dialog.add('button', undefined, '選択');
    var fgImagePath;
    fgImageButton.onClick = function () {
        fgImagePath = File.openDialog('近景画像を選択してください');
        if (fgImagePath) {
            fgImageButton.text = fgImagePath.name;
        }
    };

    dialog.add('statictext', undefined, '中景画像を選択:');
    var mgImageButton = dialog.add('button', undefined, '選択');
    var mgImagePath;
    mgImageButton.onClick = function () {
        mgImagePath = File.openDialog('中景画像を選択してください');
        if (mgImagePath) {
            mgImageButton.text = mgImagePath.name;
        }
    };

    dialog.add('statictext', undefined, '遠景画像を選択:');
    var bgImageButton = dialog.add('button', undefined, '選択');
    var bgImagePath;
    bgImageButton.onClick = function () {
        bgImagePath = File.openDialog('遠景画像を選択してください');
        if (bgImagePath) {
            bgImageButton.text = bgImagePath.name;
        }
    };

    // OKボタン
    var okButton = dialog.add('button', undefined, 'OK', { name: 'ok' });
    okButton.onClick = function () {
        dialog.close();
    };

    dialog.show();

    // 入力値の取得
    var artboardWidth = parseInt(widthInput.text, 10);
    var artboardHeight = parseInt(heightInput.text, 10);
    var spaceNo = spaceNoInput.text;
    var circleName = circleNameInput.text;
    var description = descriptionInput.text;

    // 新規ドキュメントの作成
    //var doc = app.documents.add(DocumentColorSpace.RGB);
    var doc = app.activeDocument;
    doc.artboards[0].artboardRect = [0, artboardHeight, artboardWidth, 0];

    // レイヤーの作成
    var layerOrder = ["文字", "近景", "中景", "遠景"];
    var layers = {};

    // レイヤーを逆順で作成して、文字レイヤーを最前面に配置する
    for (var i = layerOrder.length - 1; i >= 0; i--) {
        var layerName = layerOrder[i];
        layers[layerName] = doc.layers.add();
        layers[layerName].name = layerName;
    }

    // 文字レイヤーにテキストオブジェクトの作成
    var textLayer = layers["文字"];
    var texts = [
        { content: spaceNo, name: "SpaceNo" },
        { content: circleName, name: "CircleName" },
        { content: description, name: "Description" }
    ];

    for (var i = 0; i < texts.length; i++) {
        var textFrame = textLayer.textFrames.add();
        textFrame.contents = texts[i].content;
        textFrame.name = texts[i].name;
        textFrame.position = [10, artboardHeight - (20 * (i + 1))]; // 適当な位置に配置
    }

    // 画像を読み込む関数
    function placeImage(layer, filePath) {
        // クリッピング用の矩形をアートボードの中央に生成
        var rect = layer.pathItems.rectangle(0, 0, artboardWidth, -artboardHeight);
        rect.stroked = false; // 枠線なし
        //rect.filled = false;  // 塗りつぶし無し

        // 画像を配置（ファイルパスが指定されている場合のみ配置）
        if (filePath) {
            var placedItem = layer.placedItems.add();
            placedItem.file = new File(filePath);

            // 画像を矩形の中央に配置（アスペクト比を保持）
            placedItem.position = [rect.position[0], rect.position[1]];

            // グループ化してクリッピングマスクを適用
            var group = layer.groupItems.add();
            placedItem.moveToBeginning(group);
            rect.moveToBeginning(group);
            group.clipped = true;
        } else {
            // 画像がない場合は矩形を非表示にする
            rect.hidden = true;
        }
    }

    // 近景、中景、遠景レイヤーに画像を読み込む
    var imagePaths = {
        "近景": fgImagePath,
        "中景": mgImagePath,
        "遠景": bgImagePath
    };

    for (var layerName in imagePaths) {
        var imagePath = imagePaths[layerName];
        placeImage(layers[layerName], imagePath);

    }
}

main();
