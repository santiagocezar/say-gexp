import {
    isCollection,
    isSym,
    stringify,
    sym,
    type Collection,
    type Form,
    type Primitive,
    type Sym,
} from "../core/form.ts";
import type { SpecialForms } from "./expression/special.ts";

import type * as es from "estree";
export type * as es from "estree";

// export interface Out<E = es.Expression> {
//     preamble?: es.Statement[] | undefined;
//     expr: E;
//     spread?: boolean | undefined;
//     macro?: string | undefined;
// }

export interface Env {
    target: Sym | "expression" | "return" | "toplevel" | null;
    quote?: "quote" | "quasiquote" | null;
    context?: "module" | "compiler";
    special?: SpecialForms;
}

export const SKIP_UNDEFINED: es.Identifier = {
    type: "Identifier",
    name: "undefined",
};

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
    "-": "__",
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

export const munge = (name: string) =>
    Array.from(name, (c) => CHAR_MAP[c] ?? c).join("");

let i = 0;
export function gensym(base: string) {
    return sym(base + ++i);
}

type TupleSeq_<T, L, A extends [...any]> = A["length"] extends L
    ? A
    : TupleSeq_<T, L, [...A, T]>;
type TupleSeq<T, L> = TupleSeq_<T, L, []>;

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

export function emitLiteral(value: Primitive): es.Literal {
    if (typeof value === "bigint") {
        return {
            type: "Literal",
            value,
            bigint: value.toString(),
        };
    }
    return {
        type: "Literal",
        value,
    };
}

export function arity<N extends number, T>(
    name: string,
    n: N,
    list: T[],
): asserts list is TupleSeq<T, N> {
    if (list.length !== n) {
        throw new Error(`${name} expects ${n} argument${n === 1 ? "" : "s"}`);
    }
    return list as any;
}

export function minArity<N extends number, T>(
    name: string,
    n: N,
    list: T[],
): asserts list is TupleSeq<T, N> & T[] {
    if (list.length < n) {
        throw new Error(`${name} expects ${n} argument${n === 1 ? "" : "s"}`);
    }
    return list as any;
}

export function fnArguments(forms: Form[]): {
    flags: Record<string, boolean>;
    id: Sym | null;
    docs: string[];
    params: Collection;
    body: Form[];
} {
    minArity("fn", 2, forms);

    let id: Sym | null = null;
    if (isSym(forms[0]) && !forms[0].s.startsWith(".")) {
        id = forms[0];
        forms = forms.slice(1);
    }

    let flags: Record<string, boolean> = {};

    let i = 0;

    for (; i < forms.length; i++) {
        const form = forms[i]!;

        if (isSym(form) && form.s.startsWith(".")) {
            flags[form.s.substring(1)] = true;
        } else break;
    }

    let docs: string[] = [];

    for (; i < forms.length; i++) {
        const form = forms[i]!;

        if (typeof form === "string") {
            docs.push(form);
        } else break;
    }

    const params = forms[i];

    i++;
    if (!isCollection(params)) {
        throw new Error(
            "expected a collection of arguments, got " + stringify(params),
        );
    }

    return {
        flags,
        id,
        docs,
        params,
        body: forms.slice(i),
    };
}

export function defArguments(forms: Form[]): {
    id: Sym;
    kind: "var" | "let" | "const" | "using" | "await-using";
    init: Form | null;
} {
    minArity("def", 1, forms);

    const idForm = forms[0];
    const kindForm = forms[1];

    // (def a 2)
    // (def a .const 2)

    let id: Sym;
    let kind: "var" | "let" | "const" | "using" | "await-using" = "let";
    let init = forms[2] ?? null;

    if (!isSym(idForm)) {
        throw new Error("expected first form to be a sym");
    }

    id = idForm;

    if (isSym(kindForm) && kindForm.s.startsWith(".")) {
        const maybeKind = kindForm.s.substring(1);
        if (
            maybeKind === "var" ||
            maybeKind === "let" ||
            maybeKind === "const" ||
            maybeKind === "using" ||
            maybeKind === "await-using"
        ) {
            kind = maybeKind;
        } else {
            throw new Error(
                "expected second form to be one of these sym: .var, .let, .const, .using, .await-using",
            );
        }
    } else if (kindForm !== undefined && init === null) {
        init = kindForm;
    } else {
        throw new Error(
            "expected second form to be one of these sym: .macro, .var, .let, .const, .using, .await-using",
        );
    }

    return {
        id,
        kind,
        init,
    };
}

// interface ModuleHeader {
//     imports: ModuleImportDeclaration[]
// }

// interface ModuleImportDeclaration {
//     source: string
//     specifiers: ModuleImportSpecifier[]
// }

// interface ModuleImportSpecifier {
//     source: string
//     imported: Sym | string | null
//     local: string
// }

// export function parseModuleHeader(form: Form):
