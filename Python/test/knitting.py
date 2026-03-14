import tkinter as tk
from tkinter import messagebox

def calculate():
    try:
        # 入力値を取得
        orig_width_gauge = float(entry_orig_width.get())
        orig_height_gauge = float(entry_orig_height.get())
        orig_stitches = float(entry_orig_stitches.get())
        orig_rows = float(entry_orig_rows.get())
        my_width_gauge = float(entry_my_width.get())
        my_height_gauge = float(entry_my_height.get())
        
        # 目数換算
        converted_stitches = round(orig_stitches * (my_width_gauge / orig_width_gauge))
        # 段数換算
        converted_rows = round(orig_rows * (my_height_gauge / orig_height_gauge))
        
        result_text.set(f"換算後の目数: {converted_stitches}目\n換算後の段数: {converted_rows}段")
        
    except ValueError:
        messagebox.showerror("入力エラー", "数字を正しく入力してください")

# GUI作成
root = tk.Tk()
root.title("編み物ゲージ換算")

# 入力欄
tk.Label(root, text="編み図 横ゲージ(目):").grid(row=0, column=0)
entry_orig_width = tk.Entry(root)
entry_orig_width.grid(row=0, column=1)

tk.Label(root, text="編み図 縦ゲージ(段):").grid(row=1, column=0)
entry_orig_height = tk.Entry(root)
entry_orig_height.grid(row=1, column=1)

tk.Label(root, text="編みたい作品 目数:").grid(row=2, column=0)
entry_orig_stitches = tk.Entry(root)
entry_orig_stitches.grid(row=2, column=1)

tk.Label(root, text="編みたい作品 段数:").grid(row=3, column=0)
entry_orig_rows = tk.Entry(root)
entry_orig_rows.grid(row=3, column=1)

tk.Label(root, text="自分の毛糸 横ゲージ(目):").grid(row=4, column=0)
entry_my_width = tk.Entry(root)
entry_my_width.grid(row=4, column=1)

tk.Label(root, text="自分の毛糸 縦ゲージ(段):").grid(row=5, column=0)
entry_my_height = tk.Entry(root)
entry_my_height.grid(row=5, column=1)

# 計算ボタン
tk.Button(root, text="換算する", command=calculate).grid(row=6, column=0, columnspan=2, pady=10)

# 結果表示
result_text = tk.StringVar()
tk.Label(root, textvariable=result_text, fg="yellow").grid(row=7, column=0, columnspan=2)

root.mainloop()
