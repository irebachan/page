import tkinter as tk

def center_window(window, width=None, height=None):
    """
    ウィンドウを画面中央に配置し、最前面に表示します
    """
    # ウィンドウサイズを取得
    if width is None or height is None:
        window.update_idletasks()
        width = window.winfo_width()
        height = window.winfo_height()
    
    # 画面サイズを取得
    screen_width = window.winfo_screenwidth()
    screen_height = window.winfo_screenheight()
    
    # 中央に配置するための座標を計算
    x = (screen_width - width) // 2
    y = (screen_height - height) // 2
    
    # ウィンドウを配置
    window.geometry(f"{width}x{height}+{x}+{y}")
    
    # 最前面に表示
    window.lift()
    window.attributes('-topmost', True)
    window.after_idle(lambda: window.attributes('-topmost', False)) 