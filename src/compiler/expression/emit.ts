import { type es, munge } from "#compiler/common.ts";
import { isPrimitive, sym, type Form, type Primitive } from "#core/form.ts";

export const emitIdentifier = (name: string): es.Identifier => ({
    type: "Identifier",
    name: munge(name),
});

export function emitMemberExpression(
    object: es.Expression,
    property: es.Expression,
    computed = false,
): es.MemberExpression {
    return {
        type: "MemberExpression",
        object,
        property,
        computed,
        // TODO:
        optional: false,
    };
}

export function emitLiteral(value: Primitive): es.Literal {
    if (typeof value === "bigint") {
        return {
            type: "Literal",
            value,
            bigint: value.toString(),
        };
    }
    return {
        type: "Literal",
        value,
    };
}

export function emitQuote(form: Form | Form[]): es.Expression {
    if (isPrimitive(form)) {
        return emitLiteral(form);
    }

    if (Array.isArray(form)) {
        return {
            type: "ArrayExpression",
            elements: form.map((f) => emitQuote(f)),
        };
    }

    const obj: es.ObjectExpression = {
        type: "ObjectExpression",
        properties: [],
    };

    for (const [key, value] of Object.entries(form)) {
        obj.properties.push({
            type: "Property",
            kind: "init",
            key: emitLiteral(key),
            value: emitQuote(value),
            computed: false,
            method: false,
            shorthand: false,
        });
    }

    return obj;
}

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

export function emitLogicalExpression(
    operator: es.LogicalOperator,
    expressions: es.Expression[],
): es.Expression {
    return expressions.reduce((left, right) => ({
        type: "LogicalExpression",
        left,
        operator: operator,
        right,
    }));
}
