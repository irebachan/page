import sys
from pathlib import Path

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import (
    QApplication,
    QFileDialog,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QPlainTextEdit,
    QSpinBox,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

from rmmz2novel import (
    extract_list_from_common,
    extract_list_from_map,
    ir_to_novel_text,
    parse_event_list_to_ir,
)


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("rmmz2novel - RMMZ → ノベル記法 逆変換ツール")
        self.resize(1200, 700)
        self._build_ui()

    def _build_ui(self) -> None:
        splitter = QSplitter(Qt.Horizontal)

        # 左パネル: 取り込み元の指定
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)

        proj_group = QGroupBox("RMMZ プロジェクト")
        proj_layout = QHBoxLayout(proj_group)
        self.project_edit = QLineEdit()
        self.project_edit.setPlaceholderText("RMMZ プロジェクトのフォルダパス")
        browse_btn = QPushButton("参照...")
        browse_btn.clicked.connect(self.browse_project)
        proj_layout.addWidget(self.project_edit)
        proj_layout.addWidget(browse_btn)

        map_group = QGroupBox("マップイベントから読み込み")
        map_layout = QGridLayout(map_group)
        self.map_id_spin = QSpinBox()
        self.map_id_spin.setRange(1, 999)
        self.map_id_spin.setValue(1)
        self.event_id_spin = QSpinBox()
        self.event_id_spin.setRange(1, 9999)
        self.event_id_spin.setValue(1)
        self.page_index_spin = QSpinBox()
        self.page_index_spin.setRange(0, 99)
        self.page_index_spin.setValue(0)
        load_map_btn = QPushButton("この設定で読み込む")
        load_map_btn.clicked.connect(self.on_load_map)
        map_layout.addWidget(QLabel("Map ID"), 0, 0)
        map_layout.addWidget(self.map_id_spin, 0, 1)
        map_layout.addWidget(QLabel("Event ID"), 1, 0)
        map_layout.addWidget(self.event_id_spin, 1, 1)
        map_layout.addWidget(QLabel("Page index (0開始)"), 2, 0)
        map_layout.addWidget(self.page_index_spin, 2, 1)
        map_layout.addWidget(load_map_btn, 3, 0, 1, 2)

        ce_group = QGroupBox("コモンイベントから読み込み")
        ce_layout = QGridLayout(ce_group)
        self.common_id_spin = QSpinBox()
        self.common_id_spin.setRange(1, 9999)
        self.common_id_spin.setValue(1)
        load_ce_btn = QPushButton("この設定で読み込む")
        load_ce_btn.clicked.connect(self.on_load_common)
        ce_layout.addWidget(QLabel("CommonEvent ID"), 0, 0)
        ce_layout.addWidget(self.common_id_spin, 0, 1)
        ce_layout.addWidget(load_ce_btn, 1, 0, 1, 2)

        left_layout.addWidget(proj_group)
        left_layout.addWidget(map_group)
        left_layout.addWidget(ce_group)
        left_layout.addStretch(1)

        # 右パネル: ノベルテキスト
        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)
        header_layout = QHBoxLayout()
        header_layout.addWidget(QLabel("ノベル記法テキスト（コピーしてノベルプレーヤーに貼ってください）"))
        copy_btn = QPushButton("コピー")
        copy_btn.setToolTip("テキスト全体をクリップボードにコピー")
        copy_btn.clicked.connect(self.copy_text)
        save_btn = QPushButton("保存")
        save_btn.clicked.connect(self.save_text)
        header_layout.addWidget(copy_btn)
        header_layout.addWidget(save_btn)
        right_layout.addLayout(header_layout)

        self.text_edit = QPlainTextEdit()
        right_layout.addWidget(self.text_edit)

        splitter.addWidget(left_widget)
        splitter.addWidget(right_widget)
        splitter.setStretchFactor(0, 0)
        splitter.setStretchFactor(1, 1)

        container = QWidget()
        layout = QHBoxLayout(container)
        layout.addWidget(splitter)
        self.setCentralWidget(container)

    def copy_text(self) -> None:
        text = self.text_edit.toPlainText()
        if not text:
            # 何もないときは静かに何もしない
            return
        QApplication.clipboard().setText(text)

    def browse_project(self) -> None:
        path = QFileDialog.getExistingDirectory(
            self,
            "RMMZ プロジェクトフォルダを選択",
            self.project_edit.text() or str(Path.cwd()),
        )
        if path:
            self.project_edit.setText(path)

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

    def save_text(self) -> None:
        text = self.text_edit.toPlainText()
        if not text.strip():
            QMessageBox.warning(self, "警告", "保存するテキストが空です。")
            return
        path, _ = QFileDialog.getSaveFileName(
            self,
            "ノベルテキストを保存",
            str(Path.cwd() / "script_from_rmmz.txt"),
            "Text files (*.txt);;All files (*)",
        )
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
        except Exception as e:  # noqa: BLE001
            QMessageBox.critical(self, "保存エラー", str(e))

    def load_from_list(self, cmds: list[dict]) -> None:
        try:
            ir = parse_event_list_to_ir(cmds)
            text = ir_to_novel_text(ir)
        except Exception as e:  # noqa: BLE001
            QMessageBox.critical(self, "変換エラー", str(e))
            return
        self.text_edit.setPlainText(text)

    def on_load_map(self) -> None:
        try:
            root = self.get_project_root()
            cmds = extract_list_from_map(
                root,
                map_id=int(self.map_id_spin.value()),
                event_id=int(self.event_id_spin.value()),
                page_index=int(self.page_index_spin.value()),
            )
        except Exception as e:  # noqa: BLE001
            QMessageBox.critical(self, "読み込みエラー", str(e))
            return
        self.load_from_list(cmds)

    def on_load_common(self) -> None:
        try:
            root = self.get_project_root()
            cmds = extract_list_from_common(
                root,
                common_event_id=int(self.common_id_spin.value()),
            )
        except Exception as e:  # noqa: BLE001
            QMessageBox.critical(self, "読み込みエラー", str(e))
            return
        self.load_from_list(cmds)


def main() -> None:
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()

