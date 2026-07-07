import path from "node:path";

import { transform } from "../transpile.ts";

/** @type {import("node:module").ResolveHook} */
export async function resolve(specifier, context, nextResolve) {
    const ext = path.extname(specifier);

    if (ext !== ".say") {
        return nextResolve(specifier);
    }

    const { url } = await nextResolve(specifier);

    return {
        format: "say",
        shortCircuit: true,
        url,
    };
}

/** @type {import("node:module").LoadHook} */
export async function load(url, context, nextLoad) {
    if (context.format !== "say") {
        return nextLoad(url);
    }

    const rawSource =
        "" + (await nextLoad(url, { ...context, format: "module" })).source;

    const transpiledSource = transform(rawSource);

    return {
        format: "module",
        shortCircuit: true,
        source: transpiledSource,
    };
}
