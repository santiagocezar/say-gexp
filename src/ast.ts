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

export function asIdentifier(form: Form): any {
    let name;
    if (Sym.isSym(form)) {
        name = Array.from(form.name, (c) => CHAR_MAP[c] ?? c).join("");
    } else if (typeof form === "string") {
        name = form;
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

// TODO: this function is not really flexible, doesn't allow
// for computed or optional properties
export function asMemberExpression(object: any, properties: any[]) {
    return properties.reduce(
        (object, property) => ({
            type: "MemberExpression",
            object,
            property,
        }),
        object,
    );
}

export function asCall(forms: Form[]) {
    let [callee, ...params] = forms;

    // shorthand for array indexing
    // TODO: use asMemberExpression here
    if (typeof callee === "number" || typeof callee === "string") {
        return {
            type: "MemberExpression",
            object: asExpression(params[0]),
            property: asLiteral(callee),
            optional: false,
            computed: true,
        };
    }

    let calleeExpr;

    if (Sym.isSym(callee)) {
        // transpiler macros
        const special = SPECIAL_FORMS[callee.name];
        if (special) {
            return special(...params);
        }

        // method syntax
        if (callee.name.startsWith(".") && !callee.name.startsWith("..")) {
            const [, ...idents] = callee.name.split(".");

            // remove and use 1st param as method target instance
            const [object] = params.splice(0, 1);

            calleeExpr = asMemberExpression(
                asExpression(object),
                idents.map(asIdentifier),
            );
        }
        // TODO: optional call
    }

    calleeExpr ??= asExpression(callee);

    return {
        type: "CallExpression",
        callee: calleeExpr,
        arguments: params.map((form) => {
            if (List.isList(form) && Sym.isSym(form.items[0], "spread")) {
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
}

export function asExpression(form: Form): any {
    if (List.isList(form)) {
        if (form.type === "(") {
            if (form.items.length) {
                return asCall(form.items);
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
    } else if (Sym.isSym(form)) {
        const [ident, ...member] = form.name.split(".");
        assertNonReservedIdentifier(ident!);
        return asMemberExpression(
            asIdentifier(ident!),
            member.map(asIdentifier),
        );
    }
    return asLiteral(form);
}

function isStatement() {
    return false; // TODO
}
