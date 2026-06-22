import { type Form, type FormIs, read } from "./reader.ts";
import { type Atom } from "./token.ts";
import { print } from "esrap";
import ts from "esrap/languages/ts";

const ast = {
    type: "Program",
    body: [
        {
            type: "ExpressionStatement",
            expression: {
                type: "CallExpression",
                callee: {
                    type: "Identifier",
                    name: "alert",
                },
                arguments: [
                    {
                        type: "Literal",
                        value: "hello world!",
                    },
                ],
            },
        },
    ],
};

interface ErrFn {
    (msg: string): Error;
}

interface FormHandler {
    (forms: Form[], err: ErrFn): any;
}

function isAtom(form: Form): form is Atom {
    return true;
}

function toIdent(form: FormIs<"symbol" | "boolean" | "null" | "undefined">) {
    return {
        type: "Identifier",
        name:
            form[0] === "symbol"
                ? form[1]
                : form[0] === "null"
                  ? "null"
                  : form[0] === "undefined"
                    ? "undefined"
                    : form[1]
                      ? "true"
                      : "false",
    };
}

function toLiteral(
    form: FormIs<"string" | "number" | "boolean" | "null" | "undefined">,
) {
    return {
        type: "Literal",
        value: form[1],
    };
}

function toPattern(form: Form): any {
    if (form[0] === "symbol") {
        return {
            type: "Identifier",
            name: form[1],
        };
    } else if (form[0] === "special" && form[2] === ";") {
        return {
            type: "RestElement",
            argument: toPattern(form[1][0]),
        };
    } else if (form[0] === "[") {
        return {
            type: "ArrayPattern",
            elements: form[1].map(toPattern),
        };
    } else if (form[0] === "{") {
        const properties = [];
        for (let j = 1; j < form[1].length; j += 2) {
            const i = j - 1;
            const keyForm = form[1][i];
            const value = toPattern(form[1][i + 1]);
            let key,
                computed = false;
            if (keyForm[0] === "[") {
                if (keyForm[1].length !== 1) {
                    throw new Error(
                        "computed property must have a single form",
                    );
                }
                key = toExpression(keyForm[1][0]);
                computed = true;
            } else if (keyForm[0] === "number" || keyForm[0] === "string") {
                key = toLiteral(keyForm);
            } else if (
                keyForm[0] === "symbol" ||
                keyForm[0] === "boolean" ||
                keyForm[0] === "null" ||
                keyForm[0] === "undefined"
            ) {
                key = toIdent(keyForm);
            } else if (keyForm[0] === "special" && keyForm[2] === ";") {
                throw new Error("spread form must go last");
            } else {
                throw new Error("invalid form type " + keyForm[0]);
            }
            properties.push({
                type: "Property",
                kind: "init",
                method: false,
                key,
                value,
                computed,
            });
        }
        if (form[1].length % 2 !== 0) {
            const last = form[1].at(-1);
            if (last && last[0] === "special" && last[2] === ";") {
                properties.push(toPattern(last));
            } else {
                throw new Error(
                    "object with uneven number of forms must end with spread",
                );
            }
        }
        return {
            type: "ObjectPattern",
            properties,
        };
    }
}

function toExpression(form: Form) {
    if (form[0] === "(") {
        const forms = form[1];
        if (forms.length) {
            if (forms[0][0] === "symbol") {
                if (forms[0][1] in specialForms) {
                    return specialForms[forms[0][1]](
                        forms.slice(1),
                        (msg) => new Error(msg),
                    );
                } else {
                    return {};
                }
            }
        } else {
            return {
                type: "ArrayExpression",
                elements: [],
            };
        }
    }
}

const specialForms: Record<string, FormHandler> = {
    "decl*": (forms, err) => {
        const [kind, ...declarations] = forms;
        if (!declarations.length) {
            throw err("requires at least 2 forms");
        }
        if (
            kind[0] === "symbol" ||
            (kind[1] !== "var" &&
                kind[1] !== "let" &&
                kind[1] !== "const" &&
                kind[1] !== "using" &&
                kind[1] !== "using*")
        ) {
            throw err(
                "first form must be a one of these symbols: var, let, const, using, using*",
            );
        }

        return {
            type: "VariableDeclaration",
            kind: kind[1],
            declarations: declarations.map((form) => {
                if (form[0] !== "[") {
                    throw err("declarator forms must be a vec");
                }

                const [ident, value, canary] = form[1];

                if (!ident || canary) {
                    throw err("declarator requires 1 or 2 forms");
                }
                if (
                    ident[0] !== "symbol" &&
                    ident[0] !== "[" &&
                    ident[0] !== "{"
                ) {
                    throw err(
                        "first form in declarator must be a symbol, vec or map",
                    );
                }

                return {
                    type: "VariableDeclarator",
                };
            }),
        };
    },
};

function evaluate(form: Form) {
    console.dir(form, { depth: null });
}

const prog = `
    [a a b b ;c]
`;
// (decl* const (a true)
//              (b))

// const prog =
//     '("a hola \\\\ \\\nga" 2 14 .1 (get {"a" 2} "a") "que tal!!\\\na" hasd NaN)';

for (const form of read(prog)) {
    const ast = toPattern(form);
    console.dir(ast, { depth: null });
    console.log(print(ast, ts()));
}
