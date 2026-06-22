import { type Atom, OPENING, type Opening, tokenize } from "./token.ts";

export type Form = [Opening, Form[]] | ["special", Form[], string] | Atom;

export type FormIs<K extends Form[0]> = Extract<Form, [K, ...any[]]>;

export function* read(prog: Iterable<string>) {
    const stack: Exclude<Form, Atom>[] = [];

    function* fuse(form: Form): Generator<Form> {
        const top = stack[stack.length - 1];

        if (top) {
            top[1].push(form);
            if (top[0] === "special") {
                stack.pop();
                yield* fuse(top);
            }
        } else {
            yield form;
        }
    }

    for (let token of tokenize(prog)) {
        if (token[0] === "opening") {
            stack.push([token[1], []]);
        } else if (token[0] === "special") {
            stack.push(["special", [], token[1]]);
        } else if (token[0] === "closing") {
            const form = stack.pop();

            if (!form) {
                throw new Error("extra " + token[1] + " in input");
            }

            if (form[0] === "special") {
                throw new Error("expected form after " + form[2]);
            }

            if (OPENING[form[0]] !== token[1]) {
                throw new Error(
                    "closing " + token[1] + " does not match with " + form[0],
                );
            }

            yield* fuse(form);
        } else {
            yield* fuse(token);
        }
    }
}
