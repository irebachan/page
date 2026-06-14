import { Compartment } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { novelLanguage } from "./novel_syntax.mjs";
import { buildColorThemeExtensions } from "./novel_theme.mjs";
import { getStoredThemeId } from "./novel_editor_colors.mjs";

function clearDomTextSelection() {
    const sel = window.getSelection?.();
    if (sel?.rangeCount) sel.removeAllRanges();
}

const colorThemeCompartment = new Compartment();

export function createScenarioEditor(parent, options = {}) {
    const { onChange, onPreviewShortcut, onSyncEditorShortcut, onCursorChange } = options;
    const initialTheme = getStoredThemeId();

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
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    onChange?.();
                }
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
    };
}

if (typeof window !== "undefined") {
    window.ScenarioEditor = { create: createScenarioEditor };
}
