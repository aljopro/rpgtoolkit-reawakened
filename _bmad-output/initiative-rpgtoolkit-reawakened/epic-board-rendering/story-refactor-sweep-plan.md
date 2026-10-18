---
ticket: 27
type: chore
status: built
---
# Refactor sweep

## Intent

Remove dead weight and stale ownership scaffolding left by the board-rendering epic without changing engine behaviour, serialized state, draw ordering, hashes, or oracle images. Keep the public script-pack seams stable while making the catalogue generator prove that generated stubs do not claim commands owned by first-party packs.

## Scope and constraints

- Scope is the epic-created code under `packages/core/src/{engine,render,raster,world,save,script,formats/font}`, the runner harness/headless packages, and the catalogue/command-docs/font/golden tooling named by ticket 4.27.
- Preserve G1–G7, all public exports used by callers, and the existing golden/hash/oracle vectors. This is cleanup only; no new command semantics, renderer ordering, or state fields.
- Reconcile the catalogue filter with every command exposed by the board-rendering packs, regenerate the checked-in stubs, and update only assertions whose counts change because real commands are no longer generated as stubs.
- Remove unused helper parameters and stale historical comments that claim the epic is still a skeleton or that future owners have not landed. Keep intentional test doubles and compatibility fallbacks documented rather than deleting them.
- Review the global deferred-work ledger for entries sourced by epic board-rendering; baseline inventory contains no unresolved board-specific item, so no unrelated deferred item will be rewritten.

## Code map

- `packages/core/src/script/packs/{world,ui,graphics}.ts`: command-effect helpers currently accept a command name they never read.
- `tools/catalogue/generate.mjs`: `REAL_PACK_COMMANDS` is an incomplete shadow-prevention list; generated stubs still contain names implemented by the UI/graphics/render packs.
- `packages/core/src/save/{sections,state}.ts` and `packages/core/src/script/{builtins,registry,plugin,catalogue-responders}.ts`: stale entry/placeholder wording after the epic landed.
- `packages/runner-harness/src/script-host.ts`: clarify why the legacy script fixture host remains alongside the real engine golden path.
- Generated `packages/core/src/script/catalogue-stubs.ts` and focused catalogue tests: regenerate and pin the no-shadow invariant.

## Acceptance

1. No generated catalogue stub has a name or alias owned by a board-rendering pack; `catalogue:check` and the focused catalogue tests enforce this.
2. Unused helper arguments and stale “skeleton/placeholder/future owner” comments are removed or rewritten without changing runtime results.
3. Intentional compatibility fallbacks and test doubles remain present and are accurately described.
4. All required repository gates pass: install, fixture fetch, typecheck, lint, strict tests, Node/Bun goldens, graph, licence, provenance, catalogue, command docs, and oracle checks.
5. `golden/` and `tools/fixtures/conformance/` have no diff, and no hash-vector or oracle PNG changes occur.

## Implementation notes

Pending implementation and gate evidence.
