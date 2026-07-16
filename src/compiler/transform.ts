import { type Form } from "#core/form.ts";
import { print } from "esrap";
import special from "./expression/special.ts";
import compileStatement from "./statements/index.ts";
import ts from "esrap/languages/ts";
import { type es } from "./common.ts";
import { createEvaluator } from "./eval/index.ts";

export async function transform(forms: Form[]) {
    const program: es.Program = {
        type: "Program",
        sourceType: "module",
        body: [],
    };

    const evaluator = createEvaluator();

    for (let form of forms) {
        form = evaluator.expandAll(form);

        await evaluator.eval(form, (ast) => print(ast as any, ts()).code);

        program.body.push(
            ...compileStatement(
                {
                    target: "toplevel",
                    context: "module",
                    special,
                },
                form,
            ),
        );
    }

    // @ts-expect-error
    return print(program, ts()).code;
}
