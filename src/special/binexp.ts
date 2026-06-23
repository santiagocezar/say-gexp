import { asExpression } from "../ast.ts";
import type { Form } from "../core/reader.ts";
import unoexp_STAR_ from "./unoexp.ts";

export default function binexp_STAR_(operator: string, unary: boolean = false) {
    const unoexp = unary ? unoexp_STAR_(operator) : undefined;

    return function binexp(...forms: Form[]) {
        if (forms.length < 2) {
            if (unoexp) {
                if (forms.length < 1) {
                    throw new Error(
                        `expected at least 1 argument for operator ${operator}`,
                    );
                }

                return unoexp(forms[0]);
            } else {
                throw new Error(
                    `expected at least 2 arguments for operator ${operator}`,
                );
            }
        }

        return forms.map(asExpression).reduce((left, right) => ({
            type: "BinaryExpression",
            left,
            operator,
            right,
        }));
    };
}
