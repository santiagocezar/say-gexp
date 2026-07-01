import { List, Sym, type Form } from "../core/index.ts";
import { getSpecialForm } from "../special/index.ts";
import {
    astExpression,
    astLiteral,
    astMemberExpression,
} from "./expressions.ts";
import { astIdentifier } from "./identifiers.ts";
import type {
    ASTContext,
    CallExpression,
    Expression,
    MemberExpression,
    SpreadElement,
} from "./index.ts";

export function astCallExpression(
    ctx: ASTContext,
    forms: Form[],
): CallExpression | MemberExpression {
    const newCtx = { ...ctx, statementTarget: null };
    let [callee, ...params] = forms;

    // shorthand for array indexing
    // TODO: use asMemberExpression here
    if (typeof callee === "number" || typeof callee === "string") {
        return {
            type: "MemberExpression",
            object: astExpression(newCtx, params[0]!),
            property: astLiteral(callee),
            // optional: false,
            computed: true,
        };
    }

    let calleeExpr;

    if (Sym.isSym(callee)) {
        // transpiler macros
        const special = getSpecialForm(callee.name);
        if (special) {
            return special(ctx, ...params);
        }

        // property syntax
        if (callee.keyword) {
            return astMemberExpression(astExpression(newCtx, params[0]!), [
                astIdentifier(callee),
            ]);
        }

        // method syntax
        if (callee.name.startsWith(".") && !callee.name.startsWith("..")) {
            // TODO: actually do we really need chaining here
            const [, ...idents] = callee.name.split(".");

            // remove and use 1st param as method target instance
            const [object] = params.splice(0, 1);

            calleeExpr = astMemberExpression(
                astExpression(newCtx, object!),
                idents.map(astIdentifier),
            );
        }
        // TODO: optional call
    }

    calleeExpr ??= astExpression(newCtx, callee!);

    return {
        type: "CallExpression",
        callee: calleeExpr,
        arguments: params.map((form): Expression | SpreadElement => {
            if (List.isList(form) && Sym.isSym(form.items[0], "spread")) {
                return {
                    type: "SpreadElement",
                    argument: astExpression(newCtx, form.items[1]!),
                };
            } else {
                return astExpression(newCtx, form!);
            }
        }),
        // optional: false,
    };
}
