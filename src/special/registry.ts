import type { ASTContext } from "../ast/index.ts";
import type { Form } from "../core/index.ts";

export interface SpecialForm {
    (ctx: ASTContext, ...forms: Form[]): any;
}

export const SPECIAL_FORMS: Record<string, SpecialForm> = {
    // "function*": function_STAR_,
};
