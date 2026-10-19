// Callable and dictionary syntax in the parser (docs/spec/engine/rpgcode-language.md FUN-8, EXP-7;
// docs/spec/engine/rpgcode-modules-and-objects.md OOP-10, OOP-11; entry 18.2). The parser builds the
// nodes; lowering and running them is entry 18.3, so compiling one is a located refusal.
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { compileInline, parse, type ScriptError } from "../src/index.ts";
import type { Expr } from "../src/script/ast.ts";
import { tokenizeObjects } from "../src/script/lex.ts";

/** Narrow `expr` to one node kind, failing the test with the actual kind otherwise. */
function kindOf<K extends Expr["kind"]>(expr: Expr | undefined, kind: K): Extract<Expr, { kind: K }> {
  if (expr === undefined || expr.kind !== kind) {
    throw new Error(`expected a ${kind} node but found ${expr?.kind ?? "nothing"}`);
  }
  return expr as Extract<Expr, { kind: K }>;
}

function expressionOf(source: string): Expr {
  const statement = parse(tokenizeObjects(source)).statements[0];
  if (statement === undefined || statement.kind !== "expr") {
    throw new Error(`not an expression statement: ${source}`);
  }
  return statement.expr;
}

/** The right-hand side of `name = <value>`. */
function assignedValue(source: string): Expr {
  return kindOf(expressionOf(source), "assign").value;
}

function syntaxErrorOf(source: string): ScriptError {
  try {
    parse(tokenizeObjects(source));
  } catch (error) {
    return error as ScriptError;
  }
  throw new Error(`expected a syntax error for: ${source}`);
}

test("a lambda with a block body keeps its parameters, by-reference marks and statements", () => {
  const value = kindOf(assignedValue("f = (a, &b) => { b = a + 1; return b; }"), "lambda");
  deepEqual(
    value.params.map((param) => [param.name, param.byRef]),
    [
      ["a", false],
      ["b", true],
    ],
  );
  equal(value.exprBody, false);
  deepEqual(
    value.body.map((statement) => statement.kind),
    ["expr", "return"],
  );
});

test("an expression-bodied lambda is stored as one return, with and without parentheses", () => {
  for (const source of ["f = (x) => x * 2", "f = x => x * 2", "f = (x)=>x * 2"]) {
    const value = kindOf(assignedValue(source), "lambda");
    equal(value.exprBody, true, source);
    equal(value.body.length, 1, source);
    const only = value.body[0];
    equal(only?.kind, "return", source);
    equal(only?.kind === "return" ? only.value?.kind : undefined, "binary", source);
  }
  equal(kindOf(assignedValue("f = () => 7"), "lambda").params.length, 0);
});

test("an arrow with a brace always opens a block, never a dictionary literal", () => {
  equal(kindOf(assignedValue("f = () => { return 1 }"), "lambda").exprBody, false);
});

test("a parenthesised expression that is not followed by an arrow is not a lambda", () => {
  const value = kindOf(assignedValue("y = (a + b) * 2"), "binary");
  equal(value.left.kind, "binary");
});

test("dictionary literals keep key order, accept string keys, lambdas, nesting and a trailing comma", () => {
  const value = kindOf(
    assignedValue(`potion = {
    name: "Health Potion",
    "heal amount": 50,
    use: (target) => { target.hp += this.healAmount },
    inner: { depth: 1 },
  }`),
    "object",
  );
  deepEqual(
    value.entries.map((entry) => entry.key),
    ["name", "heal amount", "use", "inner"],
  );
  deepEqual(
    value.entries.map((entry) => entry.value.kind),
    ["literal", "literal", "lambda", "object"],
  );
  equal(kindOf(assignedValue("bag = {}"), "object").entries.length, 0);
});

test("a malformed dictionary literal is a syntax error", () => {
  for (const source of ["d = { a 1 }", "d = { a: 1 b: 2 }", "d = { 1: 2 }", "d = { a: }"]) {
    equal(syntaxErrorOf(source).code, "syntax.error", source);
  }
});

test("a call through an expression becomes callIndirect; a bare name stays a named call", () => {
  const chained = kindOf(expressionOf("f(1)(2)"), "callIndirect");
  equal(chained.callee.kind, "call");
  equal(chained.args.length, 1);

  equal(kindOf(kindOf(expressionOf("handlers[i](x)"), "callIndirect").callee, "index").kind, "index");
  equal(kindOf(kindOf(expressionOf("((x) => x + 1)(2)"), "callIndirect").callee, "lambda").kind, "lambda");

  // The legacy namespaces are untouched: a name followed by `(` is still the named call.
  equal(kindOf(expressionOf("castint(4.75)"), "call").name, "castint");
});

test("dot and arrow member access build the same nodes, and `this` reads a member", () => {
  const dot = kindOf(expressionOf("a.b.c(1)"), "methodCall");
  equal(dot.name, "c");
  equal(dot.receiver.kind, "member");

  equal(kindOf(expressionOf("a->b->c(1)"), "methodCall").name, "c");
  equal(kindOf(expressionOf("this.healAmount"), "member").name, "healamount");
});

test("`=>` does not change `>=` or the legacy operators", () => {
  const compare = kindOf(assignedValue("ok = a >= b"), "binary");
  equal(compare.operator, ">=");
  equal(kindOf(assignedValue("ok = (a == b)"), "binary").operator, "==");
});

test("lowers lambdas to deterministic function handles and dynamic calls to explicit IR", () => {
  const lambdaProgram = compileInline("f = (a) => a");
  deepEqual(lambdaProgram.ops.slice(0, 6), [
    { op: "load", name: "f", pos: { file: "<inline>", line: 1 } },
    { op: "load_fn", def: "<inline>#lambda_1", captures: [], pos: { file: "<inline>", line: 1 } },
    { op: "storeRef", pos: { file: "<inline>", line: 1 } },
    { op: "pop", pos: { file: "<inline>", line: 1 } },
    { op: "return", pos: { file: "<inline>", line: 1 } },
    { op: "load", name: "a", pos: { file: "<inline>", line: 1 } },
  ]);
  equal(lambdaProgram.functions["<inline>#lambda_1"]?.[0]?.params[0]?.name, "a");

  deepEqual(compileInline("f(1)(2)").ops, [
    { op: "push", value: 1, pos: { file: "<inline>", line: 1 } },
    { op: "call", name: "f", argc: 1, pos: { file: "<inline>", line: 1 } },
    { op: "push", value: 2, pos: { file: "<inline>", line: 1 } },
    { op: "call_indirect", argc: 1, pos: { file: "<inline>", line: 1 } },
    { op: "pop", pos: { file: "<inline>", line: 1 } },
    { op: "return", pos: { file: "<inline>", line: 1 } },
  ]);
});

test("dictionary literals remain a located refusal until object storage is implemented", () => {
  let thrown: ScriptError | undefined;
  try {
    compileInline("\n\nd = { k: 1 }");
  } catch (error) {
    thrown = error as ScriptError;
  }
  if (thrown === undefined) throw new Error("expected dictionary lowering refusal");
  equal(thrown.code, "syntax.unsupported");
  equal(thrown.pos?.line, 3);
});
