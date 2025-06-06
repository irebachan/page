import os
import tkinter as tk
from tkinter import filedialog, messagebox
import mutagen
from mutagen import File
from mutagen.id3 import ID3, APIC, TALB, TPE1, TIT2, TCMP, error as ID3Error, Encoding
from mutagen.flac import Picture
import subprocess

class MetadataEditorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("音楽メタデータ編集アプリ")
        self.file_path = None
        self.create_widgets()

    def clean_text(self, text):
        """テキストのクリーニング処理"""
        if not text:
            return ""
        # 前後の空白を削除
        text = text.strip()
        # 連続する空白を1つに
        text = ' '.join(text.split())
        return text

    def get_tag_text(self, audio, tag_name, default=""):
        """タグからテキストを安全に取得"""
        try:
            if hasattr(audio, 'tags') and audio.tags:
                if isinstance(audio.tags, ID3):
                    if tag_name in audio.tags:
                        return self.clean_text(str(audio.tags[tag_name]))
                else:
                    # easy=True の場合
                    value = audio.get(tag_name, [default])[0]
                    return self.clean_text(str(value))
        except Exception:
            pass
        return default

    def create_widgets(self):
        self.file_label = tk.Label(self.root, text="ファイル: 未選択")
        self.file_label.pack()

        self.select_button = tk.Button(self.root, text="ファイルを選ぶ", command=self.select_file)
        self.select_button.pack()

        tk.Label(self.root, text="曲名:").pack()
        self.title_entry = tk.Entry(self.root)
        self.title_entry.pack()

        tk.Label(self.root, text="アーティスト:").pack()
        self.artist_entry = tk.Entry(self.root)
        self.artist_entry.pack()

        tk.Label(self.root, text="アルバム:").pack()
        self.album_entry = tk.Entry(self.root)
        self.album_entry.pack()

        # コンピレーションアルバムのチェックボックスを追加
        self.compilation_var = tk.BooleanVar()
        self.compilation_check = tk.Checkbutton(self.root, text="コンピレーションアルバム", variable=self.compilation_var)
        self.compilation_check.pack()

        tk.Label(self.root, text="ジャケット画像（パス）:").pack()
        self.cover_path_entry = tk.Entry(self.root)
        self.cover_path_entry.pack()

        self.cover_button = tk.Button(self.root, text="画像を選ぶ", command=self.select_cover)
        self.cover_button.pack()

        self.save_button = tk.Button(self.root, text="保存", command=self.save_metadata)
        self.save_button.pack()

    def select_file(self):
        filetypes = [("音楽ファイル", "*.mp3 *.flac *.ogg *.opus *.m4a")]
        filepath = filedialog.askopenfilename(filetypes=filetypes)
        if filepath:
            self.file_label.config(text=f"ファイル: {filepath}")
            self.file_path = filepath
            # 既存のタグを読み込んでエントリーにセット
            audio = File(filepath, easy=True)
            if audio:
                # 各フィールドをクリーンアップして設定
                self.title_entry.delete(0, tk.END)
                self.title_entry.insert(0, self.get_tag_text(audio, "title"))
                
                self.artist_entry.delete(0, tk.END)
                self.artist_entry.insert(0, self.get_tag_text(audio, "artist"))
                
                self.album_entry.delete(0, tk.END)
                self.album_entry.insert(0, self.get_tag_text(audio, "album"))
                
                # コンピレーション設定を読み込む
                if hasattr(audio, 'tags') and isinstance(audio.tags, ID3):
                    self.compilation_var.set(bool(audio.tags.get('TCMP')))

    def select_cover(self):
        filepath = filedialog.askopenfilename(filetypes=[("画像ファイル", "*.jpg *.jpeg *.png")])
        if filepath:
            self.cover_path_entry.delete(0, tk.END)
            self.cover_path_entry.insert(0, filepath)

    def save_metadata(self):
        if not self.file_path:
            messagebox.showerror("エラー", "ファイルが選択されていません。")
            return

        # 各フィールドをクリーニング
        title = self.clean_text(self.title_entry.get())
        artist = self.clean_text(self.artist_entry.get())
        album = self.clean_text(self.album_entry.get())
        cover_path = self.cover_path_entry.get()
        is_compilation = self.compilation_var.get()

        audio = File(self.file_path, easy=False)
        if audio is None:
            messagebox.showerror("エラー", "このファイル形式はmutagenで扱えません。")
            return

        try:
            if self.file_path.lower().endswith(".mp3"):
                if not isinstance(audio.tags, ID3):
                    try:
                        audio.add_tags()
                    except ID3Error:
                        pass
                
                # 既存のタグをクリア
                for tag in ['TIT2', 'TPE1', 'TALB', 'TCMP']:
                    if tag in audio.tags:
                        del audio.tags[tag]
                
                # 新しいタグを設定
                if title:
                    audio.tags["TIT2"] = TIT2(encoding=Encoding.UTF8, text=title)
                if artist:
                    audio.tags["TPE1"] = TPE1(encoding=Encoding.UTF8, text=artist)
                if album:
                    audio.tags["TALB"] = TALB(encoding=Encoding.UTF8, text=album)
                
                # コンピレーション設定を保存
                if is_compilation:
                    audio.tags["TCMP"] = TCMP(encoding=Encoding.UTF8, text="1")

                if os.path.isfile(cover_path):
                    with open(cover_path, "rb") as img:
                        mime = "image/jpeg" if cover_path.lower().endswith((".jpg", ".jpeg")) else "image/png"
                        audio.tags["APIC"] = APIC(
                            encoding=Encoding.UTF8, mime=mime, type=3, desc=u"Cover", data=img.read()
                        )
                    
                    # macOSのサムネイルを設定
                    try:
                        subprocess.run(['xattr', '-w', 'com.apple.metadata:kMDItemWhereFroms', '', self.file_path], check=True)
                        subprocess.run(['xattr', '-w', 'com.apple.metadata:kMDItemFinderComment', '', self.file_path], check=True)
                        subprocess.run(['xattr', '-w', 'com.apple.metadata:kMDItemFSLabel', '0', self.file_path], check=True)
                        subprocess.run(['xattr', '-w', 'com.apple.metadata:kMDItemFSContentChangeDate', '', self.file_path], check=True)
                    except subprocess.CalledProcessError as e:
                        print(f"サムネイル設定中にエラーが発生しました: {e}")

            elif self.file_path.lower().endswith((".flac", ".ogg", ".opus", ".m4a")):
                audio["title"] = title
                audio["artist"] = artist
                audio["album"] = album

                if cover_path and os.path.isfile(cover_path):
                    with open(cover_path, "rb") as f:
                        pic_data = f.read()

                    pic = Picture()
                    pic.data = pic_data
                    pic.type = 3  # 表示用カバー(front)
                    pic.mime = "image/jpeg" if cover_path.lower().endswith((".jpg", ".jpeg")) else "image/png"

                    if self.file_path.lower().endswith(".flac"):
                        audio.clear_pictures()
                        audio.add_picture(pic)

            else:
                messagebox.showinfo("未対応", "この形式のタグ編集はまだ未対応です。")
                return

            audio.save()
            messagebox.showinfo("保存完了", "メタデータを保存しました。")

        except Exception as e:
            messagebox.showerror("エラー", f"メタデータ保存に失敗しました: {e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = MetadataEditorApp(root)
    root.mainloop()
