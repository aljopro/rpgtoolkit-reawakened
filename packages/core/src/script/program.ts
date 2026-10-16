/**
 * Program references and compilation (AD-7; docs/spec/engine/rpgcode-language.md#open-questions follow-ups 5/6).
 *
 * `ProgramRef` is exactly AD-7's shape. Compiled code is held outside state and
 * rebuilt from the file or inline text on restore, so `Program` is the
 * compiled artefact and never enters `GameState`.
 *
 * docs/adr/0004 (decision 1's compiled-program cache); docs/spec/formats/rpgcode-program.md#compiled-form and docs/spec/engine/rpgcode-language.md#lexical-rules / docs/spec/engine/rpgcode-functions.md.
 */

import { ScriptError } from "./errors.ts";
import { tokenizeObjects } from "./lex.ts";
import { lower, type CompiledClass, type FunctionInfo } from "./lower.ts";
import type { StepOp } from "./ops.ts";
import { parse } from "./parse.ts";

export type { CompiledClass, FunctionInfo } from "./lower.ts";


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

/** A compiled program: its reference, Step IR, functions, classes and labels. */
export type Program = {
  readonly ref: ProgramRef;
  readonly ops: StepOp[];
  readonly functions: { readonly [name: string]: readonly FunctionInfo[] };
  readonly classes: { readonly [name: string]: CompiledClass };
  readonly labels: { readonly [name: string]: number };
};

/** Compile inline source text (docs/spec/engine/rpgcode-language.md#threads, a thread given text instead of a file). */
export function compileInline(text: string, file = "<inline>"): Program {
  const ast = parse(tokenizeObjects(text));
  const result = lower(ast, file);
  return {
    ref: { kind: "inline", text, compiler: COMPILER_VERSION },
    ops: result.ops,
    functions: result.functions,
    classes: result.classes,
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
