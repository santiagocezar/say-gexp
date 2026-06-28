import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Reader } from "./src/core/reader.ts";
import { print } from "esrap";
import ts from "esrap/languages/ts";
import { transpileToAST } from "./src/eval.ts";

const rl = readline.createInterface({ input, output });

// i'm cheating

function _PLUS_(a, b) {
    // TODO: variadic _PLUS_
    return a + b;
}

const reader = new Reader();
let pending = false;
while (true) {
    const prog = await rl.question(pending ? "... " : ">>> ");

    for (const token of Reader.tokens(prog)) {
        console.log(token);

        const { done, forms } = reader.push(token);
        pending = !done;

        if (done) {
            for (const form of forms) {
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
    }
}
