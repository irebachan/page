// プレビュー用の変数と条件式（@set / @if）。eval は使わず小さな式だけ評価する

/** ティラノ風の f. / sf. / tf. は付けても付けなくても同じ変数として扱う */
function normalizeScriptVarName(name) {
    return String(name || "").trim().replace(/^(?:f|sf|tf)\./, "");
}

class ScriptExprError extends Error {
    constructor(kind, message) {
        super(message);
        this.kind = kind;
    }
}

const SCRIPT_EXPR_OPERATORS = [
    "===", "!==", "==", "!=", "<=", ">=", "&&", "||",
    "<", ">", "+", "-", "*", "/", "%", "!", "(", ")",
];

function tokenizeScriptExpr(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
        const ch = src[i];
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        const num = /^\d+(?:\.\d+)?/.exec(src.slice(i));
        if (num) {
            tokens.push({ type: "num", value: Number(num[0]) });
            i += num[0].length;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === "「") {
            const close = ch === "「" ? "」" : ch;
            const end = src.indexOf(close, i + 1);
            if (end < 0) throw new ScriptExprError("syntax", "文字列が閉じていません");
            tokens.push({ type: "str", value: src.slice(i + 1, end) });
            i = end + 1;
            continue;
        }
        const ident = /^[\p{L}_$][\p{L}\p{N}_$.]*/u.exec(src.slice(i));
        if (ident) {
            const word = ident[0];
            if (word === "and") tokens.push({ type: "op", value: "&&" });
            else if (word === "or") tokens.push({ type: "op", value: "||" });
            else if (word === "not") tokens.push({ type: "op", value: "!" });
            else if (word === "true") tokens.push({ type: "lit", value: true });
            else if (word === "false") tokens.push({ type: "lit", value: false });
            else tokens.push({ type: "var", value: normalizeScriptVarName(word) });
            i += word.length;
            continue;
        }
        const op = SCRIPT_EXPR_OPERATORS.find((o) => src.startsWith(o, i));
        if (!op) throw new ScriptExprError("syntax", `使えない記号: ${ch}`);
        tokens.push({ type: "op", value: op });
        i += op.length;
    }
    return tokens;
}

/** 優先順位の低い順（同じ段は左結合） */
const SCRIPT_EXPR_BINARY_LEVELS = [
    ["||"],
    ["&&"],
    ["===", "!==", "==", "!="],
    ["<", ">", "<=", ">="],
    ["+", "-"],
    ["*", "/", "%"],
];

function applyScriptExprBinary(op, a, b) {
    switch (op) {
        case "||": return a || b;
        case "&&": return a && b;
        case "===": return a === b;
        case "!==": return a !== b;
        // eslint-disable-next-line eqeqeq
        case "==": return a == b;
        // eslint-disable-next-line eqeqeq
        case "!=": return a != b;
        case "<": return a < b;
        case ">": return a > b;
        case "<=": return a <= b;
        case ">=": return a >= b;
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return a / b;
        case "%": return a % b;
        default: throw new ScriptExprError("syntax", `未対応の演算子: ${op}`);
    }
}

/**
 * 式を評価する。vars に無い変数が出てきたら kind "unknown" の ScriptExprError。
 * && / || は短絡評価（左だけで決まれば右の未知変数は問わない）。
 */
function evaluateScriptExpr(src, vars) {
    const tokens = tokenizeScriptExpr(String(src ?? ""));
    let pos = 0;
    const peek = () => tokens[pos];
    const isOp = (t, values) => t && t.type === "op" && values.includes(t.value);

    const parseLevel = (level) => {
        if (level >= SCRIPT_EXPR_BINARY_LEVELS.length) return parseUnary();
        const ops = SCRIPT_EXPR_BINARY_LEVELS[level];
        let left = parseLevel(level + 1);
        while (isOp(peek(), ops)) {
            const op = tokens[pos++].value;
            const right = parseLevel(level + 1);
            const l = left;
            left = () => {
                if (op === "&&") return l() && right();
                if (op === "||") return l() || right();
                return applyScriptExprBinary(op, l(), right());
            };
        }
        return left;
    };

    const parseUnary = () => {
        if (isOp(peek(), ["!"])) {
            pos++;
            const inner = parseUnary();
            return () => !inner();
        }
        if (isOp(peek(), ["-"])) {
            pos++;
            const inner = parseUnary();
            return () => -inner();
        }
        return parsePrimary();
    };

    const parsePrimary = () => {
        const t = tokens[pos++];
        if (!t) throw new ScriptExprError("syntax", "式が途中で終わっています");
        if (t.type === "num" || t.type === "str" || t.type === "lit") {
            return () => t.value;
        }
        if (t.type === "var") {
            return () => {
                if (!Object.prototype.hasOwnProperty.call(vars, t.value)) {
                    throw new ScriptExprError("unknown", `未設定の変数: ${t.value}`);
                }
                return vars[t.value];
            };
        }
        if (isOp(t, ["("])) {
            const inner = parseLevel(0);
            if (!isOp(tokens[pos++], [")"])) {
                throw new ScriptExprError("syntax", "括弧が閉じていません");
            }
            return inner;
        }
        throw new ScriptExprError("syntax", `ここに ${t.value} は書けません`);
    };

    const root = parseLevel(0);
    if (pos < tokens.length) {
        throw new ScriptExprError("syntax", `余分な記述: ${tokens[pos].value}`);
    }
    return root();
}

/** { ok: true, value } / { ok: false, kind: "unknown" | "syntax", message } */
function tryEvaluateScriptExpr(src, vars) {
    try {
        return { ok: true, value: evaluateScriptExpr(src, vars) };
    } catch (err) {
        if (err instanceof ScriptExprError) {
            return { ok: false, kind: err.kind, message: err.message };
        }
        return { ok: false, kind: "syntax", message: String(err?.message || err) };
    }
}
