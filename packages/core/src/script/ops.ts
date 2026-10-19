/**
 * The Step IR: the flat, linear instruction array the VM steps through
 * (ADR 0004 decision 1; docs/spec/engine/rpgcode-errors-and-threads.md#threads THR-3).
 *
 * Each variant carries `pos: SourcePos` ({ file, line }), the single owner
 * of the bytecode-to-source mapping.
 *
 * docs/adr/0004 decision 1; docs/spec/engine/rpgcode-functions.md#rpgcode-built-in-commands.
 */

import type { Value, VarScope } from "../ports/value.ts";

/** Source position attached to every Step IR instruction (R-38a, E-98). */
export type SourcePos = { readonly file: string; readonly line: number };

/** The unary operator vocabulary (EXP-2 level 2, prefix ++/--). */
export type UnaryOp = "-" | "+" | "!" | "~" | "++" | "--";

/** The binary operator vocabulary (EXP-2 levels 3 to 13). */
export type BinaryOp =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "^"
  | "<<"
  | ">>"
  | "<"
  | "<="
  | ">"
  | ">="
  | "=="
  | "~="
  | "!="
  | "&"
  | "`"
  | "|"
  | "&&"
  | "||";

/** One VM instruction (ADR 0004 decision 1). */
export type StepOp =
  | { readonly op: "push"; readonly value: Value; readonly pos: SourcePos }
  | { readonly op: "name"; readonly name: string; readonly pos: SourcePos }
  | {
      readonly op: "load";
      readonly name: string;
      readonly scope?: VarScope;
      readonly pos: SourcePos;
    }
  | {
      readonly op: "declRef";
      readonly scope: VarScope;
      readonly name: string;
      readonly pos: SourcePos;
    }
  | { readonly op: "storeRef"; readonly pos: SourcePos }
  | { readonly op: "index"; readonly pos: SourcePos }
  | { readonly op: "member"; readonly name: string; readonly pos: SourcePos }
  /**
   * Make an empty dictionary object in the handle table and push its handle
   * (OOP-10, entry 19.3). A dictionary literal is this op, then one value
   * expression and one `initMember` per entry, in the order written.
   */
  | { readonly op: "newObject"; readonly pos: SourcePos }
  /**
   * Pop a value and write it as member `key` of the dictionary below it on the
   * stack, which stays there (OOP-10). A repeated key keeps the last value.
   */
  | { readonly op: "initMember"; readonly key: string; readonly pos: SourcePos }
  /**
   * Load a statically identified callable definition. `def` is a stable definition ID
   * (for example `<inline>#lambda_1`) and captures are plain environment-cell IDs.
   *
   * The VM owns resolving the definition; keeping this as an instruction rather than
   * embedding a closure preserves G1's plain-data state boundary.
   */
  | {
      readonly op: "load_fn";
      readonly def: string;
      readonly captures: readonly string[];
      readonly pos: SourcePos;
    }
  | {
      /** Invoke the callable below the top `argc` stack values (callee pushed first, then arguments). */
      readonly op: "call_indirect";
      readonly argc: number;
      readonly pos: SourcePos;
    }
  | {
      readonly op: "methodCall";
      readonly name: string;
      readonly argc: number;
      readonly pos: SourcePos;
    }
  | {
      readonly op: "construct";
      readonly className: string;
      readonly argc: number;
      readonly pos: SourcePos;
    }
  | { readonly op: "compound"; readonly operator: string; readonly pos: SourcePos }
  | { readonly op: "dup"; readonly pos: SourcePos }
  | { readonly op: "pop"; readonly pos: SourcePos }
  | { readonly op: "unop"; readonly operator: UnaryOp; readonly pos: SourcePos }
  | { readonly op: "binop"; readonly operator: BinaryOp; readonly pos: SourcePos }
  | { readonly op: "select"; readonly pos: SourcePos }
  | { readonly op: "jump"; readonly target: number; readonly pos: SourcePos }
  | { readonly op: "jumpIfFalse"; readonly target: number; readonly pos: SourcePos }
  | {
      readonly op: "call";
      readonly name: string;
      readonly argc: number;
      /** The folded file name of a `file.func(...)` call site (MOD-2); a restore reproduces the binding from it. */
      readonly file?: string;
      readonly pos: SourcePos;
    }
  | { readonly op: "return"; readonly pos: SourcePos };
