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

function toPatternaaaa(form: Form): any {
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
    } else if (form[0] === "{") {
    }
}

function toExpressiaaaaon(form: Form) {}

function isIdentifier(
    form: Form,
): form is FormIs<"symbol" | "null" | "undefined" | "boolean"> {
    return (
        form[0] === "symbol" ||
        form[0] === "null" ||
        form[0] === "undefined" ||
        form[0] === "boolean"
    );
}

function asIdentifier(
    form: FormIs<"symbol" | "null" | "undefined" | "boolean">,
) {
    const name =
        form[0] === "symbol"
            ? form[1]
            : form[0] === "null"
              ? "null"
              : form[0] === "undefined"
                ? "undefined"
                : form[0] === "boolean"
                  ? form[1]
                      ? "true"
                      : "false"
                  : undefined;

    if (!name) {
        return false;
    }

    return {
        type: "Identifier",
        name,
    };
}

function maybeForm<K extends Form[0]>(
    form: Form,
    ...types: K[]
): FormIs<K> | undefined {
    for (const type of types) {
        if (form[0] === type) {
            return form as FormIs<K>;
        }
    }
}

function expectForm<K extends Form[0]>(
    form: Form,
    position: number,
    ...types: K[]
): FormIs<K> {
    const maybe = maybeForm(form, ...types);

    if (maybe) {
        return maybe;
    }

    throw new Error(
        `form at position ${position} must be one of these types: ${types.join(", ")}`,
    );
}

function expectValue<V>(value: any, position: number, ...expected: V[]): V {
    for (const e of expected) {
        if (value === e) {
            return e;
        }
    }

    throw new Error(
        `form at position ${position} must be one of these value: ${expected.join(", ")}`,
    );
}

function asLiteral(form: Form) {
    return {
        type: "Literal",
        value: form[1],
    };
}

function vec(...forms: Form[]): any {
    return {
        type: "ArrayExpression",
        elements: forms.map(evaluate),
    };
}

function fun_star(name: Form, args: Form, ...body) {}

function asObjectKey(key: Form) {
    let keyAst,
        computed = false;

    if (key[0] === "[") {
        if (key[1].length !== 1) {
            throw new Error("computed property must have a single form");
        }
        keyAst = evaluate(key[1][0]);
        computed = true;
    } else if (key[0] === "number" || key[0] === "string") {
        keyAst = asLiteral(key);
    } else if (isIdentifier(key)) {
        keyAst = asIdentifier(key);
    } else {
        throw new Error("invalid form type " + key[0]);
    }

    return { keyAst, computed };
}

function getProperties(forms: Form[]) {
    const properties: [any, boolean, Form][] = [];
    let rest: FormIs<"special"> | null = null;

    for (let j = 1; j < forms.length; j += 2) {
        const key = forms[j - 1];
        const value = forms[j];
        if (key[0] === "special" && key[2] === ";") {
            throw new Error("spread form must go last");
        }

        const { keyAst, computed } = asObjectKey(key);
        properties.push([keyAst, computed, value]);
    }

    if (forms.length % 2 !== 0) {
        const last = forms.at(-1);
        if (last && last[0] === "special" && last[2] === ";") {
            rest = last;
        } else {
            throw new Error(
                "map with uneven number of forms must end with spread",
            );
        }
    }

    return {
        properties,
        rest,
    };
}

function pat(form: Form): any {
    if (form[0] === "[") {
        return {
            type: "ArrayPattern",
            elements: form[1].map(pat),
        };
    } else if (form[0] === "{") {
        const { properties, rest } = getProperties(form[1]);
        const propertiesAst = properties.map(([keyAst, computed, value]) => {
            const valueAst = pat(value);

            return {
                type: "Property",
                kind: "init",
                method: false,
                key: keyAst,
                value,
                computed,
            };
        });
        if (rest) {
            propertiesAst.push(pat(rest));
        }
        return {
            type: "ObjectPattern",
            properties,
        };
    } else if (form[0] === "special" && form[2] === ";") {
        return {
            type: "RestElement",
            argument: pat(form[1][0]),
        };
    } else if (isIdentifier(form)) {
        return asIdentifier(form);
    } else {
        throw new Error("invalid form type for pattern: " + form[0]);
    }
}

function map(...forms: Form[]): any {
    const propertiesAst = forms.map((form) => {
        let kind = "init",
            computed = false,
            method = false,
            shorthand = false,
            keyAst,
            valueAst;

        // key-value pair
        if (form[0] === "[") {
            const [key, value = key] = form[1];
            const evaluated = asObjectKey(key);
            shorthand = key === value;
            keyAst = evaluated.keyAst;
            computed = evaluated.computed;
            valueAst = evaluate(value);
        } else if (form[0] === "(") {
            const methodKindForm = expectForm(form[1][0], 1, "symbol");
            const methodKind = expectValue(
                methodKindForm[1],
                1,
                "get",
                "set",
                "fun",
            );
            method = methodKind === "fun";
            kind = methodKind === "fun" ? "init" : methodKind;
        }

        return {
            type: "Property",
            kind: "init",
            method: false,
            key: keyAst,
            value,
            computed,
        };
    });
    if (rest) {
        propertiesAst.push(pat(rest));
    }
    return {
        type: "ObjectExpression",
        properties,
    };
}

function decl(kind: Form, ...declarations: Form[]) {
    if (
        kind[0] === "symbol" ||
        (kind[1] !== "var" &&
            kind[1] !== "let" &&
            kind[1] !== "const" &&
            kind[1] !== "using" &&
            kind[1] !== "using*")
    ) {
        throw new Error(
            "first form must be a one of these symbols: var, let, const, using, using*",
        );
    }

    return {
        type: "VariableDeclaration",
        kind: kind[1],
        declarations: declarations.map((form) => {
            if (form[0] !== "[") {
                throw new Error("declarator forms must be a vec");
            }

            const [ident, value, canary] = form[1];

            if (!ident || canary) {
                throw new Error("declarator requires 1 or 2 forms");
            }
            if (ident[0] !== "symbol" && ident[0] !== "[" && ident[0] !== "{") {
                throw new Error(
                    "first form in declarator must be a symbol, vec or map",
                );
            }

            return {
                type: "VariableDeclarator",
            };
        }),
    };
}

function call(calee: Form, optional: Form, ...args: Form[]): any {
    const caleeAst = evaluate(calee);
    if (optional[0] !== "boolean") {
        throw new Error(`second form must be a boolean`);
    }

    return {
        type: "CallExpression",
        callee: caleeAst,
        arguments: args.map(evaluate),
        optional: optional[1],
    };
}

interface FormHandler {
    (forms: Form[]): any;
}
function toHandler(fn: (...args: Form[]) => any): FormHandler {
    return (forms) => {
        if (forms.length < fn.length) {
            throw new Error(
                `expected at least ${fn.length} form${fn.length > 1 ? "s" : ""}`,
            );
        }
        return fn(...forms);
    };
}

const specialForms: Record<string, FormHandler> = {
    "pat*": toHandler(pat),
    "vec*": toHandler(vec),
    "map*": toHandler(map),
    "decl*": toHandler(decl),
    "call*": toHandler(call),
};

function evaluate(form: Form) {
    if (form[0] === "(") {
        const forms = form[1];
        if (forms.length) {
            if (forms[0][0] === "symbol") {
                if (forms[0][1] in specialForms) {
                    return specialForms[forms[0][1]](forms.slice(1));
                } else {
                    return call(
                        forms[0],
                        ["boolean", false],
                        ...forms.slice(1),
                    );
                }
            }
        } else {
            return {
                type: "ArrayExpression",
                elements: [],
            };
        }
    } else if (form[0] === "[") {
    }

    // console.dir(form, { depth: null });
}

const prog = `
    {
        [a 2]
        [b]
        (fun hola [x] x)
        (get hola [] x)
        (set hola [x] x)
    }
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

// functions with this as first param would be class functions, without they'd be arrow functions
