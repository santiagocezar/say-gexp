import type { Form } from "../core/reader.ts";
import binexp_STAR_ from "./binexp.ts";
import function_STAR_ from "./function.ts";
import unoexp_STAR_ from "./unoexp.ts";

export { function_STAR_ };

export const SPECIAL_FORMS: Record<string, (...forms: Form[]) => any> = {
    "function*": function_STAR_,
    "==": binexp_STAR_("=="),
    "!=": binexp_STAR_("!="),
    "===": binexp_STAR_("==="),
    "!==": binexp_STAR_("!=="),

    "<": binexp_STAR_("<"),
    "<=": binexp_STAR_("<="),
    ">": binexp_STAR_(">"),
    ">=": binexp_STAR_(">="),

    "<<": binexp_STAR_("<<"),
    ">>": binexp_STAR_(">>"),
    ">>>": binexp_STAR_(">>>"),

    "+": binexp_STAR_("+", true),
    "-": binexp_STAR_("-", true),
    "*": binexp_STAR_("*"),
    "/": binexp_STAR_("/"),
    "%": binexp_STAR_("%"),

    "|": binexp_STAR_("|"),
    "^": binexp_STAR_("^"),
    "&": binexp_STAR_("&"),
    in: binexp_STAR_("in"),

    instanceof: binexp_STAR_("instanceof"),

    "!": unoexp_STAR_("!"),
    "~": unoexp_STAR_("~"),
    typeof: unoexp_STAR_("typeof"),
    void: unoexp_STAR_("void"),
    delete: unoexp_STAR_("delete"),
};
