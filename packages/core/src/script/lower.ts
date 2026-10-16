/**
 * Lowering: the Unified AST to the flat Step IR (ADR 0004 decision 1;
 * docs/spec/engine/rpgcode-errors-and-threads.md#threads THR-3).
 *
 * Emits a linear StepOp array whose every instruction carries an interned
 * `pos: SourcePos`. Top-level code is emitted from op 0, ending with `return`.
 * Function definitions are hoisted and emitted after top-level code.
 *
 * Each statement leaves exactly one value on the operand stack, and the caller
 * appends a `pop`. Control statements leave the unset value (`push 0`).
 *
 * docs/adr/0004 decision 1; docs/spec/engine/rpgcode-functions.md#rpgcode-built-in-commands.
 */

import type { Ast, Block, ClassDef, Expr, FunctionDef, MethodDef, Statement } from "./ast.ts";
import { ScriptError } from "./errors.ts";
import type { BinaryOp, SourcePos, StepOp } from "./ops.ts";

/** Parameter info retained on a compiled function for call resolution. */
export type ParamInfo = {
  readonly name: string;
  readonly byRef: boolean;
};

/** Metadata for one compiled function or method. */
export type FunctionInfo = {
  readonly entry: number;
  readonly end: number;
  readonly params: readonly ParamInfo[];
  readonly labels: { readonly [name: string]: number };
  readonly className?: string;
  readonly access?: "public" | "private";
};

export type CompiledClass = {
  readonly name: string;
  readonly bases: readonly string[];
  readonly members: ClassDef["members"];
  readonly methods: { readonly [name: string]: readonly FunctionInfo[] };
  readonly constructor: FunctionInfo | null;
  readonly destructor: FunctionInfo | null;
  readonly abstract: boolean;
};

/** Lowering result: instructions, hoisted function/class tables and top-level labels. */
export type LowerResult = {
  readonly ops: StepOp[];
  readonly functions: { readonly [name: string]: readonly FunctionInfo[] };
  readonly classes: { readonly [name: string]: CompiledClass };
  readonly labels: { readonly [name: string]: number };
};

/** Lower an AST to the flat Step IR array and function tables. */
export function lower(ast: Ast, file = "<inline>"): LowerResult {
  const classNames = new Set(ast.classes.map((item) => item.name));
  const ops: StepOp[] = [];
  const posCache = new Map<number, SourcePos>();

  function getPos(line: number): SourcePos {
    let p = posCache.get(line);
    if (!p) {
      p = Object.freeze({ file, line });
      posCache.set(line, p);
    }
    return p;
  }

  function emitJump(op: "jump" | "jumpIfFalse", target: number, line: number): number {
    const idx = ops.length;
    ops.push({ op, target, pos: getPos(line) });
    return idx;
  }

  function patchJump(idx: number, target: number): void {
    const existing = ops[idx]!;
    if (existing.op === "jump" || existing.op === "jumpIfFalse") {
      ops[idx] = { op: existing.op, target, pos: existing.pos };
    }
  }

  function lowerLvalue(target: Expr): void {
    if (target.kind === "variable") {
      if (target.scope) {
        ops.push({ op: "load", name: target.name, scope: target.scope, pos: getPos(target.line) });
      } else {
        ops.push({ op: "load", name: target.name, pos: getPos(target.line) });
      }
      return;
    }
    if (target.kind === "decl") {
      ops.push({ op: "declRef", scope: target.scope, name: target.name, pos: getPos(target.line) });
      return;
    }
    if (target.kind === "index") {
      lowerIndexBase(target.base);
      lowerExpr(target.index);
      ops.push({ op: "index", pos: getPos(target.line) });
      return;
    }
    if (target.kind === "member") {
      lowerExpr(target.receiver);
      ops.push({ op: "member", name: target.name, pos: getPos(target.line) });
      return;
    }
    if (target.kind === "call" || target.kind === "methodCall") {
      lowerExpr(target);
      return;
    }
    throw new ScriptError("syntax.error", "invalid assignment target", getPos(target.line));
  }

  function lowerIndexBase(base: Expr): void {
    if (base.kind === "variable") {
      ops.push({ op: "name", name: base.name, pos: getPos(base.line) });
    } else {
      lowerExpr(base);
    }
  }

  function lowerExpr(expr: Expr): void {
    switch (expr.kind) {
      case "literal":
        ops.push({ op: "push", value: expr.value, pos: getPos(expr.line) });
        break;
      case "variable":
        if (expr.scope) {
          ops.push({ op: "load", name: expr.name, scope: expr.scope, pos: getPos(expr.line) });
        } else {
          ops.push({ op: "load", name: expr.name, pos: getPos(expr.line) });
        }
        break;
      case "index":
        lowerIndexBase(expr.base);
        lowerExpr(expr.index);
        ops.push({ op: "index", pos: getPos(expr.line) });
        break;
      case "decl":
        ops.push({ op: "declRef", scope: expr.scope, name: expr.name, pos: getPos(expr.line) });
        break;
      case "labelRef":
        ops.push({ op: "push", value: expr.name, pos: getPos(expr.line) });
        break;
      case "call":
        for (const arg of expr.args) lowerExpr(arg);
        if (classNames.has(expr.name)) {
          ops.push({ op: "construct", className: expr.name, argc: expr.args.length, pos: getPos(expr.line) });
        } else {
          ops.push({ op: "call", name: expr.name, argc: expr.args.length, pos: getPos(expr.line) });
        }
        break;
      case "methodCall":
        lowerExpr(expr.receiver);
        for (const arg of expr.args) lowerExpr(arg);
        ops.push({ op: "methodCall", name: expr.name, argc: expr.args.length, pos: getPos(expr.line) });
        break;
      case "construct":
        for (const arg of expr.args) lowerExpr(arg);
        ops.push({ op: "construct", className: expr.className, argc: expr.args.length, pos: getPos(expr.line) });
        break;
      case "member":
        lowerExpr(expr.receiver);
        ops.push({ op: "member", name: expr.name, pos: getPos(expr.line) });
        break;
      case "unary":
        if (expr.operator === "++") {
          lowerLvalue(expr.operand);
          ops.push({ op: "dup", pos: getPos(expr.line) });
          ops.push({ op: "push", value: 1, pos: getPos(expr.line) });
          ops.push({ op: "binop", operator: "+", pos: getPos(expr.line) });
          ops.push({ op: "storeRef", pos: getPos(expr.line) });
        } else if (expr.operator === "--") {
          lowerLvalue(expr.operand);
          ops.push({ op: "dup", pos: getPos(expr.line) });
          ops.push({ op: "push", value: 1, pos: getPos(expr.line) });
          ops.push({ op: "binop", operator: "-", pos: getPos(expr.line) });
          ops.push({ op: "storeRef", pos: getPos(expr.line) });
        } else {
          lowerExpr(expr.operand);
          ops.push({ op: "unop", operator: expr.operator, pos: getPos(expr.line) });
        }
        break;
      case "postfix":
        if (expr.operator === "++") {
          lowerLvalue(expr.operand);
          ops.push({ op: "dup", pos: getPos(expr.line) });
          ops.push({ op: "dup", pos: getPos(expr.line) });
          ops.push({ op: "push", value: 1, pos: getPos(expr.line) });
          ops.push({ op: "binop", operator: "+", pos: getPos(expr.line) });
          ops.push({ op: "storeRef", pos: getPos(expr.line) });
          ops.push({ op: "pop", pos: getPos(expr.line) });
        } else {
          lowerLvalue(expr.operand);
          ops.push({ op: "dup", pos: getPos(expr.line) });
          ops.push({ op: "dup", pos: getPos(expr.line) });
          ops.push({ op: "push", value: 1, pos: getPos(expr.line) });
          ops.push({ op: "binop", operator: "-", pos: getPos(expr.line) });
          ops.push({ op: "storeRef", pos: getPos(expr.line) });
          ops.push({ op: "pop", pos: getPos(expr.line) });
        }
        break;
      case "binary":
        lowerExpr(expr.left);
        lowerExpr(expr.right);
        ops.push({ op: "binop", operator: expr.operator, pos: getPos(expr.line) });
        break;
      case "ternary":
        lowerExpr(expr.cond);
        lowerExpr(expr.then);
        lowerExpr(expr.else);
        ops.push({ op: "select", pos: getPos(expr.line) });
        break;
      case "assign":
        lowerLvalue(expr.target);
        if (expr.operator === "=") {
          lowerExpr(expr.value);
          ops.push({ op: "storeRef", pos: getPos(expr.line) });
        } else {
          lowerExpr(expr.value);
          ops.push({ op: "compound", operator: expr.operator, pos: getPos(expr.line) });
        }
        break;
    }
  }

  function lowerBlock(block: Block, currentLabels: { [name: string]: number }): void {
    for (const statement of block) {
      lowerStatement(statement, currentLabels);
      ops.push({ op: "pop", pos: getPos(statement.line) });
    }
  }

  function lowerStatement(stmt: Statement, currentLabels: { [name: string]: number }): void {
    switch (stmt.kind) {
      case "expr":
        lowerExpr(stmt.expr);
        break;
      case "if": {
        const jumpEnds: number[] = [];
        let nextBranchJump: number | null = null;

        for (let i = 0; i < stmt.branches.length; i++) {
          const branch = stmt.branches[i]!;
          if (nextBranchJump !== null) {
            patchJump(nextBranchJump, ops.length);
          }
          lowerExpr(branch.cond);
          nextBranchJump = emitJump("jumpIfFalse", 0, branch.line);
          lowerBlock(branch.body, currentLabels);
          jumpEnds.push(emitJump("jump", 0, branch.line));
        }

        if (nextBranchJump !== null) {
          patchJump(nextBranchJump, ops.length);
        }

        if (stmt.elseBody) {
          lowerBlock(stmt.elseBody, currentLabels);
        }

        const endTarget = ops.length;
        for (const j of jumpEnds) {
          patchJump(j, endTarget);
        }
        ops.push({ op: "push", value: 0, pos: getPos(stmt.line) });
        break;
      }
      case "while": {
        const top = ops.length;
        lowerExpr(stmt.cond);
        const jumpEnd = emitJump("jumpIfFalse", 0, stmt.line);
        lowerBlock(stmt.body, currentLabels);
        emitJump("jump", top, stmt.line);
        patchJump(jumpEnd, ops.length);
        ops.push({ op: "push", value: 0, pos: getPos(stmt.line) });
        break;
      }
      case "until": {
        const top = ops.length;
        lowerExpr(stmt.cond);
        ops.push({ op: "unop", operator: "!", pos: getPos(stmt.line) });
        const jumpEnd = emitJump("jumpIfFalse", 0, stmt.line);
        lowerBlock(stmt.body, currentLabels);
        emitJump("jump", top, stmt.line);
        patchJump(jumpEnd, ops.length);
        ops.push({ op: "push", value: 0, pos: getPos(stmt.line) });
        break;
      }
      case "for": {
        if (stmt.init) {
          lowerExpr(stmt.init);
          ops.push({ op: "pop", pos: getPos(stmt.line) });
        }
        const top = ops.length;
        let jumpEnd: number | null = null;
        if (stmt.cond) {
          lowerExpr(stmt.cond);
          jumpEnd = emitJump("jumpIfFalse", 0, stmt.line);
        }
        lowerBlock(stmt.body, currentLabels);
        if (stmt.step) {
          lowerExpr(stmt.step);
          ops.push({ op: "pop", pos: getPos(stmt.line) });
        }
        emitJump("jump", top, stmt.line);
        if (jumpEnd !== null) {
          patchJump(jumpEnd, ops.length);
        }
        ops.push({ op: "push", value: 0, pos: getPos(stmt.line) });
        break;
      }
      case "switch": {
        lowerExpr(stmt.value);
        const jumpEnds: number[] = [];

        for (const cs of stmt.cases) {
          ops.push({ op: "dup", pos: getPos(cs.line) });
          lowerExpr(cs.value);
          ops.push({ op: "binop", operator: "==", pos: getPos(cs.line) });
          const jumpNext = emitJump("jumpIfFalse", 0, cs.line);
          ops.push({ op: "pop", pos: getPos(cs.line) });
          lowerBlock(cs.body, currentLabels);
          jumpEnds.push(emitJump("jump", 0, cs.line));
          patchJump(jumpNext, ops.length);
        }

        // Pop the test value carried on stack
        ops.push({ op: "pop", pos: getPos(stmt.line) });

        if (stmt.defaultBody) {
          lowerBlock(stmt.defaultBody, currentLabels);
        }

        const endTarget = ops.length;
        for (const j of jumpEnds) {
          patchJump(j, endTarget);
        }
        ops.push({ op: "push", value: 0, pos: getPos(stmt.line) });
        break;
      }
      case "label":
        if (Object.hasOwn(currentLabels, stmt.name)) {
          throw new ScriptError(
            "compile.duplicate-label",
            `label \`:${stmt.name}\` is already defined in this scope`,
            getPos(stmt.line),
          );
        }
        currentLabels[stmt.name] = ops.length;
        ops.push({ op: "push", value: 0, pos: getPos(stmt.line) });
        break;
      case "return":
        if (stmt.byRef) {
          if (!stmt.value) {
            ops.push({ op: "push", value: 0, pos: getPos(stmt.line) });
          } else {
            lowerLvalue(stmt.value);
          }
        } else if (stmt.value) {
          lowerExpr(stmt.value);
        } else {
          ops.push({ op: "push", value: 0, pos: getPos(stmt.line) });
        }
        ops.push({ op: "return", pos: getPos(stmt.line) });
        break;
    }
  }

  // --- Top-level lowering ---
  const topLabels: { [name: string]: number } = {};
  for (const statement of ast.statements) {
    lowerStatement(statement, topLabels);
    ops.push({ op: "pop", pos: getPos(statement.line) });
  }
  const lastLine = ast.statements[ast.statements.length - 1]?.line ?? 1;
  ops.push({ op: "return", pos: getPos(lastLine) });

  // --- Hoisted function and class-method lowering ---
  const functions: { [name: string]: FunctionInfo[] } = {};
  const classes: { [name: string]: CompiledClass } = {};

  function lowerBody(body: Block, line: number): { entry: number; end: number; labels: { [name: string]: number } } {
    const entry = ops.length;
    const labels: { [name: string]: number } = {};
    for (const statement of body) {
      lowerStatement(statement, labels);
      ops.push({ op: "pop", pos: getPos(statement.line) });
    }
    const lastLine = body[body.length - 1]?.line ?? line;
    ops.push({ op: "return", pos: getPos(lastLine) });
    return { entry, end: ops.length, labels };
  }

  function infoFor(method: FunctionDef | MethodDef, className?: string): FunctionInfo {
    const access = "access" in method ? method.access : undefined;
    if (method.body === null) {
      const base = { entry: -1, end: -1, params: method.params.map((p) => ({ name: p.name, byRef: p.byRef })), labels: {} };
      if (className === undefined) return base;
      return access === undefined ? { ...base, className } : { ...base, className, access };
    }
    const lowered = lowerBody(method.body, method.line);
    const base = { ...lowered, params: method.params.map((p) => ({ name: p.name, byRef: p.byRef })) };
    if (className === undefined) return base;
    return access === undefined ? { ...base, className } : { ...base, className, access };
  }

  for (const fn of ast.functions) {
    const list = functions[fn.name] ?? [];
    if (list.some((existing) => existing.params.length === fn.params.length)) {
      throw new ScriptError("compile.duplicate-function", `function \`${fn.name}\` with ${fn.params.length} parameter(s) is already defined`, getPos(fn.line));
    }
    const info = infoFor(fn);
    functions[fn.name] = [...list, info];
  }

  for (const cls of ast.classes) {
    const methods: { [name: string]: FunctionInfo[] } = {};
    let constructor: FunctionInfo | null = null;
    let destructor: FunctionInfo | null = null;
    let abstract = false;
    for (const method of cls.methods) {
      if (method.isPure) abstract = true;
      const info = infoFor(method, cls.name);
      if (info.entry < 0) continue;
      const list = methods[method.name] ?? [];
      methods[method.name] = [...list, info];
      if (method.name === cls.name && method.params.length >= 0) constructor = info;
      if (method.name === `~${cls.name}` || method.name === `destructor`) destructor = info;
    }
    classes[cls.name] = { name: cls.name, bases: cls.bases, members: cls.members, methods, constructor, destructor, abstract };
  }

  return { ops, functions, classes, labels: topLabels };
}
