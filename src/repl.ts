import { Session } from "node:inspector/promises";
import readline from "node:readline/promises";
import vm from "node:vm";
import { stdin as input, stdout as output } from "node:process";
import { Reader } from "#core/reader.ts";
import { print } from "esrap";
import ts from "esrap/languages/ts";
import { transpiler, transpileToJS } from "./transpile.ts";
import * as sayGlobal from "./say-global.ts";

const rl = readline.createInterface({ input, output });

// const session = new Session();

// session.connect();

// await session.post("Runtime.enable");

// session.addListener("Runtime.executionContextCreated", (ev) => {
//     startRepl(ev.params.context.id);
// });

// vm.createContext(sayGlobal, {
//     importModuleDynamically: vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER,
// });

// async function evalIn(contextId: number, code: string) {
//     try {
//         const { result, exceptionDetails } = await session.post(
//             "Runtime.evaluate",
//             {
//                 contextId,
//                 returnByValue: true,
//                 awaitPromise: true,
//                 replMode: true,
//                 expression: code,
//             },
//         );
//         if (exceptionDetails) {
//             console.error(exceptionDetails);
//         }
//         console.log(result.value);
//     } catch (err) {
//         console.error(err);
//     }
// }

// async function startRepl(contextId: number) {
//     let pending = false;
//     while (true) {
//         const prog = await rl.question(pending ? "|" : ">");

//         for (const token of Reader.tokens(prog)) {
//             const { done, form } = reader.push(token);
//             pending = !done;

//             if (done) {
//                 let ast;
//                 try {
//                     ast = transpileToAST(form);
//                 } catch (err) {
//                     console.error(err);
//                     continue;
//                 }
//                 console.dir(ast, { depth: null });

//                 const code = print(ast as any, ts()).code;

//                 console.log(code);

//                 await evalIn(contextId, code);
//             }
//         }
//     }
// }

const reader = new Reader();

let pending = false;

Object.assign(globalThis, sayGlobal);

const transpile = transpiler();

while (true) {
    const prog = await rl.question(pending ? "|" : ">");

    for (const token of Reader.tokens(prog)) {
        const { done, form } = reader.push(token);
        pending = !done;

        if (done) {
            let out;
            try {
                out = transpile(form);
            } catch (err) {
                console.error(err);
                continue;
            }

            try {
                const code = transpileToJS(out);
                const res = (0, eval)(code);
            } catch (err) {
                console.error(err);
                continue;
            }
        }
    }
}
