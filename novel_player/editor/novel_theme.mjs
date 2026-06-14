import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { resolveSyntaxColors } from "./novel_editor_colors.mjs";

/** UI テーマの CSS 変数に追従するエディタ枠 */
export function createEditorTheme() {
    return EditorView.theme({
        "&": {
            height: "100%",
            backgroundColor: "var(--editor-bg, #333)",
            color: "var(--editor-fg, #eee)",
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
            backgroundColor: "var(--editor-gutter-bg, #2a2a2a)",
            color: "var(--editor-gutter-fg, #777)",
            border: "none",
            paddingLeft: "0.35em",
        },
        ".cm-activeLineGutter": {
            backgroundColor: "var(--app-surface-3, #353535)",
            color: "var(--app-muted-2, #aaa)",
        },
        ".cm-activeLine": {
            backgroundColor: "var(--editor-active-line, rgba(100, 140, 200, 0.08))",
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
}

export function buildHighlightStyle(colors) {
    return HighlightStyle.define([
        { tag: tags.lineComment, color: "#888", fontStyle: "italic" },
        { tag: tags.comment, color: "#888", fontStyle: "italic" },
        { tag: tags.heading, color: colors.character },
        { tag: tags.keyword, color: colors.if },
        { tag: tags.name, color: colors.if, fontStyle: "italic" },
        { tag: tags.operator, color: colors.goto },
        { tag: tags.typeName, color: colors.goto, fontStyle: "italic" },
        { tag: tags.meta, color: colors.call },
        { tag: tags.link, color: colors.call, fontStyle: "italic" },
        { tag: tags.processingInstruction, color: colors.end },
        { tag: tags.labelName, color: colors.label },
        { tag: tags.string, color: colors.choice },
        { tag: tags.url, color: colors.choice, fontStyle: "italic" },
    ]);
}

export function buildColorThemeExtensions(themeId) {
    const colors = resolveSyntaxColors(themeId);
    return [
        createEditorTheme(),
        syntaxHighlighting(buildHighlightStyle(colors)),
    ];
}

export const novelEditorTheme = createEditorTheme();
export const novelSyntaxHighlighting = syntaxHighlighting(
    buildHighlightStyle(resolveSyntaxColors("default"))
);
