import { OPENING, type Opening, tokenize } from "./token.ts";
import { List, Sym } from "./types.ts";

export type Atom = Sym | boolean | number | null | undefined | string;

export type Form = List | Atom;

export function* read(prog: Iterable<string>) {
    const stack: [shorthand: boolean, List][] = [];

    function* fuse(form: Form): Generator<Form> {
        const top = stack[stack.length - 1];
        if (!top) {
            yield form;
            return;
        }

        const [shorthand, list] = top;

        list.items.push(form);

        if (shorthand) {
            stack.pop();
            yield* fuse(list);
        }
    }

    for (let token of tokenize(prog)) {
        if (token[0] === "opening") {
            stack.push([false, new List(token[1], [])]);
        } else if (token[0] === "shorthand") {
            stack.push([true, new List("(", [new Sym(token[1])])]);
        } else if (token[0] === "closing") {
            const top = stack.pop();

            if (!top) {
                throw new Error("extra " + token[1] + " in input");
            }

            const [, form] = top;

            if (!form.doesMatch(token[1])) {
                throw new Error(
                    "closing " + token[1] + " does not match with " + form.type,
                );
            }

            yield* fuse(form);
        } else {
            let value: Atom;
            if (token[0] === "symbol") {
                value = new Sym(token[1]);
            } else {
                value = token[1];
            }
            yield* fuse(value);
        }
    }
}
