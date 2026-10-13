// 変数（@set）と @if 条件の簡易評価・出力変換
(function (global) {
    "use strict";

    const UNKNOWN = Symbol("unknown");
    const ID_START = /[\p{L}_$]/u;
    const ID_PART = /[\p{L}\p{N}_$.]/u;
    const OPERATORS = [
        "===", "!==", "==", "!=", ">=", "<=", "&&", "||", "+=", "-=",
        ">", "<", "!", "(", ")", "+", "-", "*", "/", "%", "=",
    ];
    const WORD_OPS = new Set(["and", "or", "not"]);
    const LITERAL_WORDS = new Set(["true", "false", "True", "False"]);
    const ENGINE_PREFIX = /^(?:f|tf|sf)\./;

    /** f. / tf. / sf. を外した名前（プレビューでは同じ変数として扱う） */
    function normalizeName(name) {
        return String(name || "").replace(ENGINE_PREFIX, "");
    }

    function tokenize(src) {
        const s = String(src ?? "");
        const tokens = [];
        let i = 0;
        while (i < s.length) {
            const c = s[i];
            if (/\s/.test(c)) {
                let j = i + 1;
                while (j < s.length && /\s/.test(s[j])) j++;
                tokens.push({ t: "ws", v: s.slice(i, j) });
                i = j;
                continue;
            }
            if (c === '"' || c === "'") {
                let j = i + 1;
                let v = "";
                while (j < s.length && s[j] !== c) {
                    if (s[j] === "\\" && j + 1 < s.length) {
                        v += s[j + 1];
                        j += 2;
                    } else {
                        v += s[j++];
                    }
                }
                if (j >= s.length) return null;
                tokens.push({ t: "str", v, q: c, raw: s.slice(i, j + 1) });
                i = j + 1;
                continue;
            }
            if (/[0-9]/.test(c)) {
                const m = s.slice(i).match(/^[0-9]+(?:\.[0-9]+)?/);
                tokens.push({ t: "num", v: Number(m[0]), raw: m[0] });
                i += m[0].length;
                continue;
            }
            if (ID_START.test(c)) {
                let j = i + 1;
                while (j < s.length && ID_PART.test(s[j])) j++;
                const word = s.slice(i, j);
                if (WORD_OPS.has(word)) tokens.push({ t: "op", v: word, raw: word });
                else if (LITERAL_WORDS.has(word)) {
                    tokens.push({ t: "bool", v: word.toLowerCase() === "true", raw: word });
                } else tokens.push({ t: "id", v: word, raw: word });
                i = j;
                continue;
            }
            const op = OPERATORS.find((o) => s.startsWith(o, i));
            if (!op) return null;
            tokens.push({ t: "op", v: op, raw: op });
            i += op.length;
        }
        return tokens;
    }

    /** 条件式を構文木にする。解釈できなければ null */
    function parseExpression(src) {
        const all = tokenize(src);
        if (!all) return null;
        const toks = all.filter((t) => t.t !== "ws");
        let p = 0;
        const peek = () => toks[p];
        const isOp = (...vs) => peek()?.t === "op" && vs.includes(peek().v);
        const fail = () => {
            throw new Error("syntax");
        };

        function parseOr() {
            let node = parseAnd();
            while (isOp("||", "or")) {
                p++;
                node = { k: "or", a: node, b: parseAnd() };
            }
            return node;
        }
        function parseAnd() {
            let node = parseNot();
            while (isOp("&&", "and")) {
                p++;
                node = { k: "and", a: node, b: parseNot() };
            }
            return node;
        }
        function parseNot() {
            if (isOp("!", "not")) {
                p++;
                return { k: "not", a: parseNot() };
            }
            return parseCmp();
        }
        function parseCmp() {
            const node = parseAdd();
            if (isOp("==", "!=", "===", "!==", ">", "<", ">=", "<=")) {
                const op = toks[p++].v;
                return { k: "cmp", op, a: node, b: parseAdd() };
            }
            return node;
        }
        function parseAdd() {
            let node = parseMul();
            while (isOp("+", "-")) {
                const op = toks[p++].v;
                node = { k: "bin", op, a: node, b: parseMul() };
            }
            return node;
        }
        function parseMul() {
            let node = parseUnary();
            while (isOp("*", "/", "%")) {
                const op = toks[p++].v;
                node = { k: "bin", op, a: node, b: parseUnary() };
            }
            return node;
        }
        function parseUnary() {
            if (isOp("-")) {
                p++;
                return { k: "neg", a: parseUnary() };
            }
            return parsePrimary();
        }
        function parsePrimary() {
            const t = toks[p++];
            if (!t) fail();
            if (t.t === "num" || t.t === "str" || t.t === "bool") return { k: "lit", v: t.v };
            if (t.t === "id") return { k: "var", name: normalizeName(t.v) };
            if (t.t === "op" && t.v === "(") {
                const node = parseOr();
                if (!isOp(")")) fail();
                p++;
                return node;
            }
            return fail();
        }

        try {
            if (!toks.length) return null;
            const node = parseOr();
            return p === toks.length ? node : null;
        } catch {
            return null;
        }
    }

    function evalNode(node, vars, ctx) {
        switch (node.k) {
            case "lit":
                return node.v;
            case "var":
                if (Object.prototype.hasOwnProperty.call(vars, node.name)) {
                    return vars[node.name];
                }
                if (ctx.unsetIsUndefined) return undefined;
                ctx.missing.add(node.name);
                return UNKNOWN;
            case "not": {
                const a = evalNode(node.a, vars, ctx);
                return a === UNKNOWN ? UNKNOWN : !a;
            }
            case "and": {
                const a = evalNode(node.a, vars, ctx);
                if (a !== UNKNOWN && !a) return a;
                const b = evalNode(node.b, vars, ctx);
                if (b !== UNKNOWN && !b) return b;
                return a === UNKNOWN || b === UNKNOWN ? UNKNOWN : b;
            }
            case "or": {
                const a = evalNode(node.a, vars, ctx);
                if (a !== UNKNOWN && a) return a;
                const b = evalNode(node.b, vars, ctx);
                if (b !== UNKNOWN && b) return b;
                return a === UNKNOWN || b === UNKNOWN ? UNKNOWN : b;
            }
            case "neg": {
                const a = evalNode(node.a, vars, ctx);
                return a === UNKNOWN ? UNKNOWN : -a;
            }
            case "bin": {
                const a = evalNode(node.a, vars, ctx);
                const b = evalNode(node.b, vars, ctx);
                if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN;
                if (node.op === "+") return a + b;
                if (node.op === "-") return a - b;
                if (node.op === "*") return a * b;
                if (node.op === "/") return a / b;
                return a % b;
            }
            case "cmp": {
                const a = evalNode(node.a, vars, ctx);
                const b = evalNode(node.b, vars, ctx);
                if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN;
                switch (node.op) {
                    case "==":
                    case "===":
                        return a == b;
                    case "!=":
                    case "!==":
                        return a != b;
                    case ">":
                        return a > b;
                    case "<":
                        return a < b;
                    case ">=":
                        return a >= b;
                    default:
                        return a <= b;
                }
            }
            default:
                return UNKNOWN;
        }
    }

    /**
     * 条件式を評価する。
     * options.unsetIsUndefined … 未設定の名前をエンジン同様 undefined として扱う（偽になる）
     * @returns {{ known: true, value: any } | { known: false, missing: string[], syntaxError?: boolean }}
     */
    function evaluate(src, vars, options = {}) {
        const node = parseExpression(src);
        if (!node) return { known: false, missing: [], syntaxError: true };
        const ctx = { missing: new Set(), unsetIsUndefined: !!options.unsetIsUndefined };
        const value = evalNode(node, vars || {}, ctx);
        if (value === UNKNOWN) return { known: false, missing: [...ctx.missing] };
        return { known: true, value };
    }

    /** @set の本文（「@set 」より後）を解釈する。不正なら null */
    function parseSet(body) {
        const text = String(body || "").trim();
        if (!text) return null;
        let m = text.match(/^(?:!|not\s+)([\p{L}_$][\p{L}\p{N}_$.]*)$/u);
        if (m) return { name: m[1], op: "=", expr: "false" };
        m = text.match(/^([\p{L}_$][\p{L}\p{N}_$.]*)$/u);
        if (m) return { name: m[1], op: "=", expr: "true" };
        m = text.match(/^([\p{L}_$][\p{L}\p{N}_$.]*)\s*(\+=|-=|=)(?!=)\s*(.+)$/u);
        if (!m) return null;
        if (!parseExpression(m[3])) return null;
        return { name: m[1], op: m[2], expr: m[3].trim() };
    }

    /** @set を vars に反映（vars を直接書き換える） */
    function applySet(item, vars) {
        const key = normalizeName(item.name);
        const r = evaluate(item.expr, vars);
        if (item.op === "=") {
            if (r.known) vars[key] = r.value;
            else delete vars[key];
            return;
        }
        const cur = Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : 0;
        if (!r.known) return;
        vars[key] = item.op === "+=" ? cur + r.value : cur - r.value;
    }

    /** 脚本中の @set / @if で使われている名前（出現順・正規化済み） */
    function collectNames(script) {
        const names = [];
        const seen = new Set();
        const add = (n) => {
            const key = normalizeName(n);
            if (!key || seen.has(key)) return;
            seen.add(key);
            names.push(key);
        };
        for (const item of script || []) {
            if (item.type === "set") add(item.name);
            if (item.type === "if_chain") {
                for (const b of item.branches || []) {
                    const toks = b.condition ? tokenize(b.condition) : null;
                    (toks || []).forEach((t) => {
                        if (t.t === "id") add(t.v);
                    });
                }
            }
        }
        return names;
    }

    function formatValue(v) {
        if (typeof v === "string") return `"${v}"`;
        return String(v);
    }

    /** パネル入力の文字列を値にする（空欄は undefined＝未設定） */
    function parseLiteralInput(text) {
        const t = String(text ?? "").trim();
        if (t === "") return undefined;
        if (/^(true|false)$/i.test(t)) return t.toLowerCase() === "true";
        if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(t)) return Number(t);
        const q = t.match(/^(["'])(.*)\1$/);
        return q ? q[2] : t;
    }

    function convertTokens(src, mapToken) {
        const toks = tokenize(src);
        if (!toks) return String(src ?? "");
        let out = "";
        toks.forEach((t, i) => {
            let piece = mapToken(t, toks, i);
            if (t.t !== "str" && out.endsWith(" ")) piece = piece.replace(/^ +/, "");
            out += piece;
        });
        return out;
    }

    function needsSpaceAround(toks, i) {
        const prev = toks[i - 1];
        const next = toks[i + 1];
        return {
            before: prev && prev.t !== "ws" && !(prev.t === "op" && prev.v === "("),
            after: next && next.t !== "ws" && !(next.t === "op" && next.v === ")"),
        };
    }

    /** ティラノの JS 式へ（素の名前は f. を付ける。f. 等が付いていればそのまま） */
    function toTyranoExp(src) {
        return convertTokens(src, (t, toks, i) => {
            if (t.t === "ws") {
                const prev = toks[i - 1];
                return prev?.t === "op" && prev.v === "not" ? "" : t.v;
            }
            if (t.t === "id") return t.v.includes(".") ? t.v : `f.${t.v}`;
            if (t.t === "bool") return t.v ? "true" : "false";
            if (t.t === "str") {
                return t.v.includes("'") ? JSON.stringify(t.v) : `'${t.v}'`;
            }
            if (t.t === "op") {
                const map = { and: "&&", or: "||", not: "!" };
                if (t.v === "not") return "!";
                if (map[t.v]) {
                    const sp = needsSpaceAround(toks, i);
                    return `${sp.before ? " " : ""}${map[t.v]}${sp.after ? " " : ""}`;
                }
            }
            return t.raw;
        });
    }

    /** Ren'Py（Python）式へ（f. / tf. を外し、sf. は persistent. に） */
    function toRenpyExpr(src) {
        return convertTokens(src, (t, toks, i) => {
            if (t.t === "ws") return t.v;
            if (t.t === "id") {
                if (t.v.startsWith("sf.")) return `persistent.${t.v.slice(3)}`;
                return t.v.replace(/^(?:f|tf)\./, "");
            }
            if (t.t === "bool") return t.v ? "True" : "False";
            if (t.t === "str") return t.raw;
            if (t.t === "op") {
                const map = { "&&": "and", "||": "or", "!": "not", "===": "==", "!==": "!=" };
                if (t.v === "===" || t.v === "!==") return map[t.v];
                if (map[t.v]) {
                    const sp = needsSpaceAround(toks, i);
                    const after = t.v === "!" ? true : sp.after;
                    return `${sp.before ? " " : ""}${map[t.v]}${after ? " " : ""}`;
                }
            }
            return t.raw;
        });
    }

    function tyranoSetTag(item) {
        const name = item.name.includes(".") ? item.name : `f.${item.name}`;
        const exp = `${name}${item.op}${toTyranoExp(item.expr)}`;
        return `[eval exp="${exp.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
    }

    function renpySetLine(item) {
        return `$ ${toRenpyExpr(item.name)} ${item.op} ${toRenpyExpr(item.expr)}`;
    }

    const api = {
        normalizeName,
        tokenize,
        parseExpression,
        evaluate,
        parseSet,
        applySet,
        collectNames,
        formatValue,
        parseLiteralInput,
        toTyranoExp,
        toRenpyExpr,
        tyranoSetTag,
        renpySetLine,
    };
    global.ScriptFlags = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
