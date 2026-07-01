import { SPECIAL_FORMS, type SpecialForm } from "./registry.ts";

export function defineSpecialForm(symbol: string, fun: SpecialForm) {
    SPECIAL_FORMS[symbol] = fun;
}

export function getSpecialForm(sym: string) {
    return SPECIAL_FORMS[sym];
}

import "./expressions.ts";
