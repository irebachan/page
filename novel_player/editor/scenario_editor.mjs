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

function getKeyboardOverlap() {
    const vv = window.visualViewport;
    if (!vv) return 0;
    return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

const KEYBOARD_SCROLL_PADDING = 16;
const TOUCH_SCROLL_Y_MARGIN = 32;

function nudgeCursorIntoVisualViewport(view) {
    const head = view.state.selection.main.head;
    const coords = view.coordsAtPos(head);
    if (!coords) return;

    const vv = window.visualViewport;
    const visBottom =
        (vv?.offsetTop ?? 0) +
        (vv?.height ?? window.innerHeight) -
        KEYBOARD_SCROLL_PADDING;

    if (coords.bottom <= visBottom) return;

    window.scrollBy(0, coords.bottom - visBottom);

    const host = view.dom.closest(".script-editor-host");
    if (!host) return;
    const hostRect = host.getBoundingClientRect();
    const clipBottom = Math.min(hostRect.bottom, visBottom);
    if (coords.bottom > clipBottom - KEYBOARD_SCROLL_PADDING) {
        host.scrollTop +=
            coords.bottom - clipBottom + KEYBOARD_SCROLL_PADDING;
    }
}

function scrollSelectionIntoView(view) {
    view.dispatch({
        effects: EditorView.scrollIntoView(view.state.selection.main.head, {
            y: "nearest",
            yMargin: TOUCH_SCROLL_Y_MARGIN,
        }),
    });
    requestAnimationFrame(() => nudgeCursorIntoVisualViewport(view));
}

function buildMobileTouchScrollExtensions() {
    if (!isCoarsePointer()) return [];

    let keyboardOverlap = getKeyboardOverlap();

    const viewportPlugin = ViewPlugin.fromClass(
        class MobileViewportSync {
            constructor(view) {
                this.view = view;
                this._scrollTimer = null;
                this._onViewportChange = () => {
                    const next = getKeyboardOverlap();
                    const changed = Math.abs(next - keyboardOverlap) >= 2;
                    keyboardOverlap = next;
                    if (changed && view.hasFocus) {
                        this.scheduleScroll();
                    }
                };
                const vv = window.visualViewport;
                vv?.addEventListener("resize", this._onViewportChange);
                vv?.addEventListener("scroll", this._onViewportChange);
            }

            scheduleScroll() {
                clearTimeout(this._scrollTimer);
                this._scrollTimer = setTimeout(() => {
                    this._scrollTimer = null;
                    if (!this.view.hasFocus) return;
                    scrollSelectionIntoView(this.view);
                }, 80);
            }

            destroy() {
                clearTimeout(this._scrollTimer);
                const vv = window.visualViewport;
                vv?.removeEventListener("resize", this._onViewportChange);
                vv?.removeEventListener("scroll", this._onViewportChange);
            }
        }
    );

    return [
        EditorView.scrollMargins.of(() => {
            if (keyboardOverlap <= 8) return null;
            return { bottom: keyboardOverlap + KEYBOARD_SCROLL_PADDING };
        }),
        EditorView.updateListener.of((update) => {
            if (!update.selectionSet) return;
            if (
                !update.transactions.some((tr) =>
                    tr.isUserEvent("select.pointer")
                )
            ) {
                return;
            }
            requestAnimationFrame(() => {
                scrollSelectionIntoView(update.view);
            });
        }),
        viewportPlugin,
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
