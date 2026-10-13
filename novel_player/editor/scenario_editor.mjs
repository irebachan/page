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

/** カーソル行の上端の、スクロール領域上端からの距離(px)。取れなければ null */
function getCursorOffsetInScroller(view) {
    const coords = view.coordsAtPos(view.state.selection.main.head);
    if (!coords) return null;
    const rect = view.scrollDOM.getBoundingClientRect();
    return { offset: coords.top - rect.top, height: coords.bottom - coords.top, rect };
}

/**
 * キーボード開閉などで表示領域が変わったとき、カーソル行をなるべく元の位置に留める。
 * 隠れてしまう場合だけ、見える範囲の端（キーボードの真上など）まで最小限動かす。
 */
function keepCursorLineInPlace(view, anchorOffset) {
    if (!view.hasFocus) return;
    const cur = getCursorOffsetInScroller(view);
    if (!cur) {
        view.dispatch({
            effects: EditorView.scrollIntoView(view.state.selection.main.head, {
                y: "nearest",
            }),
        });
        return;
    }
    const hidden = getHiddenScrollerInsets(view) ?? { top: 0, bottom: 0 };
    const minOffset = hidden.top + KEYBOARD_SCROLL_PADDING;
    const maxOffset =
        cur.rect.height - hidden.bottom - KEYBOARD_SCROLL_PADDING - cur.height;
    if (maxOffset < minOffset) return;
    const want = Math.min(Math.max(anchorOffset ?? cur.offset, minOffset), maxOffset);
    const delta = cur.offset - want;
    if (Math.abs(delta) >= 1) view.scrollDOM.scrollTop += delta;
}

/** キーボード開閉アニメーション中とみなす、最後の viewport 変化からの時間(ms) */
const VIEWPORT_SETTLE_MS = 400;

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

    const viewportPlugin = ViewPlugin.fromClass(
        class MobileKeyboardScroll {
            constructor(view) {
                this.view = view;
                this.padBottom = 0;
                this.attrs = null;
                this._raf = 0;
                this._timer = 0;
                /** 表示領域が変わる直前の、カーソル行の位置（スクロール領域上端から） */
                this._anchorOffset = null;
                this._settlingUntil = 0;
                this._onViewportChange = () => {
                    this._settlingUntil = Date.now() + VIEWPORT_SETTLE_MS;
                    cancelAnimationFrame(this._raf);
                    clearTimeout(this._timer);
                    this._raf = requestAnimationFrame(() =>
                        keepCursorLineInPlace(view, this._anchorOffset)
                    );
                    // ブラウザ自身のカーソル追従スクロールが後から入るので、収まったあとにもう一度
                    this._timer = setTimeout(
                        () => keepCursorLineInPlace(view, this._anchorOffset),
                        VIEWPORT_SETTLE_MS - 100
                    );
                };
                this._onScroll = () => this.recordAnchor();
                view.scrollDOM.addEventListener("scroll", this._onScroll, {
                    passive: true,
                });
                window.visualViewport?.addEventListener(
                    "resize",
                    this._onViewportChange
                );
                window.visualViewport?.addEventListener(
                    "scroll",
                    this._onViewportChange
                );
            }

            recordAnchor() {
                if (Date.now() < this._settlingUntil) return;
                const cur = getCursorOffsetInScroller(this.view);
                if (cur) this._anchorOffset = cur.offset;
            }

            /** 文末でもカーソル行をキーボードの上まで持ち上げられるよう、隠れた分だけ下に余白を足す */
            update(update) {
                if (update.selectionSet || update.docChanged || update.focusChanged) {
                    update.view.requestMeasure({
                        key: this,
                        read: () => this.recordAnchor(),
                    });
                }
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
                this.view.scrollDOM.removeEventListener("scroll", this._onScroll);
                window.visualViewport?.removeEventListener(
                    "resize",
                    this._onViewportChange
                );
                window.visualViewport?.removeEventListener(
                    "scroll",
                    this._onViewportChange
                );
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
