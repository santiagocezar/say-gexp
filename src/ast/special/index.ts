import {
    arity,
    mapExpr,
    SKIP_UNDEFINED,
    type Env,
    type es,
    type Out,
} from "#ast/common.ts";
import { transformForm } from "#ast/index.ts";
import type { Form } from "#core/reader.ts";

import { quoteForm } from "./quote.ts";
import specialFunction from "./functions.ts";
import specialDo from "./do.ts";
import { specialOperators } from "./operators.ts";
import { specialMethodCall } from "./functional.ts";
import { specialIf } from "./control.ts";
import { specialNew } from "./classes.ts";

const special: Record<string, (env: Env, forms: Form[]) => Out> = {
    quote: (env, forms) =>
        arity("quote", 1, forms) &&
        quoteForm({ ...env, quote: "quote" }, forms[0]!),
    quasiquote: (env, forms) =>
        arity("quasiquote", 1, forms) &&
        quoteForm({ ...env, quote: "quasiquote" }, forms[0]!),
    spread: (env, forms) =>
        arity("spread", 1, forms) &&
        mapExpr(
            transformForm({ ...env, target: "expression" }, forms[0]!),
            (expr) => ({
                expr,
                spread: true,
            }),
        ),
    defn: (env, forms) => {
        return mapExpr(specialFunction(forms), (fn) => ({
            preamble: [
                {
                    ...fn,
                    // in an actual FunctionDeclaration id can't be null though
                    type: "FunctionDeclaration",
                } as es.FunctionDeclaration,
            ],
            expr: SKIP_UNDEFINED,
            defines: fn.id?.name,
        }));
    },
    fn: (env, forms) => specialFunction(forms),
    do: (env, forms) => specialDo(env, forms),
    if: (env, forms) => specialIf(env, forms),
    ".": (env, forms) => specialMethodCall(env, forms),

    new: (env, forms) => specialNew(env, forms),

    await: (env, form) =>
        mapExpr(
            transformForm({ ...env, target: "expression" }, form),
            (argument) => ({
                expr: {
                    type: "AwaitExpression",
                    argument,
                },
            }),
        ),

    import: (env, form) =>
        mapExpr(
            transformForm({ ...env, target: "expression" }, form),
            (source) => ({
                expr: {
                    type: "ImportExpression",
                    source,
                },
            }),
        ),

    ...specialOperators,
};

export default special;
