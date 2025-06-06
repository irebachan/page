import json
import sys
import subprocess
from pathlib import Path
import tkinter as tk
from tkinter import ttk
import os

class LauncherApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Pythonプログラムランチャー")
        
        # ウィンドウサイズを設定
        window_width = 600
        window_height = 400
        
        # 画面の中央に配置
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = (screen_width - window_width) // 2
        y = (screen_height - window_height) // 2
        self.root.geometry(f"{window_width}x{window_height}+{x}+{y}")
        
        # スタイル設定
        style = ttk.Style()
        style.configure("TButton", padding=6, relief="flat", background="#ccc")
        style.configure("TLabel", padding=6)
        
        # メインフレーム
        main_frame = ttk.Frame(root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # プログラムリスト
        self.program_list = ttk.Treeview(main_frame, columns=("name", "description"), show="headings")
        self.program_list.heading("name", text="プログラム名")
        self.program_list.heading("description", text="説明")
        self.program_list.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # スクロールバー
        scrollbar = ttk.Scrollbar(main_frame, orient=tk.VERTICAL, command=self.program_list.yview)
        scrollbar.grid(row=0, column=2, sticky=(tk.N, tk.S))
        self.program_list.configure(yscrollcommand=scrollbar.set)
        
        # 起動ボタン
        launch_button = ttk.Button(main_frame, text="起動", command=self.launch_selected)
        launch_button.grid(row=1, column=0, pady=10)
        
        # 終了ボタン
        quit_button = ttk.Button(main_frame, text="終了", command=root.quit)
        quit_button.grid(row=1, column=1, pady=10)
        
        # プログラムリストの読み込み
        self.load_programs()
        
        # ウィンドウのリサイズ設定
        root.columnconfigure(0, weight=1)
        root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(0, weight=1)

    def load_programs(self):
        config = self.load_config()
        for key, program in config['programs'].items():
            self.program_list.insert("", tk.END, values=(program['name'], program['description']), tags=(key,))

    def load_config(self):
        config_path = Path(__file__).parent / 'config.json'
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def launch_selected(self):
        selection = self.program_list.selection()
        if not selection:
            return
        
        item = self.program_list.item(selection[0])
        program_key = item['tags'][0]
        
        config = self.load_config()
        program = config['programs'][program_key]
        program_path = Path(__file__).parent / program['path']
        
        if not program_path.exists():
            tk.messagebox.showerror("エラー", f"ファイル '{program_path}' が見つかりません。")
            return
        
        try:
            # アプリケーションを起動
            process = subprocess.Popen([sys.executable, str(program_path)])
            
            # アプリケーションのウィンドウを中央に配置し、最前面に表示
            def center_and_raise_window():
                try:
                    # プロセスのウィンドウIDを取得
                    window_id = process.pid
                    # ウィンドウを中央に配置
                    screen_width = self.root.winfo_screenwidth()
                    screen_height = self.root.winfo_screenheight()
                    x = (screen_width - 800) // 2  # デフォルトのウィンドウサイズ
                    y = (screen_height - 600) // 2
                    # ウィンドウを最前面に表示
                    self.root.after(100, lambda: self.root.lift())
                except Exception as e:
                    print(f"Warning: Could not center window: {e}")
            
            self.root.after(500, center_and_raise_window)
            
        except Exception as e:
            tk.messagebox.showerror("エラー", f"プログラムの起動に失敗しました: {e}")

def main():
    root = tk.Tk()
    app = LauncherApp(root)
    root.mainloop()

if __name__ == "__main__":
    main() 