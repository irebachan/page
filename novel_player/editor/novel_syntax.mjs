import { StreamLanguage } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/** Novel Draft 用の簡易シンタックス */
export const novelLanguage = StreamLanguage.define({
    name: "novel",
    token(stream) {
        if (stream.sol()) {
            if (stream.match("//", false)) {
                stream.skipToEnd();
                return "lineComment";
            }
            if (stream.match("#")) {
                stream.skipToEnd();
                return "characterName";
            }
            if (stream.match("@if") || stream.match("@elseif") || stream.match("@else if")) {
                stream.skipToEnd();
                return "controlKeyword";
            }
            if (stream.match("@else") || stream.match("@endif")) {
                stream.skipToEnd();
                return "controlKeyword";
            }
            if (stream.match("@goto") || stream.match("@call")) {
                stream.skipToEnd();
                return "controlKeyword";
            }
            if (stream.match("@return") || stream.match("@end")) {
                stream.skipToEnd();
                return "controlKeyword";
            }
            if (stream.match("@")) {
                stream.skipToEnd();
                return "labelDef";
            }
            if (stream.match("-")) {
                stream.skipToEnd();
                return "choiceLine";
            }
        }
        stream.next();
        return null;
    },
    tokenTable: {
        lineComment: tags.lineComment,
        characterName: tags.heading,
        controlKeyword: tags.keyword,
        labelDef: tags.labelName,
        choiceLine: tags.string,
    },
});
