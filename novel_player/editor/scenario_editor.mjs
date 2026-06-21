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

const KEYBOARD_SCROLL_PADDING = 12;

function isKeyboardVisible() {
    const vv = window.visualViewport;
    if (!vv) return false;
    return window.innerHeight - vv.height - vv.offsetTop > 8;
}

/** 画面の表示領域（キーボードで下半分が隠れる）とエディタの交差部分 */
function getEditorVisibleRect(view) {
    const host = view.dom.closest(".script-editor-host");
    if (!host) return null;
    const hostRect = host.getBoundingClientRect();
    if (hostRect.height <= 0) return null;

    const vv = window.visualViewport;
    const screenTop = vv?.offsetTop ?? 0;
    const screenHeight = vv?.height ?? window.innerHeight;
    const screenBottom = isKeyboardVisible()
        ? screenTop + screenHeight
        : screenTop + screenHeight * 0.5;

    return {
        top: Math.max(hostRect.top, screenTop),
        bottom: Math.min(hostRect.bottom, screenBottom),
    };
}

/** カーソル行をエディタの表示領域内に収める */
function keepCursorInEditorVisibleArea(view) {
    const coords = view.coordsAtPos(view.state.selection.main.head);
    const area = getEditorVisibleRect(view);
    if (!coords || !area || area.bottom <= area.top) return;

    const top = area.top + KEYBOARD_SCROLL_PADDING;
    const bottom = area.bottom - KEYBOARD_SCROLL_PADDING;
    const scrollDOM = view.scrollDOM;

    if (coords.bottom > bottom) {
        scrollDOM.scrollTop += coords.bottom - bottom;
    } else if (coords.top < top) {
        scrollDOM.scrollTop += coords.top - top;
    }
}

function buildMobileTouchScrollExtensions() {
    if (!isCoarsePointer()) return [];

    const viewportPlugin = ViewPlugin.fromClass(
        class MobileKeyboardScroll {
            constructor(view) {
                this.view = view;
                this._onResize = () => {
                    if (view.hasFocus) keepCursorInEditorVisibleArea(view);
                };
                window.visualViewport?.addEventListener(
                    "resize",
                    this._onResize
                );
            }

            destroy() {
                window.visualViewport?.removeEventListener(
                    "resize",
                    this._onResize
                );
            }
        }
    );

    return [
        viewportPlugin,
        EditorView.updateListener.of((update) => {
            if (!update.selectionSet) return;
            if (
                !update.transactions.some((tr) =>
                    tr.isUserEvent("select.pointer")
                )
            ) {
                return;
            }
            const view = update.view;
            keepCursorInEditorVisibleArea(view);
            setTimeout(() => keepCursorInEditorVisibleArea(view), 150);
        }),
    ];
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

if (typeof window !== "undefined") {
    window.ScenarioEditor = { create: createScenarioEditor };
}
