import { mapExpr, type Env, type Out } from "#ast/common.ts";
import { transformCallExpression } from "#ast/index.ts";
import type { Form } from "#core/reader.ts";

export function specialNew(env: Env, forms: Form[]): Out {
    env = { ...env, target: "expression" };

    const klass = forms[1];

    if (klass === undefined) {
        throw new Error(`new expects at least one argument`);
    }

    return mapExpr(
        transformCallExpression(env, klass, forms.slice(2)),
        (call) => ({
            expr: {
                ...call,
                type: "NewExpression",
            },
        }),
    );
}
