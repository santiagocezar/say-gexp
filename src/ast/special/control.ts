import type { Form } from "#core/reader.ts";
import { type Env, type Out, type es, mapExpr } from "#ast/common.ts";
import { targetExpression, transformBlockStatement } from "./do.ts";
import { transformForm } from "#ast/index.ts";

export function specialIf(env: Env, forms: Form[]): Out {
    const { env: nextEnv, out } = targetExpression(env);

    if (forms.length < 2) {
        throw new Error(`if expects 2 or 3 arguments`);
    }

    const test = transformForm({ ...env, target: "expression" }, forms[0]!);
    const consequent = transformBlockStatement(nextEnv, [forms[1]!]);
    const alternate =
        forms[2] !== undefined
            ? transformBlockStatement(nextEnv, [forms[2]])
            : undefined;

    return mapExpr(out, (expr) =>
        mapExpr(test, (test) => ({
            preamble: [
                {
                    type: "IfStatement",
                    test,
                    consequent,
                    alternate,
                },
            ],
            expr,
        })),
    );
}
