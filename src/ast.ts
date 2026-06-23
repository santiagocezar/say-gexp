import { type Form } from "./core/reader.ts";
import { formType, List, Sym } from "./core/types.ts";
import { SPECIAL_FORMS } from "./special/index.ts";

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

export function asIdentifier(form: Form) {
    let name;
    if (Sym.isSym(form)) {
        name = Array.from(form.name, (c) => CHAR_MAP[c] ?? c).join("");
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

export function asLiteral(value: Form) {
    if (Sym.isSym(value)) {
        assertNonReservedIdentifier(value.name);
        return asIdentifier(value);
    }

    if (List.isList(value)) {
        throw new Error(
            `${formType(value)} form is not a valid JavaScript Literal`,
        );
    }

    return {
        type: "Literal",
        value,
    };
}

export function asExpression(form: Form): any {
    if (List.isList(form)) {
        if (form.type === "(") {
            if (form.items.length) {
                const [callee, ...params] = form.items;

                // shorthand for array indexing
                if (typeof callee === "number" || typeof callee === "string") {
                    return {
                        type: "MemberExpression",
                        object: asExpression(params[0]),
                        property: asLiteral(callee),
                        optional: false,
                        computed: true,
                    };
                }

                if (Sym.isSym(callee)) {
                    const special = SPECIAL_FORMS[callee.name];
                    if (special) {
                        return special(...params);
                    }
                    // TODO: optional call
                }
                return {
                    type: "CallExpression",
                    callee: asExpression(callee),
                    arguments: params.map((form) => {
                        if (
                            List.isList(form) &&
                            Sym.isSym(form.items[0], "spread")
                        ) {
                            return {
                                type: "SpreadElement",
                                argument: asExpression(form.items[1]),
                            };
                        } else {
                            return asExpression(form);
                        }
                    }),
                    optional: false,
                };
            } else {
                // TODO: or should I return a null literal
                return {
                    type: "ArrayExpression",
                    elements: [],
                };
            }
        } else if (form.type === "[") {
            return {
                type: "ArrayExpression",
                elements: form.items.map(asExpression),
            };
        }
    }

    return asLiteral(form);
}

function isStatement() {
    return false; // TODO
}
