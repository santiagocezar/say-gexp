export const OPENING = {
    "(": ")",
    "[": "]",
    "{": "}",
} as const;
export const CLOSING = {
    ")": "(",
    "]": "[",
    "}": "{",
} as const;

export type Opening = keyof typeof OPENING;
export type Closing = keyof typeof CLOSING;

export type Token =
    | ["opening", Opening]
    | ["closing", Closing]
    | ["shorthand", string]
    | ["symbol", string]
    | ["number", number]
    | ["boolean", boolean]
    | ["null", null]
    | ["undefined", undefined]
    | ["string", string];

const isKeyOf = <ObjectType extends Record<PropertyKey, unknown>>(
    object: ObjectType,
    property: PropertyKey,
): property is keyof ObjectType => {
    return Object.prototype.hasOwnProperty.call(object, property);
};

const NUMSTART = /[0-9]/;

function isWhitespace(c: string) {
    return c === " " || c === "\r" || c === "\n";
}

function isTerminator(c: string | undefined) {
    return !c || c === '"' || c in OPENING || c in CLOSING || isWhitespace(c);
}

function isNotTerminator(c: string | undefined): c is string {
    return !isTerminator(c);
}

const SHORTHANDS: Record<string, string> = {
    ";": "spread",
};

export function* tokenize(prog: Iterable<string, undefined>) {
    const iter = prog[Symbol.iterator]();

    let cursor = 0;
    let stack: string[] = [];

    let _c: string | undefined = iter.next().value;

    function skip() {
        _c = iter.next().value;
        cursor++;
    }
    function push() {
        if (_c) stack.push(_c);
        return skip();
    }
    function popall() {
        const raw = stack.join("");
        stack.length = 0;
        return raw;
    }
    function peek() {
        return _c;
    }

    function error(msg: string) {
        throw new Error(`at position ${cursor}: ${msg}`);
    }

    function num(): Token {
        while (!isTerminator(peek())) push();

        const raw = popall();
        const n = Number(raw);

        if (isNaN(n)) {
            error("invalid number " + raw);
        }

        return ["number", n];
    }

    function sym(): Token | undefined {
        while (!isTerminator(peek())) push();

        if (stack.length) {
            const raw = popall();
            switch (raw) {
                case "true":
                    return ["boolean", true];
                case "false":
                    return ["boolean", false];
                case "null":
                    return ["null", null];
                case "undefined":
                    return ["undefined", undefined];
                default:
                    return ["symbol", raw];
            }
        }
    }

    function symnum(): Token | undefined {
        if (peek() === "-" || peek() === "+") {
            push();
        }

        const next = peek();
        if (isNotTerminator(next)) {
            if (next.match(NUMSTART)) {
                return num();
            } else {
                return sym();
            }
        }

        return sym();
    }

    function str(): Token | undefined {
        const s = [];

        if (peek() === '"') {
            skip();
            while (peek() && peek() !== '"') {
                push();
                if (peek() === "\\") {
                    skip();
                    s.push(...popall());
                    switch (peek()) {
                        case "0":
                            s.push("\0");
                            break;
                        case '"':
                            s.push('"');
                            break;
                        case "\\":
                            s.push("\\");
                            break;
                        case "n":
                            s.push("\n");
                            break;
                        case "r":
                            s.push("\r");
                            break;
                        case "v":
                            s.push("\v");
                            break;
                        case "t":
                            s.push("\t");
                            break;
                        case "\r":
                        case "\n":
                            break;
                    }
                    skip();
                }
            }
            s.push(...popall());
            skip();

            return ["string", s.join("")];
        }
    }

    function list(): Token | undefined {
        const c = peek();
        if (c && isKeyOf(OPENING, c)) {
            skip();
            return ["opening", c];
        } else if (c && isKeyOf(CLOSING, c)) {
            skip();
            return ["closing", c];
        }
    }

    function shorthand(): Token | undefined {
        const sym = SHORTHANDS[peek() ?? ""];
        if (sym) {
            skip();
            return ["shorthand", sym];
        }
    }

    while (peek()) {
        const token = shorthand() ?? list() ?? str() ?? symnum();

        if (token) yield token;
        else skip();
    }
}
