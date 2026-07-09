import type { Form } from "#core/reader.ts";
import {
    type Env,
    type Out,
    SKIP_UNDEFINED,
    emitIdentifier,
    type es,
    gensym,
    mapExpr,
} from "#ast/common.ts";
import { transformForm } from "#ast/index.ts";
import { Sym } from "#core/types.ts";

export function transformBlockStatement(
    env: Env,
    forms: Form[],
): es.BlockStatement {
    const body: es.Statement[] = [];

    forms.forEach((form, i) => {
        const newEnv = {
            ...env,
            target: i + 1 === forms.length ? env.target : null,
        };

        const { preamble, expr } = transformForm(newEnv, form);

        if (preamble) body.push(...preamble);

        if (expr === SKIP_UNDEFINED) {
            return;
        }

        if (Sym.isSym(newEnv.target)) {
            const left = emitIdentifier(newEnv.target.v);
            body.push({
                type: "ExpressionStatement",
                expression: {
                    type: "AssignmentExpression",
                    operator: "=",
                    left,
                    right: expr,
                },
            });
            return;
        }

        if (newEnv.target === "return") {
            body.push({
                type: "ReturnStatement",
                argument: expr,
            });
            return;
        }

        body.push({
            type: "ExpressionStatement",
            expression: expr,
        });
    });

    if (body.length === 1 && body[0]?.type === "BlockStatement") {
        return body[0];
    }

    return {
        type: "BlockStatement",
        body,
    };
}

export function targetExpression(env: Env) {
    var preamble: es.Statement[] = [];

    if (env.target === "expression") {
        const target = gensym("_doexpr_");
        env = { ...env, target };
        preamble.push({
            type: "VariableDeclaration",
            kind: "var",
            declarations: [
                {
                    type: "VariableDeclarator",
                    id: emitIdentifier(target.v),
                },
            ],
        });
    }

    return {
        env,
        out: {
            preamble,
            expr: Sym.isSym(env.target)
                ? emitIdentifier(env.target.v)
                : SKIP_UNDEFINED,
        },
    };
}

export default function specialDo(env: Env, forms: Form[]): Out {
    const { env: nextEnv, out } = targetExpression(env);

    return mapExpr(out, (expr) => ({
        preamble: [transformBlockStatement(nextEnv, forms)],
        expr,
    }));
}
