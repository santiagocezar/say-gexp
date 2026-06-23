import { asExpression, asLiteral } from "./ast.ts";
import { type Form } from "./core/reader.ts";

export function transpileToAST(form: Form) {
    return asExpression(form);
}
