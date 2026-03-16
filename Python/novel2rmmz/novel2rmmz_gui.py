import sys
from pathlib import Path

from PyQt5.QtCore import Qt, QPoint
from PyQt5.QtWidgets import (
    QApplication,
    QComboBox,
    QDialog,
    QFileDialog,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSpinBox,
    QSplitter,
    QVBoxLayout,
    QWidget,
    QPlainTextEdit,
)

from PyQt5.QtGui import QPainter, QPen, QColor

import novel2rmmz
from novel2rmmz import inject_into_common_event, inject_into_map, ir_to_rmmz_commands, parse_novel_script


class GuideTextEdit(QPlainTextEdit):
    """縦のガイドライン（列数ベース）を描画するテキストエディタ."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        # デフォルト列位置（顔グラあり / なし）
        self.column_face = 20
        self.column_plain = 36

    def set_columns(self, col_face: int, col_plain: int) -> None:
        self.column_face = max(1, col_face)
        self.column_plain = max(1, col_plain)
        self.viewport().update()

    def paintEvent(self, event) -> None:  # noqa: ANN001
        super().paintEvent(event)

        painter = QPainter(self.viewport())
        pen_face = QPen(QColor(0, 128, 255, 70))
        pen_face.setWidth(1)
        pen_plain = QPen(QColor(255, 128, 0, 70))
        pen_plain.setWidth(1)

        fm = self.fontMetrics()
        char_width = fm.horizontalAdvance("あ") or 1

        # スクロール位置を考慮した x 座標
        offset = self.contentOffset().x()

        x_face = int(self.column_face * char_width + offset)
        x_plain = int(self.column_plain * char_width + offset)

        h = self.viewport().height()

        painter.setPen(pen_face)
        painter.drawLine(QPoint(x_face, 0), QPoint(x_face, h))

        painter.setPen(pen_plain)
        painter.drawLine(QPoint(x_plain, 0), QPoint(x_plain, h))

        painter.end()


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("novel2rmmz - ノベル → RMMZ 会話注入ツール")
        self.resize(1200, 700)
        self._config_path = Path(__file__).with_name("novel2rmmz_config.json")
        # 設定オブジェクト（global + projects）
        self._config: dict = {"global": {}, "projects": {}}
        self._help_dialog: QDialog | None = None
        self._build_ui()
        self._load_config()

    # === UI 構築 ===

    def _build_ui(self) -> None:
        splitter = QSplitter(Qt.Horizontal)

        # 左パネル: 設定
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)

        # プロジェクト
        proj_group = QGroupBox("RMMZ プロジェクト / ヘルプ")
        proj_layout = QHBoxLayout(proj_group)
        self.project_edit = QLineEdit()
        self.project_edit.setPlaceholderText("RMMZ プロジェクトのフォルダパス")
        self.project_edit.editingFinished.connect(self.on_project_changed)
        browse_btn = QPushButton("参照...")
        browse_btn.clicked.connect(self.browse_project)
        help_btn = QPushButton("ヘルプ")
        help_btn.clicked.connect(self.show_help)
        proj_layout.addWidget(self.project_edit)
        proj_layout.addWidget(browse_btn)
        proj_layout.addWidget(help_btn)

        # メッセージウィンドウ設定
        msg_group = QGroupBox("メッセージウィンドウ設定・メッセージ単位")
        msg_layout = QGridLayout(msg_group)

        self.position_combo = QComboBox()
        self.position_combo.addItem("上", 0)
        self.position_combo.addItem("中", 1)
        self.position_combo.addItem("下", 2)
        self.position_combo.setCurrentIndex(2)  # デフォルト: 下

        self.background_combo = QComboBox()
        self.background_combo.addItem("ウィンドウ", 0)
        self.background_combo.addItem("暗くする", 1)
        self.background_combo.addItem("透明", 2)
        self.background_combo.setCurrentIndex(0)

        self.col_face_spin = QSpinBox()
        self.col_face_spin.setRange(5, 80)
        self.col_face_spin.setValue(20)

        self.col_plain_spin = QSpinBox()
        self.col_plain_spin.setRange(5, 80)
        self.col_plain_spin.setValue(36)

        msg_layout.addWidget(QLabel("位置"), 0, 0)
        msg_layout.addWidget(self.position_combo, 0, 1)
        msg_layout.addWidget(QLabel("背景"), 1, 0)
        msg_layout.addWidget(self.background_combo, 1, 1)
        self.message_unit_combo = QComboBox()
        self.message_unit_combo.addItem("行ごと", "line")
        self.message_unit_combo.addItem("ブロック（連続行まとめ）", "block")

        msg_layout.addWidget(QLabel("折り返し目安: 顔あり列"), 2, 0)
        msg_layout.addWidget(self.col_face_spin, 2, 1)
        msg_layout.addWidget(QLabel("折り返し目安: 顔なし列"), 3, 0)
        msg_layout.addWidget(self.col_plain_spin, 3, 1)
        msg_layout.addWidget(QLabel("メッセージ単位"), 4, 0)
        msg_layout.addWidget(self.message_unit_combo, 4, 1)

        # 顔グラ設定
        face_group = QGroupBox("顔グラ設定（1行: 名前, [表情ラベル], ファイル名, インデックス）")
        face_layout = QVBoxLayout(face_group)
        self.face_text = QPlainTextEdit()
        self.face_text.setPlaceholderText(
            "# 例:\n"
            "# デフォルト表情\n"
            "ヒロイン, default, Actor1, 0\n"
            "# 表情ラベル付き\n"
            "ヒロイン, smile,   Actor1, 1\n"
        )
        face_layout.addWidget(self.face_text)

        # Map 用設定
        map_group = QGroupBox("マップイベントに注入")
        map_layout = QGridLayout(map_group)

        self.map_id_spin = QSpinBox()
        self.map_id_spin.setRange(1, 999)
        self.map_id_spin.setValue(6)

        self.event_id_spin = QSpinBox()
        self.event_id_spin.setRange(1, 9999)
        self.event_id_spin.setValue(1)

        self.page_index_spin = QSpinBox()
        self.page_index_spin.setRange(0, 99)
        self.page_index_spin.setValue(0)

        inject_map_btn = QPushButton("この設定でマップに書き込む")
        inject_map_btn.clicked.connect(self.on_inject_map)

        map_layout.addWidget(QLabel("Map ID"), 0, 0)
        map_layout.addWidget(self.map_id_spin, 0, 1)
        map_layout.addWidget(QLabel("Event ID"), 1, 0)
        map_layout.addWidget(self.event_id_spin, 1, 1)
        map_layout.addWidget(QLabel("Page index (0開始)"), 2, 0)
        map_layout.addWidget(self.page_index_spin, 2, 1)
        map_layout.addWidget(inject_map_btn, 3, 0, 1, 2)

        # CommonEvent 用設定
        ce_group = QGroupBox("コモンイベントに注入")
        ce_layout = QGridLayout(ce_group)

        self.common_id_spin = QSpinBox()
        self.common_id_spin.setRange(1, 9999)
        self.common_id_spin.setValue(1)

        inject_ce_btn = QPushButton("この設定でコモンイベントに書き込む")
        inject_ce_btn.clicked.connect(self.on_inject_common)

        ce_layout.addWidget(QLabel("CommonEvent ID"), 0, 0)
        ce_layout.addWidget(self.common_id_spin, 0, 1)
        ce_layout.addWidget(inject_ce_btn, 1, 0, 1, 2)

        left_layout.addWidget(proj_group)
        left_layout.addWidget(msg_group)
        left_layout.addWidget(face_group)
        left_layout.addWidget(map_group)
        left_layout.addWidget(ce_group)
        left_layout.addStretch(1)

        # 右パネル: テキスト
        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)

        text_header_layout = QHBoxLayout()
        text_header_layout.addWidget(QLabel("ノベルテキスト (@ラベル, #名前, - 選択肢 => ラベル)"))
        load_btn = QPushButton("読み込み")
        load_btn.setToolTip("テキストファイルから読み込む")
        load_btn.clicked.connect(self.load_text_file)
        save_btn = QPushButton("保存")
        save_btn.setToolTip("現在のテキストをファイルに保存する")
        save_btn.clicked.connect(self.save_text_file)
        text_header_layout.addWidget(load_btn)
        text_header_layout.addWidget(save_btn)
        right_layout.addLayout(text_header_layout)

        self.text_edit = GuideTextEdit()
        self.text_edit.setPlaceholderText(
            "@start\n"
            "#ヒロイン\n"
            "ここに会話を書く。\n"
            "\n"
            "選択肢の例:\n"
            "ここからどうする？\n"
            "- 逃げる => escape\n"
            "- 戦う   => fight\n"
            "\n"
            "@escape\n"
            "逃げた。\n"
            "\n"
            "@fight\n"
            "戦った。\n"
        )
        # ガイドラインの初期位置を反映
        self.text_edit.set_columns(self.col_face_spin.value(), self.col_plain_spin.value())

        # スピンボックス変更時にガイド位置を即時更新
        self.col_face_spin.valueChanged.connect(
            lambda _value: self.text_edit.set_columns(self.col_face_spin.value(), self.col_plain_spin.value())
        )
        self.col_plain_spin.valueChanged.connect(
            lambda _value: self.text_edit.set_columns(self.col_face_spin.value(), self.col_plain_spin.value())
        )

        right_layout.addWidget(self.text_edit)

        splitter.addWidget(left_widget)
        splitter.addWidget(right_widget)
        splitter.setStretchFactor(0, 0)
        splitter.setStretchFactor(1, 1)

        container = QWidget()
        layout = QHBoxLayout(container)
        layout.addWidget(splitter)
        self.setCentralWidget(container)

    # === ユーティリティ ===

    def browse_project(self) -> None:
        path = QFileDialog.getExistingDirectory(
            self, "RMMZ プロジェクトフォルダを選択", self.project_edit.text() or str(Path.cwd())
        )
        if path:
            self.project_edit.setText(path)
            # プロジェクト変更時に、そのプロジェクト用設定を反映
            self.on_project_changed()

    def get_project_root(self) -> Path:
        text = self.project_edit.text().strip()
        if not text:
            raise ValueError("プロジェクトパスが空です。")
        root = Path(text)
        if not root.exists():
            raise FileNotFoundError(f"指定したフォルダが存在しません: {root}")
        if not (root / "data").exists():
            raise FileNotFoundError(f"data フォルダが見つかりません: {root}")
        return root

    def get_script_text(self) -> str:
        text = self.text_edit.toPlainText()
        if not text.strip():
            raise ValueError("ノベルテキストが空です。")
        return text

    def get_window_config(self) -> tuple[int, int]:
        pos = self.position_combo.currentData()
        bg = self.background_combo.currentData()
        return int(pos), int(bg)

    def apply_face_config(self) -> None:
        """顔グラ設定テキストを NAME_FACE_CONFIG に反映する."""
        import novel2rmmz

        cfg: dict[str, dict[str, tuple[str, int]]] = {}
        text = self.face_text.toPlainText()
        for raw in text.splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p.strip() for p in line.split(",")]
            # 形式:
            #  - 名前, ファイル名, インデックス          -> 表情ラベル 'default'
            #  - 名前, 表情ラベル, ファイル名, インデックス
            if len(parts) == 3:
                name, face_name, index_str = parts[0], parts[1], parts[2]
                expr = "default"
            elif len(parts) >= 4:
                name, expr, face_name, index_str = parts[0], parts[1], parts[2], parts[3]
            else:
                continue

            try:
                idx = int(index_str)
            except ValueError:
                continue

            expr_key = expr or "default"
            face_map = cfg.setdefault(name, {})
            face_map[expr_key] = (face_name, idx)

        novel2rmmz.NAME_FACE_CONFIG.clear()
        novel2rmmz.NAME_FACE_CONFIG.update(cfg)

    # === プロジェクト切り替え ===

    def on_project_changed(self) -> None:
        """プロジェクトパスが変わったときに、そのプロジェクト用設定を反映する."""
        path = self.project_edit.text().strip()
        projects = self._config.get("projects") or {}
        if not path:
            # プロジェクト未指定時は global だけが有効（特に何もしない）
            return
        proj_cfg = projects.get(path)
        if proj_cfg is None:
            # 初回のプロジェクトは空設定として登録だけしておく
            projects[path] = {}
            self._config["projects"] = projects
            return

        # プロジェクト固有設定を反映
        if isinstance(proj_cfg.get("position"), int):
            idx = self.position_combo.findData(int(proj_cfg["position"]))
            if idx != -1:
                self.position_combo.setCurrentIndex(idx)
        if isinstance(proj_cfg.get("background"), int):
            idx = self.background_combo.findData(int(proj_cfg["background"]))
            if idx != -1:
                self.background_combo.setCurrentIndex(idx)

        if isinstance(proj_cfg.get("col_face"), int):
            self.col_face_spin.setValue(int(proj_cfg["col_face"]))
        if isinstance(proj_cfg.get("col_plain"), int):
            self.col_plain_spin.setValue(int(proj_cfg["col_plain"]))

        if isinstance(proj_cfg.get("face_text"), str):
            self.face_text.setPlainText(proj_cfg["face_text"])
        if isinstance(proj_cfg.get("script_text"), str):
            self.text_edit.setPlainText(proj_cfg["script_text"])

        if isinstance(proj_cfg.get("map_id"), int):
            self.map_id_spin.setValue(int(proj_cfg["map_id"]))
        if isinstance(proj_cfg.get("event_id"), int):
            self.event_id_spin.setValue(int(proj_cfg["event_id"]))
        if isinstance(proj_cfg.get("page_index"), int):
            self.page_index_spin.setValue(int(proj_cfg["page_index"]))
        if isinstance(proj_cfg.get("common_event_id"), int):
            self.common_id_spin.setValue(int(proj_cfg["common_event_id"]))

    # === 設定の保存 / 読み込み ===

    def _load_config(self) -> None:
        """JSON から GUI 設定を読み込む."""
        try:
            if not self._config_path.exists():
                return
            import json

            with self._config_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            return

        # 旧フォーマットとの互換を取りつつ、新フォーマットに正規化
        if "global" in data or "projects" in data:
            self._config["global"] = data.get("global", {})
            self._config["projects"] = data.get("projects", {})
        else:
            # 旧: フラットなキーを global 扱い + projects[project_path] として変換
            self._config["global"] = {
                "position": data.get("position"),
                "background": data.get("background"),
                "col_face": data.get("col_face"),
                "col_plain": data.get("col_plain"),
            }
            projects: dict = {}
            proj_path = data.get("project_path")
            if isinstance(proj_path, str) and proj_path:
                projects[proj_path] = {
                    "face_text": data.get("face_text", ""),
                    "script_text": data.get("script_text", ""),
                    "map_id": data.get("map_id"),
                    "event_id": data.get("event_id"),
                    "page_index": data.get("page_index"),
                    "common_event_id": data.get("common_event_id"),
                }
            self._config["projects"] = projects

        # global 設定を反映
        g = self._config.get("global", {})
        if isinstance(g.get("position"), int):
            idx = self.position_combo.findData(int(g["position"]))
            if idx != -1:
                self.position_combo.setCurrentIndex(idx)
        if isinstance(g.get("background"), int):
            idx = self.background_combo.findData(int(g["background"]))
            if idx != -1:
                self.background_combo.setCurrentIndex(idx)
        if isinstance(g.get("col_face"), int):
            self.col_face_spin.setValue(int(g["col_face"]))
        if isinstance(g.get("col_plain"), int):
            self.col_plain_spin.setValue(int(g["col_plain"]))

        unit = g.get("message_unit")
        if isinstance(unit, str):
            idx = self.message_unit_combo.findData(unit)
            if idx != -1:
                self.message_unit_combo.setCurrentIndex(idx)

        # プロジェクトが既に入力されていれば、その設定をさらに上書き
        proj = self.project_edit.text().strip()
        if proj:
            self.on_project_changed()

    def _save_config(self) -> None:
        """GUI 設定を JSON に保存する."""
        import json

        # global 設定を更新
        self._config["global"] = {
            "position": int(self.position_combo.currentData()),
            "background": int(self.background_combo.currentData()),
            "col_face": int(self.col_face_spin.value()),
            "col_plain": int(self.col_plain_spin.value()),
            "message_unit": str(self.message_unit_combo.currentData()),
        }

        # 現在のプロジェクトにひもづく設定を更新
        proj_path = self.project_edit.text().strip()
        projects = self._config.get("projects") or {}
        if proj_path:
            proj_cfg = projects.get(proj_path, {})
            proj_cfg.update(
                {
                    "face_text": self.face_text.toPlainText(),
                    "script_text": self.text_edit.toPlainText(),
                    "map_id": int(self.map_id_spin.value()),
                    "event_id": int(self.event_id_spin.value()),
                    "page_index": int(self.page_index_spin.value()),
                    "common_event_id": int(self.common_id_spin.value()),
                    "position": int(self.position_combo.currentData()),
                    "background": int(self.background_combo.currentData()),
                    "col_face": int(self.col_face_spin.value()),
                    "col_plain": int(self.col_plain_spin.value()),
                }
            )
            projects[proj_path] = proj_cfg
        self._config["projects"] = projects

        try:
            with self._config_path.open("w", encoding="utf-8") as f:
                json.dump(self._config, f, ensure_ascii=False, indent=2)
        except Exception:
            # 保存失敗は致命的ではないので黙って無視
            pass

    def show_help(self) -> None:
        """記法と使い方のヘルプを、コピーしやすい専用ダイアログで表示."""
        # すでに開いている場合はそれを前面に出す
        if self._help_dialog is not None and self._help_dialog.isVisible():
            self._help_dialog.raise_()
            self._help_dialog.activateWindow()
            return

        dialog = QDialog(self)
        dialog.setWindowTitle("novel2rmmz ヘルプ")
        dialog.resize(700, 600)
        layout = QVBoxLayout(dialog)

        # 見出し
        layout.addWidget(QLabel("タグ記法と使い方（テキストはコピーできます）"))

        help_edit = QPlainTextEdit()
        help_edit.setReadOnly(True)
        help_edit.setPlainText(
            "【タグ一覧（コピペ用サンプル）】\n"
            "\n"
            "@start\n"
            "@kitchen\n"
            "@goto start\n"
            "@window middle, dark\n"
            "@window reset\n"
            "@w1 top, transparent\n"
            "\n"
            "@bgm main_theme\n"
            "@bgm main_theme, 80\n"
            "\n"
            "@se door_open\n"
            "@se door_open, 70\n"
            "\n"
            "#ヒロイン\n"
            "#ヒロイン@smile\n"
            "ここにセリフを書く\n"
            "\n"
            "- 逃げる => escape\n"
            "- 戦う   => fight\n"
            "\n"
            "// ここは注釈（ツクールの注釈コマンドになる）\n"
            "\n"
            "【説明】\n"
            "・@start, @kitchen など: ラベル定義\n"
            "・@goto ラベル名      : ラベルジャンプ\n"
            "・@bgm name[, volume] : BGM の演奏（volume 省略時は 90）\n"
            "・@se  name[, volume] : SE の演奏（volume 省略時は 90）\n"
            "・@window pos[, bg]   : ウィンドウ位置・背景の一括設定\n"
            "    pos: top / middle / bottom\n"
            "    bg : normal / dark / transparent\n"
            "  例) @window middle, dark\n"
            "      @window reset   # GUIで選んだデフォルトに戻す\n"
            "・@w1 pos[, bg]       : 次の1メッセージだけ、位置・背景を一時変更\n"
            "・#名前               : 以降のセリフの話者名\n"
            "・#名前@表情          : 話者＋表情ラベル（face 設定と組み合わせて使う）\n"
            "・- テキスト => label : 選択肢とジャンプ先ラベル\n"
            "・// 行               : ツクール上の注釈コマンド\n"
            "\n"
            "【顔グラ設定】\n"
            "左の「顔グラ設定」ボックスに 1 行ずつ、\n"
            "  名前, 顔グラファイル名, インデックス\n"
            "または\n"
            "  名前, 表情ラベル, 顔グラファイル名, インデックス\n"
            "の形式で書きます。\n"
            "例:\n"
            "  ヒロイン, Actor1, 0              # default 表情\n"
            "  ヒロイン, smile, Actor1, 1       # smile 表情\n"
            "\n"
            "【メッセージウィンドウ設定】\n"
            "・位置: 上 / 中 / 下\n"
            "・背景: ウィンドウ / 暗くする / 透明\n"
            "\n"
            "【折り返し目安のガイドライン】\n"
            "・顔あり列: 顔グラ＋名前がある時の 1 行の目安文字数\n"
            "・顔なし列: 顔グラなしの時の 1 行の目安文字数\n"
            "  → テキストエディタ上に縦線 2 本として表示されます。\n"
            "\n"
            "【書き込みの流れ】\n"
            "1. RMMZ プロジェクトフォルダを指定\n"
            "2. 必要なら顔グラ設定とウィンドウ設定・ガイド列を調整\n"
            "3. 右側にノベルテキストを書くか、テキストを読み込む\n"
            "4. マップ or コモンイベントの ID を指定して\n"
            "   「マップに書き込む」または「コモンイベントに書き込む」を押す\n"
        )
        layout.addWidget(help_edit)

        close_btn = QPushButton("閉じる")
        close_btn.clicked.connect(dialog.close)
        layout.addWidget(close_btn, alignment=Qt.AlignRight)

        # 参照を保持して非モーダル表示
        self._help_dialog = dialog
        dialog.setAttribute(Qt.WA_DeleteOnClose, True)

        def _clear_ref() -> None:
            self._help_dialog = None

        dialog.destroyed.connect(_clear_ref)
        dialog.show()

    def load_text_file(self) -> None:
        path, _ = QFileDialog.getOpenFileName(
            self,
            "ノベルテキストファイルを選択",
            str(Path.cwd()),
            "Text files (*.txt);;All files (*)",
        )
        if not path:
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:  # noqa: BLE001
            QMessageBox.critical(self, "読み込みエラー", str(e))
            return
        self.text_edit.setPlainText(content)

    def save_text_file(self) -> None:
        text = self.text_edit.toPlainText()
        if not text:
            QMessageBox.warning(self, "警告", "保存するテキストが空です。")
            return

        path, _ = QFileDialog.getSaveFileName(
            self,
            "ノベルテキストを保存",
            str(Path.cwd() / "script.txt"),
            "Text files (*.txt);;All files (*)",
        )
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
        except Exception as e:  # noqa: BLE001
            QMessageBox.critical(self, "保存エラー", str(e))
            return
        QMessageBox.information(self, "保存完了", f"テキストを保存しました:\n{path}")

    def run_injection(self, target: str) -> None:
        try:
            project_root = self.get_project_root()
            script_text = self.get_script_text()

            # ガイド列を反映
            self.text_edit.set_columns(
                self.col_face_spin.value(),
                self.col_plain_spin.value(),
            )

            # メッセージウィンドウ設定を適用
            pos, bg = self.get_window_config()
            novel2rmmz.DEFAULT_POSITION = pos
            novel2rmmz.DEFAULT_BACKGROUND = bg

            # 顔グラ設定を適用
            self.apply_face_config()

            # メッセージ単位設定を適用
            unit = self.message_unit_combo.currentData()
            if isinstance(unit, str) and unit in ("line", "block"):
                novel2rmmz.MESSAGE_UNIT = unit

            nodes = parse_novel_script(script_text)
            commands = ir_to_rmmz_commands(nodes)

            if target == "map":
                inject_into_map(
                    project_root=project_root,
                    map_id=int(self.map_id_spin.value()),
                    event_id=int(self.event_id_spin.value()),
                    page_index=int(self.page_index_spin.value()),
                    commands=commands,
                    do_backup=True,
                )
            else:
                inject_into_common_event(
                    project_root=project_root,
                    common_event_id=int(self.common_id_spin.value()),
                    commands=commands,
                    do_backup=True,
                )
        except Exception as e:  # noqa: BLE001
            QMessageBox.critical(self, "エラー", str(e))
            return

        QMessageBox.information(self, "完了", "イベントへの書き込みが完了しました。\nツクール側で確認してください。")

    # === ハンドラ ===

    def on_inject_map(self) -> None:
        self.run_injection("map")

    def on_inject_common(self) -> None:
        self.run_injection("common")

    def closeEvent(self, event) -> None:  # noqa: D401, ANN001
        """ウィンドウを閉じる際に設定を保存."""
        self._save_config()
        super().closeEvent(event)


def main() -> int:
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()
    return app.exec_()


if __name__ == "__main__":
    sys.exit(main())

