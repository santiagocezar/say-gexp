import { OPENING, type Opening, type Token, tokenize } from "./token.ts";
import { List, Sym } from "./types.ts";

export type Atom = Sym | boolean | number | string;

export type Form = List | Atom;

const ICANHAZTOKEN = Symbol("ICANHAZTOKEN");

type Reads<T> = Generator<typeof ICANHAZTOKEN, T>;

const tap = {
    [Symbol.iterator]: function* (): Reads<Token> {
        return yield ICANHAZTOKEN;
    },
};

function* read_list(list: List): Reads<List> {
    let token;
    while (((token = yield* tap), token[0] !== "closing")) {
        const forms = yield* read_form(token);
        list.items.push(...forms);
    }

    if (!list.doesMatch(token[1])) {
        throw new Error(
            "closing " + token[1] + " does not match with " + list.type,
        );
    }

    return list;
}

function* read_shorthand(name: string): Reads<List[]> {
    const forms = yield* read_form();
    const call = new List("(", [new Sym(name), ...forms]);
    return [call];
}

const SPECIAL: Record<string, () => Reads<Form[]>> = {
    ";": () => read_shorthand("spread"),
};

function* read_form(token?: Token): Reads<Form[]> {
    token ??= yield* tap;

    if (token[0] === "opening") {
        const list = yield* read_list(new List(token[1], []));
        return [list];
    } else if (token[0] === "special") {
        const forms = yield* SPECIAL[token[1]]!();
        return forms;
    } else if (token[0] === "closing") {
        throw new Error("extra " + token[1] + " in input");
    } else {
        if (token[0] === "symbol") {
            const sym = new Sym(token[1]);
            return [sym];
        } else {
            return [token[1]];
        }
    }
}

type PushResult = { done: true; forms: Form[] } | { done: false; forms: [] };

export class Reader {
    #read_fun: Reads<Form[]> | undefined;

    static tokens(prog: Iterable<string>) {
        return tokenize(
            prog,
            (c) => c in SPECIAL,
            (c) => c in SPECIAL,
        );
    }

    push(token: Token): PushResult {
        if (!this.#read_fun) {
            this.#read_fun = read_form();
            this.#read_fun.next();
        }

        const status = this.#read_fun.next(token);

        if (status.done) {
            this.#read_fun = undefined;
            return { done: true, forms: status.value };
        } else {
            return { done: false, forms: [] };
        }
    }
}
