import { OPENING, type Opening, type Token, tokenize } from "./token.ts";
import { Keyword, List, Sym } from "./types.ts";

export type Atom = Sym | Keyword | boolean | number | string;

export type Form = Atom | List | Form[] | Map<Form, Form>;

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
        const form = yield* read_form(token);
        list.push(form);
    }

    if (token[1] !== ")") {
        throw new Error("closing " + token[1] + " does not match with (");
    }

    return list;
}

function* read_array(arr: Form[]): Reads<Form[]> {
    let token;
    while (((token = yield* tap), token[0] !== "closing")) {
        const form = yield* read_form(token);
        arr.push(form);
    }

    if (token[1] !== "]") {
        throw new Error("closing " + token[1] + " does not match with [");
    }

    return arr;
}

function* read_map(map: Map<Form, Form>): Reads<Map<Form, Form>> {
    let currentKey: Form | undefined = undefined;
    let token;
    while (((token = yield* tap), token[0] !== "closing")) {
        const form = yield* read_form(token);

        if (currentKey === undefined) {
            currentKey = form;
        } else {
            map.set(currentKey, form);
            currentKey = undefined;
        }
    }

    if (currentKey !== undefined) {
        throw new Error("expecting a value for key " + currentKey);
    }

    if (token[1] !== "}") {
        throw new Error("closing " + token[1] + " does not match with (");
    }

    return map;
}

function* read_shorthand(name: string): Reads<List> {
    const form = yield* read_form();
    const call = new List(new Sym(name), form);
    return call;
}

const SPECIAL: Record<string, () => Reads<Form>> = {
    ";": () => read_shorthand("spread"),
    "~": () => read_shorthand("quasiquote"),
    "'": () => read_shorthand("quote"),
    ",": () => read_shorthand("unquote"),
};

function* read_form(token?: Token): Reads<Form> {
    token ??= yield* tap;

    if (token[0] === "opening") {
        if (token[1] === "(") {
            return yield* read_list(new List());
        } else if (token[1] === "[") {
            return yield* read_array([]);
        } else if (token[1] === "{") {
            return yield* read_map(new Map());
        } else {
            return null as never;
        }
    } else if (token[0] === "special") {
        return yield* SPECIAL[token[1]]!();
    } else if (token[0] === "closing") {
        throw new Error("extra " + token[1] + " in input");
    } else {
        if (token[0] === "symbol") {
            if (token[1].startsWith(":")) {
                return new Keyword(token[1].substring(1));
            } else {
                return new Sym(token[1]);
            }
        } else {
            return token[1];
        }
    }
}

type PushResult = { done: true; form: Form } | { done: false; form: undefined };

export class Reader {
    #read_fun: Reads<Form> | undefined;

    static tokens(prog: Iterable<string>) {
        return tokenize(
            prog,
            (c) => c in SPECIAL,
            (c) => c in SPECIAL,
        );
    }

    static read(prog: Iterable<string>) {
        const reader = new Reader();
        const forms: Form[] = [];
        for (const token of Reader.tokens(prog)) {
            const result = reader.push(token);
            if (result.done) {
                forms.push(result.form);
            }
        }
        return forms;
    }

    push(token: Token): PushResult {
        if (!this.#read_fun) {
            this.#read_fun = read_form();
            this.#read_fun.next();
        }

        const status = this.#read_fun.next(token);

        if (status.done) {
            this.#read_fun = undefined;
            return { done: true, form: status.value };
        } else {
            return { done: false, form: undefined };
        }
    }
}
