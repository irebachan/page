import { Compartment } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { keymap, ViewPlugin } from "@codemirror/view";
import { novelLanguage } from "./novel_syntax.mjs";
import { buildColorThemeExtensions } from "./novel_theme.mjs";
import { getStoredThemeId } from "./novel_editor_colors.mjs";

function clearDomTextSelection() {
    const sel = window.getSelection?.();
    if (sel?.rangeCount) sel.removeAllRanges();
}

function isCoarsePointer() {
    return (
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: coarse)").matches
    );
}

/** カーソルとキーボード上端・画面上端の間に空ける余白(px) */
const KEYBOARD_SCROLL_PADDING = 12;

/**
 * エディタのスクロール領域のうち、実際の画面（visualViewport）の外にはみ出している上下の幅。
 * iOS などキーボードがレイアウトを縮めず上に被さる環境で、被さった分を「見えない」と扱う。
 */
function getHiddenScrollerInsets(view) {
    const vv = window.visualViewport;
    if (!vv) return null;
    const rect = view.scrollDOM.getBoundingClientRect();
    const visibleTop = vv.offsetTop;
    const visibleBottom = vv.offsetTop + vv.height;
    return {
        top: Math.max(0, visibleTop - rect.top),
        bottom: Math.max(0, rect.bottom - visibleBottom),
    };
}

/**
 * baseScrollTop のままでカーソルが見えていればそれを、見えなければ見える位置まで最小限ずらした scrollTop を返す
 */
function scrollTopKeepingCursorVisible(view, baseScrollTop) {
    const scroller = view.scrollDOM;
    const head = view.state.selection.main.head;
    const rect = scroller.getBoundingClientRect();
    const coords = view.coordsAtPos(head);
    let lineTop;
    let lineBottom;
    if (coords) {
        lineTop = coords.top - rect.top + scroller.scrollTop;
        lineBottom = coords.bottom - rect.top + scroller.scrollTop;
    } else {
        const block = view.lineBlockAt(head);
        const docTop = view.documentTop - rect.top + scroller.scrollTop;
        lineTop = docTop + block.top;
        lineBottom = docTop + block.bottom;
    }
    const hidden = getHiddenScrollerInsets(view) ?? { top: 0, bottom: 0 };
    const viewTop = hidden.top + KEYBOARD_SCROLL_PADDING;
    const viewBottom = scroller.clientHeight - hidden.bottom - KEYBOARD_SCROLL_PADDING;
    let target = baseScrollTop;
    if (lineBottom - target > viewBottom) target = lineBottom - viewBottom;
    if (lineTop - target < viewTop) target = lineTop - viewTop;
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    return Math.max(0, Math.min(target, maxScroll));
}

/** タップ後、ブラウザ等による自動スクロールを打ち消す時間(ms) */
const TAP_SCROLL_GUARD_MS = 800;
/** これ以上指が動いたらタップではなくスクロール操作とみなす(px) */
const TAP_MOVE_TOLERANCE = 10;

function buildMobileTouchScrollExtensions() {
    if (!isCoarsePointer()) return [];

    const scrollMargins = EditorView.scrollMargins.of((view) => {
        if (!view.hasFocus) return null;
        const hidden = getHiddenScrollerInsets(view);
        if (!hidden) return null;
        return {
            top: hidden.top + KEYBOARD_SCROLL_PADDING,
            bottom: hidden.bottom + KEYBOARD_SCROLL_PADDING,
        };
    });

    /**
     * Android Chrome はキーボード表示中に入力欄をタップするたび「入力欄をカーソルが見える位置へ」
     * 独自にスクロールし、大きな入力欄だと本文が大きく飛ぶ。タップ直後のスクロールは打ち消し、
     * タップした行が隠れる場合だけ見える端まで最小限動かす。
     */
    const viewportPlugin = ViewPlugin.fromClass(
        class MobileKeyboardScroll {
            constructor(view) {
                this.view = view;
                this.padBottom = 0;
                this.attrs = null;
                this._touch = null;
                this._base = 0;
                this._guardUntil = 0;
                this._raf = 0;
                this._timer = 0;
                const scroller = view.scrollDOM;

                this._onTouchStart = (e) => {
                    this._guardUntil = 0;
                    const t = e.touches.length === 1 ? e.touches[0] : null;
                    this._touch = t ? { x: t.clientX, y: t.clientY, moved: false } : null;
                };
                this._onTouchMove = (e) => {
                    const t = e.touches[0];
                    if (!this._touch || !t) return;
                    if (
                        Math.abs(t.clientX - this._touch.x) > TAP_MOVE_TOLERANCE ||
                        Math.abs(t.clientY - this._touch.y) > TAP_MOVE_TOLERANCE
                    ) {
                        this._touch.moved = true;
                    }
                };
                this._onTouchEnd = () => {
                    const touch = this._touch;
                    this._touch = null;
                    if (!touch || touch.moved) return;
                    this._base = scroller.scrollTop;
                    this._guardUntil = Date.now() + TAP_SCROLL_GUARD_MS;
                };
                this._onScroll = () => {
                    if (this._touch || Date.now() > this._guardUntil) return;
                    this.enforce(this._base);
                };
                this._vvHeight = window.visualViewport?.height ?? 0;
                this._onViewportChange = () => {
                    const height = window.visualViewport?.height ?? 0;
                    const shrank = height < this._vvHeight - 1;
                    this._vvHeight = height;
                    const guarding = Date.now() <= this._guardUntil;
                    if (guarding) {
                        this._guardUntil = Date.now() + TAP_SCROLL_GUARD_MS;
                    } else if (!shrank) {
                        return;
                    }
                    cancelAnimationFrame(this._raf);
                    clearTimeout(this._timer);
                    const run = () => {
                        if (!view.hasFocus || this._touch) return;
                        this.enforce(guarding ? this._base : scroller.scrollTop);
                    };
                    this._raf = requestAnimationFrame(run);
                    this._timer = setTimeout(run, 300);
                };

                scroller.addEventListener("touchstart", this._onTouchStart, { passive: true });
                scroller.addEventListener("touchmove", this._onTouchMove, { passive: true });
                scroller.addEventListener("touchend", this._onTouchEnd, { passive: true });
                scroller.addEventListener("touchcancel", this._onTouchStart, { passive: true });
                scroller.addEventListener("scroll", this._onScroll, { passive: true });
                window.visualViewport?.addEventListener("resize", this._onViewportChange);
            }

            enforce(base) {
                const scroller = this.view.scrollDOM;
                const target = scrollTopKeepingCursorVisible(this.view, base);
                this._base = target;
                if (Math.abs(scroller.scrollTop - target) >= 1) scroller.scrollTop = target;
            }

            /** 文末でもカーソル行をキーボードの上まで持ち上げられるよう、隠れた分だけ下に余白を足す */
            update(update) {
                const hidden = update.view.hasFocus
                    ? getHiddenScrollerInsets(update.view)
                    : null;
                const pad = hidden?.bottom
                    ? Math.round(hidden.bottom + KEYBOARD_SCROLL_PADDING * 2)
                    : 0;
                if (pad === this.padBottom) return;
                this.padBottom = pad;
                this.attrs = pad > 0 ? { style: `padding-bottom: ${pad}px` } : null;
            }

            destroy() {
                cancelAnimationFrame(this._raf);
                clearTimeout(this._timer);
                const scroller = this.view.scrollDOM;
                scroller.removeEventListener("touchstart", this._onTouchStart);
                scroller.removeEventListener("touchmove", this._onTouchMove);
                scroller.removeEventListener("touchend", this._onTouchEnd);
                scroller.removeEventListener("touchcancel", this._onTouchStart);
                scroller.removeEventListener("scroll", this._onScroll);
                window.visualViewport?.removeEventListener("resize", this._onViewportChange);
            }
        },
        {
            provide: (plugin) =>
                EditorView.contentAttributes.of(
                    (view) => view.plugin(plugin)?.attrs ?? null
                ),
        }
    );

    return [scrollMargins, viewportPlugin];
}

const colorThemeCompartment = new Compartment();

export function createScenarioEditor(parent, options = {}) {
    const { onChange, onPreviewShortcut, onSyncEditorShortcut, onCursorChange } = options;
    const initialTheme = getStoredThemeId();
    let backgroundPaused = false;

    const previewKeymap = keymap.of([
        {
            key: "Mod-Enter",
            run: () => {
                onPreviewShortcut?.();
                return true;
            },
        },
        {
            key: "Mod-Shift-Enter",
            run: () => {
                onSyncEditorShortcut?.();
                return true;
            },
        },
    ]);

    const view = new EditorView({
        parent,
        doc: "",
        extensions: [
            basicSetup,
            novelLanguage,
            colorThemeCompartment.of(buildColorThemeExtensions(initialTheme)),
            EditorView.lineWrapping,
            previewKeymap,
            ...buildMobileTouchScrollExtensions(),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    onChange?.();
                }
                if (backgroundPaused) return;
                if (update.selectionSet || update.docChanged) {
                    onCursorChange?.();
                }
            }),
        ],
    });

    parent.classList.add("script-editor-host--ready");

    return {
        getValue() {
            return view.state.doc.toString();
        },

        setValue(text) {
            const next = text ?? "";
            const cur = view.state.doc.toString();
            if (cur === next) return;
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: next },
            });
        },

        getCursorLine() {
            return view.state.doc.lineAt(view.state.selection.main.head).number - 1;
        },

        goToLine(lineNum, options = {}) {
            if (lineNum < 0) return;
            const lineCount = view.state.doc.lines;
            if (lineCount === 0) return;
            const line = view.state.doc.line(Math.min(lineNum + 1, lineCount));
            const scrollY = options.scrollY ?? "center";
            const yMargin =
                options.yMargin ?? (scrollY === "start" ? 96 : 5);
            view.dispatch({
                selection: { anchor: line.from, head: line.from },
                effects: EditorView.scrollIntoView(line.from, {
                    y: scrollY,
                    yMargin,
                }),
            });
            if (options.focus !== false) {
                view.focus();
                if (options.clearNativeSelection) {
                    clearDomTextSelection();
                    requestAnimationFrame(clearDomTextSelection);
                }
            }
        },

        isFocused() {
            return view.hasFocus;
        },

        focus() {
            view.focus();
        },

        clearNativeSelection() {
            clearDomTextSelection();
        },

        selectAll() {
            view.dispatch({
                selection: { anchor: 0, head: view.state.doc.length },
            });
        },

        getView() {
            return view;
        },

        getAppTheme() {
            return getStoredThemeId();
        },

        setAppTheme(themeId) {
            view.dispatch({
                effects: colorThemeCompartment.reconfigure(
                    buildColorThemeExtensions(themeId)
                ),
            });
        },

        setBackgroundPaused(paused) {
            backgroundPaused = Boolean(paused);
        },
    };
}

/* global __EDITOR_BUILD__ */
const EDITOR_BUILD = typeof __EDITOR_BUILD__ === "string" ? __EDITOR_BUILD__ : "dev";

if (typeof window !== "undefined") {
    window.ScenarioEditor = { create: createScenarioEditor, build: EDITOR_BUILD };
    const showBuild = () => {
        const el = document.getElementById("editorBuildStamp");
        if (el) el.textContent = EDITOR_BUILD;
    };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", showBuild);
    } else {
        showBuild();
    }
}
