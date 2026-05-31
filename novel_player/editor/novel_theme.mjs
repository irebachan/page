import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/** 既存 UI（#333 背景）に合わせたダークテーマ */
export const novelEditorTheme = EditorView.theme({
    "&": {
        height: "100%",
        backgroundColor: "#333",
        color: "#eee",
        fontSize: "1.05em",
    },
    ".cm-scroller": {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        lineHeight: "1.55",
        overflow: "auto",
    },
    ".cm-content": {
        padding: "1em 0.5em 1em 0",
        caretColor: "#fff",
    },
    ".cm-gutters": {
        backgroundColor: "#2a2a2a",
        color: "#777",
        border: "none",
        paddingLeft: "0.35em",
    },
    ".cm-activeLineGutter": {
        backgroundColor: "#353535",
        color: "#aaa",
    },
    ".cm-activeLine": {
        backgroundColor: "rgba(100, 140, 200, 0.08)",
    },
    "&.cm-focused .cm-cursor": {
        borderLeftColor: "#fff",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
        backgroundColor: "rgba(100, 160, 255, 0.35) !important",
    },
    ".cm-selectionMatch": {
        backgroundColor: "rgba(120, 180, 255, 0.2)",
    },
});

export const novelHighlightStyle = HighlightStyle.define([
    { tag: tags.lineComment, color: "#888", fontStyle: "italic" },
    { tag: tags.heading, color: "#9cf", fontWeight: "bold" },
    { tag: tags.keyword, color: "#c9f" },
    { tag: tags.labelName, color: "#8df" },
    { tag: tags.string, color: "#bdc" },
]);

export const novelSyntaxHighlighting = syntaxHighlighting(novelHighlightStyle);
