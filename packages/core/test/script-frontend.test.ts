// The tracer's RPGCode frontend (format-spec §9.2/§9.3/§9.5/§9.12; ADR 0004
// decision 1): the tokenizer's subset, the construct rejections and the exact
// Step IR the tracer program lowers to.
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { compileInline, compileProgram, tokenize, type ScriptError } from "../src/index.ts";

function errorOf(run: () => unknown): { code: string; message: string } {
  try {
    run();
  } catch (error) {
    const scriptError = error as ScriptError;
    equal(typeof scriptError.code, "string");
    return { code: scriptError.code, message: scriptError.message };
  }
  throw new Error("expected the call to throw");
}

test("tokenizes case-folded identifiers with sigils stripped", () => {
  deepEqual(tokenize('Count! = 2 ; name$ = "hi"\nend'), [
    { kind: "identifier", name: "count" },
    { kind: "punct", text: "=" },
    { kind: "number", value: 2 },
    { kind: "end" },
    { kind: "identifier", name: "name" },
    { kind: "punct", text: "=" },
    { kind: "string", value: "hi" },
    { kind: "end" },
    { kind: "identifier", name: "end" },
    { kind: "eof" },
  ]);

  // `x!=1` is the operator (LEX-3); `x! = 1` keeps the sigil reading.
  equal(errorOf(() => tokenize("x!=1")).message.includes("entry 5"), true);
  deepEqual(tokenize("x! = true"), [
    { kind: "identifier", name: "x" },
    { kind: "punct", text: "=" },
    { kind: "number", value: 1 },
    { kind: "eof" },
  ]);

  // `$` followed by `=` is a sigil, only `!` followed by `=` is the operator.
  deepEqual(tokenize('name$="hi"'), [
    { kind: "identifier", name: "name" },
    { kind: "punct", text: "=" },
    { kind: "string", value: "hi" },
    { kind: "eof" },
  ]);
});

test("rejects every construct the subset excludes naming its entry", () => {
  const cases: readonly (readonly [string, string])[] = [
    ["x = 1 + 2", "entry 5"],
    ["x = a ~= b", "entry 5"],
    ["x = a ? b : c", "entry 5"],
    ["if (x) { y = 1 }", "entry 5"],
    ["while (x) { y = 1 }", "entry 5"],
    ["for (i = 0; i < 2; i = i + 1) { y = 1 }", "entry 5"],
    ["return 1", "entry 5"],
    ["function f() { }", "entry 5"],
    ["method C::C() { }", "entry 5"],
    ["class C { }", "entry 6"],
    ["x[0] = 1", "entry 5"],
    ["local(x) = 1", "entry 5"],
    ["global(x) = 1", "entry 5"],
    ["x = 1 /* comment */", "entry 5"],
    ["x = 1 _\ny = 2", "entry 5"],
    ['#include "other.prg"', "entry 8"],
    ['redirect("a", "b")', "entry 8"],
    ["a.b()", "entry 8"],
    ["@", "entry 15"],
  ];

  for (const [source, entry] of cases) {
    const error = errorOf(() => tokenize(source));
    equal(error.code, "syntax.unsupported", source);
    equal(error.message.includes(entry), true, `${source} -> ${error.message}`);
  }

  // An unknown character is a lexical error (LEX-11), not an unsupported construct.
  equal(errorOf(() => tokenize("x = 1 \\")).code, "syntax.error");
  equal(errorOf(() => tokenize('x = "unterminated')).code, "syntax.error");
});

test("lowers the tracer program to the exact op array", () => {
  const program = compileInline(
    'greeting = "hi"\ncount = 2\nsleep(count)\ncount = 3\nend()\n',
  );
  deepEqual(program.ref, {
    kind: "inline",
    text: 'greeting = "hi"\ncount = 2\nsleep(count)\ncount = 3\nend()\n',
    compiler: "1",
  });
  deepEqual(program.ops, [
    { op: "push", value: "hi" },
    { op: "store", name: "greeting" },
    { op: "pop" },
    { op: "push", value: 2 },
    { op: "store", name: "count" },
    { op: "pop" },
    { op: "load", name: "count" },
    { op: "call", name: "sleep", argc: 1 },
    { op: "pop" },
    { op: "push", value: 3 },
    { op: "store", name: "count" },
    { op: "pop" },
    { op: "call", name: "end", argc: 0 },
    { op: "pop" },
    { op: "return" },
  ]);

  // A file reference is refused until entry 8 loads files.
  equal(
    errorOf(() =>
      compileProgram({ kind: "file", path: "a.prg", sourceHash: "0", compiler: "1" }),
    ).code,
    "program.file-unsupported",
  );
});
