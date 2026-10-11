---
title: 'Main game file (.gam) reader and project layout'
type: 'chore'
ticket: '9'
created: '2026-10-11'
status: 'done'
baseline_revision: 'edf9d3840b748d6cd587c0a12ac406db139f0fa1'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Every game needs a main file — the engine cannot boot without it (§1.5) — and it is the only place that names the project folder, the startup program and board, the window settings and the active plugins. There is no reader for it, and no way to turn a stored reference into the path it resolves to under `Game/<projectPath>/`.

**Approach:** Add `packages/core/src/formats/main-file/` implementing format-spec §2: the 43-row `RPGTLKIT MAIN` table read across minors 0–9, honouring all twelve version-dependent rows, with a writer that reproduces the input bytes exactly (AD-18). Add §1.5 layout resolution as a pure function that pairs a main-file model with the game root and returns project-folder paths and per-type subfolder paths/keys, without touching a file system.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no imports of other packages. Determinism (G3): only the allowlisted `Math` members, no `**`, no `Date`/`performance`/`Intl`/`Math.random`. Every implementing file names its `docs/format-spec.md` section (G7). One public entry per package (AD-22). `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. Readers return `Result` and never throw (AD-18); a `FormatError` carries the failing field's byte offset and the citing section.

**Never:** add a runtime dependency, touch the legacy GPL source, edit `golden/**`, or touch the file system from the layout resolver.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/main-file/model.ts` — the `MainFile` model and constants, the residue type, and the minor-8 `gameSpeed` bias helpers (`decodeGameSpeed`/`encodeGameSpeed`) — §2.
- [x] `packages/core/src/formats/main-file/reader.ts` — `readMainFile(reader) -> Result<MainFile>`: the header and version checks, the 43-row table in order, all twelve version-dependent rows, the registration quirk read the way the editor writes it, and the reserved runs kept as residue — §2.
- [x] `packages/core/src/formats/main-file/writer.ts` — `writeMainFile(model) -> Result<Uint8Array>` reproducing the reader's input byte-for-byte for every minor 0–9 — §2, AD-18.
- [x] `packages/core/src/formats/main-file/layout.ts` — §1.5 project layout: `projectFolder`, `resolveReference`, `typeFolder`, `stripTypeFolder`, `toSlashes`, `foldPath`, the `AssetKind`/`ASSET_FOLDERS` table.
- [x] `packages/core/src/formats/main-file/index.ts`, `packages/core/src/formats/index.ts` — re-exports.
- [x] `packages/core/test/format-main-file.test.ts` — synthetic fixtures for minors 0–9 covering every conditional row, the registration-quirk offsets, the layout rules and the located errors.

**The twelve version-dependent rows (§2 checklist, in the order §2 lists them):**
1. `minor < 3`: row 10, reserved `i32` (old parallax value).
2. `minor ≥ 3`: row 21, `str menuPlugin, str fightPlugin`; `minor < 3`: reserved `i32`.
3. `minor ≤ 2`: row 22, reserved `i32, i16` (multitask speed and memory protection).
4. `minor < 3`: row 29, reserved `i16` (old fight style), after `customFightPrg`.
5. `minor ≤ 2`: row 33, plugin entries as `i16 enabled` rather than `str pluginFile`.
6. `minor ≥ 3`: row 37, `cursorMoveSound, cursorSelectSound, cursorCancelSound, useJoystick, colorDepth`.
7. `minor ≥ 4`: row 38, `gameSpeed, pixelMovement`.
8. `minor = 5`: row 39, `cursorEnabled`.
9. `minor ≥ 6`: row 40, `mouseCursor, hotSpotX, hotSpotY, transparent`.
10. `minor ≥ 7`: row 41, `resX, resY`.
11. `minor ≥ 8`: row 42, `showFpsInTitle`.
12. `minor ≥ 9`: row 43, `pathfindHeuristic, drawVectorsFlags, pathColor, movementControls, 8 × movementScanCode`.

**Acceptance Criteria:**
- Synthetic `.gam` fixtures across minors 0–9 parse every field at its documented width and in order; each conditional row is present exactly at the minors §2 gives it and absent elsewhere.
- `gameSpeed` decodes correctly on both sides of the minor-8 rule, including a negative speed.
- `fightingDisabled` is read as the inverted flag §2 documents (0 = fighting enabled).
- The registration quirk lands at the offset §2 names, and the editor's `i16`-then-`str` shape round-trips.
- Every minor writes back byte-for-byte with `reader.remaining === 0`.
- Layout resolution produces `<root>/Game/<projectPath>/<TypeFolder>/<reference>`, treats `\` and `/` as equal, folds case for lookup and strips a leading type-folder prefix.
- Wrong magic, a negative version, a minor above 9, a truncated file and an empty/garbage buffer are located `FormatError`s.

## Implementation Notes

- **The registration quirk (rows 3–4).** The editor writes an `i16` flag then the `"NOCODE"` string; the legacy C++ reader read an `i32` then a `str`, eating two bytes of `"NOCODE\0"` and reading the rest as `"CODE"`. Both land at `projectPath` (offset 0x1B). The reader follows the editor's shape so the write round-trips; the quirk is named in `model.ts` and `reader.ts`, and a test walks both shapes to the same offset.
- **Residue (AD-18).** The four reserved runs (`parallax`, `menuPluginFallback`, `multitask`, `fightStyle`) are kept as raw `Uint8Array` bytes rather than parsed numbers, because they are unmodelled for the minor that wrote them; the writer re-emits them verbatim. This is what makes the round-trip byte-identical.
- **`gameSpeed` bias.** At `minor ≥ 8` the stored byte is `speed + 128` (range −4…+4); below 8 it is the raw speed. `decodeGameSpeed`/`encodeGameSpeed` hold the rule in one place so the reader, the writer and the tests cannot drift.
- **Inverted flag.** `fightingDisabled` is kept as stored (0 = enabled, non-zero = disabled, the legacy `-1` included), so a `-1` round-trips.
- **Version checks.** The magic mismatch is reported at offset 0; a negative major at 14; a minor outside 0–9 (or negative) at 16. Primitive EOFs keep their §1.1 section from `BinaryReader`.
- **Empty-program entries.** The ext-key and enemy lists keep every entry, including empty ones, so the upper bound and byte layout round-trip; §2's "skip entries with an empty program" is a runtime rule, noted in a comment.
- **Layout is pure.** `projectFolder`/`resolveReference` take the root as a string and return path strings; `foldPath` gives the case-insensitive key the resolver ticket (2.10) will index on. No file system access.
- **No sample `.gam`.** The fixture fetch copies only `Build/game/<game>`, so the corpus ships no `Main/*.gam`. The layout is pinned entirely by synthetic fixtures; the fixture test is guarded to skip when no `.gam` is present.

## Plan Change Log

## Review Triage Log

## Design Notes

- No new dependency: `Uint8Array`/`DataView` through the existing `BinaryReader`/`BinaryWriter`.
- The plugin list carries both `enabled` and `pluginFile` on each entry and the writer emits the one the file's minor stores, so an entry cannot be written at the wrong width.

## Verification

**Commands (all in the worktree, baseline `edf9d38`):**
- `pnpm install --frozen-lockfile` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 196 tests pass, 0 fail (29 of them in `format-main-file.test.ts`).
- `pnpm lint` — exit 0; `check-core-deps: 1 core runtime dependency matches the allowlist`, eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (89 modules, 243 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 176 files`, `0 violations`.
- `uv run _bmad/method/scripts/tickets.py --project-root . status` — exit 0, entry 2.9 shown as done.
