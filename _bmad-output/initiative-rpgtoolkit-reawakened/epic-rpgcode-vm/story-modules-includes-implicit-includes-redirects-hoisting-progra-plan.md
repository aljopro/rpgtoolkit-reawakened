---
title: 'Modules: includes, implicit includes, redirects, hoisting, program cache'
type: 'feature'
ticket: 8
created: '2026-10-16'
status: ready-for-dev
baseline_revision: 'c90dc52bc32cc12481b894cc8cbd0349e8443c50'
route: 'full'
route_source: 'pinned'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/spec/engine/rpgcode-modules-and-objects.md', '{project-root}/docs/spec/engine/rpgcode-functions.md', '{project-root}/docs/spec/engine/rpgcode-language.md', '{project-root}/docs/spec/formats/rpgcode-program.md', '{project-root}/packages/core/src/formats/resolver/resolver.ts', '{project-root}/packages/core/src/formats/resolver/model.ts']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The VM can compile inline programs but deliberately rejects file programs and all module syntax. `VmState.redirects` exists but is unused, the program memo cannot load source through the asset resolver, and call resolution only sees functions in the current file. Consequently included libraries, `Prg/` programs, redirects, and restore-safe program identity cannot run.

**Approach:** Add a pure source-loading seam over the completed 2.10 asset resolver, compile file programs with literal and runtime includes, preserve per-file hoisting and qualified binding, and make a source-hash/redirect-aware cache outside saveable state. Integrate redirects and module-qualified calls into the existing registry/VM call path, retaining the existing plugin command contract.

**Doc-first check:** `docs/spec/engine/rpgcode-modules-and-objects.md#modules` already rules MOD-2 and MOD-3. R-35 and R-41–R-44 are already recorded in `docs/spec/engine/rpgcode-functions.md` and the 3.27 plan; there is no unresolved module ruling to ask the owner.

## Boundaries & Constraints

**Always:** Follow G1–G3: source loading is injected data/ports, compiled programs and caches stay outside `VmState`, and all saved module metadata is plain JSON. Resolve `Prg/` names through `createAssetIndex`/`resolveAsset` with `AssetRoot`, reuse `decodeCp1252`/text line handling, fold paths and names with existing ASCII-fold helpers, and cite MOD-1..3, R-35, R-41..44, E-91 and §9.1. `#include` imports functions/classes without executing loose top-level code; literal includes are collected at file parse completion, runtime `include()` takes effect thereafter, repeated folded paths are one include, and an include cycle reports a located diagnostic instead of recursing. Built-in calls bind ahead of same-named script functions (R-35), while script-function overrides warn and are last-wins (R-41).

**Never:** Open or copy `../rpgtoolkit`; use host filesystem APIs or put bytes in save state; support the pre-compiled instruction format; change renderer, runner-headless, golden fixtures, or object dispatch across files; duplicate the asset path convention; alter the command middleware contract. Coordinate `vm.ts`/`state.ts` edits with 3.9 (threads, PR #103) and `plugin.ts`/`createScriptServices` edits with 3.25 (manifest, PR #104); do not overwrite their changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Literal include | `#include "Lib\Queue.prg"` before a call | File is resolved case-insensitively, parsed once, top-level code is not run, and `Lib.Queue` plus unqualified functions become visible after load | Missing load-time file is ignored; cycle is a located diagnostic |
| Implicit include | `Queue.AddLit(x)` | The folded file name is queued while loading and the qualified call reaches Queue's own definition before ordinary lookup | Missing runtime file is a catchable runtime error |
| Clash/hoisting | Two included files define `PopLit`; call appears before a definition | Definitions are hoisted per file; flat script list is last-added-wins with `command.overridden` logger/diagnostic; `file.func` bypasses the flat list | Wrong arity falls through to built-in/extension tiers |
| Redirect | `redirect("old", "new")`, then `old()`; later `killRedirect` | One folded substitution applies to call syntax, including built-ins; no chaining; state survives snapshot | Missing target follows normal unknown-call handling |
| Cache/refusal | Same source hash twice; bytes begin with `0x00` | Second compile reuses the cached Program; compiled `.prg` is refused with the §9.1 “re-save the source” message | Redirect/include-key mismatch recompiles; no binary parser is added |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/lex.ts`, `ast.ts`, `parse.ts`, `lower.ts` — replace entry-8 rejection with `#include`, `include`, redirect calls, dotted file-qualified call metadata, and module declarations while preserving existing line/source positions and function hoisting.
- `packages/core/src/script/program.ts` — extend `ProgramRef`/`Program` with ordered include metadata and compile-time redirect context; compile source files from injected bytes, reject first-byte `0x00`, and expose the cache key inputs.
- `packages/core/src/script/vm.ts` — replace the private memo with a `ProgramCache`/loader seam using `AssetIndex`, `AssetRoot`, and an injected byte provider; queue runtime includes, apply redirect state, and preserve thread/frame APIs from 3.9.
- `packages/core/src/script/registry.ts`, `state.ts`, `errors.ts`, `index.ts` — add redirect-first resolution, folded file-qualified lookup, `redirects` mutation helpers, module error codes, and exports without changing plugin layers.
- `packages/core/src/formats/resolver/{model,resolver}.ts` and `formats/binary/cp1252.ts` — consume the landed 2.10 `AssetIndex`/`AssetRoot`/`resolveAsset` contract and existing Windows-1252 decoder; do not edit these provider files.
- `packages/core/test/script-frontend.test.ts`, `script-registry.test.ts`, `script-state.test.ts`, new `script-modules.test.ts` — replace entry-8 rejection pins and cover cycles, visibility, clashes, redirects, cache hits, snapshot metadata, resolver paths and compiled refusal.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/core/src/script/{lex,ast,parse,lower}.ts` — represent directives and dotted calls, collect literal includes independent of control flow, and retain per-file function/class tables and source positions.
- [ ] `packages/core/src/script/program.ts` — add injected file-source loading, include expansion with cycle/repeat guards, source hashes, redirect-aware cache identity, and the `0x00` refusal; bump compiler/schema fixture coverage if persisted `ProgramRef` changes.
- [ ] `packages/core/src/script/{vm,registry,state,errors,index}.ts` — wire runtime include and redirect commands, flat-list last-wins diagnostics, qualified resolution, and save/restore of redirects while preserving 3.9 and 3.25 seams.
- [ ] `packages/core/test/script-modules.test.ts` plus existing script tests — assert every matrix case and snapshot/restore determinism; keep plugin and object behavior unchanged.

**Acceptance Criteria:**
- Given a source file with a literal include, when compiled, then included definitions are hoisted/visible without executing included top-level statements, and repeated folded paths add once.
- Given an include cycle, when loading, then compilation terminates with a located cycle diagnostic rather than recursion or a hang.
- Given `file.func(args)`, when compiled and run, then the file is resolved through `Prg/`, its own matching function wins, and its included functions are available to later ordinary calls.
- Given two same-arity script definitions added in order, when the latter is loaded, then it wins and emits the required located `command.overridden` warning; a built-in name remains compile-bound to the built-in with a shadow warning.
- Given redirects and a snapshot, when calls run before and after restore, then folded one-hop substitution, kill operations, and the `redirects` state produce identical results and hashes.
- Given identical source hash/cache inputs, when compilation is requested twice, then parsing occurs once; given first byte `0x00`, then loading fails with the section 9.1 refusal and no binary parser runs.
- Given the full required gates, when run, then typecheck, tests, lint, graph, provenance, licence and golden pass with no golden edits.

## Implementation Notes

## Plan Change Log

## Design Notes

`ProgramRef` is saveable metadata, while `Program` and the cache are rebuilt outside state. The cache key must include source hash, compiler version, ordered runtime include list, and the redirect table in force at compilation (the open questions named by the language page). Runtime include and redirect mutations therefore trigger a fresh compiled record rather than mutating already-bound call sites. The 3.9 branch owns thread scheduling and 3.25 owns manifest/plugin selection; this ticket consumes their stable APIs and should land module-specific helpers in separate files where possible to reduce `vm.ts` conflict.

## Verification

**Commands:**
- `node --test packages/core/test/script-frontend.test.ts packages/core/test/script-registry.test.ts packages/core/test/script-state.test.ts packages/core/test/script-modules.test.ts` — expected: all module and existing contract tests pass, none skipped.
- `pnpm typecheck && pnpm test && pnpm lint && pnpm graph && pnpm provenance && pnpm licence && pnpm golden` — expected: all gates pass; no golden or unrelated package changes.

**Manual checks:**
- Compare every include/redirect behavior against `docs/spec/engine/rpgcode-modules-and-objects.md#modules`, R-35 and R-41–R-44; inspect the diff to confirm only the plan is changed before implementation.
