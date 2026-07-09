import { emitIdentifier, type es, type Out } from "#ast/common.ts";
import { Keyword, List, Sym, type Form } from "#core/index.ts";
import specialDo, { transformBlockStatement } from "./do.ts";

export default function specialFunction(
    args: Form[],
): Out<es.FunctionExpression> {
    let idForm: Sym | null = null;

    let extra: Form[];

    if (Sym.isSym(args[0])) {
        idForm = args[0];
        extra = args.slice(1);
    } else {
        extra = args;
    }

    let params: Form[] = [];
    let paramsIndex = -1;

    for (let i = 0; i < extra.length; i++) {
        const form = extra[i];
        if (List.isList(form) || Array.isArray(form)) {
            params = form;
            paramsIndex = i;
            break;
        }
    }

    if (paramsIndex < 0) {
        throw new Error("defn is missing argument list");
    }

    const body = extra.slice(paramsIndex + 1);
    extra.length = paramsIndex;

    let flags: Record<string, boolean> = {};
    let docs: string[] = [];

    extra.forEach((form) => {
        if (Keyword.isKeyword(form)) {
            flags[form.v] = true;
        } else if (typeof form === "string") {
            docs.push(form);
        }
    });

    const id = idForm === null ? null : emitIdentifier(idForm.v);

    return {
        expr: {
            type: "FunctionExpression",
            id,
            params: params.map((id) => emitIdentifier(id.v)),
            async: flags["async"],
            generator: flags["gen"],
            leadingComments: [
                {
                    type: "Block",
                    value: docs.map((d) => "* " + d).join("\n"),
                },
            ],
            body: transformBlockStatement(
                {
                    target: "return",
                },
                body,
            ),
        },
        macro: flags["macro"] ? id?.name : undefined,
    };
}
