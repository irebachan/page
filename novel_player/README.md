# Novel Draft

ブラウザでシナリオを編集しながらプレビューできるツールです。共有はテキストのやりとりで行うことを想定しています。

## できること

- **編集とプレビュー**（分割 / 右上□で全画面切替）
- **作品の自動保存**（このブラウザ内に複数保持、切り替え可能）
- **エクスポート / インポート**、**コピー / 共有**、**特殊形式出力**（ティラノ / Ren'Py）
- **PWA**（HTTPS 配信時にホーム画面へ追加・オフラインで UI を表示）

## 使い方のイメージ

1. シナリオメニューで作品を選ぶ（＋で新規、✎で名前変更）
2. プレビューしながら編集（内容は自動保存）
3. 外にファイルとして残すときだけ **エクスポート**
4. 別端末やバックアップ用に渡すときは **コピー / 共有** またはエクスポートした `.txt`
5. 外から取り込むときは **インポート** または **貼り付け**（新規作品 / 現在の作品に上書きを選択）

## ノードグラフの編集

- **@goto**: ノードを別ノードへドラッグ、または「接続」で2回クリック
- **選択肢**: `- 文 =>` の時点で線が出る（未接続は「未接続」へ点線）。線をノードへドラッグで接続
- **@call**: 黄褐色の破線（グラフから新規作成はしない）
- **削除**: 矢印をクリック（ドラッグしなければ削除）
- **戻す**: ツールバー「戻す」または Ctrl+Z（グラフ操作のみ）
- ノード下に本文プレビュー（約40字）。ベタ指定は原稿で

## ノードグラフ（dagre）

縦方向レイアウト用に [dagre](https://github.com/dagrejs/dagre) を `js/lib/` に置きます（初回または clone 直後）:

```bash
cd novel_player
mkdir -p js/lib
curl -fsSL -o js/lib/graphlib.min.js "https://cdn.jsdelivr.net/npm/graphlib@2.1.8/dist/graphlib.min.js"
curl -fsSL -o js/lib/dagre.min.js "https://cdn.jsdelivr.net/npm/dagre@0.8.5/dist/dagre.min.js"
```

## PWA（ホーム画面に追加）

**HTTPS**（GitHub Pages など）で開いているときだけ有効です。`file://` 直開きでは登録されません。

- **Chrome / Edge（Android 含む）**: メニュー → 「アプリをインストール」／「ホーム画面に追加」
- **Safari（iOS）**: 共有 → 「ホーム画面に追加」

オフラインでも編集画面は開けます（作品データは IndexedDB に保存された分）。更新時は `sw.js` の `CACHE_NAME` バージョンを上げて再デプロイしてください。

アイコンを作り直す場合（要 Pillow）:

```bash
cd novel_player
python3 -c "from PIL import Image, ImageDraw, ImageFont; ..."
# または icons/icon.svg を差し替え
```

## フォルダ構成

```
novel_player/
  index.html, styles.css, manifest.webmanifest, sw.js, pwa.js  … 入口・PWA
  editor/          … CodeMirror エディタ（build.mjs で bundle 生成）
  icons/           … PWA アイコン
  js/
    core/          … プレイヤー本体・メニュー初期化
    lib/           … 共通ユーティリティ（保存・クリップボード等）
    storage/       … 作品の IndexedDB 保存
    ui/            … パネル分割・レイアウト
    script/        … 記法パーサー・参照エラー
    export/        … ティラノ / Ren'Py 等への出力
  docs/            … 設計メモ
```

エディタのビルド: `npm run build:editor`（`editor/scenario_editor.mjs` → `scenario_editor.bundle.js`）

## 記法

- `#キャラ名` の次の行からがセリフ
- `@ラベル名` でラベル定義
- `- 選択肢 => ジャンプ先ラベル` / `- 選択肢 => call ジャンプ先ラベル`
- `@goto ラベル名` でジャンプ
- `@call ラベル名` と `@return` で呼び出し・戻り
- `@end` でシナリオ終了
- 詳細はツール内の「ヘルプ」を参照してください。

## call / return の確認（3分）

1. **選択肢** … 公園で「ミナに話しかける」→ 会話 → 次へで `@return` → **3つの選択肢が再表示**されれば OK
2. **本文 @call** … `@call` の直後に `@ラベル` が続いても、`@return` 後に **本編の続き**（別枝のラベルに吸われない）なら OK
3. 迷ったらブラウザコンソールで `novelPlayer.getPreviewDebugState()` … `callStack` が空なのに return した等を確認

ラベルチップでジャンプすると call スタックはリセットされます（意図どおり）。
