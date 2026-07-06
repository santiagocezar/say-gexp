import type { Form } from "#core/reader.ts";
import {
    type Env,
    type Out,
    SKIP_UNDEFINED,
    emitIdentifier,
    type es,
    gensym,
} from "#ast/common.ts";
import { transformForm } from "#ast/index.ts";
import { Sym } from "#core/types.ts";

export default function specialDo(env: Env, forms: Form[]): Out {
    const finalPreamble: es.Statement[] = [];

    if (env.target === "expression") {
        env.target = gensym("_doexpr_");
        finalPreamble.push({
            type: "VariableDeclaration",
            kind: "var",
            declarations: [
                {
                    type: "VariableDeclarator",
                    id: emitIdentifier(env.target.v),
                },
            ],
        });
    }

    const blockPreamble: es.Statement[] = [];
    let finalExpr: es.Expression = SKIP_UNDEFINED;

    const last = forms.length - 1;

    forms.forEach((form, i) => {
        const { preamble, expr } = transformForm(env, form);

        if (i === last) {
            finalPreamble.push({
                type: "BlockStatement",
                body: blockPreamble,
            });

            if (preamble) finalPreamble.push(...preamble);
            finalExpr = expr;
        } else {
            if (preamble) blockPreamble.push(...preamble);
            blockPreamble.push({
                type: "ExpressionStatement",
                expression: expr,
            });
        }
    });

    if (finalExpr !== SKIP_UNDEFINED) {
        if (Sym.isSym(env.target)) {
            const left = emitIdentifier(env.target.v);
            finalPreamble.push({
                type: "ExpressionStatement",
                expression: {
                    type: "AssignmentExpression",
                    operator: "=",
                    left,
                    right: finalExpr,
                },
            });
            finalExpr = left;
        } else if (env.target === "return") {
            finalPreamble.push({
                type: "ReturnStatement",
                argument: finalExpr,
            });
            finalExpr = SKIP_UNDEFINED;
        } else {
            finalPreamble.push({
                type: "ExpressionStatement",
                expression: finalExpr,
            });
            finalExpr = SKIP_UNDEFINED;
        }
    }

    return {
        preamble: finalPreamble,
        expr: finalExpr,
    };
}
