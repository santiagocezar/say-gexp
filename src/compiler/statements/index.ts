import type { Env, es } from "#compiler/common.ts";
import { emitIdentifier } from "#compiler/expression/emit.ts";
import compileExpression from "#compiler/expression/index.ts";
import { isSym, type Form } from "#core/form.ts";

export default function compileStatement(
    env: Env,
    form: Form,
    last = false,
): es.Statement[] {
    if (!last && env.target !== "toplevel")
        env = {
            ...env,
            target: null,
        };

    const { preamble, expr, skip } = compileExpression(env, form);

    if (skip) return preamble;

    if (env.target === "return") {
        preamble.push({
            type: "ReturnStatement",
            argument: expr,
        });
    } else if (isSym(env.target)) {
        preamble.push({
            type: "ExpressionStatement",
            expression: {
                type: "AssignmentExpression",
                operator: "=",
                left: emitIdentifier(env.target.s),
                right: expr,
            },
        });
    } else if (env.target !== "expression") {
        preamble.push({
            type: "ExpressionStatement",
            expression: expr,
        });
    }

    return preamble;
}

export function compileStatements(env: Env, forms: Form[]): es.Statement[] {
    return forms.flatMap((form, i) =>
        compileStatement(env, form, i + 1 === forms.length),
    );
}
