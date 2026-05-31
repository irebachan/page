import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { novelLanguage } from "./novel_syntax.mjs";
import { novelEditorTheme, novelSyntaxHighlighting } from "./novel_theme.mjs";

/**
 * シナリオエディタ（CodeMirror 6）を初期化する。
 * @param {HTMLElement} parent
 * @param {{ onChange?: () => void, onPreviewShortcut?: () => void }} options
 */
export function createScenarioEditor(parent, options = {}) {
    const { onChange, onPreviewShortcut, onCursorChange } = options;

    const previewKeymap = keymap.of([
        {
            key: "Mod-Enter",
            run: () => {
                onPreviewShortcut?.();
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
            novelEditorTheme,
            novelSyntaxHighlighting,
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

        /** 0-based 行番号（パーサーの sourceLine と一致） */
        getCursorLine() {
            return view.state.doc.lineAt(view.state.selection.main.head).number - 1;
        },

        /** 0-based 行へ移動 */
        goToLine(lineNum) {
            if (lineNum < 0) return;
            const lineCount = view.state.doc.lines;
            if (lineCount === 0) return;
            const line = view.state.doc.line(Math.min(lineNum + 1, lineCount));
            view.dispatch({
                selection: { anchor: line.from },
                effects: EditorView.scrollIntoView(line.from, { y: "center" }),
            });
            view.focus();
        },

        isFocused() {
            return view.hasFocus;
        },

        focus() {
            view.focus();
        },

        selectAll() {
            view.dispatch({
                selection: { anchor: 0, head: view.state.doc.length },
            });
        },

        getView() {
            return view;
        },
    };
}

if (typeof window !== "undefined") {
    window.ScenarioEditor = { create: createScenarioEditor };
}
