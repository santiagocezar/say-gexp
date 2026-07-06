export { Reader, type Atom, type Form } from "./reader.ts";
export { List, Sym, Keyword, formType } from "./types.ts";
export {
    tokenize,
    CLOSING,
    OPENING,
    type Closing,
    type Opening,
    type Token,
} from "./token.ts";

import type { Form } from "./reader.ts";
import { List, Sym, Keyword } from "./types.ts";

export function l(...args: Form[]) {
    return new List(...args);
}

export function s(strings: TemplateStringsArray) {
    return new Sym(strings[0]!);
}

export function k(strings: TemplateStringsArray) {
    return new Keyword(strings[0]!);
}
