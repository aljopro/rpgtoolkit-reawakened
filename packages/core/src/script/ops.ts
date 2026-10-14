/**
 * The Step IR: the flat, linear instruction array the VM steps through
 * (ADR 0004 decision 1; format-spec §9.15 THR-3).
 *
 * The tracer's lowering emits six ops. `push`, `call` and `return` map to
 * ADR 0004 decision 1's `OP_PUSH`/`OP_CALL`/`OP_RETURN`; `load`, `store` and
 * `pop` are this entry's additions for variable access and for discarding a
 * statement-position value. Each op is exactly one VM step in §9.15 (THR-3)'s
 * sense, so `STEP_BUDGET` counts `StepOp` executions. Entry 5 extends the union
 * with control flow (`jump`) and the full expression grammar; a blocking call
 * *is* the yield (AD-8 makes yielding a call outcome, not an opcode), so there
 * is no `yield` op.
 *
 * Format-spec §9.2/§9.3/§9.5/§9.15; docs/adr/0004 decision 1.
 */

import type { Value } from "../ports/value.ts";

/** One VM instruction (ADR 0004 decision 1; see the file header). */
export type StepOp =
  | { readonly op: "push"; readonly value: Value }
  | { readonly op: "load"; readonly name: string }
  | { readonly op: "store"; readonly name: string }
  | { readonly op: "call"; readonly name: string; readonly argc: number }
  | { readonly op: "pop" }
  | { readonly op: "return" };
