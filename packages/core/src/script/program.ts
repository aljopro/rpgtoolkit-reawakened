/**
 * Program references and compilation (AD-7; format-spec §9.14 follow-ups 5/6).
 *
 * `ProgramRef` is exactly AD-7's shape. Compiled code is held outside state and
 * rebuilt from the file or inline text on restore, so `Program` is the
 * compiled artefact and never enters `GameState`.
 *
 * docs/adr/0004 (decision 1's compiled-program cache); format-spec
 * §9.1/§9.2/§9.14.
 */

import { ScriptError } from "./errors.ts";
import { tokenize } from "./lex.ts";
import { lower, type FunctionInfo } from "./lower.ts";
import type { StepOp } from "./ops.ts";
import { parse } from "./parse.ts";

export type { FunctionInfo } from "./lower.ts";

/**
 * The compiler version, part of `GameState.schema` (AD-7, AD-23). A change
 * here is a schema bump and needs a previous-version fixture (AD-7's check).
 */
export const COMPILER_VERSION = "2";

/** How a program was supplied (AD-7). */
export type ProgramRef =
  | {
      readonly kind: "file";
      readonly path: string;
      readonly sourceHash: string;
      readonly compiler: string;
    }
  | { readonly kind: "inline"; readonly text: string; readonly compiler: string };

/** A compiled program: its reference, its Step IR, functions and labels. */
export type Program = {
  readonly ref: ProgramRef;
  readonly ops: StepOp[];
  readonly functions: { readonly [name: string]: readonly FunctionInfo[] };
  readonly labels: { readonly [name: string]: number };
};

/** Compile inline source text (format-spec §9.1 source programs). */
export function compileInline(text: string, file = "<inline>"): Program {
  const ast = parse(tokenize(text));
  const result = lower(ast, file);
  return {
    ref: { kind: "inline", text, compiler: COMPILER_VERSION },
    ops: result.ops,
    functions: result.functions,
    labels: result.labels,
  };
}

export function compileProgram(ref: ProgramRef): Program {
  if (ref.kind === "file") {
    throw new ScriptError(
      "program.file-unsupported",
      "a file program needs the loader; entry 8 loads `.prg` files",
    );
  }
  return compileInline(ref.text, "<inline>");
}
