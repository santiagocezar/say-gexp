import { type Form, List, Sym, formType } from "../core/index.ts";
import { astExpression } from "./expressions.ts";
import { astCallExpression } from "./functions.ts";
import {
    astIdentifier,
    assertNonReservedIdentifier,
    gensym,
} from "./identifiers.ts";
import type {
    AssignmentExpression,
    ASTContext,
    BlockStatement,
    ExpressionStatement,
    FunctionBody,
    Program,
    ReturnStatement,
    Statement,
    VariableDeclaration,
} from "./index.ts";

export function astProgram(...forms: Form[]): Program {
    const ctx: ASTContext = {
        body: [],
        statementTarget: null,
    };

    astBody(ctx, forms);

    return {
        type: "Program",
        body: ctx.body,
    };
}

export function astFunctionBody(...forms: Form[]): FunctionBody {
    const ctx: ASTContext = {
        body: [],
        statementTarget: "<return>",
    };

    astBody(ctx, forms);

    return {
        type: "BlockStatement",
        body: ctx.body,
    };
}

export function astBody(ctx: ASTContext, forms: Form[]) {
    const last = forms.length - 1;
    forms.forEach((form, i) => {
        astStatement(
            {
                ...ctx,
                statementTarget: i === last ? ctx.statementTarget : null,
            },
            form,
        );
    });
}

export function astStatement(ctx: ASTContext, form: Form) {
    let stmt: ExpressionStatement | ReturnStatement = {
        type: "ExpressionStatement",
        expression: astExpression(ctx, form),
    };

    if (Sym.isSym(ctx.statementTarget)) {
        stmt.expression = {
            type: "AssignmentExpression",
            operator: "=",
            left: astIdentifier(ctx.statementTarget),
            right: stmt,
        } as AssignmentExpression;
    } else if (ctx.statementTarget === "<return>") {
        stmt = {
            type: "ReturnStatement",
            argument: stmt.expression,
        } as ReturnStatement;
    }

    ctx.body.push(stmt);
}

export function doExpression(ctx: ASTContext, forms: Form[]) {
    const newCtx = {
        ...ctx,
        body: [],
    };

    if (!newCtx.statementTarget) {
        ctx.body.push({
            type: "VariableDeclaration",
            kind: "var",
            declarations: [
                {
                    type: "VariableDeclarator",
                    id: astIdentifier(
                        (newCtx.statementTarget = gensym("_doexpr_")),
                    ),
                },
            ],
        } as VariableDeclaration);
    }

    astBody(newCtx, forms);

    ctx.body.push({
        type: "BlockStatement",
        body: newCtx.body,
    } as BlockStatement);

    return astExpression(newCtx, newCtx.statementTarget);
}
