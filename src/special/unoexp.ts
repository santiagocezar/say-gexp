import { asExpression } from "../ast.ts";
import type { Form } from "../core/reader.ts";

export default function unoexp_STAR_(operator: string) {
    return function (form: Form) {
        return {
            type: "UnaryExpression",
            operator,
            prefix: true,
            argument: asExpression(form),
        };
    };
}
