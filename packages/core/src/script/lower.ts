/**
 * Lowering: the Unified AST to the flat Step IR (ADR 0004 decision 1;
 * format-spec §9.15 THR-3).
 *
 * Each statement leaves its value on the operand stack and is followed by a
 * `pop`, because §9.4 makes every operator — assignment included — yield a
 * value. `store` therefore assigns from the top of the stack and leaves it in
 * place; the trailing `pop` discards it. A call statement is
 * `args…, call, pop`, so the value a resolved blocking call contributes is
 * pushed when the call wakes and is discarded by that same `pop`. The array
 * always ends with `return`.
 *
 * Format-spec §9.2/§9.3/§9.5/§9.15; docs/adr/0004 decision 1.
 */

import type { Ast, Expr } from "./ast.ts";
import type { StepOp } from "./ops.ts";

function lowerExpr(expr: Expr, ops: StepOp[]): void {
  switch (expr.kind) {
    case "literal":
      ops.push({ op: "push", value: expr.value });
      break;
    case "variable":
      ops.push({ op: "load", name: expr.name });
      break;
    case "call":
      for (const arg of expr.args) lowerExpr(arg, ops);
      ops.push({ op: "call", name: expr.name, argc: expr.args.length });
      break;
  }
}

/** Lower a parsed program to its Step IR array (ADR 0004 decision 1). */
export function lower(ast: Ast): StepOp[] {
  const ops: StepOp[] = [];
  for (const statement of ast.statements) {
    if (statement.kind === "assign") {
      lowerExpr(statement.value, ops);
      ops.push({ op: "store", name: statement.name });
    } else {
      for (const arg of statement.args) lowerExpr(arg, ops);
      ops.push({ op: "call", name: statement.name, argc: statement.args.length });
    }
    ops.push({ op: "pop" });
  }
  ops.push({ op: "return" });
  return ops;
}
