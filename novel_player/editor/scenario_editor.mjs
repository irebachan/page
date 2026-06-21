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
/** キーボード非表示時に「隠れる」とみなす画面下側の割合 */
const KEYBOARD_HIDDEN_SCREEN_RATIO = 0.45;
/** 行を置く表示帯内の位置（下寄り） */
const LINE_TARGET_RATIO = 0.75;

function isKeyboardVisible() {
    const vv = window.visualViewport;
    if (!vv) return false;
    return window.innerHeight - vv.height - vv.offsetTop > 8;
}

/** キーボードで下半分が隠れたあと残る、画面上の表示帯 */
function getScreenVisibleBand() {
    const vv = window.visualViewport;
    const screenTop = vv?.offsetTop ?? 0;
    const layoutHeight = window.innerHeight;
    const vvHeight = vv?.height ?? layoutHeight;
    const bottom = isKeyboardVisible()
        ? screenTop + vvHeight
        : screenTop + layoutHeight * (1 - KEYBOARD_HIDDEN_SCREEN_RATIO);
    return { top: screenTop, bottom };
}

function getLineClientRect(view, pos) {
    const line = view.lineBlockAt(pos);
    const top = view.coordsAtPos(line.from)?.top;
    const bottom =
        view.coordsAtPos(line.to, 1)?.bottom ??
        view.coordsAtPos(pos)?.bottom;
    if (top == null || bottom == null) return null;
    return { top, bottom, height: bottom - top };
}

/** カーソル行全体を、画面上の表示帯内（下寄り）に収める */
function keepCursorInEditorVisibleArea(view) {
    const head = view.state.selection.main.head;
    const line = getLineClientRect(view, head);
    const band = getScreenVisibleBand();
    if (!line || band.bottom <= band.top) return;

    const pad = KEYBOARD_SCROLL_PADDING;
    const safeTop = band.top + pad;
    const safeBottom = band.bottom - pad;
    const safeHeight = safeBottom - safeTop;
    if (safeHeight <= 0) return;

    const targetBottom = safeTop + safeHeight * LINE_TARGET_RATIO;
    let targetTop = targetBottom - line.height;
    if (targetTop < safeTop) {
        targetTop = safeTop;
    }

    let delta = 0;
    if (line.bottom > targetBottom) {
        delta = line.bottom - targetBottom;
    } else if (line.top < targetTop) {
        delta = line.top - targetTop;
    } else if (line.bottom > safeBottom) {
        delta = line.bottom - safeBottom;
    } else if (line.top < safeTop) {
        delta = line.top - safeTop;
    }
    if (delta !== 0) {
        view.scrollDOM.scrollTop += delta;
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
            requestAnimationFrame(() => keepCursorInEditorVisibleArea(view));
            setTimeout(() => keepCursorInEditorVisibleArea(view), 200);
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
