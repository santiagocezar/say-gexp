import type * as es from "estree";
import { Sym, List, type Form, Keyword } from "#core/index.ts";
import {
    arity,
    emitIdentifier,
    emitLiteral,
    emitMemberExpression,
    mapExpr,
    reduceExpr,
    SKIP_UNDEFINED,
    type Env,
    type Out,
} from "./common.ts";

import special from "./special/index.ts";
export type * as es from "estree";

export function transformKeyword(kw: Keyword): es.Literal {
    return emitLiteral(kw.v);
}

export function transformList(env: Env, list: List): Out {
    const [first, ...rest] = list;

    if (first == null)
        return {
            preamble: [],
            expr: {
                type: "ArrayExpression",
                elements: [],
            },
        };

    if (Sym.isSym(first)) {
        const fn = special[first.v];

        if (fn) {
            return fn(env, rest);
        }
    }

    if (Keyword.isKeyword(first)) {
        const [object] = arity(":" + first.v, 1, rest);

        return mapExpr(transformForm(env, object), (object) => ({
            expr: emitMemberExpression(object, emitIdentifier(first.v)),
        }));
    }

    if (
        typeof first === "boolean" ||
        typeof first === "number" ||
        typeof first === "string"
    ) {
        const [object] = arity("" + first, 1, rest);

        return mapExpr(transformForm(env, object), (object) => ({
            expr: emitMemberExpression(object, emitLiteral(first)),
        }));
    }

    const args = transformArguments(env, rest);

    return mapExpr(transformForm(env, first), (callee) =>
        mapExpr(args, (args) => ({
            expr: {
                type: "CallExpression",
                callee,
                arguments: args,
                optional: false,
            },
        })),
    );
}

export function transformArguments(
    env: Env,
    forms: Form[],
): Out<(es.Expression | es.SpreadElement)[]> {
    return reduceExpr<es.Expression | es.SpreadElement>(
        forms.map((form) => {
            const out = transformForm(env, form);
            if (out.spread) {
                return mapExpr(out, (argument) => ({
                    expr: {
                        type: "SpreadElement",
                        argument: out.expr,
                    },
                }));
            }
            return out;
        }),
    );
}

function transformProperty(env: Env, key: Form, value: Form): Out<es.Property> {
    if (Keyword.isKeyword(key)) {
        // property shorthand like fennel
        if (key.v === "") {
            if (!Sym.isSym(value)) {
                throw new Error("expected identifier after property shorthand");
            }

            return {
                preamble: [],
                expr: {
                    type: "Property",
                    kind: "init",
                    key: emitIdentifier(value.v),
                    value: emitIdentifier(value.v),
                    method: false,
                    shorthand: true,
                    computed: false,
                },
            };
        }

        return mapExpr(transformForm(env, value), (value) => ({
            preamble: [],
            expr: {
                type: "Property",
                kind: "init",
                key: emitIdentifier(key.v),
                value,
                method: false,
                shorthand: true,
                computed: false,
            },
        }));
    }

    if (Sym.isSym(key) && key.v.startsWith(".")) {
        // TODO: get and set

        return mapExpr(transformForm(env, value), (value) => ({
            preamble: [],
            expr: {
                type: "Property",
                kind: "init",
                key: emitIdentifier(key.v.slice(1)),
                value,
                method: true,
                shorthand: false,
                computed: false,
            },
        }));
    }

    if (
        typeof key === "string" ||
        typeof key === "number" ||
        typeof key === "boolean"
    ) {
        // FIXME: this is wrong
        return mapExpr(transformForm(env, value), (value) => ({
            preamble: [],
            expr: {
                type: "Property",
                kind: "init",
                key: emitLiteral(key),
                value,
                method: false,
                shorthand: false,
                computed: false,
            },
        }));
    }

    return mapExpr(transformForm(env, value), (value) =>
        mapExpr(transformForm(env, key), (key) => ({
            preamble: [],
            expr: {
                type: "Property",
                kind: "init",
                key,
                value,
                method: false,
                shorthand: false,
                computed: true,
            },
        })),
    );
}

function transformObject(
    env: Env,
    form: Map<Form, Form>,
): Out<es.ObjectExpression> {
    const properties = [
        ...form
            .entries()
            .map(([key, value]) => transformProperty(env, key, value)),
    ];

    return mapExpr(reduceExpr(properties), (properties) => ({
        expr: {
            type: "ObjectExpression",
            properties,
        },
    }));
}

export function transformForm(env: Env, form: Form): Out {
    if (List.isList(form)) {
        return transformList(env, form);
    }

    if (Array.isArray(form)) {
        const elements = reduceExpr(
            form.map((form) => transformForm(env, form)),
        );

        return mapExpr(elements, (elements) => ({
            expr: {
                type: "ArrayExpression",
                elements,
            },
        }));
    }

    if (form instanceof Map) {
        return transformObject(env, form);
    }

    if (Keyword.isKeyword(form)) {
        return { preamble: [], expr: emitLiteral(form.v) };
    }

    if (Sym.isSym(form)) {
        return { preamble: [], expr: emitIdentifier(form.v) };
    }

    return { preamble: [], expr: emitLiteral(form) };
}
