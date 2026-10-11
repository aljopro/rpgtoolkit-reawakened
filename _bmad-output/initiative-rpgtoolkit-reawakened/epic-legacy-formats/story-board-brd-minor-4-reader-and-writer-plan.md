---
title: 'Board (.brd) minor 4 reader and writer'
type: 'chore'
ticket: '5'
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

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** A board is the scene container of a Toolkit game — a 3-D grid of tiles beside images, collision and trigger geometry, sprites, lighting and per-board settings. Nothing reads the 3.1.0 vector layout (`RPGTLKIT BOARD`, minor ≥ 4) yet, so the headless runner has no boards to load. The layout is the densest in the corpus: a lookup table, a run-length tile matrix whose runs wrap rows and layers, run-length shading, lights, four kinds of vector geometry, program regions, sprite slots, then the trailing board properties.

**Approach:** Add `packages/core/src/formats/board/` on the ticket-2.1 `Result`/`FormatError` contract (AD-18) and `BinaryReader`/`BinaryWriter` (§1). `readBoard(reader)` applies the §4.1 dispatch exactly: a non-zero byte at offset 14 is the 2.x text form and is refused; minors 0–1 are refused as obsolete; minors 2–3 are refused with a pointer at the pre-vector layout of §4.8 (ticket 2.8 converts it, not this reader); minor ≥ 4 reads the §4.2 fields in the documented order. `writeBoard(model)` re-emits the version that was read and reproduces the bytes exactly.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no other workspace package. Determinism (G3): only the allowlisted `Math` members, no `**`, no `Date`/`performance`/`Intl`/`Math.random`; the module needs no maths at all. Every file names its `docs/format-spec.md` section (G7). One public entry per package (AD-22). `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. Every slot — empty strings included — is kept so LUT, program and sprite indices stay stable (§4.2). Unmodelled bytes stay in `residue` so a write is byte-identical (AD-18).

**Never:** convert the pre-vector layout here (ticket 2.8), add a runtime dependency, touch the legacy GPL source, edit `golden/**`, or drop empty slots to "tidy" the model.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/board/model.ts` — `Board` and its section types (`BoardTileRun`, `BoardShadeLayer`/`BoardShadeRecord`, `BoardLight`, `BoardVector`, `BoardProgram`, `BoardSprite`, `BoardImage`, `BoardLinks`, `BoardProperties`, `BoardRgb`), the magic/detect-offset/vector-minor constants, and `boardGrid(sizeX, sizeY, coordType)` giving the §4.2/§5 stored grid (`(sizeX + sizeY)²` when the `ISO_ROTATED` bit is set).
- [x] `packages/core/src/formats/board/reader.ts` — `readBoard(reader)`: §4.1 dispatch, then §4.2 in order — dimensions, LUT, run-length tile matrix (decompressed to one LUT index per cell, with the stored runs kept), shading layers, lights, vectors, programs, sprites, images, threads, constants, layer titles, the four links (N, S, E, W) and the trailing properties; trailing bytes become `residue`.
- [x] `packages/core/src/formats/board/writer.ts` — `writeBoard(model)` deriving every bound back from the model's arrays and re-emitting each field in the same order, so an unmodified board writes back byte-for-byte.
- [x] `packages/core/src/formats/board/index.ts` and `packages/core/src/formats/index.ts` — re-exports (one added line).
- [x] `packages/core/test/format-board.test.ts` — synthetic boards pinning the tricky rules (a run wrapping a row end, a run wrapping a layer boundary, a one-cell run marker re-encoded identically, the reserved LUT index 0, shading `runCount` 0/1, `closed = -1`, empty program/sprite slots, an iso-rotated 147-cell matrix, residue), the located errors (text board, wrong magic, minors 0–3, a negative minor, a truncated file, a negative run index), and the three sample boards.

**Acceptance Criteria:**
- Given any minor-4 board, `readBoard` returns every field of §4.2 in order, keeps every slot and consumes the whole file (`reader.remaining === 0`).
- Given the three sample boards, the reader reports zero trailing bytes and `writeBoard` reproduces the input bytes exactly.
- Given a 2.x text board the reader returns a located error at offset 14; given minor 0/1 it says obsolete; given minor 2/3 it names the pre-vector layout and cites §4.8.
- Given a run marker, the decompressed matrix matches the traversal order (runs wrapping rows and layers), and the stored encoding is preserved so the write is byte-identical.

## Implementation Notes

- **Dispatch order.** `BinaryReader.isBinaryAt(14)` does not move the cursor, so the reader can read the header first (as the ticket describes) and still check the detection byte before any header error. A text board cannot yield a matching magic — a matching magic *is* a NUL at offset 14 — so the detection check is total over text boards, including one with no NUL at all.
- **Grid vs. shading.** The stored grid is `sizeX × sizeY` per layer, and `(sizeX + sizeY)²` per layer for iso-rotated boards (coordType bit 2, §5). The tile matrix has `sizeL` such layers; each shading layer covers one grid.
- **RLE kept exact.** `BoardTileRun.marker` records whether the file used a negative marker, so a `-1` marker covering a single cell round-trips as a marker rather than being "normalised" to a bare index. `tileMatrix` is the decompressed view of `tileRuns`; the writer reads `tileRuns`.
- **Bound overruns are warnings, not errors.** A run that covers more cells than the grid leaves gets a `warnings[]` entry and the extra cells are kept, so a permissive read still round-trips. A *truncated* file is still an error from the field's first byte.
- **`closed` and `reserved` are stored verbatim.** `closed` is written back as read (`-1` from legacy VB `CInt(True)`); `reserved` keeps `-1` on sprites and `100` on images.
- **Bounds from lengths.** The writer derives each upper bound as `length - 1` (`-1` for none) so empty slots survive; it fails, located, when a LUT, run, point list or layer-title count cannot fit its field.
- **`tileMatrix` duplicated by design.** Keeping both the decompressed cells and the stored runs is deliberate: the decoded grid is what a renderer wants and the runs are what byte-identity needs.

## Plan Change Log

- 2026-10-11 — initial implementation; spec §4.2 verified field-by-field against the three sample boards before the TypeScript reader was written.

## Review Triage Log

## Design Notes

- No new dependency: `Uint8Array`/`DataView` only, through the shared binary primitives.
- The board files cite `format-spec §4.1` (dispatch) and `format-spec §4.2` (layout) in their headers, and `§4.8` in the minor 2–3 refusal message, per G7.
- A local `fail(offset, section, message, path)` mirrors the tileset/battle readers so every located error in the format layer is built the same way.

## Verification

**Commands (all in the worktree, baseline `edf9d38`):**
- `pnpm install --frozen-lockfile` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 188 tests pass, 0 fail, 0 skipped.
- `pnpm lint` — exit 0; `check-core-deps: 1 core runtime dependency matches the allowlist`, eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (88 modules, 240 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 175 files`, `0 violations`.

**Sample boards (all three: zero trailing bytes, byte-identical round-trip):**
- `demo/Boards/out.brd` — 20×15×2, coordType 4, LUT 34, 600 tile cells, 6 vectors, 1 program, 1 sprite, start (204, 246) layer 1.
- `demo/Boards/start.brd` — 20×11×2, coordType 4, LUT 19, 440 tile cells, 17 vectors, 1 program, 1 sprite, start (213, 146) layer 1.
- `Basic/Boards/start.brd` — 20×15×2, coordType 0, LUT 2, 600 tile cells, 0 vectors, 0 programs, 0 sprites, start (304, 192) layer 1.

## Code Review

### 2026-10-11

**Code review complete.** 0 `decision-needed`, 8 `patch`, 2 `defer`, 18 rejected. The two decisions were resolved on 2026-10-11 and became patches; checked items are applied.

Scope: 943aef2, 05de90c; diff excludes the ticket's own plan file. Lenses run: blind-hunter, edge-case-hunter, verification-gap, intent-alignment (thorough). Decision, patch and defer counts are entries after grouping; the rejected count is findings.

- [x] [Review][Patch] Sample-corpus tests are skipped in CI (fixtures are only fetched in the golden job) — decided 2026-10-11 (user: harden the test ecosystem); applied as the recommended option: the `golden` job now runs `pnpm test` right after `pnpm fixtures:fetch` and `pnpm fixtures:check` (`.github/workflows/ci.yml`, described in `CONTRIBUTING.md`), so the three sample boards' parse and byte-identical `writeBoard` round trip execute in CI instead of being skipped in `unit`.
- [x] [Review][Patch] writeBoard ignored tileMatrix and never checked that tileRuns covers the grid [packages/core/src/formats/board/writer.ts] — decided 2026-10-11 (user was unsure; the recommended, safest option was applied): `writeBoard` now refuses, with a located error, a model whose runs do not cover the grid the way `readBoard` accepts it (too few cells, or a run after the one that completes the grid; a single final run that overshoots is still accepted, since the reader keeps it with a warning) or whose runs disagree with `tileMatrix` (the message names the first differing cell and says to rebuild the runs from the matrix). Models from `readBoard` are always consistent, so valid files still write back byte for byte. Consequence for the editor: after editing `tileMatrix` it must rebuild `tileRuns` before saving; a run encoder already exists privately in the pre-vector converter and can be shared then.
- [ ] [Review][Patch] The tile-matrix expansion exhausts memory on a crafted board [packages/core/src/formats/board/reader.ts:130-150] — a 64 KB file declaring 1000×1000×100 with 16k run markers OOM-aborts node (exit 134); smallest fix: bound the declared cell count against the bytes that remain (§1.2) before expanding runs.
- [ ] [Review][Patch] writeBoard returns ok for models it cannot serialise faithfully [packages/core/src/formats/board/writer.ts:66,71-73,103-206] — counts above 32768 wrap to "none" (40 000 sprites / 32 769 images / 40 000 light colours all re-read as 0 entries with the bytes as residue), i16-overflowing scalars (sizeX 40000) and a magic/minor this layout cannot write all produce files the reader refuses; smallest fix: extend the LUT/points bound guard to every count and range-check the scalar i16 writes.
- [ ] [Review][Patch] The light section of the board reader/writer is never exercised by any test [packages/core/src/formats/board/reader.ts:293-313] — smallest fix: add a `lights` option to the test builder plus a byte-identical round-trip test.
- [ ] [Review][Patch] readBoard accepts negative board dimensions [packages/core/src/formats/board/reader.ts:214-227] — a sizeL ≤ −2 board reads ok (nonsense grid) and yields a model `writeBoard` then refuses, breaking AD-18; smallest fix: reject a negative sizeX/sizeY/sizeL with a located error.
- [ ] [Review][Patch] Board model doc comments misstate §4.2 semantics [packages/core/src/formats/board/model.ts:139,205,250,280] — `disableSaving` documented as "whether the player may save", `attributes` as flags for every type (stairs: destination layer), the start/sprite fallbacks and the iso +8 px offset unstated; smallest fix: correct the comments.
- [ ] [Review][Patch] Test comment arithmetic is wrong [packages/core/test/format-board.test.ts:544] — "magic (14 bytes incl. NUL) + major (2) = the minor field starts at 17" sums to 16 (the magic is 15 bytes with its NUL); smallest fix: reword to match the sibling comment.
- [x] [Review][Defer] readUpperBound maps every negative stored bound to "none" [packages/core/src/formats/binary/reader.ts:47] — deferred: root cause in ticket 2.1's binary primitive (readUpperBound); fixing it there fixes this reader.
- [x] [Review][Defer] format-spec §4.2/§14 do not state the reader's new rules [docs/format-spec.md] — deferred: the fix edits the spec (negative LUT index after a run marker, the overrun-warning policy, the empty-LUT contradiction with §1.2, §14's `coordType & 1` wording), and G7 asks for the doc first in its own commit. The residue policy is no longer part of this: it is now format-spec §1.7.

**Rejected**
- blind-hunter: A tile-matrix LUT index is never checked against lut.length — low: crafted-input-only, the harm is a dangling index, and the fix is an added guard.
- blind-hunter: A negative shade runCount is counted as one cell — low: legacy writers emitted counts ≥ 0, the round-trip still holds, and the fix is another guard.
- blind-hunter: A tile matrix that underruns its grid is not detected — low: §4.2 gives the matrix no end marker, so reading on is the only behaviour and the caller still gets a located error.
- blind-hunter: coordType is never validated against §5 — low: the spec requires no such validation and the fix is an added guard (the §14 wording half is deferred).
- blind-hunter: The negative-version error always reports the minor offset — low: a developer-only offset nit on an input the test does not exercise; fix is a per-field branch.
- blind-hunter: Hardcoded "format-spec §1.4" — false: the same inline string is the repo convention (actor/character.ts:136, actor/enemy.ts:59, actor/item.ts:103, pre-vector-reader.ts), so there is no inconsistency.
- blind-hunter: Writer errors carry a character index, not a byte offset — low: that is `BinaryWriter.str`'s documented contract, the message names the character, and the fix threads byte offsets through the ticket-2.1 primitive.
- blind-hunter: No test reaches any writeBoard failure branch or the reader's warnings — low: real but a coverage gap whose fix is adding tests.
- blind-hunter: Diff duplicates the test file / redundant guard / duplicate assertion — false: `unwrap` has no `asserts` signature so the guard is required to type-check `result.warnings`, the warning filter is not a duplicate of the residue-length assertion, and "new then patched" is how a two-commit diff is composed.
- edge-case-hunter: A negative shade runCount is accepted — low: same as above.
- verification-gap: Untested handled-failure paths in the writer and the reader's overrun warnings — low: the guards exist, and the fix is adding tests.
- intent-alignment: The residue mechanism makes byte-identity insensitive to a wrong read — low: the plan's Boundaries and AD-18 mandate residue, the state is reported as a warning, and 05de90c already moved the proof to the corpus test's empty-residue assertion.
- intent-alignment: The test builder mirrors the implementation — low: the three real boards are still read and written byte-identically by the fixture test, so a real-byte anchor exists; the fix is a test rewrite.
- intent-alignment: Real data and tests leave parts of §4.2 unexercised — low: re-probed (lights 0, images 0, coordType 4/4/0, no single-cell markers, no runCount 0, empty condition strings); the actionable part is the light section, which is a patch entry.
- intent-alignment: The purpose surface (a runner loading boards) is untouched — false: the plan's Approach and Task list scope this ticket to the core format module.
- intent-alignment: The header is read before the byte-14 probe — false: outcome-equivalent, documented in the code comment and the plan's Implementation Notes.
- intent-alignment: The text/minor 0-3 tests are not real files — false: both refusals happen on the detection byte or the version field before any body byte is parsed.
- intent-alignment: Non-ASCII byte-exactness is delegated to cp1252 — false: the codec is total and lossless and format-binary.test.ts:80,101 round-trips all five undefined bytes.
