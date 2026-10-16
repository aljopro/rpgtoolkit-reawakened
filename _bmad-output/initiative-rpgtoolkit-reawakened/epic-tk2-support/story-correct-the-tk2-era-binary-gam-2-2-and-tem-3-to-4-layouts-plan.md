---
title: 'Correct the TK2-era binary .gam 2.2 and .tem 3 to 4 layouts'
type: 'chore'
ticket: 6
created: '2026-10-16'
status: built
baseline_revision: '8f2e5b62'
route: 'full'
route_source: 'auto'
risk: 'high'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/spec/formats/main-file.md', '{project-root}/docs/spec/formats/character.md', '{project-root}/docs/spec/formats/legacy/older-binary-versions.md', '{project-root}/packages/core/src/formats/main-file/reader.ts', '{project-root}/packages/core/src/formats/main-file/writer.ts', '{project-root}/packages/core/src/formats/main-file/model.ts', '{project-root}/packages/core/src/formats/actor/character.ts', '{project-root}/packages/core/src/formats/actor/model.ts']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:**
The TK2 binary `.gam` minor 2 layout in `packages/core/src/formats/main-file/` reads rows 11 (old parallax) and 23′ (menu plugin fallback) as 4-byte integers (`i32`). Under `i32`, the 10 BusDriver files leave 1506 residue bytes each, and FinalDestiny's two files run off the end (EOF failure at 1917/1959 bytes). Corpus evidence (R-18, round 5 Q2) proved that both fields are 2-byte shorts (`i16`); `docs/spec/formats/main-file.md` and `docs/spec/tools/rpgtk_formats.py` were corrected to `short`, but the core reader, writer, model and tests were left on `i32`.
Similarly, the TK2 binary `.tem` character layout in `packages/core/src/formats/actor/character.ts` for `minor < 5` (TK2 minors 3 and 4) stops reading after `sizeType` and takes the remainder of the file as `residue` (407 to 797 residue bytes per file). The actual TK2 binary layout for `minor < 5` (`docs/spec/formats/legacy/older-binary-versions.md#character-before-minor-8`, entry 3, round 5 Q8) stores 120 NUL-terminated graphic names (32 walking tiles as 16 upper/lower frames, 64 battle tiles across 4 stances × 4 frames × 2×2 grid, 4 rest tiles as a 2×2 grid, and 20 custom tiles as 10 upper/lower frames). With those 120 strings read, 14 of the 16 binary minor 3–4 files in the corpus close with 0 residue bytes; FinalDestiny's `start.tem` and `Bill.tem` leave 96 and 13 harmless residue bytes (Q8). In addition, A-4 confirms that the 1-byte field at minor 3 is `firstLevelExp` (`levelType` in legacy naming), already handled by `FIRST_LEVEL_EXP_I8_MINOR`.

**Approach:**
1. In `packages/core/src/formats/main-file/`:
   - `reader.ts`: Change rows 11 (parallax) and 23′ (menuPluginFallback) for `minor < 3` to `reader.readBytes(2)` (from 4).
   - `writer.ts`: Change `checkModel` run length checks for `parallax` and `menuPluginFallback` at `minor < 3` to 2 (from 4).
   - `model.ts`: Update doc comments for `MainFileReservedRuns` to note both are `i16` (2 bytes, R-18).
   - `format-main-file.test.ts`: Update test constants `PARALLAX` and `MENU_FALLBACK` to 2-byte buffers (`Uint8Array([0x11, 0x22])`, `Uint8Array([0x51, 0x52])`), update tests asserting on reserved run lengths and byte-for-byte round trips.
2. In `packages/core/src/formats/actor/`:
   - `model.ts`: Define `LegacyCharacterGraphics` (holding `walkFrames: readonly LegacyWalkFrame[]`, `battleTiles: readonly string[]`, `restTiles: readonly string[]`, `customFrames: readonly LegacyWalkFrame[]`) and slot count constants (`LEGACY_CHARACTER_WALK_FRAME_COUNT = 16`, `LEGACY_CHARACTER_BATTLE_TILE_COUNT = 64`, `LEGACY_CHARACTER_REST_TILE_COUNT = 4`, `LEGACY_CHARACTER_CUSTOM_FRAME_COUNT = 10`). Add `legacyGraphics: LegacyCharacterGraphics | undefined` to `Character`.
   - `character.ts`: In `readCharacter`, when `minor < 5`, read the 120 strings (16 walk frames × 2, 64 battle tiles, 4 rest tiles, 10 custom frames × 2) into `legacyGraphics`. When `minor >= 5`, keep existing behavior. In `writeCharacter`, when `minor < 5`, validate and emit `model.legacyGraphics`'s 120 strings.
   - `format-actor.test.ts`: Update `buildCharacter` to emit 120 strings when `minor < 5`, add tests verifying minor 3 and minor 4 characters read with 0 residue bytes and round-trip byte-for-byte, add tests verifying writer refusal if `legacyGraphics` is missing or has incorrect slot counts for minor < 5, and verify that the real binary `.gam` (15 files) and binary `.tem` (16 files) from the archive parse cleanly with 0 trailing bytes in the stream.

## Boundaries & Constraints

**Always:**
- Keep `core` free of DOM, Node, I/O and timers (G2).
- Return a located `FormatError` on read/write failure and never throw (AD-18).
- Implement clean-room from `docs/` only (G7).
- Respect G1-G7 guardrails and Blue Oak licence policy (G6).
- Use absolute paths in worktree ops.

**Never:**
- Never edit the main checkout directly.
- Never edit `docs/format-spec.md` (frozen under ADR 0007).
- Never modify golden recordings unless explicitly requested.
- Never add external dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Binary `.gam` minor < 3 | File with `minor < 3` (e.g. minor 2) | Reads row 11 as 2 bytes, row 23′ as 2 bytes; consumes stream exactly | `readBytes(2)` fails if fewer than 2 bytes remain |
| Binary `.gam` minor 0..2 round-trip | Parsed `MainFile` with `minor < 3` and 2-byte runs | Serialised byte-for-byte matching input | Refused if `parallax` or `menuPluginFallback` is not 2 bytes |
| Binary `.gam` minor ≥ 3 | File with `minor ≥ 3` | Rows 11 and 23′ not read; strings read at rows 23/24 | Standard string read errors |
| Binary `.tem` minor 3 | File with `minor = 3` | Reads `firstLevelExp` as `i8`, 4 battle sounds, level-up program/type/sizeType, then 120 graphic names into `legacyGraphics` | Truncated strings produce located `FormatError` |
| Binary `.tem` minor 4 | File with `minor = 4` | Reads `firstLevelExp` as `i32`, 4 battle sounds, level-up program/type/sizeType, then 120 graphic names into `legacyGraphics` | Truncated strings produce located `FormatError` |
| Binary `.tem` minor 3 & 4 round-trip | `Character` with `minor < 5` and valid `legacyGraphics` | Serialised byte-for-byte matching input | Refused if `legacyGraphics` missing or slot counts invalid |
| Binary `.tem` minor ≥ 5 | File with `minor ≥ 5` | Reads directional animations, stances, etc. `legacyGraphics` is `undefined` | Existing behavior preserved |
| Binary `.tem` minor < 5 missing `legacyGraphics` | `writeCharacter` called with `minor < 5` and `legacyGraphics: undefined` | Refuses write with located error | Located error in `actor.character` section |
| FinalDestiny `.tem` residual bytes (Q8) | `start.tem` (96 extra bytes), `Bill.tem` (13 extra bytes) | Consumes 120 graphic names, remaining bytes kept in `residue` with warning, 0 bytes unread in reader stream | Valid parse, non-empty residue warning |
| 15 binary `.gam` files in corpus | BusDriver (10), FinalDestiny (2), LittleMan (1), School2Demo (1), ChimeranEmpire (1) | Parse with 0 residue and 0 remaining bytes | — |
| 16 binary `.tem` minor 3–4 in corpus | 14 files close with 0 residue, 2 FinalDestiny files close with expected Q8 residue | Parse successfully, 0 remaining bytes | — |

</frozen-after-approval>

## Code Map

- `packages/core/src/formats/main-file/reader.ts`: lines 111-116 (row 11), 180-198 (row 23′).
- `packages/core/src/formats/main-file/writer.ts`: lines 285-289 (`checkModel` run lengths).
- `packages/core/src/formats/main-file/model.ts`: lines 93-102 (`MainFileReservedRuns` doc comments).
- `packages/core/test/format-main-file.test.ts`: test constants and assertions for 2-byte runs.
- `packages/core/src/formats/actor/model.ts`: add `LegacyCharacterGraphics` interface, slot count constants, and `legacyGraphics` field to `Character`.
- `packages/core/src/formats/actor/character.ts`: read 120 graphic names when `minor < 5`, write 120 graphic names when `minor < 5`.
- `packages/core/test/format-actor.test.ts`: tests for minor 3 and 4 character reading, writing, round-trip, invalid counts refusal, and archive corpus verification.

## Tasks & Acceptance

- [ ] Update `packages/core/src/formats/main-file/reader.ts` to read 2 bytes for rows 11 and 23′ when `minor < 3`.
- [ ] Update `packages/core/src/formats/main-file/writer.ts` to check for 2-byte runs for rows 11 and 23′ when `minor < 3`.
- [ ] Update `packages/core/src/formats/main-file/model.ts` doc comments.
- [ ] Update `packages/core/test/format-main-file.test.ts` for 2-byte runs and verify all main-file tests pass.
- [ ] Add `LegacyCharacterGraphics` and constants to `packages/core/src/formats/actor/model.ts`, and field to `Character`.
- [ ] Update `packages/core/src/formats/actor/character.ts` to read and write the 120 graphic names for `minor < 5`.
- [ ] Update `packages/core/test/format-actor.test.ts` with comprehensive minor 3 and 4 tests (including round-trip and validation).
- [ ] Add corpus verification tests ensuring all 15 binary `.gam` files and 16 binary `.tem` files from the archive parse cleanly.
- [ ] Run full CI checks: `typecheck`, `test`, `lint`, `graph`, `provenance`, `licence`, `golden`.

## Verification

- `pnpm --filter @rpgtools/core test` passes with all tests green.
- `pnpm typecheck` and `pnpm test` pass across workspace.
- `pnpm lint`, `pnpm graph`, `pnpm provenance`, `pnpm licence`, `pnpm golden` all clean.
