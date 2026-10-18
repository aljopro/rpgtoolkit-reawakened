---
type: discovery
title: "First-class functions readiness audit: epic-rpgcode-first-class-functions (epic 18)"
date: 2026-10-18
baseline_revision: f212728587894ad87ae94de67ae14e31cb444a36
status: audit; findings are facts with file:line, not rulings
---

# First-class functions and pure-RPGCode plugin readiness audit

What the repository already has, assumes, and enforces regarding functions, references, values, and command resolution in `packages/core/src/script/` and `docs/spec/engine/`.

| ID | Finding | Evidence | Blocks |
|---|---|---|---|
| F-01 | **Value union:** `Value` is currently defined as `number | string | ObjectValue | null`. Function references, handles, or closures do not exist in the type union. | `packages/core/src/ports/value.ts:33` | 18.1, 18.4 |
| F-02 | **Resolution pipeline:** Unqualified call resolution is hard-coded into four tiers in `resolveCall`: `file.`-qualified, `builtin` (Tier 2), `scriptFunction` (Tier 3), and `extension` (Tier 4). | `packages/core/src/script/registry.ts:74-88,159-186` | 18.1, 18.5 |
| F-03 | **Compiler lowering:** Function calls lower to `{ op: "call", name, argc }`, and method calls lower to `{ op: "methodCall", name, argc }`. There is no instruction to take a function address (`&fn`) or invoke through a dynamic register/variable. | `packages/core/src/script/lower.ts:156-168` | 18.2, 18.4 |
| F-04 | **Parser AST:** The grammar supports `&` only for by-reference parameters (`ParamSpec.byRef`) and by-reference returns (`return &lvalue`), not for taking the address of a function or method. | `docs/spec/engine/rpgcode-language.md:83-86`; `packages/core/src/script/parser.ts` | 18.2 |
| F-05 | **Guardrail G1 (Plain Data):** `GameState.vm` must remain strictly plain JSON serializable without native V8 closures or cyclic pointer graphs. Function handles must serialize as plain numeric or string IDs. | `docs/guardrails.md` G1; `packages/core/src/save/sections/vm.ts` | 18.1, 18.6 |
| F-06 | **Guardrail G3 (Determinism):** Dynamic invocations through function pointers must consume VM steps against `Thread.budget` and execute within the deterministic 60 Hz tick pipeline without wall-clock drift. | `docs/guardrails.md` G3; `packages/core/src/script/vm.ts:784-820` | 18.4, 18.6 |
| F-07 | **Legacy compatibility (R-35 & FUN-1):** 3.1 games rely on arity overloading and compile-time built-in binding. All legacy programs must continue to resolve identically if no function reassignments are made. | `docs/spec/engine/rpgcode-functions.md:10-12`; `docs/spec/engine/rpgcode-language.md:83` | 18.1, 18.7 |
| F-08 | **Redirects table:** Redirects currently exist as a special compile-time table in `state.vm.redirects`. With first-class function reassignments, `redirect(old, new)` can be lowered directly as a global variable assignment. | `docs/spec/engine/rpgcode-modules-and-objects.md:37-40`; `packages/core/src/script/registry.ts:75` | 18.1, 18.5 |
