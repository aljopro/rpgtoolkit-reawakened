---
title: 'Rulings: Function handles, address-of syntax, invocation, and environment table'
type: 'feature'
ticket: 1
created: '2026-10-18'
status: built
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'spec - docs/spec/engine/rpgcode-language.md (FUN-1, FUN-5, R-35)'
  - 'spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-7, AD-8'
  - 'idea - _bmad-output/initiative-rpgtoolkit-reawakened/nice-to-have.md, 'First-class function handles and pure-RPGCode plugin architecture''
---

## Intent
Rule the syntax, type system extension, and resolution semantics for first-class function callables, arrow lambdas, auto-bound methods, dictionary object foundations, and pure-RPGCode plugin middleware before implementing compiler and VM changes under G7 doc-first discipline.

## Boundaries
Documentation and specification amendments only. No TypeScript compiler or VM runtime code changes in this ticket.

## Key Decisions (Owner-Ruled 2026-10-18)

1. **Compatibility Target (D-01):** 100% backward compatibility to RPG Toolkit 3.1. Reawakened's prior internal AST, IR opcodes, or development save formats may be replaced cleanly without shims.
2. **Callable Representation (D-02, G1):** Callables are plain serializable data records:
   `{ type: 'callable', def: string, captures: string[], receiver: string | null }`.
   `def` is a deterministic static program ID (e.g., `main.prg#lambda_1`). `captures` are cell IDs for closure storage. `receiver` is an object ID for `this`, or `null`.
3. **Lambda Syntax (D-04):** Expression lambdas use arrow syntax: `(param1, param2) => { ... }` and `(x) => expr`. They are expressions producing callable values, distinct from top-level function/command declarations. Legacy variable assignments (`castint = 99`) do not clobber commands or functions.
4. **Auto-Bound Receivers & `bindThis` (D-08):**
   - Member access `obj.method` produces a callable with `receiver` auto-bound to `obj`. Detaching `fn = obj.method; fn()` preserves `this = obj`.
   - Standalone lambdas have `this = null`.
   - Rebinding is explicit via the built-in function `bindThis(fn, targetObj)`.
5. **Pure-RPGCode Plugin Middleware (D-11):**
   - Plugins register via `registerPlugin(pluginDefinition)`.
   - Command interceptors receive `(args..., next)`. Calling `next(...)` passes control to the next plugin in the chain or the native built-in.
   - Avoids global variable monkey-patching and maintains clean onion middleware composition.
6. **Unified Dictionary Foundation (D-02):** Dictionaries backed by environment cells serve as the single foundation for modern objects and compiled legacy classes.
7. **All-RPGCode Battle Engine & HUD:** Thorough screen-building and drawing primitives in RPGCode will allow the stock ATB battle system and custom HUDs to be authored 100% in pure RPGCode.

## Acceptance

1. `docs/spec/engine/rpgcode-language.md` documents arrow lambdas, callable value types, dynamic call syntax `expr(args)`, and `bindThis(fn, obj)`.
2. `docs/spec/engine/rpgcode-modules-and-objects.md` documents the dictionary/prototype model, auto-bound receiver semantics, and the `registerPlugin(def)` middleware onion pipeline.
3. `docs/adr/0004-script-ast-step-ir-and-plugins.md` amends the architecture decision record to reflect callable representation, serializable closures under G1, and the indirect call dispatch model.
4. All internal anchor links and citations resolve cleanly; no broken references.

## Verification

Specification review, markdown link/anchor check, and golden/licence/lint CI gates pass on the doc-only commit.
