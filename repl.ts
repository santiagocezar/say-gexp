import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { read } from "./src/core/reader.ts";
import { print } from "esrap";
import ts from "esrap/languages/ts";
import { transpileToAST } from "./src/eval.ts";

const rl = readline.createInterface({ input, output });

// i'm cheating

function _PLUS_(a, b) {
    return a + b;
}

while (true) {
    const prog = await rl.question("> ");

    for (const form of read(prog)) {
        console.dir(form, { depth: null });
        let ast;
        try {
            ast = transpileToAST(form);
        } catch (err) {
            console.error(err);
            continue;
        }
        console.dir(ast, { depth: null });

        const code = print(ast, ts()).code;

        console.log(code);
        try {
            const result = eval(code);
            console.log(result);
        } catch (err) {
            console.error(err);
            continue;
        }
    }
}
