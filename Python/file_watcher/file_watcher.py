import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import os
import shutil
import json
from pathlib import Path

# アプリケーションのディレクトリパスを取得
APP_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(APP_DIR, "watcher_config.json")

class FileHandler(FileSystemEventHandler):
    def __init__(self, target_dir, extensions, overwrite_var):
        self.target_dir = target_dir
        self.extensions = [ext.lower() for ext in extensions]
        self.overwrite_var = overwrite_var
        print(f"初期化: 移動先={target_dir}, 拡張子={extensions}")

    def get_unique_filename(self, target_path):
        """同名ファイルがある場合、連番を付けて新しいファイル名を生成"""
        if not os.path.exists(target_path):
            return target_path

        base_name = os.path.splitext(target_path)[0]
        extension = os.path.splitext(target_path)[1]
        counter = 1

        while True:
            new_path = f"{base_name}_{counter}{extension}"
            if not os.path.exists(new_path):
                return new_path
            counter += 1

    def on_created(self, event):
        if not event.is_directory:
            file_path = event.src_path
            file_ext = os.path.splitext(file_path)[1].lower()
            
            if file_ext in self.extensions:
                target_path = os.path.join(self.target_dir, os.path.basename(file_path))
                
                if os.path.exists(target_path):
                    if self.overwrite_var.get():  # 現在の上書き設定を直接参照
                        try:
                            shutil.move(file_path, target_path)
                            print(f"ファイルを上書きしました: {target_path}")
                        except Exception as e:
                            print(f"ファイルの上書きに失敗しました: {e}")
                    else:
                        new_target_path = self.get_unique_filename(target_path)
                        try:
                            shutil.move(file_path, new_target_path)
                            print(f"ファイルを別名で保存しました: {new_target_path}")
                        except Exception as e:
                            print(f"ファイルの移動に失敗しました: {e}")
                else:
                    try:
                        shutil.move(file_path, target_path)
                        print(f"ファイルを移動しました: {target_path}")
                    except Exception as e:
                        print(f"ファイルの移動に失敗しました: {e}")

class FileWatcherApp:
    def __init__(self, root):
        self.root = root
        self.root.title("ファイル監視アプリ")
        self.root.geometry("600x500")
        
        self.observer = None
        self.watching = False
        
        # スタイルの設定
        self.style = ttk.Style()
        self.style.configure("Watch.TButton", font=("Helvetica", 14, "bold"))
        self.style.configure("WatchOn.TButton", background="red")
        
        self.create_widgets()
        self.load_config()

    def create_widgets(self):
        # メインフレーム
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # 監視元フォルダ
        ttk.Label(main_frame, text="監視元フォルダ:", font=("Helvetica", 10, "bold")).pack(pady=5)
        self.source_frame = ttk.Frame(main_frame)
        self.source_frame.pack(fill=tk.X, padx=5)
        self.source_entry = ttk.Entry(self.source_frame, font=("Helvetica", 10))
        self.source_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(self.source_frame, text="参照", command=self.select_source).pack(side=tk.RIGHT)

        # 移動先フォルダ
        ttk.Label(main_frame, text="移動先フォルダ:", font=("Helvetica", 10, "bold")).pack(pady=5)
        self.target_frame = ttk.Frame(main_frame)
        self.target_frame.pack(fill=tk.X, padx=5)
        self.target_entry = ttk.Entry(self.target_frame, font=("Helvetica", 10))
        self.target_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(self.target_frame, text="参照", command=self.select_target).pack(side=tk.RIGHT)

        # 拡張子設定
        ttk.Label(main_frame, text="監視する拡張子 (カンマ区切り):", font=("Helvetica", 10, "bold")).pack(pady=5)
        self.extensions_entry = ttk.Entry(main_frame, font=("Helvetica", 10))
        self.extensions_entry.pack(fill=tk.X, padx=5)
        self.extensions_entry.insert(0, ".txt,.pdf,.doc,.docx")  # デフォルト値

        # 上書きオプション
        self.overwrite_var = tk.BooleanVar(value=False)
        tk.Checkbutton(main_frame, text="同名ファイルを上書きする", 
                      variable=self.overwrite_var,
                      font=("Helvetica", 10)).pack(pady=10)

        # 状態表示ラベル
        self.status_label = ttk.Label(main_frame, text="監視停止中", 
                                    font=("Helvetica", 12, "bold"),
                                    foreground="gray")
        self.status_label.pack(pady=10)

        # 開始/停止ボタン
        self.toggle_button = ttk.Button(main_frame, 
                                      text="監視開始",
                                      style="Watch.TButton",
                                      command=self.toggle_watching)
        self.toggle_button.pack(pady=20, ipadx=20, ipady=10)

    def update_button_state(self):
        if self.watching:
            self.toggle_button.configure(text="監視停止", style="WatchOn.TButton")
            self.status_label.configure(text="監視中", foreground="red")
        else:
            self.toggle_button.configure(text="監視開始", style="Watch.TButton")
            self.status_label.configure(text="監視停止中", foreground="gray")

    def select_source(self):
        folder = filedialog.askdirectory()
        if folder:
            self.source_entry.delete(0, tk.END)
            self.source_entry.insert(0, folder)

    def select_target(self):
        folder = filedialog.askdirectory()
        if folder:
            self.target_entry.delete(0, tk.END)
            self.target_entry.insert(0, folder)

    def toggle_watching(self):
        if not self.watching:
            source = self.source_entry.get()
            target = self.target_entry.get()
            extensions = [ext.strip() for ext in self.extensions_entry.get().split(",")]
            
            if not all([source, target, extensions]):
                messagebox.showerror("エラー", "すべての項目を入力してください。")
                return
            
            if not os.path.exists(source) or not os.path.exists(target):
                messagebox.showerror("エラー", "指定されたフォルダが存在しません。")
                return

            self.observer = Observer()
            handler = FileHandler(target, extensions, self.overwrite_var)
            self.observer.schedule(handler, source, recursive=False)
            self.observer.start()
            
            self.watching = True
            self.update_button_state()
            self.save_config()
        else:
            if self.observer:
                self.observer.stop()
                self.observer.join()
            self.watching = False
            self.update_button_state()

    def save_config(self):
        try:
            config = {
                "source_dir": self.source_entry.get(),
                "target_dir": self.target_entry.get(),
                "extensions": self.extensions_entry.get(),
                "overwrite": self.overwrite_var.get()
            }
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(config, f, ensure_ascii=False, indent=4)
        except Exception as e:
            print(f"設定の保存に失敗しました: {e}")

    def load_config(self):
        try:
            if os.path.exists(CONFIG_FILE):
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    config = json.load(f)
                    self.source_entry.delete(0, tk.END)
                    self.source_entry.insert(0, config.get("source_dir", ""))
                    
                    self.target_entry.delete(0, tk.END)
                    self.target_entry.insert(0, config.get("target_dir", ""))
                    
                    self.extensions_entry.delete(0, tk.END)
                    self.extensions_entry.insert(0, config.get("extensions", ".txt,.pdf,.doc,.docx"))
                    
                    self.overwrite_var.set(config.get("overwrite", False))
        except Exception as e:
            print(f"設定の読み込みに失敗しました: {e}")
            # デフォルト値を設定
            self.extensions_entry.delete(0, tk.END)
            self.extensions_entry.insert(0, ".txt,.pdf,.doc,.docx")

if __name__ == "__main__":
    root = tk.Tk()
    app = FileWatcherApp(root)
    root.mainloop() 