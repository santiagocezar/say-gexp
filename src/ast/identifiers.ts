import { type Form, formType, Sym } from "../core/index.ts";
import type { Identifier } from "./index.ts";

// taken from https://github.com/clojure/clojure/blob/master/src/jvm/clojure/lang/Compiler.java#L3364C1-L3390C17
const CHAR_MAP: Record<string, string> = {
    "-": "_",
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

export function astIdentifier(form: Form): Identifier {
    let name;
    if (Sym.isSym(form)) {
        name = munge(form.name);
    } else if (typeof form === "string") {
        name = munge(form);
    } else if (form === undefined) {
        name = "undefined";
    } else if (form === null) {
        name = "null";
    } else if (form === true) {
        name = "true";
    } else if (form === false) {
        name = "false";
    } else {
        throw new Error(
            `${formType(form)} form can't be used as a JavaScript Identifier`,
        );
    }

    return {
        type: "Identifier",
        name,
    };
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

export function assertNonReservedIdentifier(ident: string) {
    if (isReservedIdentifier(ident)) {
        throw new Error(
            `${ident} can't be used as a JavaScript Identifier in this context`,
        );
    }
}

let i = 0;
export function gensym(base: string) {
    return new Sym(base + ++i);
}
