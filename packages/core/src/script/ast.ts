/**
 * The minimal Unified AST for the tracer's RPGCode subset (ADR 0004
 * decision 1's first layer; format-spec §9.3/§9.5).
 *
 * It carries the three statement forms and the three expression forms the
 * tracer's IN list needs. ADR 0004's full Unified AST — branches, loops,
 * functions, classes, members, indexing, operators — is entry 5/6's; the
 * frontend rejects those constructs by name before an AST node is built.
 *
 * Format-spec §9.2/§9.3/§9.5/§9.15; docs/adr/0004 decision 1 (three-tier
 * lowering).
 */

import type { Value } from "../ports/value.ts";

/** A value-producing expression (format-spec §9.3, §9.4). */
export type Expr =
  | { readonly kind: "literal"; readonly value: Value }
  | { readonly kind: "variable"; readonly name: string }
  | { readonly kind: "call"; readonly name: string; readonly args: readonly Expr[] };

/** A statement (format-spec §9.5). */
export type Statement =
  | { readonly kind: "assign"; readonly name: string; readonly value: Expr }
  | { readonly kind: "call"; readonly name: string; readonly args: readonly Expr[] };

/** A parsed program: an ordered statement list. */
export type Ast = { readonly statements: readonly Statement[] };
