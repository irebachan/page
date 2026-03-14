import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
import time
import threading
import queue
import signal
import json

class NumbersFileHandler(FileSystemEventHandler):
    def __init__(self, callback):
        self.callback = callback
        self.last_modified = {}
        self.processing = False
    
    def on_modified(self, event):
        if event.src_path.endswith('.numbers') and not self.processing:
            current_time = time.time()
            if event.src_path not in self.last_modified or \
               current_time - self.last_modified[event.src_path] > 2:
                self.last_modified[event.src_path] = current_time
                self.processing = True
                self.callback(event.src_path)
                self.processing = False

class NumbersWatcherApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Numbersファイル自動csvエクスポート")
        self.root.geometry("600x400")
        
        self.config_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'numbers_watcher_config.json')
        self.watch_path = tk.StringVar()
        self.output_path = tk.StringVar()  # 出力フォルダ用の変数を追加
        self.show_confirm = tk.BooleanVar(value=True)
        self.observer = None
        self.is_watching = False
        self.processing_queue = queue.Queue()
        self.numbers_process = None
        
        # 設定の読み込み
        self.load_config()
        
        # シグナルハンドラの設定
        signal.signal(signal.SIGINT, self.handle_exit)
        signal.signal(signal.SIGTERM, self.handle_exit)
        
        self.create_widgets()
        self.start_processing_thread()
    
    def load_config(self):
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    self.watch_path.set(config.get('watch_path', ''))
                    self.output_path.set(config.get('output_path', ''))  # 出力フォルダの設定を読み込み
                    self.show_confirm.set(config.get('show_confirm', True))
        except Exception as e:
            print(f"設定の読み込みエラー: {str(e)}")
    
    def save_config(self):
        try:
            config = {
                'watch_path': self.watch_path.get(),
                'output_path': self.output_path.get(),  # 出力フォルダの設定を保存
                'show_confirm': self.show_confirm.get()
            }
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"設定の保存エラー: {str(e)}")
    
    def handle_exit(self, signum, frame):
        self.cleanup()
        self.root.quit()
    
    def cleanup(self):
        self.stop_watching()
        if self.numbers_process:
            try:
                subprocess.run(['osascript', '-e', 'tell application "Numbers" to quit'])
            except:
                pass
        self.save_config()
    
    def create_widgets(self):
        # パス選択フレーム
        path_frame = ttk.Frame(self.root, padding="10")
        path_frame.pack(fill=tk.X)
        
        # 監視フォルダ
        watch_frame = ttk.Frame(path_frame)
        watch_frame.pack(fill=tk.X, pady=2)
        ttk.Label(watch_frame, text="監視フォルダ:").pack(side=tk.LEFT)
        ttk.Entry(watch_frame, textvariable=self.watch_path, width=50).pack(side=tk.LEFT, padx=5)
        ttk.Button(watch_frame, text="参照", command=lambda: self.select_folder('watch')).pack(side=tk.LEFT)
        
        # 出力フォルダ
        output_frame = ttk.Frame(path_frame)
        output_frame.pack(fill=tk.X, pady=2)
        ttk.Label(output_frame, text="出力フォルダ:").pack(side=tk.LEFT)
        ttk.Entry(output_frame, textvariable=self.output_path, width=50).pack(side=tk.LEFT, padx=5)
        ttk.Button(output_frame, text="参照", command=lambda: self.select_folder('output')).pack(side=tk.LEFT)
        
        # コントロールフレーム
        control_frame = ttk.Frame(self.root, padding="10")
        control_frame.pack(fill=tk.X)
        
        self.watch_button = ttk.Button(control_frame, text="監視開始", command=self.toggle_watching)
        self.watch_button.pack(side=tk.LEFT, padx=5)
        
        ttk.Button(control_frame, text="全ファイルエクスポート", 
                  command=self.export_all_files).pack(side=tk.LEFT, padx=5)
        
        # 確認ダイアログ設定
        ttk.Checkbutton(control_frame, text="確認ダイアログを表示", 
                       variable=self.show_confirm,
                       command=self.save_config).pack(side=tk.LEFT, padx=5)
        
        # ログ表示エリア
        log_frame = ttk.LabelFrame(self.root, text="ログ", padding="10")
        log_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        self.log_text = tk.Text(log_frame, height=10, width=60)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        # スクロールバー
        scrollbar = ttk.Scrollbar(self.log_text, command=self.log_text.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.log_text.config(yscrollcommand=scrollbar.set)
        
        # 終了時のクリーンアップ
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
    
    def on_closing(self):
        self.cleanup()
        self.root.destroy()
    
    def select_folder(self, folder_type):
        folder = filedialog.askdirectory()
        if folder:
            if folder_type == 'watch':
                self.watch_path.set(folder)
            else:  # output
                self.output_path.set(folder)
            self.save_config()
    
    def start_processing_thread(self):
        def process_queue():
            while True:
                try:
                    file_path = self.processing_queue.get()
                    if file_path is None:
                        break
                    self.export_to_csv(file_path)
                    self.processing_queue.task_done()
                except Exception as e:
                    self.log(f"処理エラー: {str(e)}")
        
        self.processing_thread = threading.Thread(target=process_queue, daemon=True)
        self.processing_thread.start()
    
    def toggle_watching(self):
        if not self.is_watching:
            if not self.watch_path.get():
                messagebox.showerror("エラー", "監視フォルダを選択してください")
                return
            
            self.start_watching()
            self.watch_button.config(text="監視停止")
            self.is_watching = True
        else:
            self.stop_watching()
            self.watch_button.config(text="監視開始")
            self.is_watching = False
    
    def start_watching(self):
        event_handler = NumbersFileHandler(self.on_numbers_modified)
        self.observer = Observer()
        self.observer.schedule(event_handler, self.watch_path.get(), recursive=False)
        self.observer.start()
        self.log("監視を開始しました: " + self.watch_path.get())
    
    def stop_watching(self):
        if self.observer:
            self.observer.stop()
            self.observer.join()
            self.log("監視を停止しました")
    
    def on_numbers_modified(self, file_path):
        self.log(f"ファイルが更新されました: {file_path}")
        self.processing_queue.put(file_path)
    
    def export_to_csv(self, numbers_file):
        try:
            # ファイルパスを絶対パスに変換
            abs_numbers_path = os.path.abspath(numbers_file)
            
            # 出力フォルダが指定されている場合は、そこにCSVを出力
            if self.output_path.get():
                filename = os.path.basename(numbers_file)
                csv_filename = os.path.splitext(filename)[0] + '.csv'
                csv_path = os.path.join(self.output_path.get(), csv_filename)
            else:
                csv_path = os.path.splitext(abs_numbers_path)[0] + '.csv'
            
            # Numbersが既に開いているか確認
            check_script = '''
            tell application "System Events"
                set numbersRunning to exists (processes where name is "Numbers")
            end tell
            '''
            result = subprocess.run(['osascript', '-e', check_script], 
                                 capture_output=True, 
                                 text=True)
            
            # AppleScriptでCSVエクスポート
            script = f'''
            tell application "Numbers"
                if not (exists document 1) then
                    open POSIX file "{abs_numbers_path}"
                    delay 2
                end if
                tell document 1
                    export to POSIX file "{csv_path}" as CSV
                    delay 1
                end tell
            end tell
            '''
            
            result = subprocess.run(['osascript', '-e', script], 
                                 capture_output=True, 
                                 text=True)
            
            if result.returncode != 0:
                raise Exception(f"AppleScript error: {result.stderr}")
            
            if os.path.exists(csv_path):
                self.log(f"CSVにエクスポートしました: {csv_path}")
            else:
                raise Exception("CSVファイルが作成されませんでした")
                
        except Exception as e:
            self.log(f"エクスポートエラー: {str(e)}")
    
    def export_all_files(self):
        if not self.watch_path.get():
            messagebox.showerror("エラー", "監視フォルダを選択してください")
            return
        
        if not self.output_path.get():
            if not messagebox.askyesno("確認", 
                "出力フォルダが指定されていません。Numbersファイルと同じフォルダに出力しますか？"):
                return
        
        try:
            # フォルダ内の全.numbersファイルを取得
            numbers_files = []
            for file in os.listdir(self.watch_path.get()):
                if file.endswith('.numbers'):
                    numbers_files.append(os.path.join(self.watch_path.get(), file))
            
            if not numbers_files:
                messagebox.showinfo("情報", "Numbersファイルが見つかりませんでした")
                return
            
            # 確認ダイアログの表示設定に応じて処理
            if self.show_confirm.get():
                if not messagebox.askyesno("確認", 
                    f"{len(numbers_files)}個のNumbersファイルをCSVにエクスポートしますか？"):
                    return
            
            # 各ファイルをエクスポート
            for file_path in numbers_files:
                self.processing_queue.put(file_path)
                self.log(f"エクスポートキューに追加: {file_path}")
            
        except Exception as e:
            self.log(f"全ファイルエクスポートエラー: {str(e)}")
            messagebox.showerror("エラー", f"エクスポート中にエラーが発生しました: {str(e)}")
    
    def log(self, message):
        self.log_text.insert(tk.END, f"{time.strftime('%H:%M:%S')} - {message}\n")
        self.log_text.see(tk.END)

if __name__ == "__main__":
    root = tk.Tk()
    app = NumbersWatcherApp(root)
    root.mainloop() 