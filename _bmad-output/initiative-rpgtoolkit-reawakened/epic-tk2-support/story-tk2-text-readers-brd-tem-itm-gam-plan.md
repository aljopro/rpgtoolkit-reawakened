---
title: 'TK2 text readers: .brd, .tem, .itm, .gam'
type: 'feature'
ticket: '4'
created: '2026-10-16'
status: done
baseline_revision: '8f2e5b623a43f36c60991c2ca498c9bc9fae6ce7'
route: 'full'
route_source: 'auto'
risk: 'high'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0007-docs-spec-is-the-normative-specification.md', '{project-root}/docs/spec/formats/legacy/text-formats.md', '{project-root}/docs/spec/formats/legacy/README.md', '{project-root}/packages/core/src/formats/board/reader.ts', '{project-root}/packages/core/src/formats/board/pre-vector-reader.ts', '{project-root}/packages/core/src/formats/board/pre-vector-convert.ts', '{project-root}/packages/core/src/formats/actor/character.ts', '{project-root}/packages/core/src/formats/actor/item.ts', '{project-root}/packages/core/src/formats/main-file/reader.ts']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** Toolkit 2 stored its primary assets — boards (`.brd`), characters (`.tem`), items (`.itm`), and main game files (`.gam`) — as line-oriented CRLF text files. Currently, the readers in `core` (`readBoard`, `readCharacter`, `readItem`, `readMainFile`) only decode the 3.x binary formats: `readBoard` rejects text boards with an error at byte offset 14, `readCharacter` and `readItem` reject text forms at byte offset 13, and `readMainFile` fails with unterminated binary string errors because it has no text detection probe. In addition, zero-byte placeholder files left by game authors (Z-1) cause located read errors rather than being tolerated as empty assets. As a result, no TK2 game containing text files can load, blocking CAP-1 and epic 16's verification.

**Approach:**
1. Introduce a pure, deterministic line reader helper `TextReader` in `packages/core/src/formats/text/line-reader.ts` built on `decodeCp1252`, tracking line numbers and exact byte offsets.
2. Add text-format branches to:
   - `readBoard` (dispatched when byte 14 is non-NUL): parses text boards (minor 0: 19×11, minor 1: explicit width/height), converts through the pre-vector model (`PreVectorBoard` -> `convertPreVectorBoard`) into a vector `Board`.
   - `readCharacter` (dispatched when byte 13 is non-NUL): parses text character files (`RPGTLKIT CHAR`, minor 0–2, sizeType 0 embedded pixels and sizeType 1 tile names).
   - `readItem` (dispatched when byte 13 is non-NUL): parses text item files (`RPGTLKIT ITEM`, minor 0–1, sizeType 0 embedded pixels with `-2` empty picture markers and sizeType 1 tile names).
   - `readMainFile` (dispatched when byte 13 is non-NUL, accepting both `RPGTLKIT MAIN` and `RPGTLKIT mainForm` per R-19): parses text game files, tolerating the optional tail from row 32 onwards (A-1).
3. Implement rule Z-1 for zero-byte placeholder files: empty buffers (`bytes.length === 0`) are tolerated with a descriptive warning and return empty placeholder models rather than errors.
4. Wire format detection in `decodeBoard` and `CORE_DECODERS` so both binary and text forms dispatch seamlessly.

## Boundaries & Constraints

**Always:** Implement strictly from `docs/spec/formats/legacy/text-formats.md` and `docs/spec/formats/legacy/README.md`. Keep `core` free of DOM, Node, I/O and timers (G2). Deterministic arithmetic and parsing only (G3). Return located `FormatError` on malformed data, never throw (AD-18). Keep warning contracts and 0-byte placeholder warnings (Z-1). Doc-first (G7): document any missing detail in `docs/spec/` before writing code. Maintain Blue Oak Bronze license compliance with zero new dependencies (G6). Headless golden tests must remain clean (G5).

**Never:** Open or read `../rpgtoolkit` (G7). Modify `golden/legacy-corpus.json` (G5). Throw exceptions on malformed input (G1, AD-18). Break backward compatibility with existing 3.x binary formats.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Text board (minor 1, day/night tail present) | Caoquest `Boards/town.brd` (19×20, 15939 lines) | Decodes cleanly to vector `Board` via pre-vector path, 0 residue lines | Malformed lines return `FormatError` with byte offset |
| Text board (minor 1, day/night tail omitted) | FinalDestiny `Boards/start.brd` (19×11, 9095 lines) | Decodes cleanly to vector `Board`, day/night fields default | Returns `ok(board)` |
| Text board (minor 0, fixed 19×11) | Authored sample (no dimensions line) | Width=19, Height=11, decodes cleanly | Valid result |
| Zero-byte board file | `Secret Weapon Shop 2.brd` or `.brd` (0 bytes) | Empty placeholder `Board` (0×0×0, empty arrays) | Warning: zero-byte placeholder file (Z-1) |
| Text character (minor 2, sizeType 0) | Caoquest `Chrs/start.tem` (45091 lines) | Decodes to `Character`, 201 special moves, 0 residue lines | Returns `ok(character)` |
| Text character (sizeType 1) | Authored sample with tile names | Decodes to `Character` with tile name graphics | Returns `ok(character)` |
| Text item (sizeType 0, all `-2` empty) | Caoquest `Item/dagger.itm` (104 lines) | Decodes to `Item`, 17 empty pictures, 0 residue lines | Returns `ok(item)` |
| Text item (sizeType 0, mixed full/empty) | Caoquest `Item/10smp.itm` (1127 lines) | Decodes to `Item`, 1 full picture + 16 empty pictures | Returns `ok(item)` |
| Text item (sizeType 1, tile names) | Caoquest `Item/water.itm` (121 lines) | Decodes to `Item` with `legacyWalk` frames and rest tiles | Returns `ok(item)` |
| Zero-byte item file | `Item/fjaoefo.itm` or `.itm` (0 bytes) | Empty placeholder `Item` | Warning: zero-byte placeholder file (Z-1) |
| Text main file (row 31 termination) | BusDriver `Main/DEMO.GAM` (1133 lines) | Decodes to `MainFile`, optional tail default, 0 residue lines | Returns `ok(mainFile)` |
| Text main file (row 40 termination) | Caoquest `Main/caoquest.gam` (1146 lines) | Decodes to `MainFile`, 5 plugin slots, day/night parsed, 0 residue lines | Returns `ok(mainFile)` |
| Text main file header variants | `RPGTLKIT MAIN` and `RPGTLKIT mainForm` | Both accepted (R-19) | Unrecognised magic fails at offset 0 |
| Truncated / malformed text file | File truncated mid-record or non-numeric where number required | Returns `ok: false` with located `FormatError` | Located error at line byte offset |

</frozen-after-approval>

## Code Map

- `docs/spec/formats/legacy/text-formats.md` — doc-first commit: make row 22 item fields explicit `(file, x, y, layer, activate, initialVar, finalVar, initialValue, finalValue, activationType)` to match row 21 and the pre-vector sprite layout.
- `packages/core/src/formats/text/line-reader.ts` (new) — `TextReader` helper: line splitting, byte offset tracking, `line()`, `num()`, `hasMore()`, located error generation.
- `packages/core/src/formats/text/index.ts` (new) — exports `TextReader`.
- `packages/core/src/formats/board/text-reader.ts` (new) — `readTextBoard`: parses TK2 text board into `PreVectorBoard`, then calls `convertPreVectorBoard`.
- `packages/core/src/formats/board/reader.ts` — dispatch to `readTextBoard` when byte 14 is non-NUL, and handle 0-byte file (Z-1).
- `packages/core/src/formats/board/layout.ts` & `packages/core/src/formats/registry/core-decoders.ts` — wire `decodeBoard` to support text boards and 0-byte boards.
- `packages/core/src/formats/actor/character.ts` — dispatch to text character reader when byte 13 is non-NUL, and handle 0-byte file (Z-1).
- `packages/core/src/formats/actor/item.ts` — dispatch to text item reader when byte 13 is non-NUL, and handle 0-byte file (Z-1).
- `packages/core/src/formats/main-file/reader.ts` — dispatch to text main-file reader when byte 13 is non-NUL, and handle 0-byte file (Z-1).
- `packages/core/test/format-board-text.test.ts` (new) — comprehensive tests for text boards: Caoquest 14 boards, 19×11 default boards, minor 0, 0-byte boards, malformed inputs.
- `packages/core/test/format-actor-text.test.ts` (new) — comprehensive tests for text characters and text items: start.tem, swim.tem, sizeType 0/1, 16 item variations, 0-byte items.
- `packages/core/test/format-main-file-text.test.ts` (new) — comprehensive tests for text main files: DEMO.GAM (1133 lines), caoquest.gam (1146 lines), main_tk2_text.gam (1143 lines), RPGTLKIT mainForm variant, 0-byte file.
- `packages/runner-headless/src/dump/parse.ts` — ensure dump reports text-parsed models cleanly.

## Tasks & Acceptance

**Execution:**
- [ ] `docs/spec/formats/legacy/text-formats.md` — doc-first commit: clarify row 22 item fields.
- [ ] `packages/core/src/formats/text/line-reader.ts` — implement `TextReader` with line and byte offset tracking.
- [ ] `packages/core/src/formats/board/text-reader.ts` — implement text board parser converting to `PreVectorBoard` -> `convertPreVectorBoard`.
- [ ] `packages/core/src/formats/board/reader.ts` — integrate text board dispatch at byte 14 and 0-byte placeholder handling (Z-1).
- [ ] `packages/core/src/formats/actor/character.ts` — implement text character parser at byte 13 and 0-byte placeholder handling (Z-1).
- [ ] `packages/core/src/formats/actor/item.ts` — implement text item parser at byte 13 and 0-byte placeholder handling (Z-1).
- [ ] `packages/core/src/formats/main-file/reader.ts` — implement text main-file parser at byte 13 and 0-byte placeholder handling (Z-1).
- [ ] `packages/core/src/formats/registry/core-decoders.ts` — ensure `decodeBoard` and all decoders handle text and 0-byte files cleanly.
- [ ] Tests: add unit tests in `packages/core/test/` covering all 37 corpus files, edge cases, error conditions, and 0-byte files.
- [ ] Verification: run all verification scripts (`typecheck`, `test`, `lint`, `graph`, `provenance`, `licence`, `golden`).

**Acceptance Criteria:**
- All 17 text `.brd` files in the six games parse with 0 trailing bytes and convert to valid vector `Board` models.
- All 2 text `.tem` files in the six games parse with 0 trailing bytes.
- All 16 text `.itm` files in the six games parse with 0 trailing bytes.
- All 2 text `.gam` files in the six games parse with 0 trailing bytes.
- The 2 zero-byte `.brd` and 2 zero-byte `.itm` files parse as empty documents with Z-1 warnings.
- All malformed or truncated files return `ok: false` with located `FormatError` and never throw.
- All type checks, linter, tests, and golden checks pass without regressions.

## Implementation Notes

- **Pre-vector conversion for text boards:** Text boards carry per-tile collision types (TT_SOLID, etc.) and tile-coordinate positions for sprites and programs. Converting them through `PreVectorBoard` into `convertPreVectorBoard` reuses the established vector-synthesis logic (§4.8), generating axis-aligned vector boxes and passage edges cleanly.
- **Zero-byte placeholder files (Z-1):** Tolerating 0-byte files with a warning avoids breaking shipped games that contain empty reference stubs left by their authors.
- **TextLineReader:** By splitting on CRLF and tracking byte offsets, every field error pinpoints the exact byte in the source file.

## Plan Change Log

- 2026-10-16 — initial plan authored for Ticket 16.4.

## Verification

**Commands:**
- `pnpm typecheck && pnpm test && pnpm lint && pnpm graph && pnpm provenance && pnpm licence`
- `pnpm test:strict`
- `pnpm dump:check`
- Throwaway test script running against `/tmp/tk2-163` verifying all 37 files + 4 zero-byte files parse with 0 leftover lines.
