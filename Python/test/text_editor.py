import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import re
import os

class TextEditorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("テキストエディタ")
        self.root.geometry("1200x600")
        
        # 現在開いているファイルのパスを保持
        self.current_file_path = None

        # メインフレーム
        self.main_frame = ttk.Frame(self.root, padding="10")
        self.main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # ボタンフレーム
        self.button_frame = ttk.Frame(self.main_frame)
        self.button_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))

        # ボタン
        self.load_button = ttk.Button(self.button_frame, text="ファイルを開く", command=self.load_file)
        self.load_button.grid(row=0, column=0, padx=5)

        self.process_button = ttk.Button(self.button_frame, text="テキストを処理", command=self.process_text)
        self.process_button.grid(row=0, column=1, padx=5)

        self.save_button = ttk.Button(self.button_frame, text="書き出し", command=self.save_file)
        self.save_button.grid(row=0, column=2, padx=5)

        # 接頭語・接尾語設定フレーム
        self.affix_frame = ttk.Frame(self.button_frame)
        self.affix_frame.grid(row=0, column=3, padx=5)
        
        # 接頭語・接尾語の選択
        self.affix_type = tk.StringVar(value="suffix")
        ttk.Radiobutton(self.affix_frame, text="接尾語", variable=self.affix_type, value="suffix").pack(side=tk.LEFT)
        ttk.Radiobutton(self.affix_frame, text="接頭語", variable=self.affix_type, value="prefix").pack(side=tk.LEFT)
        
        # 接頭語・接尾語の入力
        self.affix_var = tk.StringVar(value="_processed")
        self.affix_entry = ttk.Entry(self.affix_frame, textvariable=self.affix_var, width=10)
        self.affix_entry.pack(side=tk.LEFT, padx=(5, 0))

        # フレームを2つに分割
        self.left_frame = ttk.LabelFrame(self.main_frame, text="編集前", padding="5")
        self.left_frame.grid(row=1, column=0, padx=5, pady=5, sticky=(tk.W, tk.E, tk.N, tk.S))

        self.right_frame = ttk.LabelFrame(self.main_frame, text="編集後", padding="5")
        self.right_frame.grid(row=1, column=1, padx=5, pady=5, sticky=(tk.W, tk.E, tk.N, tk.S))

        # 左側のテキストエリア（編集前）
        self.text_area_before = tk.Text(self.left_frame, wrap=tk.WORD, width=50, height=30)
        self.text_area_before.grid(row=0, column=0, padx=5, pady=5, sticky=(tk.W, tk.E, tk.N, tk.S))

        # 左側のスクロールバー
        scrollbar_left = ttk.Scrollbar(self.left_frame, orient=tk.VERTICAL, command=self.text_area_before.yview)
        scrollbar_left.grid(row=0, column=1, sticky=(tk.N, tk.S))
        self.text_area_before['yscrollcommand'] = scrollbar_left.set

        # 右側のテキストエリア（編集後）
        self.text_area_after = tk.Text(self.right_frame, wrap=tk.WORD, width=50, height=30)
        self.text_area_after.grid(row=0, column=0, padx=5, pady=5, sticky=(tk.W, tk.E, tk.N, tk.S))

        # 右側のスクロールバー
        scrollbar_right = ttk.Scrollbar(self.right_frame, orient=tk.VERTICAL, command=self.text_area_after.yview)
        scrollbar_right.grid(row=0, column=1, sticky=(tk.N, tk.S))
        self.text_area_after['yscrollcommand'] = scrollbar_right.set

        # グリッドの設定
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        self.main_frame.columnconfigure(0, weight=1)
        self.main_frame.columnconfigure(1, weight=1)
        self.main_frame.rowconfigure(1, weight=1)
        self.left_frame.columnconfigure(0, weight=1)
        self.left_frame.rowconfigure(0, weight=1)
        self.right_frame.columnconfigure(0, weight=1)
        self.right_frame.rowconfigure(0, weight=1)

        # 初期メッセージを表示
        self.show_initial_message()

    def show_initial_message(self):
        message = ""
        self.text_area_before.delete(1.0, tk.END)
        self.text_area_before.insert(1.0, message)
        self.text_area_after.delete(1.0, tk.END)
        self.text_area_after.insert(1.0, message)

    def load_file(self):
        file_path = filedialog.askopenfilename(
            filetypes=[("テキストファイル", "*.txt"), ("すべてのファイル", "*.*")]
        )
        if file_path:
            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    self.text_area_before.delete(1.0, tk.END)
                    self.text_area_before.insert(1.0, content)
                    self.text_area_after.delete(1.0, tk.END)
                    # ファイルパスを保持
                    self.current_file_path = file_path
                    # ファイル読み込み時に自動処理
                    self.process_text()
            except Exception as e:
                messagebox.showerror("エラー", f"ファイルの読み込みに失敗しました: {str(e)}")

    def process_text(self):
        text = self.text_area_before.get(1.0, tk.END)
        
        # まず[]で囲まれた部分を削除（半角・全角両対応）
        text = re.sub(r'[\[［]＃[^\]］]*[\]］]', '', text)
        
        # 次に改行処理を行う
        lines = text.split('\n')
        processed_lines = []
        
        for i, line in enumerate(lines):
            # 「が文頭にあって、その前が空行でない場合
            if line.strip().startswith('「') and (i == 0 or lines[i-1].strip() != ''):
                processed_lines.append('')  # 空行を追加
                processed_lines.append(line)
            # 「が文頭じゃない場合
            elif '「' in line and not line.strip().startswith('「'):
                # 複数の「」を処理
                parts = []
                current = line
                while '「' in current:
                    before, after = current.split('「', 1)
                    if before.strip():
                        parts.append(before.rstrip())
                        parts.append('')  # 空行を追加
                        parts.append('')  # 2回目の空行を追加
                    if '」' in after:
                        quote, rest = after.split('」', 1)
                        parts.append('「' + quote + '」')
                        if rest.strip():
                            parts.append('')  # 空行を追加
                            parts.append('')  # 2回目の空行を追加
                        current = rest
                    else:
                        current = after
                if current.strip():
                    parts.append(current.strip())
                processed_lines.extend(parts)
            else:
                processed_lines.append(line)
        
        text = '\n'.join(processed_lines)
        
        # 」の後の改行処理
        lines = text.split('\n')
        processed_lines = []
        
        for i, line in enumerate(lines):
            # 」が文末にあって、その後が空行でない場合
            if line.strip().endswith('」') and (i == len(lines)-1 or lines[i+1].strip() != ''):
                processed_lines.append(line)
                processed_lines.append('')  # 空行を追加
            # 」が文末じゃない場合
            elif '」' in line and not line.strip().endswith('」'):
                parts = line.split('」')
                processed_lines.append(parts[0] + '」')
                processed_lines.append('')  # 空行を追加
                processed_lines.append('')  # 2回目の空行を追加
                processed_lines.append('」'.join(parts[1:]).lstrip())
            else:
                processed_lines.append(line)
        
        text = '\n'.join(processed_lines)
        
        # 連続する空行を1つに
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        # 先頭と末尾の余分な空行を削除
        text = text.strip()
        
        self.text_area_after.delete(1.0, tk.END)
        self.text_area_after.insert(1.0, text)

    def save_file(self):
        # 現在のファイル名から新しいファイル名を生成
        if self.current_file_path:
            dir_name = os.path.dirname(self.current_file_path)
            base_name = os.path.basename(self.current_file_path)
            name, ext = os.path.splitext(base_name)
            affix = self.affix_var.get()
            if self.affix_type.get() == "suffix":
                default_name = f"{name}{affix}{ext}"
            else:
                default_name = f"{affix}{name}{ext}"
            initial_dir = dir_name
        else:
            default_name = "untitled.txt"
            initial_dir = None

        file_path = filedialog.asksaveasfilename(
            initialdir=initial_dir,
            initialfile=default_name,
            defaultextension=".txt",
            filetypes=[("テキストファイル", "*.txt"), ("すべてのファイル", "*.*")]
        )
        
        if file_path:
            try:
                content = self.text_area_after.get(1.0, tk.END)
                with open(file_path, 'w', encoding='utf-8') as file:
                    file.write(content)
                messagebox.showinfo("成功", "ファイルを書き出しました")
            except Exception as e:
                messagebox.showerror("エラー", f"ファイルの書き出しに失敗しました: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = TextEditorApp(root)
    root.mainloop() 