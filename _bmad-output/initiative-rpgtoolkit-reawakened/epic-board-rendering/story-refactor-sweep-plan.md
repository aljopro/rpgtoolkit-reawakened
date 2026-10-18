---
ticket: 27
type: chore
status: done
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

Built on branch `feat/4-27`; gates and counts are in the PR description.

- `REAL_PACK_COMMANDS` now lists every name of the world, render, UI and graphics packs (verified by loading the four packs and diffing their names and aliases against the generated stubs; the one name the earlier list missed was the alias `restorescreenarray`). Regenerating removed 47 stubs that shadowed real pack commands (108 to 61 `COMMANDS` in the stub plugin; by-reference stubs 25 to 19; variadic stubs 13 to 0). `script-catalogue.test.ts` pins the no-shadow invariant against `WORLD_PLUGIN` and `RENDER_PLUGIN`.
- The catalogue layer (`CATALOGUE_PLUGIN`) used to reach the UI and render pack names only through their stubs. It now takes every `RENDER_PLUGIN` command it does not already own (documented through `documentCommands`, as the stubs were), so `verifyCatalogueCompleteness` and `command-docs:check` still resolve every name. Engine and golden paths load the packs directly and are unaffected.
- Removed unused `name` parameters from the `effect`/`effects` helpers in the world, UI and graphics packs (they were discarded with `void name`).
- Removed call-site-free `isZeroTint`, `captureScreen`, `BitmapFontMap`, and the dead `endanimation` special case in the stub generator.
- Corrected stale comments: `save/sections.ts` and `save/state.ts` (seven sections are real, seven remain placeholders) and `runner-harness/src/script-host.ts`.
- `earthquake` waits summary now names ticks, and `bordercolor` gets obsolete documentation; both were previously hidden behind stubs and the legacy allowlist, which no longer lists them.

## Proposed ruling (pending owner review)

**`bordercolor` stays functional and is documented as obsolete-but-kept.** The native table (`rpgcode-functions.md`) says it is obsolete and raises an error; the engine's `fx` handler (`render/fx.ts`) and the previous stub both record a border colour. A sweep adds no behaviour, so the code is unchanged and the doc says what the code does. Rejected: making it throw `builtin.obsolete`, which would orphan the `fx.borderColor` path and change behaviour. The spec-versus-code decision belongs to the owner.

**`mwinsize` through the catalogue layer now raises the obsolete error** (the real UI pack's behaviour) instead of recording a stub effect, because a stub may not shadow a pack. Rejected: keeping a stub for it, which violates the ticket requirement.

## Not touched

- Private `numberArg`/`stringArg`/`clamp`/`crc32` helpers: the copies differ in argument shape (`Arg[]` vs `EffectRecord`), truncation and fallback, so merging them risks behaviour changes. Tools `main`/`parseArguments` repeats are small CLI shells.
- `deferred-work.md`: no unresolved entry belongs to this epic.
