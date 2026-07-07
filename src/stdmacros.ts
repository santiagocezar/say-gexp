import type { Form } from "#core/reader.ts";
import { List, Sym } from "#core/types.ts";

export type Macros = Record<string, (...forms: Form[]) => Form>;

const stdMacros: Macros = {
    "->": (...forms: Form[]) => {
        const threaded = forms.reduce((form, curr) => {
            const list = List.isList(curr) ? curr : new List(curr);
            list.splice(1, 0, form);
            return list;
        });

        return threaded;
    },
    nary: (fn: Form, n: Form) => {
        if (typeof n !== "number") {
            throw new Error("expected second form to be a number");
        }
        const params: Sym[] = [];

        for (let i = 1; i <= n; i++) {
            params.push(new Sym("%" + i));
        }

        const call = new List(fn!, ...params);

        return new List(new Sym("fn"), params, call);
    },
};

export default stdMacros;
