---
title: 'TK2 text readers: .ene, .anm, .spc, .ste, .bkg'
type: 'feature'
ticket: 5
created: '2026-10-16'
status: in-progress
baseline_revision: '8f2e5b623a43f36c60991c2ca498c9bc9fae6ce7'
route: 'full'
route_source: 'auto'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0007-docs-spec-is-the-normative-specification.md', '{project-root}/docs/spec/formats/legacy/text-formats.md', '{project-root}/docs/spec/formats/legacy/conversion.md', '{project-root}/docs/spec/formats/legacy/README.md', '{project-root}/docs/spec/formats/enemy.md', '{project-root}/docs/spec/formats/animation.md', '{project-root}/docs/spec/formats/battle-data.md', '{project-root}/packages/core/src/formats/actor/enemy.ts', '{project-root}/packages/core/src/formats/animation/reader.ts', '{project-root}/packages/core/src/formats/battle/special-move.ts', '{project-root}/packages/core/src/formats/battle/status-effect.ts', '{project-root}/packages/core/src/formats/battle/battle-background.ts']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** Toolkit 2 (2.x) stored battle and animation assets as line-oriented text files (`one value per line`, CRLF line endings, ANSI / Windows-1252 text): enemies (`.ene`, minor 0), animations (`.anm`, minor 0), special moves (`.spc`, minor 0), status effects (`.ste`, minor 0), and fight backgrounds (`.bkg`, minor 0).
The six archived TK2 games contain 52 text `.ene`, 16 text `.anm`, 8 text `.spc`, and 23 text `.bkg` files. Today, `readEnemy`, `readSpecialMove`, `readStatusEffect`, and `readBattleBackground` actively refuse non-NUL detection bytes with located errors (`unsupported 2.x line-oriented text form`), and `readAnimation` fails on header reading because text `.anm` has no NUL terminator for its magic.
Consequently, TK2 games cannot load their enemies, animations, moves, or battle backgrounds, blocking CAP-1 and Done-when 1 of epic `epic-tk2-support`.

**Approach:** Add text-form reader branches to each of the five existing format readers:
1. `readEnemy` in `packages/core/src/formats/actor/enemy.ts`: when the detection probe at offset 14 indicates text (`!detection.value`), parse the 363-line minor-0 layout (`RPGTLKIT ENEMY`, stats, 19×7 rest tile grid R-20, 101 special move/weakness pairs, AI and reward fields, 4 battle animations for FIGHT, DEFEND, SPECIAL, DIE). Map to `Enemy` with `stances` holding the 4 combat animations in slots 1..4 (rest animation in slot 0 is empty string, matching R-20), empty strengths and customStances, and optional `width`, `height`, `tileGrid` fields for the legacy rest grid.
2. `readAnimation` in `packages/core/src/formats/animation/reader.ts`: when probe byte at offset 13 indicates text (`!detection.value`), parse the 160-line minor-0 layout (`RPGTLKIT ANIM` case-insensitive, dimensions, frame count line ignored per R-17, 51 frame triplets of image, decimal COLORREF transparent color, and sound cue, and floating-point delay in seconds). Return `Animation` with 51 frames and 0 trailing residue.
3. `readSpecialMove` in `packages/core/src/formats/battle/special-move.ts`: when probe byte at offset 16 indicates text, parse the 13-line minor-0 layout (`RPGTLKIT SPLMOVE`, name, fp, smp, prg, targetSmp, battle, menu, statusEffect, animation, description). Return `SpecialMove` with 0 residue bytes.
4. `readStatusEffect` in `packages/core/src/formats/battle/status-effect.ts`: when probe byte at offset 16 indicates text, parse the 14-line minor-0 layout (`RPGTLKIT STATUSE`, name, rounds, speed, slow, disable, hp, hpAmount, smp, smpAmount, code, prg as ruled by entry 13 and R-21). Return `StatusEffect` with 0 residue bytes.
5. `readBattleBackground` in `packages/core/src/formats/battle/battle-background.ts`: when probe byte at offset 12 indicates text, parse the 845-line minor-0 layout (`RPGTLKIT BKG`, 19×11 tile names, music, 4 sounds, 1 reserved line, 19×11×3 RGB tint lines). Return `BattleBackground` with `tiles` and `tints` attached and `image: ""` (the tile grid is the background).

A shared pure text line reader helper (`packages/core/src/formats/text/line-reader.ts`) tracks exact 0-based byte offsets and line numbers for located `FormatError` reporting, handles CRLF / LF / CR, and parses decimal/floating-point numbers and CP1252 strings without Node or DOM dependencies (G2, G3).

## Boundaries & Constraints

**Always:**
- Pure TypeScript in `core`, no Node or DOM types, no `TextDecoder` (G2).
- Return located `FormatError` ({ path, offset, section, message }) and never throw (AD-18).
- Keep every field verbatim; trailing unread bytes after expected lines report as residue or error.
- Follow G7: spec and docs first. Clean-room implementation only from `docs/`.
- Maintain strict typecheck rules (noUncheckedIndexedAccess, exactOptionalPropertyTypes, no `ok` from node:assert/strict in tests).

**Never:**
- Open or inspect `../rpgtoolkit` (G7).
- Touch `docs/format-spec.md` or `golden/legacy-corpus.json` (ADR 0007).
- Break binary reading or byte-identical binary writing for existing formats.
- Add runtime dependencies to `packages/core`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Enemy minor 0 text | 363-line `.ene` (`RPGTLKIT ENEMY`, `enemy_text.ene`) | `Enemy` with `major: 2`, `minor: 0`, 101 moves/weaknesses, 133-tile grid, 4 stances (`["", fight, defend, special, die, ""]`), 0 residue | Refuse if truncated or invalid numbers |
| Enemy fixed 19×7 grid (R-20) | Enemy with width 1, height 1 | `tileGrid` holds all 133 tile lines (x outer loop, 1..19, 1..7); only width×height used by callers | Located error if fewer than 133 tile lines |
| Enemy truncated before line 363 | File ends at line 300 | Located error at EOF offset with expected line count | `FormatError` section `docs/spec/formats/legacy/text-formats.md#enemy` |
| Animation minor 0 text | 160-line `.anm` (`RPGTLKIT ANIM`, `animation_text.anm`) | `Animation` with 51 frames, COLORREF unpacked transparent color, delay parsed as float | Case-insensitive header match |
| Animation frame count 0 (R-17) | Line 6 is `0` but 51 frames follow | Ignore line 6, read 51 frames by position | Consistent with all 17 corpus files |
| Animation scientific notation delay | Line 160 is `6.66666666666667E-02` (Caoquest `combo.anm`) | `delay` is parsed accurately as float (`0.0666666666666667`) | Located error if unparseable number |
| Special move minor 0 text | 13-line `.spc` (`RPGTLKIT SPLMOVE`, `special_text.spc`) | `SpecialMove` with `major: 2`, `minor: 0`, all 10 fields matching binary model, 0 residue | Located error if fewer than 13 lines |
| Status effect minor 0 text (R-21) | 14-line `.ste` (`RPGTLKIT STATUSE`, `status_text.ste`) | `StatusEffect` with `major: 2`, `minor: 0`, all 11 fields matching binary model, 0 residue | Located error if fewer than 14 lines |
| Fight background minor 0 text | 845-line `.bkg` (`RPGTLKIT BKG`, `background_text.bkg`) | `BattleBackground` with 209 tile names, 627 tint lines (19×11 RGB), line 218 discarded, 0 residue | Located error if fewer than 845 lines |
| Trailing lines / garbage | File has unexpected extra non-empty lines past expected end | Refuse with located error or report unconsumed bytes | Located error at unexpected trailing content |
| Non-text binary file | Magic followed by NUL byte at detect offset | Routed to binary reader path | Existing binary reader behavior unchanged |

</frozen-after-approval>

## Code Map

- `docs/spec/formats/legacy/text-formats.md`: Section Status effect (R-21) clarification for 14-line reader; Section Animation probe byte offset.
- `docs/spec/formats/legacy/README.md`: Detection table probe offset for Animation (`RPGTLKIT ANIM` -> 13).
- `docs/spec/formats/enemy.md`, `animation.md`, `battle-data.md`: Mention minor 0 text readers.
- `packages/core/src/formats/text/line-reader.ts` (new): Line reader utility over `Uint8Array` / `BinaryReader` with CP1252 decoding and offset tracking.
- `packages/core/src/formats/actor/model.ts`: Extend `Enemy` with optional legacy fields (`width?`, `height?`, `tileGrid?`).
- `packages/core/src/formats/actor/enemy.ts`: Add `readTextEnemy(reader)` branch when detection probe is non-NUL.
- `packages/core/src/formats/animation/model.ts`: Define `ANIMATION_DETECT_OFFSET = 13`.
- `packages/core/src/formats/animation/reader.ts`: Add `readTextAnimation(reader)` branch when probe at offset 13 is non-NUL.
- `packages/core/src/formats/battle/model.ts`: Extend `BattleBackground` with optional legacy fields (`tiles?`, `tints?`).
- `packages/core/src/formats/battle/special-move.ts`: Add `readTextSpecialMove(reader)` branch when probe at offset 16 is non-NUL.
- `packages/core/src/formats/battle/status-effect.ts`: Add `readTextStatusEffect(reader)` branch when probe at offset 16 is non-NUL.
- `packages/core/src/formats/battle/battle-background.ts`: Add `readTextBattleBackground(reader)` branch when probe at offset 12 is non-NUL.
- `packages/core/test/format-actor-text.test.ts` (new): Test text enemy reader, R-20 fixed 19×7 grid, 363-line verification, error handling.
- `packages/core/test/format-animation-text.test.ts` (new): Test text animation reader, R-17 51 frames, scientific notation delay, error handling.
- `packages/core/test/format-battle-text.test.ts` (new): Test text special move, status effect, battle background readers, 19×11 grid, tints, error handling.
- `packages/core/test/format-fixtures.test.ts`: Verify that all 5 version example files parse to their last line with 0 trailing bytes.

## Tasks & Acceptance

**Execution:**
- [ ] Doc-first commit: Update `docs/spec/formats/legacy/text-formats.md` (R-21 status effect reader note) and `docs/spec/formats/legacy/README.md` (animation probe offset 13).
- [ ] `packages/core/src/formats/text/line-reader.ts`: Implement `TextLineReader` over `BinaryReader` with CP1252 decoding, byte offset tracking, line and number parsers.
- [ ] `packages/core/src/formats/actor/model.ts` and `enemy.ts`: Add `readTextEnemy`, 363 lines, R-20 19×7 rest grid, 101 special moves, 4 combat stances.
- [ ] `packages/core/src/formats/animation/model.ts` and `animation/reader.ts`: Add `readTextAnimation`, 160 lines, R-17 51 frames, float delay.
- [ ] `packages/core/src/formats/battle/model.ts`, `special-move.ts`, `status-effect.ts`, `battle-background.ts`: Add `readTextSpecialMove` (13 lines), `readTextStatusEffect` (14 lines), `readTextBattleBackground` (845 lines, 19×11 tiles, tints).
- [ ] Unit tests: Author comprehensive tests in `format-actor-text.test.ts`, `format-animation-text.test.ts`, `format-battle-text.test.ts`.
- [ ] Fixture verification: Verify `docs/spec/examples/versions/` (enemy, animation, special-move, status-effect, fight-background) parse to their last line with 0 trailing bytes.
- [ ] Verification gates: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm graph`, `pnpm provenance`, `pnpm licence`, `pnpm golden`.

**Acceptance Criteria:**
- Given `enemy_text.ene` (363 lines), when read with `readEnemy`, parses to line 363, produces `minor: 0`, 133-tile grid, 4 combat stances, and `reader.remaining === 0`.
- Given `animation_text.anm` (160 lines) and Caoquest exponential delay, when read with `readAnimation`, parses to line 160, yields 51 frames, and `reader.remaining === 0`.
- Given `special_text.spc` (13 lines), when read with `readSpecialMove`, parses to line 13 and `reader.remaining === 0`.
- Given `status_text.ste` (14 lines), when read with `readStatusEffect`, parses to line 14 and `reader.remaining === 0`.
- Given `background_text.bkg` (845 lines), when read with `readBattleBackground`, parses to line 845, yields 19×11 tiles, 627 tints, and `reader.remaining === 0`.
- All binary formats continue to parse and round-trip byte-identically.
- All located errors include accurate byte offset, section, and message without throwing.

## Implementation Notes

- **Line reader design:** A pure `TextLineReader` tracks current byte offset in `BinaryReader.data`, scans for CRLF / LF / CR, and decodes strings using `decodeCp1252`.
- **R-20 rest image:** Text enemies store a 19×7 tile grid in lines 14-146. `Enemy.tileGrid` preserves all 133 tile lines verbatim; `Enemy.stances` sets slot 0 to `""` and slots 1..4 to FIGHT, DEFEND, SPECIAL, DIE.
- **R-17 frame count:** Text animations store `0` on line 6 across all 17 corpus files, but 51 frames follow. The reader ignores line 6 and reads 51 frames by position.
- **R-21 status effect:** The 14-line text status effect layout ruled by entry 13 is fully implemented and tested against `docs/spec/examples/versions/status-effect/status_text.ste`.
- **Battle background 19×11:** The 19×11 tile grid (209 lines) and 19×11 tints (627 lines) are preserved on `BattleBackground.tiles` and `BattleBackground.tints`. Line 218 is discarded as reserved.

## Plan Change Log

- 2026-10-16 — initial plan authored for ticket 16.5, baseline `8f2e5b62`.
