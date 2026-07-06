import {
    emitIdentifier,
    emitMemberExpression,
    mapExpr,
    type Env,
    type es,
    type Out,
} from "#ast/common.ts";
import { transformArguments, transformForm } from "#ast/index.ts";
import type { Form } from "#core/reader.ts";
import { List, Sym } from "#core/types.ts";
import specialFunction from "./functions.ts";

export function specialThreading(env: Env, forms: Form[]) {
    const threaded = forms.reduce((form, curr) => {
        const list = List.isList(curr) ? curr : new List(curr);
        list.splice(1, 0, form);
        return list;
    });

    return transformForm(env, threaded);
}

export function specialMethodCall(env: Env, forms: Form[]) {
    const [object, method, ...rest] = forms;
    if (!object || !method) {
        throw new Error(`. expects (at least) 2 arguments`);
    }

    if (!Sym.isSym(method)) {
        throw new Error(`. expects second argument to be a symbol`);
    }

    const args = transformArguments(env, rest);

    return mapExpr(transformForm(env, object), (object) =>
        mapExpr(args, (args) => ({
            expr: {
                type: "CallExpression",
                callee: emitMemberExpression(object, emitIdentifier(method.v)),
                arguments: args,
                optional: false,
            } satisfies es.Expression,
        })),
    );
}

export function nary(env: Env, forms: Form[]) {
    const [fn, n] = forms;

    if (typeof n !== "number") {
        throw new Error("expected second form to be a number");
    }
    const params: Sym[] = [];

    for (let i = 1; i <= n; i++) {
        params.push(new Sym("%" + i));
    }

    const call = new List(fn!, ...params);

    return specialFunction([[params], call]);
}
