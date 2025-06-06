import tkinter as tk
from tkinter import ttk, scrolledtext, filedialog, messagebox
import re
import os
import hashlib
from datetime import datetime
import json

class SettingsModal:
    def __init__(self, parent, current_settings):
        self.top = tk.Toplevel(parent)
        self.top.title("変換設定")
        self.top.geometry("600x400")
        self.top.transient(parent)
        self.top.grab_set()

        # メインフレーム
        main_frame = ttk.Frame(self.top, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # 特殊記号の設定
        symbols_frame = ttk.LabelFrame(main_frame, text="特殊記号", padding="5")
        symbols_frame.pack(fill=tk.X, pady=5)

        # ページ区切り記号
        ttk.Label(symbols_frame, text="ページ区切り:").grid(row=0, column=0, sticky=tk.W)
        self.page_break = ttk.Entry(symbols_frame, width=10)
        self.page_break.insert(0, current_settings['page_break'])
        self.page_break.grid(row=0, column=1, padx=5)

        # 行区切り記号
        ttk.Label(symbols_frame, text="行区切り:").grid(row=0, column=2, sticky=tk.W)
        self.line_break = ttk.Entry(symbols_frame, width=10)
        self.line_break.insert(0, current_settings['line_break'])
        self.line_break.grid(row=0, column=3, padx=5)

        # クリック待ち記号
        ttk.Label(symbols_frame, text="クリック待ち:").grid(row=0, column=4, sticky=tk.W)
        self.click_wait = ttk.Entry(symbols_frame, width=10)
        self.click_wait.insert(0, current_settings['click_wait'])
        self.click_wait.grid(row=0, column=5, padx=5)

        # ラベル記号
        ttk.Label(symbols_frame, text="ラベル記号:").grid(row=1, column=0, sticky=tk.W)
        self.label_symbol = ttk.Entry(symbols_frame, width=10)
        self.label_symbol.insert(0, current_settings['label_symbol'])
        self.label_symbol.grid(row=1, column=1, padx=5)

        # ジャンプタグ
        ttk.Label(symbols_frame, text="ジャンプタグ:").grid(row=1, column=2, sticky=tk.W)
        self.jump_tag = ttk.Entry(symbols_frame, width=20)
        self.jump_tag.insert(0, current_settings['jump_tag'])
        self.jump_tag.grid(row=1, column=3, columnspan=3, padx=5)

        # 置換ルール
        replace_frame = ttk.LabelFrame(main_frame, text="置換ルール", padding="5")
        replace_frame.pack(fill=tk.BOTH, expand=True, pady=5)

        self.replace_list = ttk.Frame(replace_frame)
        self.replace_list.pack(fill=tk.BOTH, expand=True)

        # 既存の置換ルールを追加
        for from_text, to_text in current_settings['replace_rules']:
            self.add_replace_item(from_text, to_text)

        # 置換ルールが空の場合は初期の置換ルールを追加
        if not current_settings['replace_rules']:
            self.add_replace_item()

        # 置換ルール追加ボタン
        add_replace_btn = ttk.Button(replace_frame, text="置換ルール追加", command=self.add_replace_item)
        add_replace_btn.pack(side=tk.LEFT, pady=5)

        # 閉じるボタン
        close_btn = ttk.Button(main_frame, text="閉じる", command=self.top.destroy)
        close_btn.pack(side=tk.RIGHT, pady=10)

    def add_replace_item(self, from_text="", to_text=""):
        item_frame = ttk.Frame(self.replace_list)
        item_frame.pack(fill=tk.X, pady=2)

        from_entry = ttk.Entry(item_frame, width=20)
        from_entry.insert(0, from_text)
        from_entry.pack(side=tk.LEFT, padx=5)
        ttk.Label(item_frame, text="→").pack(side=tk.LEFT)
        to_entry = ttk.Entry(item_frame, width=20)
        to_entry.insert(0, to_text)
        to_entry.pack(side=tk.LEFT, padx=5)

        remove_btn = ttk.Button(item_frame, text="×", width=3,
                              command=lambda: item_frame.destroy() if len(self.replace_list.winfo_children()) > 1 else None)
        remove_btn.pack(side=tk.LEFT, padx=5)

    def get_settings(self):
        return {
            'page_break': self.page_break.get(),
            'line_break': self.line_break.get(),
            'click_wait': self.click_wait.get(),
            'label_symbol': self.label_symbol.get(),
            'jump_tag': self.jump_tag.get(),
            'replace_rules': [
                (item.winfo_children()[0].get(), item.winfo_children()[2].get())
                for item in self.replace_list.winfo_children()
            ]
        }

class ScriptConverter:
    """スクリプト変換の基底クラス"""
    def __init__(self):
        self.current_character = None
        self.character_definitions = {}

    def convert(self, script):
        """スクリプトを変換（抽象メソッド）"""
        raise NotImplementedError

    def process_line(self, line):
        """1行を処理（抽象メソッド）"""
        raise NotImplementedError

    def process_character_line(self, character, text):
        """キャラクター行を処理（抽象メソッド）"""
        raise NotImplementedError

    def process_choice(self, choice_text):
        """選択肢を処理（抽象メソッド）"""
        raise NotImplementedError

    def process_label(self, label_name):
        """ラベルを処理（抽象メソッド）"""
        raise NotImplementedError

class TyranoScriptConverter(ScriptConverter):
    """ティラノスクリプト用の変換クラス"""
    def __init__(self):
        super().__init__()
        self.settings = {
            'page_break': '[p]',
            'line_break': '[r]',
            'click_wait': '[l]',
            'label_symbol': '@',
            'jump_tag': '[jump target=@]',
            'file_extension': '.ks',
            'word_replacements': {}
        }

    def convert(self, script):
        lines = script.split('\n')
        result = []
        current_block = []
        in_choice_block = False

        for line in lines:
            line = line.strip()
            if not line:
                if current_block:
                    result.extend(self.process_block(current_block))
                    current_block = []
                result.append('')  # 空行を保持
                continue

            # 名前行の処理
            if line.startswith('#'):
                if current_block:
                    result.extend(self.process_block(current_block))
                    current_block = []
                self.current_character = line[1:].strip()
                result.append(f"#{self.current_character}")  # 名前表示タグを追加
                continue

            # ラベルの処理
            if line.startswith(self.settings['label_symbol']):
                if current_block:
                    result.extend(self.process_block(current_block))
                    current_block = []
                result.append(self.process_label(line[len(self.settings['label_symbol']):].strip()))
                continue

            # 選択肢の処理
            if line.startswith('-'):
                if current_block:
                    result.extend(self.process_block(current_block))
                    current_block = []
                if not in_choice_block:
                    in_choice_block = True
                result.append(self.process_choice(line[1:].strip()))
                continue

            # テキスト行の処理
            if ':' in line:
                character, text = line.split(':', 1)
                if current_block:
                    result.extend(self.process_block(current_block))
                    current_block = []
                self.current_character = character.strip()
                result.append(f"#{self.current_character}")  # 名前表示タグを追加
                current_block.append(text.strip())
            else:
                current_block.append(line)

            # 選択肢ブロックの終了処理
            if in_choice_block and not line.startswith('-'):
                in_choice_block = False

        # 最後のブロックを処理
        if current_block:
            result.extend(self.process_block(current_block))

        return '\n'.join(result)

    def process_block(self, block):
        """テキストブロックを処理"""
        if not block:
            return []

        result = []
        # 最後の有効な行を特定
        last_valid_line = -1
        for i in range(len(block) - 1, -1, -1):
            if block[i].strip():
                last_valid_line = i
                break

        for i, line in enumerate(block):
            if not line.strip():
                result.append(line)
                continue

            is_last_valid_line = i == last_valid_line
            processed_line = self.process_line(line, is_last_valid_line)
            result.append(processed_line)

        return result

    def process_line(self, line, is_last_valid_line):
        """1行を処理"""
        # 単語置換の適用
        for word, replacement in self.settings['word_replacements'].items():
            line = line.replace(word, replacement)
            
        # 句読点で分割
        segments = self.split_by_punctuation(line)
        result = []
        
        for i, segment in enumerate(segments):
            result.append(segment['text'])
            
            # 句読点がある場合の処理
            if segment['punctuation']:
                result.append(segment['punctuation'])
                # 最後の有効行の最後の句読点以外にクリック待ちを追加
                if not is_last_valid_line or i < len(segments) - 1:
                    result.append(self.settings['click_wait'])

        # 最後の有効行以外に改行記号を追加
        if not is_last_valid_line:
            result.append(self.settings['line_break'])
        else:
            # 最後の有効行には改ページ記号を追加
            result.append(self.settings['page_break'])
        
        return "".join(result)

    def split_by_punctuation(self, text):
        """テキストを句読点で分割"""
        result = []
        punctuation_marks = ["。", "！", "!", "？", "?", ".", ","]
        
        # テキストを句読点で分割
        current_text = ""
        current_index = 0
        
        while current_index < len(text):
            char = text[current_index]
            current_text += char
            
            # 句読点が見つかった場合
            if char in punctuation_marks:
                # 句読点の前のテキストを追加
                result.append({
                    'text': current_text[:-1],  # 句読点を除いたテキスト
                    'punctuation': char  # 句読点
                })
                current_text = ""
            
            current_index += 1
        
        # 残りのテキストがあれば追加
        if current_text:
            result.append({
                'text': current_text,
                'punctuation': None
            })
        
        return result

    def process_character_line(self, character, text):
        if character:
            return f"#{character}{text}"
        return text

    def process_choice(self, choice_text):
        return f"{self.settings['jump_tag']}{choice_text}"

    def process_label(self, label_name):
        return f"{self.settings['label_symbol']}{label_name}"

class RenpyScriptConverter(ScriptConverter):
    """Ren'Py用の変換クラス"""
    def __init__(self):
        super().__init__()
        self.settings = {
            'file_extension': '.rpy',
            'page_break': '\n\n',
            'line_break': '\n',
            'word_replacements': {
                '。': '。\n',
                '！': '！\n',
                '!': '!\n',
                '？': '？\n',
                '?': '?\n',
                '.': '.\n',
                ',': ',\n'
            }
        }

    def convert(self, script):
        """スクリプトをRen'Py形式に変換"""
        lines = script.split('\n')
        result = []
        current_character = None
        
        for line in lines:
            line = line.strip()
            if not line:
                result.append('')
                continue
            
            # キャラクター名の行を処理
            if line.startswith('#'):
                current_character = line[1:].strip()
                continue
            
            # 選択肢を処理
            if line.startswith('*'):
                result.append(self.process_choice(line))
                continue
            
            # ラベルを処理
            if line.startswith('@'):
                result.append(self.process_label(line))
                continue
            
            # テキスト行を処理
            if current_character:
                result.append(f'"{current_character}" "{self.process_line(line)}"')
            else:
                result.append(f'"{self.process_line(line)}"')
        
        return '\n'.join(result)
    
    def process_line(self, line):
        """テキスト行を処理"""
        # 単語置換を適用
        for old, new in self.settings['word_replacements'].items():
            line = line.replace(old, new)
        return line.strip()

    def process_character_line(self, character, text):
        if character:
            if character not in self.character_definitions:
                char_name = character.replace(' ', '_').lower()
                self.character_definitions[character] = char_name
                return [f'define {char_name} = Character("{character}")',
                       f'{char_name} "{text}"']
            return f'{self.character_definitions[character]} "{text}"'
        return f'"{text}"'

    def process_choice(self, choice_text):
        return [f'    "{choice_text}":',
                f"        jump {choice_text}"]

    def process_label(self, label_name):
        return f"label {label_name}:"

class TextConverter:
    def __init__(self, root):
        self.root = root
        self.root.title("テキスト変換ツール")
        self.root.geometry("1200x600")
        
        # 変換モードの設定
        self.conversion_modes = {
            'TyranoScript': TyranoScriptConverter(),
            'Ren\'Py': RenpyScriptConverter()
        }
        self.current_mode = 'TyranoScript'
        
        # 最後に開いたファイルとフォルダのパス
        self.last_file_path = os.path.expanduser("~")
        self.last_folder_path = os.path.expanduser("~")
        
        # メインフレーム
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # ヘッダーフレーム
        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill=tk.X, padx=10, pady=5)
        
        # 変換モード選択
        mode_frame = ttk.Frame(header_frame)
        mode_frame.pack(side=tk.LEFT, padx=5)
        
        ttk.Label(mode_frame, text="変換方式:").pack(side=tk.LEFT)
        self.mode_var = tk.StringVar(value=self.current_mode)
        mode_combo = ttk.Combobox(
            mode_frame,
            textvariable=self.mode_var,
            values=list(self.conversion_modes.keys()),
            state="readonly",
            width=15
        )
        mode_combo.pack(side=tk.LEFT, padx=5)
        mode_combo.bind('<<ComboboxSelected>>', self.on_mode_change)
        
        # ヘッダーボタン
        ttk.Button(header_frame, text="ファイル読み込み", command=self.load_file).pack(side=tk.LEFT, padx=5)
        ttk.Button(header_frame, text="保存", command=self.save_file).pack(side=tk.LEFT, padx=5)
        ttk.Button(header_frame, text="変換設定", command=self.show_settings).pack(side=tk.LEFT, padx=5)
        ttk.Button(header_frame, text="変換", command=self.convert_text).pack(side=tk.LEFT, padx=5)
        
        # フォルダ一括変換フレーム
        folder_frame = ttk.Frame(header_frame)
        folder_frame.pack(side=tk.LEFT, padx=5)
        
        self.recursive_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            folder_frame,
            text="サブフォルダも変換",
            variable=self.recursive_var
        ).pack(side=tk.LEFT)
        
        ttk.Button(folder_frame, text="フォルダ一括変換", command=self.convert_folder).pack(side=tk.LEFT)
        
        # ボディフレーム
        body_frame = ttk.Frame(main_frame)
        body_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # 左右のフレーム
        left_frame = ttk.Frame(body_frame)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 5))
        
        right_frame = ttk.Frame(body_frame)
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(5, 0))
        
        # 入力テキストエリア
        ttk.Label(left_frame, text="入力テキスト:").pack(anchor=tk.W)
        
        self.input_text = scrolledtext.ScrolledText(left_frame, width=50, height=30)
        self.input_text.pack(fill=tk.BOTH, expand=True)
        
        # 出力テキストエリア
        ttk.Label(right_frame, text="変換結果:").pack(anchor=tk.W)
        
        self.output_text = scrolledtext.ScrolledText(right_frame, width=50, height=30)
        self.output_text.pack(fill=tk.BOTH, expand=True)
        
        # 入力テキストの変更を監視
        self.input_text.bind('<<Modified>>', self.on_text_modified)
        
        # 初期フォーカスを入力テキストに設定
        self.input_text.focus_set()

        # 変換設定を読み込み
        self.load_conversion_settings()

    def show_settings(self):
        """変換設定ダイアログを表示"""
        converter = self.conversion_modes[self.current_mode]
        dialog = ConversionSettingsDialog(self.root, converter.settings)
        if dialog.result:
            # 設定を更新
            converter.settings.update(dialog.result)
            # 変換設定を保存
            self.save_conversion_settings()
            # テキストが入力されている場合は自動変換
            if self.input_text.get("1.0", tk.END).strip():
                self.convert_text()

    def on_mode_change(self, event=None):
        """変換モードが変更された時の処理"""
        self.current_mode = self.mode_var.get()
        # テキストが入力されている場合は自動変換
        if self.input_text.get("1.0", tk.END).strip():
            self.convert_text()

    def on_text_modified(self, event=None):
        """テキストが変更された時の処理"""
        if self.input_text.edit_modified():
            self.convert_text()
            self.input_text.edit_modified(False)

    def convert_text(self):
        """テキストを変換"""
        input_text = self.input_text.get("1.0", tk.END)
        converter = self.conversion_modes[self.current_mode]
        output_text = converter.convert(input_text)
        self.output_text.delete("1.0", tk.END)
        self.output_text.insert("1.0", output_text)

    def load_file(self):
        """ファイルを読み込む"""
        file_path = filedialog.askopenfilename(
            title="ファイルを開く",
            filetypes=[("テキストファイル", "*.txt"), ("すべてのファイル", "*.*")],
            initialdir=self.last_file_path
        )
        if file_path:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                self.input_text.delete("1.0", tk.END)
                self.input_text.insert("1.0", content)
                self.last_file_path = os.path.dirname(file_path)
                # 自動変換
                self.convert_text()
            except Exception as e:
                messagebox.showerror("エラー", f"ファイルの読み込みに失敗しました: {str(e)}")

    def save_file(self):
        """ファイルを保存"""
        converter = self.conversion_modes[self.current_mode]
        file_path = filedialog.asksaveasfilename(
            title="ファイルを保存",
            defaultextension=converter.settings['file_extension'],
            filetypes=[("テキストファイル", f"*{converter.settings['file_extension']}"), ("すべてのファイル", "*.*")],
            initialdir=self.last_file_path
        )
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(self.output_text.get("1.0", tk.END))
                self.last_file_path = os.path.dirname(file_path)
            except Exception as e:
                messagebox.showerror("エラー", f"ファイルの保存に失敗しました: {str(e)}")

    def convert_folder(self):
        """フォルダ内のファイルを一括変換"""
        folder_path = filedialog.askdirectory(
            title="変換するフォルダを選択",
            initialdir=self.last_folder_path
        )
        if not folder_path:
            return
        
        self.last_folder_path = folder_path
        
        # 変換結果の集計
        total_files = 0
        converted_files = 0
        error_files = 0
        
        try:
            # フォルダ内のファイルを処理
            for root, dirs, files in os.walk(folder_path):
                if not self.recursive_var.get() and root != folder_path:
                    continue
                
                for file in files:
                    if file.endswith('.txt'):
                        total_files += 1
                        input_path = os.path.join(root, file)
                        output_path = os.path.splitext(input_path)[0] + self.conversion_modes[self.current_mode].settings['file_extension']
                        
                        try:
                            # ファイルが既に存在し、内容が同じ場合はスキップ
                            if os.path.exists(output_path):
                                with open(input_path, 'r', encoding='utf-8') as f1, open(output_path, 'r', encoding='utf-8') as f2:
                                    if f1.read() == f2.read():
                                        continue
                            
                            # ファイルを変換
                            with open(input_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            converted_content = self.conversion_modes[self.current_mode].convert(content)
                            with open(output_path, 'w', encoding='utf-8') as f:
                                f.write(converted_content)
                            converted_files += 1
                        except Exception as e:
                            error_files += 1
                            print(f"エラー: {input_path} - {str(e)}")
            
            # 結果を表示
            result_message = f"変換完了\n\n処理ファイル数: {total_files}\n変換ファイル数: {converted_files}\nエラー数: {error_files}"
            
            # 通知ウィンドウを作成
            notification = tk.Toplevel(self.root)
            notification.overrideredirect(True)  # タイトルバーを非表示
            notification.attributes('-topmost', True)  # 最前面に表示
            
            # 通知の内容
            label = ttk.Label(notification, text=result_message, padding=10)
            label.pack()
            
            # 画面の右下に配置
            screen_width = notification.winfo_screenwidth()
            screen_height = notification.winfo_screenheight()
            notification.geometry(f"+{screen_width-250}+{screen_height-100}")
            
            # 2秒後に自動的に閉じる
            notification.after(2000, notification.destroy)
            
        except Exception as e:
            messagebox.showerror("エラー", f"フォルダの処理中にエラーが発生しました: {str(e)}")

    def save_conversion_settings(self):
        """変換設定を保存"""
        settings = {}
        for mode, converter in self.conversion_modes.items():
            settings[mode] = converter.settings
        try:
            with open('conversion_settings.json', 'w', encoding='utf-8') as f:
                json.dump(settings, f, ensure_ascii=False, indent=2)
        except Exception as e:
            messagebox.showerror("エラー", f"設定の保存に失敗しました: {str(e)}")

    def load_conversion_settings(self):
        """変換設定を読み込み"""
        try:
            if os.path.exists('conversion_settings.json'):
                with open('conversion_settings.json', 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                    for mode, mode_settings in settings.items():
                        if mode in self.conversion_modes:
                            self.conversion_modes[mode].settings.update(mode_settings)
        except Exception as e:
            messagebox.showerror("エラー", f"設定の読み込みに失敗しました: {str(e)}")

class ConversionSettingsDialog:
    def __init__(self, parent, settings):
        self.result = None
        
        # ダイアログの設定
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("変換設定")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        # ダイアログのサイズと位置を設定
        dialog_width = 500
        dialog_height = 400
        screen_width = self.dialog.winfo_screenwidth()
        screen_height = self.dialog.winfo_screenheight()
        x = (screen_width - dialog_width) // 2
        y = (screen_height - dialog_height) // 2
        self.dialog.geometry(f"{dialog_width}x{dialog_height}+{x}+{y}")
        
        # メインフレーム
        main_frame = ttk.Frame(self.dialog, padding=10)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 基本設定
        basic_frame = ttk.LabelFrame(main_frame, text="基本設定", padding=5)
        basic_frame.pack(fill=tk.X, pady=5)
        
        # ページ区切り
        ttk.Label(basic_frame, text="ページ区切り:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=2)
        self.page_break_var = tk.StringVar(value=settings.get('page_break', ''))
        ttk.Entry(basic_frame, textvariable=self.page_break_var, width=20).grid(row=0, column=1, padx=5, pady=2)
        
        # 行区切り
        ttk.Label(basic_frame, text="行区切り:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=2)
        self.line_break_var = tk.StringVar(value=settings.get('line_break', ''))
        ttk.Entry(basic_frame, textvariable=self.line_break_var, width=20).grid(row=1, column=1, padx=5, pady=2)
        
        # 単語置換設定
        word_frame = ttk.LabelFrame(main_frame, text="単語置換設定", padding=5)
        word_frame.pack(fill=tk.BOTH, expand=True, pady=5)
        
        # 単語置換の編集フレーム
        edit_frame = ttk.Frame(word_frame)
        edit_frame.pack(fill=tk.X, pady=5)
        
        # 置換前の単語
        ttk.Label(edit_frame, text="置換前:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=2)
        self.old_word_var = tk.StringVar()
        ttk.Entry(edit_frame, textvariable=self.old_word_var, width=15).grid(row=0, column=1, padx=5, pady=2)
        
        # 置換後の単語
        ttk.Label(edit_frame, text="置換後:").grid(row=0, column=2, sticky=tk.W, padx=5, pady=2)
        self.new_word_var = tk.StringVar()
        ttk.Entry(edit_frame, textvariable=self.new_word_var, width=15).grid(row=0, column=3, padx=5, pady=2)
        
        # 追加ボタン
        ttk.Button(edit_frame, text="追加", command=self.add_word).grid(row=0, column=4, padx=5, pady=2)
        
        # 単語置換リスト
        list_frame = ttk.Frame(word_frame)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=5)
        
        # リストのヘッダー
        ttk.Label(list_frame, text="置換前").grid(row=0, column=0, padx=5, pady=2)
        ttk.Label(list_frame, text="置換後").grid(row=0, column=1, padx=5, pady=2)
        
        # リストボックス
        self.word_list = tk.Listbox(list_frame, height=10, selectmode=tk.SINGLE)
        self.word_list.grid(row=1, column=0, columnspan=2, sticky=tk.NSEW, padx=5, pady=2)
        
        # スクロールバー
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.word_list.yview)
        scrollbar.grid(row=1, column=2, sticky=tk.NS)
        self.word_list['yscrollcommand'] = scrollbar.set
        
        # リストの操作ボタン
        button_frame = ttk.Frame(word_frame)
        button_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(button_frame, text="削除", command=self.delete_word).pack(side=tk.LEFT, padx=5)
        
        # 既存の単語置換をリストに追加
        self.word_replacements = settings.get('word_replacements', {}).copy()
        self.update_word_list()
        
        # ボタンフレーム
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=10)
        
        ttk.Button(button_frame, text="OK", command=self.on_ok).pack(side=tk.RIGHT, padx=5)
        ttk.Button(button_frame, text="キャンセル", command=self.on_cancel).pack(side=tk.RIGHT, padx=5)
        
        # ダイアログをモーダルに
        self.dialog.wait_window()
    
    def update_word_list(self):
        """単語置換リストを更新"""
        self.word_list.delete(0, tk.END)
        for old, new in self.word_replacements.items():
            self.word_list.insert(tk.END, f"{old} → {new}")
    
    def add_word(self):
        """単語置換を追加"""
        old = self.old_word_var.get().strip()
        new = self.new_word_var.get().strip()
        if old and new:
            self.word_replacements[old] = new
            self.update_word_list()
            self.old_word_var.set('')
            self.new_word_var.set('')
    
    def delete_word(self):
        """選択された単語置換を削除"""
        selection = self.word_list.curselection()
        if selection:
            index = selection[0]
            old = list(self.word_replacements.keys())[index]
            del self.word_replacements[old]
            self.update_word_list()
    
    def on_ok(self):
        """OKボタンの処理"""
        self.result = {
            'page_break': self.page_break_var.get(),
            'line_break': self.line_break_var.get(),
            'word_replacements': self.word_replacements
        }
        self.dialog.destroy()
    
    def on_cancel(self):
        """キャンセルボタンの処理"""
        self.dialog.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = TextConverter(root)
    root.mainloop() 