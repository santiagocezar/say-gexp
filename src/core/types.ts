import { type Form } from "./reader.ts";

export class Sym {
    v: string;
    constructor(v: string) {
        this.v = v;
    }

    static isSym(obj: any, name?: string): obj is Sym {
        return obj instanceof Sym && (name === undefined || obj.v === name);
    }
}

export class Keyword {
    v: string;
    constructor(v: string) {
        this.v = v;
    }

    static isKeyword(obj: any, name?: string): obj is Keyword {
        return obj instanceof Keyword && (name === undefined || obj.v === name);
    }
}

export class List extends Array<Form> {
    static isList(obj: unknown): obj is List {
        return obj instanceof List;
    }
}

export type FormMap = { [k: PropertyKey]: Form };

export function formType(form: Form) {
    return form === null
        ? "null"
        : Sym.isSym(form)
          ? "symbol"
          : Keyword.isKeyword(form)
            ? "keyword"
            : List.isList(form)
              ? "array (parens)"
              : Array.isArray(form)
                ? "array"
                : typeof form === "object"
                  ? "object"
                  : typeof form;
}
