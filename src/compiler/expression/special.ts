import type { Env, es } from "#compiler/common.ts";
import { emitBlockStatement } from "#compiler/statements/emit.ts";
import { compileStatements } from "#compiler/statements/index.ts";
import {
    isList,
    isPrimitive,
    isSym,
    stringify,
    type Collection,
    type Form,
    type Sym,
} from "#core/form.ts";
import {
    arity,
    fnArguments,
    minArity,
    defArguments,
    isReservedIdentifier,
    gensym,
} from "#compiler/common.ts";
import {
    emitBinaryExpression,
    emitIdentifier,
    emitLiteral,
    emitLogicalExpression,
    emitMemberExpression,
    emitQuote,
    emitUnaryExpression,
} from "./emit.ts";
import compileExpression, {
    collect,
    compileArgument,
    expr,
    map,
    type Expr,
} from "./index.ts";

export type SpecialForms = Record<string, (env: Env, forms: Form[]) => Expr>;

const special = {
    quote(env, forms) {
        arity("quote", 1, forms);
        return expr(emitQuote(forms[0]));
    },

    // quasiquote: (env, forms) =>
    //     arity("quasiquote", 1, forms) &&
    //     quoteForm({ ...env, quote: "quasiquote" }, forms[0]!),
    //
    // spread: (env, forms) =>
    //     arity("spread", 1, forms) &&
    //     mapExpr(
    //         transformForm({ ...env, target: "expression" }, forms[0]!),
    //         (expr) => ({
    //             expr,
    //             spread: true,
    //         }),
    //     ),

    def(env, forms) {
        // TODO: patterns
        const { id, kind, init } = defArguments(forms);

        if (isReservedIdentifier(id.s)) {
            throw new Error(`${id.s} is a reserved JavaScript identifier`);
        }

        const identifier = emitIdentifier(id.s);

        const decl = (init?: es.Expression): es.Statement[] => {
            const stmts: es.Statement[] = [];
            const declaration: es.VariableDeclaration = {
                type: "VariableDeclaration",
                kind: kind === "await-using" ? "await using" : kind,
                declarations: [
                    {
                        type: "VariableDeclarator",
                        id: identifier,
                        init,
                    },
                ],
            };
            if (env.target === "toplevel" && env.context === "module") {
                stmts.push({
                    type: "ExportNamedDeclaration",
                    declaration,
                    specifiers: [],
                    attributes: [],
                } satisfies es.ExportNamedDeclaration as unknown as es.Statement);
            } else {
                stmts.push(declaration);
            }

            return stmts;
        };

        if (init === null) {
            return expr(identifier, decl(), true);
        }

        return map(
            compileExpression({ ...env, target: "expression" }, init),
            (init) => expr(identifier, decl(init), true),
        );
    },
    fn(env, forms): Expr<es.FunctionExpression> {
        const args = fnArguments(forms);

        return expr({
            type: "FunctionExpression",
            id: args.id === null ? null : emitIdentifier(args.id.s),
            params: args.params.v.map((id) => {
                if (!isSym(id)) {
                    throw new Error(
                        "function parameters must be identifiers (for now)",
                    );
                }
                return emitIdentifier(id.s);
            }),
            async: args.flags["async"],
            generator: args.flags["gen"],
            leadingComments: [
                {
                    type: "Block",
                    value: args.docs.map((d) => "* " + d).join("\n"),
                },
            ],
            body: emitBlockStatement(
                compileStatements({ ...env, target: "return" }, args.body),
            ),
        });
    },
    defmacro(env, forms): Expr<es.Identifier> {
        if (env.target !== "toplevel") {
            throw new Error(
                "defmacro should only be called at the top-level scope",
            );
        }

        return map(special.fn(env, forms), (fn) => {
            if (!fn.id) {
                throw new Error("defmacro expects an explicit identifier");
            }

            const declaration: es.FunctionDeclaration = {
                ...fn,
                type: "FunctionDeclaration",
                id: fn.id,
            };

            return expr(
                fn.id,
                [
                    env.context === "module"
                        ? {
                              type: "ExportNamedDeclaration",
                              declaration,
                              specifiers: [],
                              attributes: [],
                          }
                        : declaration,
                ],
                true,
            );
        });
    },
    upscope(env, forms) {
        const { env: blockEnv, out } = targetExpression(env);

        return map(out, (e) =>
            expr(e, compileStatements(blockEnv, forms), true),
        );
    },
    do(env, forms) {
        const { env: blockEnv, out } = targetExpression(env);

        return map(out, (e) =>
            expr(
                e,
                [emitBlockStatement(compileStatements(blockEnv, forms))],
                true,
            ),
        );
    },
    if(env, forms) {
        let { env: blockEnv, out } = targetExpression(env);

        minArity("if", 2, forms);

        const test = compileExpression(
            { ...env, target: "expression" },
            forms[0],
        );
        const consequent = emitBlockStatement(
            compileStatements(blockEnv, [forms[1]]),
        );
        const alternate =
            forms[2] !== undefined
                ? emitBlockStatement(compileStatements(blockEnv, [forms[2]]))
                : undefined;

        return map(out, (out) =>
            map(test, (test) =>
                expr(
                    out,
                    [
                        {
                            type: "IfStatement",
                            test,
                            consequent,
                            alternate,
                        },
                    ],
                    true,
                ),
            ),
        );
    },
    "."(env, forms) {
        env = { ...env, target: "expression" };

        minArity(".", 2, forms);
        const [target, form] = forms;

        return map(
            compileExpression(env, target),
            (target): Expr<es.Expression> => {
                let key: Form;
                let params: Form[] | null = null;

                if (isList(form)) {
                    minArity("method call in .", 1, form.v);

                    [key, ...params] = form.v;
                } else {
                    key = form;
                }

                const access = isPrimitive(key)
                    ? emitMemberExpression(target, emitLiteral(key), true)
                    : isSym(key)
                      ? emitMemberExpression(target, emitIdentifier(key.s))
                      : null;

                if (access === null) {
                    throw new Error(
                        "expected sym, primitive or list, got " +
                            stringify(key),
                    );
                }

                if (params === null) {
                    return expr(access);
                } else {
                    const p = collect(
                        params.map((f) => compileArgument(env, f)),
                    );
                    return map(p, (p) =>
                        expr({
                            type: "CallExpression",
                            callee: access,
                            optional: false,
                            arguments: p,
                        }),
                    );
                }
            },
        );
    },

    new(env, forms) {
        env = { ...env, target: "expression" };

        minArity("new", 1, forms);

        const klass = compileExpression(env, forms[0]);

        const p = collect(forms.slice(1).map((f) => compileArgument(env, f)));

        return map(klass, (klass) =>
            map(p, (p) =>
                expr({
                    type: "NewExpression",
                    callee: klass,
                    arguments: p,
                }),
            ),
        );
    },

    await(env, forms) {
        // IDEA: use targetExpression to create the Promise eagerly, say:
        //   (+ (await (get-bank-total)) (. (await (get-transaction)) value))
        // would get turned to:
        //   const _promise_1 = get__bank__total();
        //   const _promise_2 = get__transaction();
        //   return (await _promise_1) + (await _promise_2).value
        //
        // ALSO:
        // IDEA: make the form arity variadic, as a shorthand for Promise.all (or maybe allSettled?)
        arity("await", 1, forms);
        return map(
            compileExpression({ ...env, target: "expression" }, forms[0]),
            (argument) =>
                expr({
                    type: "AwaitExpression",
                    argument,
                }),
        );
    },

    import(env, forms) {
        arity("import", 1, forms);
        return map(
            compileExpression({ ...env, target: "expression" }, forms[0]),
            (source) =>
                expr({
                    type: "ImportExpression",
                    source,
                }),
        );
    },

    "=": operator("==", false, true),
    "!=": operator("!=", false, true),
    "==": operator("===", false, true),
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

    "~": operator("~", true, false),
    typeof: operator("typeof", true, false),
    void: operator("void", true, false),
    delete: operator("delete", true, false),

    not: operator("!", true, false),
    and: logicOperator("&&"),
    or: logicOperator("||"),
    "??": logicOperator("??"),
} satisfies SpecialForms;

export function operator<O extends string>(
    op: O,
    unary: O extends es.UnaryOperator ? true : false,
    binary: O extends es.BinaryOperator ? true : false,
): (env: Env, forms: Form[]) => Expr {
    if (binary) {
        return function (env, forms) {
            env = { ...env, target: "expression" };
            return map(
                collect(forms.map((form) => compileExpression(env, form))),
                (exprs) => expr(emitBinaryExpression(op, unary, exprs)),
            );
        };
    } else {
        return function (env, forms) {
            env = { ...env, target: "expression" };
            return map(compileExpression(env, forms[0]!), (e) =>
                expr(emitUnaryExpression(op, e)),
            );
        };
    }
}

export function logicOperator(
    op: es.LogicalOperator,
): (env: Env, forms: Form[]) => Expr {
    return function (env, forms) {
        env = { ...env, target: "expression" };
        return map(
            collect(forms.map((form) => compileExpression(env, form))),
            (exprs) => expr(emitLogicalExpression(op, exprs)),
        );
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
                    id: emitIdentifier(target.s),
                },
            ],
        });
    }

    return {
        env,
        out: expr(
            isSym(env.target)
                ? emitIdentifier(env.target.s)
                : emitIdentifier("undefined"),
            preamble,
        ),
    };
}

export default special;
