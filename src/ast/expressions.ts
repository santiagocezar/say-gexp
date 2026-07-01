import { type Form, List, Sym, formType } from "../core/index.ts";
import { astCallExpression } from "./functions.ts";
import { astIdentifier, assertNonReservedIdentifier } from "./identifiers.ts";
import type {
    ArrayExpression,
    ASTContext,
    Expression,
    Literal,
} from "./index.ts";

export function astExpression(ctx: ASTContext, form: Form): Expression {
    if (List.isList(form)) {
        if (form.type === "(") {
            if (form.items.length) {
                return astCallExpression(ctx, form.items);
            } else {
                // TODO: or should I return a null literal
                return {
                    type: "ArrayExpression",
                    elements: [],
                } as ArrayExpression;
            }
        } else if (form.type === "[") {
            return {
                type: "ArrayExpression",
                elements: form.items.map((e) =>
                    astExpression({ ...ctx, statementTarget: null }, e),
                ),
            } as ArrayExpression;
        }
    } else if (Sym.isSym(form)) {
        if (form.keyword) {
            return astLiteral(form.name);
        }

        const [ident, ...member] = form.name.split(".");

        return astMemberExpression(
            astIdentifier(ident!),
            member.map(astIdentifier),
        );
    }

    return astLiteral(form);
}

export function astLiteral(value: Exclude<Form, Sym>): Literal {
    if (List.isList(value)) {
        throw new Error(
            `${formType(value)} form is not a valid JavaScript Literal`,
        );
    }

    return {
        type: "Literal",
        value,
    };
}

// TODO: this function is not really flexible, doesn't allow
// for computed or optional properties
export function astMemberExpression(object: any, properties: any[]) {
    return properties.reduce(
        (object, property) => ({
            type: "MemberExpression",
            object,
            property,
        }),
        object,
    );
}

export function astUnaryExpression(
    ctx: ASTContext,
    operator: string,
    form: Form,
) {
    return {
        type: "UnaryExpression",
        operator,
        prefix: true,
        argument: astExpression(ctx, form),
    };
}

export function astBinaryExpression(
    ctx: ASTContext,
    operator: string,
    allowUnary: boolean,
    forms: Form[],
): any {
    if (forms.length < 2) {
        if (allowUnary) {
            if (forms.length < 1) {
                throw new Error(
                    `expected at least 1 argument for operator ${operator}`,
                );
            }

            return astUnaryExpression(ctx, operator, forms[0]!);
        } else {
            throw new Error(
                `expected at least 2 arguments for operator ${operator}`,
            );
        }
    }

    return forms
        .map((e) => astExpression(ctx, e))
        .reduce((left, right) => ({
            type: "BinaryExpression",
            left,
            operator,
            right,
        }));
}
