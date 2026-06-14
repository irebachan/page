import { StreamLanguage } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/** Novel Draft 用の簡易シンタックス */
export const novelLanguage = StreamLanguage.define({
    name: "novel",
    startState: () => ({ lineCtx: null }),
    token(stream, state) {
        if (stream.sol()) {
            state.lineCtx = null;
            if (stream.match("//", false)) {
                stream.skipToEnd();
                return "lineComment";
            }
            if (stream.match("#")) {
                stream.skipToEnd();
                return "characterName";
            }
            if (stream.match("@if") || stream.match("@elseif") || stream.match("@else if")) {
                state.lineCtx = "ifTail";
                return "ifKeyword";
            }
            if (stream.match("@else") || stream.match("@endif")) {
                stream.skipToEnd();
                return "ifKeyword";
            }
            if (stream.match("@endmeta") || stream.match("@meta")) {
                stream.skipToEnd();
                return "metaKeyword";
            }
            if (stream.match("@goto")) {
                state.lineCtx = "gotoTail";
                return "gotoKeyword";
            }
            if (stream.match("@call")) {
                state.lineCtx = "callTail";
                return "callKeyword";
            }
            if (stream.match("@return")) {
                stream.skipToEnd();
                return "returnKeyword";
            }
            if (stream.match("@end")) {
                stream.skipToEnd();
                return "endKeyword";
            }
            if (stream.match("@")) {
                stream.skipToEnd();
                return "labelDef";
            }
            if (stream.match("-")) {
                stream.eatSpace();
                state.lineCtx = stream.eol() ? null : "choice";
                return null;
            }
        }

        if (state.lineCtx === "ifTail") {
            stream.eatSpace();
            if (!stream.eol()) {
                stream.skipToEnd();
                state.lineCtx = null;
                return "ifCondition";
            }
            state.lineCtx = null;
            return null;
        }
        if (state.lineCtx === "gotoTail") {
            stream.eatSpace();
            if (!stream.eol()) {
                stream.skipToEnd();
                state.lineCtx = null;
                return "gotoTarget";
            }
            state.lineCtx = null;
            return null;
        }
        if (state.lineCtx === "callTail") {
            stream.eatSpace();
            if (!stream.eol()) {
                stream.skipToEnd();
                state.lineCtx = null;
                return "callTarget";
            }
            state.lineCtx = null;
            return null;
        }
        if (state.lineCtx === "choice") {
            if (stream.match("=>")) {
                stream.eatSpace();
                state.lineCtx = "choiceTarget";
                return null;
            }
            stream.next();
            return "choiceText";
        }
        if (state.lineCtx === "choiceTarget") {
            stream.skipToEnd();
            state.lineCtx = null;
            return "choiceTarget";
        }

        stream.next();
        return null;
    },
    tokenTable: {
        lineComment: tags.lineComment,
        characterName: tags.heading,
        ifKeyword: tags.keyword,
        ifCondition: tags.name,
        gotoKeyword: tags.operator,
        gotoTarget: tags.typeName,
        callKeyword: tags.meta,
        callTarget: tags.link,
        returnKeyword: tags.meta,
        endKeyword: tags.processingInstruction,
        metaKeyword: tags.comment,
        labelDef: tags.labelName,
        choiceText: tags.string,
        choiceTarget: tags.url,
    },
});
