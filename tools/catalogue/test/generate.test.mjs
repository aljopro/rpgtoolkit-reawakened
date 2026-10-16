// The catalogue generator's notation parser and stub filter (ticket 3.21).
//
// The generator turns the discovery catalogue's `params` notation into
// `ParamSpec` lists and writes one stub per stub-safe name. This suite pins the
// parser against every distinct notation in the catalogue, the by-reference
// rules, and that the committed `catalogue-stubs.ts` is what the generator
// produces.
import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import { check, generate, parseParams, readCatalogue, stubParams, stubRows } from "../generate.mjs";

const catalogue = readCatalogue();
const rows = stubRows(catalogue);

/** The `ParamSpec` one token produces, for terser expectations. */
const spec = (name, optional, byRef, variadic = false) => ({ name, optional, byRef, variadic });

test("keeps exactly the stub-safe catalogue names", () => {
  equal(rows.length, 147);
  equal(new Set(rows.map((row) => row.name)).size, 147);
  const stubSafe = new Set(["pure", "state-write", "draw-audio-cue"]);
  ok(rows.every((row) => stubSafe.has(row.effectKind)));
  // The kinds entries 9, 13 and 22 own never leak in.
  ok(rows.every((row) => row.waitKind === null || row.effectKind !== "wait"));
});

test("parses every distinct catalogue notation into named boolean parameters", () => {
  const distinct = [...new Set(rows.map((row) => row.params))].sort();
  equal(distinct.length, 75);

  for (const notation of distinct) {
    const params = parseParams(notation);
    if (notation === "" || notation === "—") {
      equal(params.length, 0);
    } else if (notation === "...") {
      equal(params.length, 1);
      ok(params[0].variadic);
    } else {
      ok(params.length >= 1);
    }
    for (const param of params) {
      ok(param.name.length > 0, `empty name in ${JSON.stringify(notation)}`);
      ok(!/[&[\]%,/]/.test(param.name), `raw notation in name ${param.name}`);
      equal(typeof param.optional, "boolean");
      equal(typeof param.byRef, "boolean");
      equal(typeof param.variadic, "boolean");
    }
  }
});

test("reads optional groups, nesting, by-reference markers and variadics", () => {
  deepEqual(parseParams(""), []);
  deepEqual(parseParams("—"), []);
  deepEqual(parseParams("..."), [spec("args", true, false, true)]);

  deepEqual(parseParams("&r,&g,&b"), [spec("r", false, true), spec("g", false, true), spec("b", false, true)]);
  deepEqual(parseParams("x,y,s[,cnv]"), [
    spec("x", false, false),
    spec("y", false, false),
    spec("s", false, false),
    spec("cnv", true, false),
  ]);

  // A comma inside a bracket does not end the token, so `tile` after it is a
  // separate required parameter.
  deepEqual(parseParams("x,y,[layer,]tile"), [
    spec("x", false, false),
    spec("y", false, false),
    spec("layer", true, false),
    spec("tile", false, false),
  ]);
  deepEqual(parseParams("[bool[,push]]"), [spec("bool", true, false), spec("push", true, false)]);
  deepEqual(parseParams("[h,]&flag"), [spec("h", true, false), spec("flag", false, true)]);
  deepEqual(parseParams("x,y,&r,&g,&b[,cnv]"), [
    spec("x", false, false),
    spec("y", false, false),
    spec("r", false, true),
    spec("g", false, true),
    spec("b", false, true),
    spec("cnv", true, false),
  ]);
  deepEqual(parseParams("x,y,r[,a0,a1[,cnv]]"), [
    spec("x", false, false),
    spec("y", false, false),
    spec("r", false, false),
    spec("a0", true, false),
    spec("a1", true, false),
    spec("cnv", true, false),
  ]);
});

test("gives the three non-identifier catalogue tokens readable names", () => {
  deepEqual(parseParams("%").map((param) => param.name), ["percent"]);
  deepEqual(parseParams("0/1").map((param) => param.name), ["flag"]);
  deepEqual(parseParams("on/off").map((param) => param.name), ["state"]);
});

test("rejects a malformed notation rather than guessing", () => {
  for (const bad of ["[x,y", "x,y]", "a,...", "&"]) {
    let threw = false;
    try {
      parseParams(bad);
    } catch {
      threw = true;
    }
    ok(threw, `expected a throw for ${JSON.stringify(bad)}`);
  }
  // A trailing comma leaves an empty token, which is simply ignored.
  deepEqual(parseParams("x,y,"), [spec("x", false, false), spec("y", false, false)]);
});

test("marks the trailing output of a byRefOut getter that omits the &", () => {
  const row = (name) => catalogue.names.find((candidate) => candidate.name === name);
  deepEqual(stubParams(row("charAt")), [spec("s", false, false), spec("pos", false, false), spec("dest", false, true)]);
  deepEqual(stubParams(row("split")), [spec("str", false, false), spec("delim", false, false), spec("arr", false, true)]);
  deepEqual(stubParams(row("tileType")), [
    spec("x", false, false),
    spec("y", false, false),
    spec("type", false, false),
    spec("layer", true, true),
  ]);
  // A variadic byRefOut name cannot fix the output position, so it declares none.
  deepEqual(stubParams(row("boardGetVector")), [spec("args", true, false, true)]);
});

test("every byRefOut name declares byRef except the four variadic ones", () => {
  const byRefOut = rows.filter((row) => row.byRefOut);
  equal(byRefOut.length, 45);
  equal(byRefOut.filter((row) => row.params === "...").length, 4);
  equal(byRefOut.filter((row) => stubParams(row).some((param) => param.byRef)).length, 41);
});

test("generates one folded spec per name and the obsolete throw", () => {
  const source = generate(catalogue);
  const generated = [...source.matchAll(/^ {4}name: "([a-z][a-z0-9]*)",$/gm)].map((match) => match[1]);
  equal(generated.length, 147);
  equal(new Set(generated).size, 147);
  ok(generated.includes("mwincls"), "a mixed-case catalogue name is folded to its registry key");
  ok(source.includes("builtin.obsolete"), "the obsolete stub raises builtin.obsolete");
  equal((source.match(/obsolete: true/g) ?? []).length, 2);
  equal(generate(catalogue), source, "generation is deterministic");
});

test("the committed catalogue-stubs.ts is exactly what the generator produces", () => {
  deepEqual(check(), []);
});
