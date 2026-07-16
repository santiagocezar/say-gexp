import type { Env, es } from "#compiler/common.ts";
import { isPrimitive, isList, isPairs, isSym, type Form } from "#core/form.ts";
import { emitIdentifier, emitLiteral, emitQuote } from "./emit.ts";

export interface Expr<E = es.Expression> {
    preamble: es.Statement[];
    expr: E;
    skip: boolean;
}

export default function compileExpression(env: Env, form: Form): Expr {
    if (isPrimitive(form)) {
        return expr(emitLiteral(form));
    }

    if (isSym(form)) {
        return expr(emitIdentifier(form.s));
    }

    if (isList(form)) {
        const [callee, ...params] = form.v;

        if (callee === undefined) {
            return expr(emitQuote([]));
        }

        if (isSym(callee)) {
            const fn = env.special?.[callee.s];

            if (fn) {
                return fn(env, params);
            }
        }

        env = { ...env, target: "expression" };

        const c = compileExpression(env, callee);
        const p = collect(params.map((f) => compileArgument(env, f)));
        return map(c, (c) =>
            map(p, (p) =>
                expr({
                    type: "CallExpression",
                    callee: c,
                    optional: false,
                    arguments: p,
                }),
            ),
        );
    }

    env = { ...env, target: "expression" };

    if (isPairs(form)) {
        const properties = collect(
            form.k.map((key, i) => compileProperty(env, key, form.v[i]!)),
        );

        return map(properties, (properties) =>
            expr({
                type: "ObjectExpression",
                properties,
            }),
        );
    }

    // Vec
    const elements = collect(form.v.map((f) => compileExpression(env, f)));
    return map(elements, (elements) =>
        expr({
            type: "ArrayExpression",
            elements,
        }),
    );
}

export function compileArgument(
    env: Env,
    form: Form,
): Expr<es.Expression | es.SpreadElement> {
    if (isList(form) && isSym(form.v[0]) && form.v[0].s === "spread") {
        if (form.v[1] === undefined) {
            throw new Error("spread expects an argument");
        }

        const argument = compileExpression(env, form.v[1]);

        return map(argument, (argument) =>
            expr({
                type: "SpreadElement",
                argument,
            }),
        );
    }

    return compileExpression(env, form);
}

function compileProperty(
    env: Env,
    key: Form,
    value: Form,
): Expr<es.Property | es.SpreadElement> {
    if (isPrimitive(key)) {
        // FIXME: this is wrong
        return map(compileExpression(env, value), (value) =>
            expr({
                type: "Property",
                kind: "init",
                key: emitLiteral(key),
                value,
                method: false,
                shorthand: false,
                computed: false,
            }),
        );
    }

    if (isSym(key) && key.s.startsWith(".")) {
        // spread
        if (key.s === "..") {
            return map(compileExpression(env, value), (value) =>
                expr({
                    type: "SpreadElement",
                    argument: value,
                }),
            );
        }
        // property shorthand, like fennel
        if (key.s === ".") {
            if (!isSym(value)) {
                throw new Error("expected sym after property shorthand");
            }

            return expr({
                type: "Property",
                kind: "init",
                key: emitIdentifier(value.s),
                value: emitIdentifier(value.s),
                method: false,
                shorthand: true,
                computed: false,
            });
        }

        // TODO: methods, get and set

        return map(compileExpression(env, value), (value) =>
            expr({
                type: "Property",
                kind: "init",
                key: emitIdentifier(key.s.substring(1)),
                value,
                method: false,
                shorthand: false,
                computed: false,
            }),
        );
    }

    return map(compileExpression(env, key), (key) =>
        map(compileExpression(env, value), (value) =>
            expr({
                type: "Property",
                kind: "init",
                key,
                value,
                method: false,
                shorthand: false,
                computed: true,
            }),
        ),
    );
}

export function expr<E = es.Expression>(
    expr: E,
    preamble: (es.Statement | es.Declaration | es.ModuleDeclaration)[] = [],
    skip = false,
): Expr<E> {
    return { expr, preamble: preamble as es.Statement[], skip };
}

export function map<E = es.Expression, O = es.Expression>(
    out: Expr<E>,
    mapfn: (expr: E) => Expr<O>,
): Expr<O> {
    const next = mapfn(out.expr);
    return {
        preamble: out.preamble
            ? next.preamble
                ? out.preamble.concat(next.preamble)
                : out.preamble
            : next.preamble,
        expr: next.expr,
        skip: next.skip,
    };
}

export function collect<O>(out: Expr<O>[]): Expr<O[]> {
    return out.reduce(
        (out, expr) =>
            map(expr, (expr) => {
                out.expr.push(expr);
                return out;
            }),
        expr<O[]>([]),
    );
}
