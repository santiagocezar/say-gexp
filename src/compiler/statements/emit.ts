import type { es } from "#compiler/common.ts";

export function emitBlockStatement(body: es.Statement[]): es.BlockStatement {
    if (body.length === 1 && body[0]?.type === "BlockStatement") {
        return body[0];
    }

    return {
        type: "BlockStatement",
        body,
    };
}
