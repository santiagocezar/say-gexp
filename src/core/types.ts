import { type Form } from "./reader.ts";
import { type Closing, type Opening, OPENING } from "./token.ts";

export class Sym {
    readonly name: string;
    readonly keyword: boolean;
    constructor(value: string) {
        this.keyword = value.startsWith(":");
        this.name = this.keyword ? value.substring(1) : value;
    }

    static isSym(obj: any, name?: string): obj is Sym {
        return obj instanceof Sym && (name === undefined || obj.name === name);
    }
}

// export class Special implements ParentForm {
//     type: string;
//     form: Form | null;

//     constructor(type: string, form: Form | null) {
//         this.type = type;
//         this.form = form;
//     }

//     static isSpecial(obj: any): obj is Special {
//         return obj instanceof Special;
//     }

//     add(form: Form) {
//         this.form = form;
//         return true;
//     }
// }

export class List {
    type: Opening;
    items: Form[];

    constructor(type: Opening, forms: Form[]) {
        this.type = type;
        this.items = forms;
    }

    static isList(obj: any): obj is List {
        return obj instanceof List;
    }

    doesMatch(char: Closing) {
        return OPENING[this.type] === char;
    }
}

export function formType(form: Form) {
    return Sym.isSym(form)
        ? "symbol"
        : List.isList(form)
          ? form.type === "("
              ? "list"
              : form.type === "["
                ? "vector"
                : form.type === "{"
                  ? "map"
                  : "unknown list"
          : form === null
            ? "null"
            : typeof form;
}
