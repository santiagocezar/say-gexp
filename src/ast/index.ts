import type { Sym } from "../core/types.ts";

export interface SourceLocation {
    source?: string;
    start: number;
    end: number;
}

export interface Node {
    type: string;
    loc?: SourceLocation | null;
}

export interface Pattern extends Node {}
export interface Expression extends Node {}
export interface Statement extends Node {}

export interface Identifier extends Expression, Pattern {
    type: "Identifier";
    name: string;
}

export interface Literal extends Expression {
    type: "Literal";
    value: string | boolean | null | number | RegExp;
}

export interface SpreadElement extends Node {
    type: "SpreadElement";
    argument: Expression;
}

export interface Super extends Node {
    type: "Super";
}

export interface CallExpression extends Expression {
    type: "CallExpression";
    callee: Expression | Super;
    arguments: (Expression | SpreadElement)[];
}

export interface MemberExpression extends Expression, Pattern {
    type: "MemberExpression";
    object: Expression | Super;
    property: Expression;
    computed: boolean;
}

export interface ArrayExpression extends Expression {
    type: "ArrayExpression";
    elements: (Expression | SpreadElement | null)[];
}

type AssignmentOperator =
    | "="
    | "+="
    | "-="
    | "*="
    | "/="
    | "%="
    | "<<="
    | ">>="
    | ">>>="
    | "|="
    | "^="
    | "&=";

export interface AssignmentExpression extends Expression {
    type: "AssignmentExpression";
    operator: AssignmentOperator;
    left: Pattern | Expression;
    right: Expression;
}

export interface AwaitExpression extends Expression {
    type: "AwaitExpression";
    argument: Expression;
}

export interface ImportExpression extends Expression {
    type: "ImportExpression";
    source: Expression;
}

export interface ExpressionStatement extends Statement {
    type: "ExpressionStatement";
    expression: Expression;
}

export interface Directive extends ExpressionStatement {
    expression: Literal;
    directive: string;
}

export interface Program extends Node {
    type: "Program";
    body: (Directive | Statement)[];
}

export interface Declaration extends Statement {}

export interface VariableDeclarator extends Node {
    type: "VariableDeclarator";
    id: Pattern;
    init?: Expression | null;
}

export interface VariableDeclaration extends Declaration {
    type: "VariableDeclaration";
    declarations: [VariableDeclarator];
    kind: "var";
}

export interface BlockStatement extends Statement {
    type: "BlockStatement";
    body: Statement[];
}
export interface FunctionBody extends BlockStatement {
    body: (Directive | Statement)[];
}

export interface ReturnStatement extends Statement {
    type: "ReturnStatement";
    argument?: Expression | null;
}

export interface ASTContext {
    body: Statement[];
    statementTarget: Sym | "<return>" | null;
}
