/**
 * The compiled-program cache (ADR 0004 decision 1; docs/spec/engine/rpgcode-modules-and-objects.md MOD-3, R-42).
 *
 * A `Program` is rebuilt from its `ProgramRef` and kept here, outside saved
 * state. The key is the ref's identity: its source (the text, or the file path
 * and source hash), the compiler version, the ordered run-time include list and
 * the redirect table in force when it was compiled. The same key is the same
 * compile, so a second request parses nothing; a changed include list or
 * redirect table is a different key and compiles afresh instead of mutating
 * call sites that are already bound.
 */

import { compileProgram, programKey, type CompileContext, type Program, type ProgramNotice, type ProgramRef } from "./program.ts";

/** Compiled programs by ref identity. */
export type ProgramCache = {
  /** The compiled program of `ref`, compiling it on first request. */
  get(ref: ProgramRef): Program;
  /** How many compiles this cache has run (tests and diagnostics). */
  readonly compiles: number;
};

/**
 * Build a cache over `context`. `report` receives the notices of each compile
 * exactly once, when the compile happens, so a clash or cycle is raised once
 * however many threads share the program.
 */
export function createProgramCache(
  context: CompileContext,
  report: (notices: readonly ProgramNotice[]) => void = () => {},
): ProgramCache {
  const programs = new Map<string, Program>();
  let compiles = 0;
  return {
    get(ref) {
      const key = programKey(ref);
      const hit = programs.get(key);
      if (hit !== undefined) return hit;
      const compiled = compileProgram(ref, context);
      compiles += 1;
      programs.set(key, compiled);
      if (compiled.notices.length > 0) report(compiled.notices);
      return compiled;
    },
    get compiles() {
      return compiles;
    },
  };
}
