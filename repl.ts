import { Session } from "node:inspector/promises";
import readline from "node:readline/promises";
import vm from "node:vm";
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
const session = new Session();
const context = vm.createContext(undefined, {
    importModuleDynamically: vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER,
});

session.connect();

let pending = false;
while (true) {
    const prog = await rl.question(pending ? "... " : ">>> ");

    for (const token of Reader.tokens(prog)) {
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

                const code = print(ast as any, ts()).code;

                console.log(code);
                try {
                    const { result, exceptionDetails } = await session.post(
                        "Runtime.evaluate",
                        {
                            // why is it 2?, i don't know how to get the id
                            // for the context created above, but this seems
                            // to be it?
                            contextId: 2,
                            awaitPromise: true,
                            replMode: true,
                            expression: code,
                        },
                    );
                    if (exceptionDetails) {
                        console.error(exceptionDetails);
                    }
                    console.log(result.value);
                } catch (err) {
                    console.error(err);
                    continue;
                }
            }
        }
    }
}
