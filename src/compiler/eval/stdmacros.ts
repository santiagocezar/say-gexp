import { munge } from "#compiler/common.ts";
import { isList, list, sym, vec, type Form } from "#core/form.ts";

export type Macros = Record<string, (...forms: Form[]) => Form>;

const stdMacros: Macros = {
    defn(id: Form, ...rest: Form[]) {
        return list(
            sym("def"),
            id,
            sym(".const"),
            list(sym("fn"), id, ...rest),
        );
    },
    [munge("->")]: (...forms: Form[]) => {
        const threaded = forms.reduce((form, curr) => {
            const l = isList(curr) ? curr : list(curr);
            l.v.splice(1, 0, form);
            return l;
        });

        return threaded;
    },
    nary: (fn: Form, n: Form) => {
        if (typeof n !== "number") {
            throw new Error("expected second form to be a number");
        }

        const params = Array.from({ length: n }, (_, i) => sym("%" + i));

        return list(sym("fn"), vec(...params), list(fn, ...params));
    },
};

export default stdMacros;
