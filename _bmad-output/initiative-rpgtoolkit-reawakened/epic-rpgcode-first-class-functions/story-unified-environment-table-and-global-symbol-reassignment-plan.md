---
title: 'Unified environment table and global symbol reassignment'
type: 'feature'
ticket: 5
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'code - packages/core/src/script/registry.ts'
  - 'code - packages/core/src/script/builtins.ts'
---

## Intent
Collapse the 4-tier lookup pipeline into an environment table supporting dynamic interception.

## Boundaries
Script environment and symbol resolution. Does not alter save file persistence format (entry 6).

## Key Decisions (recorded doc-first, 2026-10-18; see `docs/spec/engine/rpgcode-language.md` FUN-8 and ADR 0004 decision 8)
1. **One environment table.** The `redirect`/`scriptFunction`/`builtin`/`extension` tier skeleton in `registry.ts` (two of whose tiers were stubs) becomes one table with one resolution function. A plain-name call resolves, first match wins: (1) the calling scope's own symbol when it holds a callable value; (2) a built-in command; (3) a script function of the program; (4) a plugin command. The VM's own commands (the module directives and `bindingOf`) are answered before the table.
2. **Not materialised.** The table's bottom layer is the assembled registry itself, not a copy of the ~300 built-in names in `vm` state: a name with no reassignment resolves through the registry directly and every save stays the shape it had. A reassignment lives in `vm.globals` (or a frame's locals) as an ordinary value, so no new state field and no section-version bump is needed; save validation of callable values stays entry 18.6's.
3. **Reassignment takes a callable only.** Assigning a callable to a name reassigns it for calls in that scope (interception). Assigning a non-callable never shadows (R-35 unchanged: `castint = 99` leaves `castint(4.75)` meaning the command), and reading a name is never the lookup (a read never yields a command). *Rejected:* a per-name binding stack in `vm.env` with the replaced binding appended as a `next` argument — a second storage beside the variable, an arity rule that sometimes appends, and `kill`/reads disagreeing with calls.
4. **Chaining: `bindingOf(name)`** (a VM-owned command) returns, as a callable value, the binding *below* the calling scope's symbols — a built-in, else a script function, else a plugin command — so a wrapper reaches the command it replaced. The name is a string (computed strings and parameters work) or a bare variable name. *Rejected:* reading the name (`old = mediaPlay`) — the unset global before the replacement, the wrapper itself after it; and a scope-aware "current binding" form, which a wrapper calling it from its own body would resolve to itself and recurse.
5. **A callable handle resolves in the same order** (engine command first, then the compiled definitions), so a handle always runs the binding it names.
6. **Shared cells for captured locals.** A captured local's cell *is* the local's storage: the frame's slot is redirected to the cell, so the creating frame and every closure that captured that name read and write one slot (an outer assignment after creation is visible inside; an inner assignment is visible outside; a later closure from the same frame captures the same cell). A by-reference parameter is captured by value instead, because its slot aliases the caller's variable.
7. **Legacy redirects stay parse-time.** `#redirect` keeps its run-wide `vm.redirects` table and its compile-time substitution; it is *not* lowered to an environment assignment (the plan's earlier sketch). Evidence: R-42..R-44 make the table run-wide and the substitution take effect in textual order on text parsed after the call, and `withRedirects` folds the table into every compiled `ProgramRef`; converting it to a run-time assignment would make 3.1 redirects depend on run-time scope state and would interact with `run()`/`tellThread` and with a restore's recompile.
8. **Object methods keep their place** (after the built-in, script-function and plugin lookups); the OOP-6 order the VM departs from is flagged for a fidelity follow-up rather than changed here.

## Acceptance
Custom wrappers can intercept, wrap, and chain to original engine commands cleanly.

## Verification
End-to-end symbol reassignment and legacy redirect compatibility tests.
