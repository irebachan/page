/** エディタシンタックス色（AppThemes 未読込時のフォールバック） */
export const DEFAULT_SYNTAX = {
    character: "#9cf",
    label: "#c0b0e8",
    if: "#e8a55c",
    goto: "#5ec8e8",
    call: "#e8d060",
    choice: "#bdc",
    end: "#a8a8a8",
};

export function resolveSyntaxColors(themeId) {
    if (typeof window !== "undefined" && window.AppThemes?.getSyntaxColors) {
        return window.AppThemes.getSyntaxColors(themeId);
    }
    return DEFAULT_SYNTAX;
}

export function getStoredThemeId() {
    if (typeof window !== "undefined" && window.AppThemes?.getThemeId) {
        return window.AppThemes.getThemeId();
    }
    return "default";
}
