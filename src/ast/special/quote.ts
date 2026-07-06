import {
    emitIdentifier,
    emitLiteral,
    mapExpr,
    reduceExpr,
    type Env,
    type es,
    type Out,
} from "#ast/common.ts";
import { Keyword, List, Sym, type Form } from "#core/index.ts";
import { transformForm } from "#ast/index.ts";

export function quoteList(env: Env, list: List): Out {
    if (env.quote === "quasiquote" && Sym.isSym(list[0], "unquote")) {
        const form = list[1];
        if (form == null || list.length > 2)
            throw new Error("unquote expects 1 argument");

        return transformForm(
            {
                ...env,
                quote: null,
            },
            form,
        );
    }

    const args = reduceExpr(list.map((form) => quoteForm(env, form)));

    return mapExpr(args, (args) => ({
        expr: {
            type: "NewExpression",
            callee: emitIdentifier("List"),
            arguments: args,
        },
    }));
}

export function quoteArray(env: Env, arr: Form[]): Out<es.ArrayExpression> {
    const elements = reduceExpr(arr.map((form) => quoteForm(env, form)));

    return mapExpr(elements, (elements) => ({
        expr: {
            type: "ArrayExpression",
            elements,
        },
    }));
}

function quoteObject(env: Env, form: Map<Form, Form>): Out {
    const entries = [...form.entries().map((pair) => quoteArray(env, pair))];

    return mapExpr(reduceExpr(entries), (entries) => ({
        preamble: [],
        expr: {
            type: "NewExpression",
            callee: emitIdentifier("Map"),
            arguments: entries,
        },
    }));
}

export function quoteForm(env: Env, form: Form): Out {
    if (List.isList(form)) {
        return quoteList(env, form);
    }

    if (Array.isArray(form)) {
        return quoteArray(env, form);
    }

    if (form instanceof Map) {
        return quoteObject(env, form);
    }

    if (Keyword.isKeyword(form)) {
        return {
            preamble: [],
            expr: {
                type: "NewExpression",
                callee: emitIdentifier("Keyword"),
                arguments: [emitLiteral(form.v)],
            },
        };
    }

    if (Sym.isSym(form)) {
        return {
            preamble: [],
            expr: {
                type: "NewExpression",
                callee: emitIdentifier("Sym"),
                arguments: [emitLiteral(form.v)],
            },
        };
    }

    return { preamble: [], expr: emitLiteral(form) };
}
