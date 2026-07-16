export type Primitive = bigint | boolean | number | string;

export interface Collection {
    l: boolean; // list if true, array if not
    v: Form[];
    // TODO: store metadata in parallel indexed array
}

export interface List extends Collection {
    l: true;
}

export interface Vec extends Collection {
    l: false;
}

export interface Pairs {
    k: Form[];
    v: Form[];
    // TODO: store metadata in parallel indexed array
}

export interface Sym {
    s: string;
    // TODO: store metadata in parallel indexed array
}

export type Form = Primitive | List | Vec | Pairs | Sym;

export const isPrimitive = (v: any): v is Primitive =>
    typeof v !== "object" && typeof v !== "undefined";
export const isSym = (v: Form | undefined | null): v is Sym =>
    typeof v === "object" && v !== null && "s" in v;

export const isPairs = (v: Form | undefined | null): v is Pairs =>
    typeof v === "object" && v !== null && "k" in v;

export const isCollection = (v: Form | undefined | null): v is Collection =>
    typeof v === "object" && v !== null && "l" in v;
export const isList = (v: Form | undefined | null): v is List =>
    isCollection(v) && v.l;
export const isVec = (v: Form | undefined | null): v is Vec =>
    isCollection(v) && !v.l;

export const sym = (value: string): Sym => ({ s: value });
export const list = (...value: Form[]): Collection => ({
    l: true,
    v: value,
});
export const vec = (...value: Form[]): Collection => ({
    l: false,
    v: value,
});
export const pairs = (...value: [Form, Form][]): Pairs =>
    value.reduce<Pairs>(
        (pairs, [k, v]) => {
            pairs.k.push(k);
            pairs.v.push(v);
            return pairs;
        },
        { k: [], v: [] },
    );

export function stringify(form: Form | undefined): string {
    if (form === undefined) {
        return "undefined";
    }

    if (isPrimitive(form)) {
        if (typeof form === "string") {
            return `"${form}"`;
        }
        return "" + form;
    }

    if ("s" in form) {
        return form.s;
    }

    if ("k" in form) {
        return (
            "{" +
            form.k
                .map((key, i) => stringify(key) + " " + stringify(form.v[i]!))
                .join("  ") +
            "}"
        );
    }

    const inner = form.v.map((f) => stringify(f)).join(" ");
    if (form.l) {
        return "(" + inner + ")";
    } else {
        return "[" + inner + "]";
    }
}
