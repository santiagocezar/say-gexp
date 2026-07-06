import { Sym } from "../core/index.ts";

import type * as es from "estree";
export type * as es from "estree";

export interface Out<E = es.Expression> {
    preamble?: es.Statement[] | undefined;
    expr: E;
    spread?: boolean | undefined;
    macro?: string | undefined;
}

export interface Env {
    // body: es.Statement[];
    target: Sym | "expression" | "return" | null;
    quote?: "quote" | "quasiquote" | null;
    context?: "macro" | "list" | null;
}

export const SKIP_UNDEFINED: es.Identifier = {
    type: "Identifier",
    name: "undefined",
};

export function mapExpr<E, O>(out: Out<E>, mapfn: (expr: E) => Out<O>): Out<O> {
    const next = mapfn(out.expr);
    return {
        preamble: out.preamble
            ? next.preamble
                ? out.preamble.concat(next.preamble)
                : out.preamble
            : next.preamble,
        expr: next.expr,
        spread: next.spread,
        macro: out.macro,
    };
}

export function reduceExpr<O>(out: Out<O>[]): Out<O[]> {
    return out.reduce(
        (out, expr) =>
            mapExpr<O, O[]>(expr, (expr) => {
                out.expr.push(expr);
                return out;
            }),
        { expr: [] } as Out<O[]>,
    );
}

type TupleSeq_<T, L, A extends [...any]> = A["length"] extends L
    ? A
    : TupleSeq_<T, L, [...A, T]>;
type TupleSeq<T, L> = TupleSeq_<T, L, []>;

export function arity<N extends number, T>(
    name: string,
    n: N,
    list: T[],
): TupleSeq<T, N> {
    if (list.length !== n) {
        throw new Error(`${name} expects ${n} argument${n === 1 ? "" : "s"}`);
    }
    return list as any;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#reserved_words
const RESERVED = new Set([
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "let",
    "static",
    "yield",
    "await",
    "enum",
    // "implements",
    // "interface",
    // "package",
    // "private",
    // "protected",
    // "public",
]);

export function isReservedIdentifier(ident: string) {
    return RESERVED.has(ident);
}

const CHAR_MAP: Record<string, string> = {
    "-": "_SUB_",
    ":": "_COLON_",
    "+": "_PLUS_",
    ">": "_GT_",
    "<": "_LT_",
    "=": "_EQ_",
    "~": "_TILDE_",
    "!": "_BANG_",
    "@": "_CIRCA_",
    "#": "_SHARP_",
    "'": "_SINGLEQUOTE_",
    '"': "_DOUBLEQUOTE_",
    "%": "_PERCENT_",
    "^": "_CARET_",
    "&": "_AMPERSAND_",
    "*": "_STAR_",
    "|": "_BAR_",
    "{": "_LBRACE_",
    "}": "_RBRACE_",
    "[": "_LBRACK_",
    "]": "_RBRACK_",
    "/": "_SLASH_",
    "\\": "_BSLASH_",
    "?": "_QMARK_",
};

const munge = (name: string) =>
    Array.from(name, (c) => CHAR_MAP[c] ?? c).join("");

let i = 0;
export function gensym(base: string) {
    return new Sym(base + ++i);
}

export const emitIdentifier = (name: string): es.Identifier => ({
    type: "Identifier",
    name: munge(name),
});

export function emitMemberExpression(
    object: es.Expression,
    property: es.Expression,
    computed = false,
): es.MemberExpression {
    return {
        type: "MemberExpression",
        object,
        property,
        computed,
        // TODO:
        optional: false,
    };
}

export function emitLiteral(value: boolean | number | string): es.Literal {
    return {
        type: "Literal",
        value,
    };
}
