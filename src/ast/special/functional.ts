import {
    emitIdentifier,
    emitMemberExpression,
    mapExpr,
    type Env,
    type es,
} from "#ast/common.ts";
import { transformArguments, transformForm } from "#ast/index.ts";
import type { Form } from "#core/reader.ts";
import { Sym } from "#core/types.ts";

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
