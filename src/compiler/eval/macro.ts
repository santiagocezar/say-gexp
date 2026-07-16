import {
    type Form,
    isPrimitive,
    stringify,
    list,
    sym,
    isSym,
    isList,
    isPairs,
} from "#core/form.ts";
import type { Macros } from "./stdmacros.ts";
import { munge } from "#compiler/common.ts";

export function expandArray<F extends Form[]>(macros: Macros, forms: F): F {
    let expanded = false;
    const value = forms.map((f) => {
        const x = expand(macros, f);
        expanded ||= f !== x;
        return x;
    });

    if (expanded) {
        return value as F;
    }

    return forms;
}

export function expand(macros: Macros, form: Form): Form {
    if (isPrimitive(form)) {
        return form;
    }

    if (isSym(form)) {
        return form;
    }

    if (isList(form)) {
        const [head, ...tail] = form.v;

        if (!head) {
            return form;
        }

        if (isPrimitive(head)) {
            const [target, ...params] = tail;
            if (!target) {
                throw new Error(
                    "expected at least 1 parameter for member expression",
                );
            }
            return list(sym("."), target, list(head, ...params));
        }

        if (isSym(head)) {
            if (head.s !== ".") {
                if (head.s.startsWith(".")) {
                    const [target] = tail;
                    if (!target) {
                        throw new Error(
                            "expected at least 1 parameter for property expression",
                        );
                    }
                    return list(sym("."), target, sym(head.s.substring(1)));
                } else if (head.s.endsWith(".")) {
                    const [target, ...params] = tail;
                    if (!target) {
                        throw new Error(
                            "expected at least 1 parameter for method expression",
                        );
                    }
                    return list(
                        sym("."),
                        target,
                        list(sym(head.s.slice(0, -1)), ...params),
                    );
                }
            }
            const macro = macros[munge(head.s)];
            if (macro) {
                return macro(...tail);
            }
        }
    }

    if (isPairs(form)) {
        const keys = expandArray(macros, form.k);
        const values = expandArray(macros, form.v);

        if (keys !== form.k || values !== form.v) {
            return { k: keys, v: values };
        } else {
            return form;
        }
    }

    const values = expandArray(macros, form.v);

    if (values !== form.v) {
        return {
            l: form.l,
            v: values,
        };
    }

    return form;
}

export function expandAll(macros: Macros, form: Form): Form {
    let prev;
    while (form !== prev) {
        prev = form;
        form = expand(macros, form);
    }
    return form;
}
