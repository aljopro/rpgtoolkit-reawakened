/**
 * The Unified AST for RPGCode (ADR 0004 decision 1; docs/spec/formats/rpgcode-program.md#text-form.
 *
 * Covers expressions, statements, control flow, functions and parameter lists,
 * with source line numbers on every node.
 *
 * docs/adr/0004 decision 1; docs/spec/engine/rpgcode-functions.md#rpgcode-built-in-commands.
 */

import type { Value, VarScope } from "../ports/value.ts";
import type { BinaryOp, UnaryOp } from "./ops.ts";

/** One function parameter (docs/spec/engine/rpgcode-modules-and-objects.md#modules FUN-1). */
export type Param = {
  readonly name: string;
  readonly byRef: boolean;
  readonly typeName: string | null;
  readonly line: number;
};

/** An ordered statement block. */
export type Block = readonly Statement[];

/** One program-level function definition (FUN-1, FUN-6). */
export type FunctionDef = {
  readonly name: string;
  readonly params: readonly Param[];
  readonly body: Block;
  readonly isInline: boolean;
  readonly line: number;
};

export type AccessLevel = "public" | "private";

export type MemberDef = {
  readonly name: string;
  readonly arraySize: number | null;
  readonly access: AccessLevel;
  readonly line: number;
};

export type MethodDef = {
  readonly name: string;
  readonly params: readonly Param[];
  readonly body: Block | null;
  readonly isPure: boolean;
  readonly access: AccessLevel;
  readonly owner: string;
  readonly line: number;
};

export type ClassDef = {
  readonly name: string;
  readonly bases: readonly string[];
  readonly members: readonly MemberDef[];
  methods: MethodDef[];
  readonly isStruct: boolean;
  readonly line: number;
};

/** A value-producing or variable-reading expression (docs/spec/formats/rpgcode-program.md#text-form. */
export type Expr =
  | { readonly kind: "literal"; readonly value: Value; readonly line: number }
  | {
      readonly kind: "variable";
      readonly name: string;
      readonly scope: VarScope | null;
      readonly line: number;
    }
  | {
      readonly kind: "decl";
      readonly scope: VarScope;
      readonly name: string;
      readonly line: number;
    }
  | { readonly kind: "labelRef"; readonly name: string; readonly line: number }
  | {
      readonly kind: "call";
      readonly name: string;
      readonly args: readonly Expr[];
      readonly line: number;
    }
  | {
      readonly kind: "methodCall";
      readonly receiver: Expr;
      readonly name: string;
      readonly args: readonly Expr[];
      readonly line: number;
    }
  | {
      readonly kind: "member";
      readonly receiver: Expr;
      readonly name: string;
      readonly line: number;
    }
  | {
      readonly kind: "construct";
      readonly className: string;
      readonly args: readonly Expr[];
      readonly line: number;
    }
  | {
      readonly kind: "index";
      readonly base: Expr;
      readonly index: Expr;
      readonly line: number;
    }
  | {
      readonly kind: "unary";
      readonly operator: UnaryOp;
      readonly operand: Expr;
      readonly line: number;
    }
  | {
      readonly kind: "postfix";
      readonly operator: "++" | "--";
      readonly operand: Expr;
      readonly line: number;
    }
  | {
      readonly kind: "binary";
      readonly operator: BinaryOp;
      readonly left: Expr;
      readonly right: Expr;
      readonly line: number;
    }
  | {
      readonly kind: "ternary";
      readonly cond: Expr;
      readonly then: Expr;
      readonly else: Expr;
      readonly line: number;
    }
  | {
      readonly kind: "assign";
      readonly operator: string;
      readonly target: Expr;
      readonly value: Expr;
      readonly line: number;
    };

/** One branch of an if/elseif chain (STX-3). */
export type IfBranch = {
  readonly cond: Expr;
  readonly body: Block;
  readonly line: number;
};

/** One case in a switch statement (STX-2). */
export type SwitchCase = {
  readonly value: Expr;
  readonly body: Block;
  readonly line: number;
};

/** A statement (docs/spec/engine/rpgcode-modules-and-objects.md#modules). */
export type Statement =
  | {
      readonly kind: "expr";
      readonly expr: Expr;
      readonly line: number;
    }
  | {
      readonly kind: "if";
      readonly branches: readonly IfBranch[];
      readonly elseBody: Block | null;
      readonly line: number;
    }
  | {
      readonly kind: "while";
      readonly cond: Expr;
      readonly body: Block;
      readonly line: number;
    }
  | {
      readonly kind: "until";
      readonly cond: Expr;
      readonly body: Block;
      readonly line: number;
    }
  | {
      readonly kind: "for";
      readonly init: Expr | null;
      readonly cond: Expr | null;
      readonly step: Expr | null;
      readonly body: Block;
      readonly line: number;
    }
  | {
      readonly kind: "switch";
      readonly value: Expr;
      readonly cases: readonly SwitchCase[];
      readonly defaultBody: Block | null;
      readonly line: number;
    }
  | {
      readonly kind: "label";
      readonly name: string;
      readonly line: number;
    }
  | {
      readonly kind: "return";
      readonly value: Expr | null;
      readonly byRef: boolean;
      readonly line: number;
    };

/** A parsed program: statements, hoisted functions and class declarations. */
export type Ast = {
  readonly statements: Block;
  readonly functions: readonly FunctionDef[];
  readonly classes: readonly ClassDef[];
};
