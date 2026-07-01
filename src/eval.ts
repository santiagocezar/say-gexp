import { astProgram } from "./ast/statements.ts";
import { type Form } from "./core/reader.ts";

export function transpileToAST(form: Form) {
    return astProgram(form);
}
