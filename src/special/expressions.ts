import {
    astBinaryExpression,
    astExpression,
    astUnaryExpression,
} from "../ast/expressions.ts";
import type { AwaitExpression, ImportExpression } from "../ast/index.ts";
import { doExpression } from "../ast/statements.ts";
import { List } from "../core/types.ts";
import { defineSpecialForm } from "./index.ts";

const binaryExpressions = new Set([
    "==",
    "!=",
    "===",
    "!==",
    "<",
    "<=",
    ">",
    ">=",
    "<<",
    ">>",
    ">>>",
    "+",
    "-",
    "*",
    "/",
    "%",
    "|",
    "^",
    "&",
    "in",
    "instanceof",
]);

const unaryExpressions = new Set([
    "+",
    "-",
    "!",
    "~",
    "typeof",
    "void",
    "delete",
]);

for (const operator of binaryExpressions) {
    const unary = unaryExpressions.has(operator);
    defineSpecialForm(operator, (ctx, ...forms) =>
        astBinaryExpression(ctx, operator, unary, forms),
    );
}

for (const operator of unaryExpressions) {
    const binary = binaryExpressions.has(operator);
    if (!binary) {
        defineSpecialForm(operator, (ctx, form) =>
            astUnaryExpression(ctx, operator, form),
        );
    }
}

defineSpecialForm("do", (ctx, ...forms) => {
    return doExpression(ctx, forms);
});

defineSpecialForm("->", (ctx, ...forms) => {
    const threaded = forms.reduce((form, curr) => {
        const list = List.isList(curr) ? curr : new List("(", [curr]);
        list.items.splice(1, 0, form);
        return list;
    });

    return astExpression(ctx, threaded);
});

defineSpecialForm("await", (ctx, form) => {
    return {
        type: "AwaitExpression",
        argument: astExpression(ctx, form),
    } as AwaitExpression;
});

defineSpecialForm("import", (ctx, form) => {
    return {
        type: "ImportExpression",
        source: astExpression(ctx, form),
    } as ImportExpression;
});
