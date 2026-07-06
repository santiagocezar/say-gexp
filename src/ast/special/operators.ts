import {
    mapExpr,
    reduceExpr,
    type Env,
    type es,
    type Out,
} from "#ast/common.ts";
import { transformForm } from "#ast/index.ts";
import type { Form } from "#core/reader.ts";

export function operator<O extends string>(
    op: O,
    unary: O extends es.UnaryOperator ? true : false,
    binary: O extends es.BinaryOperator ? true : false,
): (env: Env, forms: Form[]) => Out {
    if (binary) {
        return function (env, forms) {
            return mapExpr(
                reduceExpr(forms.map((form) => transformForm(env, form))),
                (exprs) => ({
                    expr: emitBinaryExpression(op, unary, exprs),
                }),
            );
        };
    } else {
        return function (env, forms) {
            return mapExpr(transformForm(env, forms[0]!), (expr) => ({
                expr: emitUnaryExpression(op, expr),
            }));
        };
    }
}

export const specialOperators: Record<
    string,
    (env: Env, forms: Form[]) => Out
> = {
    "==": operator("==", false, true),
    "!=": operator("!=", false, true),
    "===": operator("===", false, true),
    "!==": operator("!==", false, true),
    "<": operator("<", false, true),
    "<=": operator("<=", false, true),
    ">": operator(">", false, true),
    ">=": operator(">=", false, true),
    "<<": operator("<<", false, true),
    ">>": operator(">>", false, true),
    ">>>": operator(">>>", false, true),
    "*": operator("*", false, true),
    "/": operator("/", false, true),
    "%": operator("%", false, true),
    "|": operator("|", false, true),
    "^": operator("^", false, true),
    "&": operator("&", false, true),
    in: operator("in", false, true),
    instanceof: operator("instanceof", false, true),

    "+": operator("+", true, true),
    "-": operator("-", true, true),

    "!": operator("!", true, false),
    "~": operator("~", true, false),
    typeof: operator("typeof", true, false),
    void: operator("void", true, false),
    delete: operator("delete", true, false),
};

export function emitUnaryExpression(
    operator: string,
    argument: es.Expression,
): es.UnaryExpression {
    return {
        type: "UnaryExpression",
        operator: operator as es.UnaryOperator,
        prefix: true,
        argument,
    };
}

export function emitBinaryExpression(
    operator: string,
    allowUnary: boolean,
    expressions: es.Expression[],
): es.Expression {
    if (expressions.length < 2) {
        if (allowUnary) {
            if (expressions.length < 1) {
                throw new Error(
                    `expected at least 1 argument for operator ${operator}`,
                );
            }

            return emitUnaryExpression(operator, expressions[0]!);
        } else {
            throw new Error(
                `expected at least 2 arguments for operator ${operator}`,
            );
        }
    }

    return expressions.reduce((left, right) => ({
        type: "BinaryExpression",
        left,
        operator: operator as es.BinaryOperator,
        right,
    }));
}
