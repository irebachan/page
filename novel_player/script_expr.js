/**
 * プレビュー用の簡易式（整数・比較・and/or/not）
 */
(function () {
    function tokenize(src) {
        const s = (src || "").trim();
        const tokens = [];
        let i = 0;
        while (i < s.length) {
            if (/\s/.test(s[i])) {
                i++;
                continue;
            }
            const two = s.slice(i, i + 2);
            if (two === ">=" || two === "<=" || two === "==" || two === "!=") {
                tokens.push({ type: "op", value: two });
                i += 2;
                continue;
            }
            if (">" === s[i] || "<" === s[i]) {
                tokens.push({ type: "op", value: s[i] });
                i++;
                continue;
            }
            if (/[0-9]/.test(s[i]) || (s[i] === "-" && /[0-9]/.test(s[i + 1]))) {
                let j = i + 1;
                while (j < s.length && /[0-9]/.test(s[j])) j++;
                tokens.push({ type: "num", value: parseInt(s.slice(i, j), 10) });
                i = j;
                continue;
            }
            if (s[i] === "(" || s[i] === ")") {
                tokens.push({ type: s[i] === "(" ? "lparen" : "rparen" });
                i++;
                continue;
            }
            const wordMatch = s.slice(i).match(/^(and|or|not)\b/i);
            if (wordMatch) {
                tokens.push({ type: "word", value: wordMatch[1].toLowerCase() });
                i += wordMatch[0].length;
                continue;
            }
            const idMatch = s.slice(i).match(/^[\p{L}\p{N}_]+/u);
            if (idMatch) {
                tokens.push({ type: "id", value: idMatch[0] });
                i += idMatch[0].length;
                continue;
            }
            throw new Error(`式を読めません: 「${s.slice(i, i + 8)}…」`);
        }
        return tokens;
    }

    function parseExpr(tokens, pos = 0) {
        function parseOr(p) {
            let node = parseAnd(p);
            p = node.pos;
            while (tokens[p]?.type === "word" && tokens[p].value === "or") {
                const right = parseAnd(p + 1);
                node = { type: "or", left: node, right: right.node };
                p = right.pos;
            }
            return { node, pos: p };
        }
        function parseAnd(p) {
            let node = parseNot(p);
            p = node.pos;
            while (tokens[p]?.type === "word" && tokens[p].value === "and") {
                const right = parseNot(p + 1);
                node = { type: "and", left: node, right: right.node };
                p = right.pos;
            }
            return { node, pos: p };
        }
        function parseNot(p) {
            if (tokens[p]?.type === "word" && tokens[p].value === "not") {
                const inner = parseNot(p + 1);
                return { node: { type: "not", inner: inner.node }, pos: inner.pos };
            }
            return parseCompare(p);
        }
        function parseCompare(p) {
            let node = parsePrimary(p);
            p = node.pos;
            const op = tokens[p];
            if (op?.type === "op" && [">=", "<=", "==", "!=", ">", "<"].includes(op.value)) {
                const right = parsePrimary(p + 1);
                node = {
                    node: { type: "compare", op: op.value, left: node.node, right: right.node },
                    pos: right.pos,
                };
            }
            return node;
        }
        function parsePrimary(p) {
            const t = tokens[p];
            if (!t) throw new Error("式が足りません");
            if (t.type === "lparen") {
                const inner = parseOr(p + 1);
                if (tokens[inner.pos]?.type !== "rparen") {
                    throw new Error(" ) がありません");
                }
                return { node: inner.node, pos: inner.pos + 1 };
            }
            if (t.type === "num") return { node: { type: "num", value: t.value }, pos: p + 1 };
            if (t.type === "id") return { node: { type: "id", name: t.value }, pos: p + 1 };
            throw new Error(`予期しないトークン: ${t.value || t.type}`);
        }
        const result = parseOr(0);
        if (result.pos < tokens.length) {
            throw new Error("式の末尾に余分な文字があります");
        }
        return result.node;
    }

    function evalNode(node, vars) {
        if (!node) return 0;
        switch (node.type) {
            case "num":
                return node.value;
            case "id": {
                if (!Object.prototype.hasOwnProperty.call(vars, node.name)) {
                    throw new Error(`未定義の変数: ${node.name}`);
                }
                return Number(vars[node.name]) || 0;
            }
            case "compare": {
                const l = evalNode(node.left, vars);
                const r = evalNode(node.right, vars);
                switch (node.op) {
                    case ">=":
                        return l >= r ? 1 : 0;
                    case "<=":
                        return l <= r ? 1 : 0;
                    case ">":
                        return l > r ? 1 : 0;
                    case "<":
                        return l < r ? 1 : 0;
                    case "==":
                        return l === r ? 1 : 0;
                    case "!=":
                        return l !== r ? 1 : 0;
                    default:
                        return 0;
                }
            }
            case "and":
                return evalNode(node.left, vars) && evalNode(node.right, vars) ? 1 : 0;
            case "or":
                return evalNode(node.left, vars) || evalNode(node.right, vars) ? 1 : 0;
            case "not":
                return evalNode(node.inner, vars) ? 0 : 1;
            default:
                return 0;
        }
    }

    function describeNode(node) {
        if (!node) return "";
        switch (node.type) {
            case "num":
                return String(node.value);
            case "id":
                return `「${node.name}」`;
            case "compare": {
                const opJa = {
                    ">=": "以上",
                    "<=": "以下",
                    ">": "より大きい",
                    "<": "より小さい",
                    "==": "と等しい",
                    "!=": "と違う",
                }[node.op];
                if (node.right.type === "num" && node.left.type === "id") {
                    return `${node.left.name}が${node.right.value}${opJa === "以上" || opJa === "以下" ? opJa : `（${node.right.value}${opJa}）`}`;
                }
                return `${describeNode(node.left)} ${node.op} ${describeNode(node.right)}`;
            }
            case "and":
                return `${describeNode(node.left)} かつ ${describeNode(node.right)}`;
            case "or":
                return `${describeNode(node.left)} または ${describeNode(node.right)}`;
            case "not":
                return `${describeNode(node.inner)} でない`;
            default:
                return "";
        }
    }

    function parseCondition(source) {
        const raw = (source || "").trim();
        if (!raw) throw new Error("条件が空です");
        const ast = parseExpr(tokenize(raw));
        return { raw, ast };
    }

    function evaluateCondition(source, vars) {
        const { ast } = parseCondition(source);
        return !!evalNode(ast, vars);
    }

    function describeCondition(source) {
        try {
            const { ast } = parseCondition(source);
            return describeNode(ast);
        } catch (_) {
            return source || "";
        }
    }

    /** @elseif 用: 直前の枝が外れたあと、という説明 */
    function describeIfBranchLabel(index, condition) {
        if (condition == null) return "どれにも当てはまらないとき（@else）";
        if (index === 0) return `最初に当てはまる: ${describeCondition(condition)}`;
        return `上の枝が外れたうえで: ${describeCondition(condition)}`;
    }

    window.ScriptExpr = {
        parseCondition,
        evaluateCondition,
        describeCondition,
        describeIfBranchLabel,
    };
})();
