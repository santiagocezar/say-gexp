import { Reader, type Form } from "./core/reader.ts";
import { Keyword, l, List, s, Sym } from "./core/index.ts";

import { print } from "esrap";
import ts from "esrap/languages/ts";

import { transformForm, type es, type Out } from "./ast/index.ts";

type Macros = Record<string, (...forms: Form[]) => Form>;

function expand(macros: Macros, form: Form, quasiquote = false): Form {
    if (List.isList(form)) {
        const [head, ...tail] = form;

        if (Sym.isSym(head)) {
            if (head.v === "quote") {
                return form;
            } else if (head.v === "quasiquote") {
                quasiquote = true;
            } else if (head.v === "unquote") {
                quasiquote = false;
            }

            if (!quasiquote) {
                const macro = macros[head.v];
                if (macro) {
                    return macro(...tail);
                }
                if (head.v !== ".") {
                    if (head.v.startsWith(".")) {
                        const [target, ...params] = tail;
                        if (!target) {
                            throw new Error(
                                "expected at least 1 parameter for member expression",
                            );
                        }
                        return l(
                            s`.`,
                            target!,
                            new Sym(head.v.substring(1)),
                            ...params,
                        );
                    } else if (head.v.endsWith(".")) {
                        return l(
                            s`new`,
                            new Sym(head.v.substring(0, -1)),
                            ...tail,
                        );
                    }
                }
            }
        }
    }

    // applies for both a List or normal Array
    if (Array.isArray(form)) {
        let expanded = false;
        const next = form.map((f) => {
            const x = expand(macros, f, quasiquote);
            expanded ||= f !== x;
            return x;
        });

        if (expanded) {
            return next;
        } else {
            return form;
        }
    }

    return form;
}

// interface Scope {
//     parent: Scope | null
//     defs:
// }

// interface Def {
//     defs:
// }

export function stringify(form: Form): string {
    if (List.isList(form)) {
        return "(" + form.map((f) => stringify(f)).join(" ") + ")";
    } else if (Array.isArray(form)) {
        return "[" + form.map((f) => stringify(f)).join(" ") + "]";
    } else if (form instanceof Map) {
        return (
            "{" +
            [...form.entries()]
                .flat()
                .map((f) => stringify(f))
                .join(" ") +
            "}"
        );
    } else if (Sym.isSym(form)) {
        return form.v;
    } else if (Keyword.isKeyword(form)) {
        return ":" + form.v;
    } else if (typeof form === "string") {
        return `"${form}"`;
    } else {
        return form.toString();
    }
}

export function transpiler() {
    const macros: Macros = {};

    return function (form: Form) {
        let prev;
        while (form !== prev) {
            prev = form;
            console.log(stringify(form));
            form = expand(macros, form);
        }

        const out = transformForm({ target: null }, form);

        if (out.macro) {
            (0, eval)(transpileToJS(out));
            macros[out.macro] = (0, eval)(out.macro);
            console.log(macros);
        }

        return out;
    };
}

export function transpileToJS(out: Out) {
    const module: es.Program = {
        type: "Program",
        sourceType: "module",
        body: [
            ...(out.preamble ?? []),
            { type: "ExpressionStatement", expression: out.expr },
        ],
    };

    const { code } = print(module as any, ts());

    return code;
}

export function transpileAllToJS(outputs: Out[]) {
    const module: es.Program = {
        type: "Program",
        sourceType: "module",
        body: [],
    };

    outputs.forEach((out) => {
        if (out.preamble) module.body.push(...out.preamble);
        module.body.push({ type: "ExpressionStatement", expression: out.expr });
    });

    const { code } = print(module as any, ts());

    return code;
}
