import type { es } from "#compiler/common.ts";
import { emitLiteral } from "#compiler/expression/emit.ts";
import compileExpression, { expr, map } from "#compiler/expression/index.ts";
import special, { type SpecialForms } from "#compiler/expression/special.ts";
import type { Form } from "#core/form.ts";
import { expandAll } from "./macro.ts";
import stdMacros, { type Macros } from "./stdmacros.ts";

export function createEvaluator() {
    // scope
    const keys: string[] = [];
    const vals: any[] = [];

    const macros: Macros = stdMacros;

    const evalSpecial = {
        ...special,
        defmacro(env, forms) {
            return map(special.defmacro(env, forms), (id) => {
                return expr(
                    id,
                    [
                        {
                            type: "ExpressionStatement",
                            expression: {
                                type: "CallExpression",
                                callee: {
                                    type: "Identifier",
                                    name: "def",
                                },
                                arguments: [
                                    emitLiteral(id.name),
                                    id,
                                    emitLiteral(true),
                                ],
                                optional: false,
                            },
                        },
                    ],
                    true,
                );
            });
        },
        def(env, forms) {
            const out = special.def(env, forms);

            if (env.target !== "toplevel") {
                return out;
            }
            return map(out, (id) =>
                expr(
                    id,
                    [
                        {
                            type: "ExpressionStatement",
                            expression: {
                                type: "CallExpression",
                                callee: {
                                    type: "Identifier",
                                    name: "def",
                                },
                                arguments: [emitLiteral(id.name), id],
                                optional: false,
                            },
                        },
                    ],
                    true,
                ),
            );
        },
    } satisfies SpecialForms;

    function def(key: string, val: any, macro = false) {
        keys.push(key);
        vals.push(val);
        if (macro) {
            macros[key] = val;
        }
    }

    return {
        expandAll(form: Form) {
            return expandAll(macros, form);
        },
        async eval(form: Form, print: (ast: es.Node) => string) {
            const { preamble, expr } = compileExpression(
                {
                    target: "toplevel",
                    context: "compiler",
                    special: evalSpecial,
                },
                form,
            );

            const code =
                preamble.map((stmt) => print(stmt)).join(";") +
                "(" +
                print(expr) +
                ")";

            const fn: (...args: any[]) => Promise<any> = AsyncFunction(
                "def",
                ...keys,
                code,
            );

            await fn(def, ...vals);
        },
    };
}

const AsyncFunction = async function () {}.constructor;
