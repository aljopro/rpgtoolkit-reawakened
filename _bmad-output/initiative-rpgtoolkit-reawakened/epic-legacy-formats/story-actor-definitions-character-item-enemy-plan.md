---
title: 'Actor definitions: Character, Item, Enemy (.tem, .itm, .ene)'
type: 'chore'
ticket: '6'
created: '2026-10-11'
status: 'done'
baseline_revision: '05de90ce8dd865a5ad69d53662c9d85e7040683a'
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

**Problem:** Players, items and enemies are the actors a Toolkit game moves around its boards — a character (`.tem`) carries the player's stats, body slots, animation stances and the two sprite-local polygons; an item (`.itm`) is inventory, equipment or a board NPC and shares that graphics model; an enemy (`.ene`) is a battle opponent. Nothing reads any of the three yet, so the headless runner has no actors to load, and each format has version-dependent rows with two documented traps.

**Approach:** Add `packages/core/src/formats/actor/` on the ticket-2.1 `Result`/`FormatError` contract (AD-18) and the `BinaryReader`/`BinaryWriter` of §1. `readCharacter`/`readItem`/`readEnemy` apply the §6.1/§6.2/§6.3 detection byte and version dispatch, then read each section in the documented order; the writers re-emit the minor that was read and reproduce the bytes exactly. The two traps are pinned by tests: the vector-bases field is an **upper bound** (the samples store `1`, meaning two bases — a literal count reading leaves 34 trailing bytes), and items store `speed` before `idleTime`, the opposite of characters. The enemy's custom-stance bound is an `i32`, and its stance list has six slots (`0..5`) with slot 5 unused.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no other workspace package. Determinism (G3): only the allowlisted `Math` members, no `**`, no `Date`/`performance`/`Intl`/`Math.random`. Every file names its `docs/format-spec.md` section (G7). One public entry per package (AD-22). `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. Every slot — empty strings and the enemy's unused stance slot 5 included — is kept so indices stay stable. Unmodelled bytes stay in `residue` so a write is byte-identical (AD-18).

**Never:** convert the 2.x text forms (§6.1 says text characters must be re-saved; §6.3's minor 0 is refused), add a runtime dependency, touch the legacy GPL source, edit `golden/**`, or drop empty slots to "tidy" the model.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/actor/model.ts` — the three models (`Character`, `Item`, `Enemy`) and their shared types (`ActorPoint`, `ActorBase`, `ActorStance`, `CharacterSpecialMove`, `CharacterStats`, `LegacyWalk`/`LegacyWalkFrame`), the magic/detect-offset/minor constants and the fixed slot counts, plus the reader/writer helpers the three formats share (`readBoundedStrings`, `readStrings`, `readBytes`, `readBases`, `readStances`, `writeBoundedStrings`, `writeFixedStrings`, `writeFixedBytes`, `writeBases`, `writeStances`, `writeBound`, `actorError`, `writerError`).
- [x] `packages/core/src/formats/actor/character.ts` — `readCharacter(reader)`/`writeCharacter(model)`: §6.1 detection at offset 13, version dispatch (`minor = 3` `i8` first-level exp, `minor < 5` obsolete battle sounds, `≥ 5` movement and battle stances, `≥ 6` idle animations, `≥ 7` idleTime/speed, `≥ 5` `i32` custom stances, `≥ 8` the `i16` vector-bases bound then the two bases), the 9 variable names, the 8 `i32` stats, the fixed 201 special-move slots, the 11 accessory slots and the 7 body slots (byte 0 padding).
- [x] `packages/core/src/formats/actor/item.ts` — `readItem(reader)`/`writeItem(model)`: §6.2 detection at offset 13, `i32` prices/bonuses at `minor ≥ 3`, movement + rest + reserved at `≥ 4`, idle then **speed then idleTime** at `≥ 5`, the custom-stance block placed after the movement strings at `minor = 4` but after the idle/speed block at `≥ 5`, the `i16` vector bases at `≥ 7`, and the legacy two-tile-tall walk frames at `minor < 4`.
- [x] `packages/core/src/formats/actor/enemy.ts` — `readEnemy(reader)`/`writeEnemy(model)`: §6.3 detection at offset 14, only the binary minor 1 form, the bounded special-move/weakness/strength lists, the six-slot stance list (stored bound 5, slot 5 unused) and the `i32` custom-stance bound.
- [x] `packages/core/src/formats/actor/index.ts` and `packages/core/src/formats/index.ts` — re-exports (one added line).
- [x] `packages/core/test/format-actor.test.ts` — synthetic buffers pinning the vector-bases upper bound (stored `1` → two bases, `-1` → none), the seven body slots with byte 0 padding, the item-vs-character speed/idleTime order, the `minor = 4` vs `≥ 5` custom-stance placement, the enemy's six stance slots and `i32` custom-stance bound, byte-identical round-trips, the located errors (wrong magic, unsupported minor, text form, truncation) and the sample fixtures.

**Acceptance Criteria:**
- Given any `.tem`/`.itm`/`.ene`, the reader returns every field of §6.1/§6.2/§6.3 in order, keeps every slot, and consumes the whole file (`reader.remaining === 0`).
- Given the four sample actor files, the reader reports zero trailing bytes and zero residue, with no residue warning, and the writer reproduces the input bytes exactly.
- Given a 2.x text actor the reader returns a located error at the detection byte (13/13/14); given a wrong magic it fails at offset 0; given an unsupported minor it fails on the minor field; a truncated file is a located error, never a throw.
- Given the vector-bases field, the stored `1` yields two bases and `-1` yields none; given an item and a character with distinguishable values, each reads its own order (character idleTime then speed, item speed then idleTime).

## Implementation Notes

- **Detection order.** `BinaryReader.isBinaryAt(13|14)` does not move the cursor, so each reader reads the header first (as §6.1–§6.3 describe) and still checks the detection byte before any header error. A matching magic *is* a NUL at the detection offset, so the check is total over text actors, including one with no NUL anywhere.
- **Vector bases are an upper bound (A-TEM-1).** §6.1/§6.2 store the field as an upper bound like §1.2: the samples store `1`, which means indices `0..1` — two bases, collision then activation. `readUpperBound("i16")` is used; a literal `i16` count reading would leave the second base's 34 bytes (`2 + 4 × 8`) trailing, which the discovery report records on all three files. The test also asserts the raw stored value is `1`.
- **The enemy's `i32` custom-stance bound (A-ENE-1).** The literal `i16` reading leaves 2 trailing bytes on `pirate.ene`; reading the bound as a 4-byte `i32` consumes the file exactly, matching the other two sprite formats. `readStances`/`writeStances` use `i32` everywhere.
- **`minor` selects the layout; the writer follows the model's own minor.** Each writer emits the version it read, so an unmodified actor round-trips; conditional fields are `undefined` (not `[]`) when the model's minor does not store them, and the writer keys every conditional row on `minor`, never on a field's presence.
- **Empty slots are kept.** The 9 variable names, 201 special-move slots, 11 accessory slots, 7 body slots, 51 item handle slots, 8 equip slots, the fixed stance/animation blocks and the enemy's stance slot 5 are all preserved verbatim, including empty strings.
- **Fixed blocks fail loudly on a wrong length.** A `str × 51` or `i8 × 7` block with the wrong entry count cannot be serialised, so `writeFixedStrings`/`writeFixedBytes` return a located `FormatError` instead of writing a silently short file. Bounded lists derive their bound back from the array length (`-1` for none).
- **`residue` (AD-18).** Anything past the last modelled field is kept in `residue` and re-emitted, with a warning when non-empty — the same shape as the board reader, so the fixture test additionally asserts an empty residue rather than trusting `remaining === 0`.
- **`hasSpecialMoves` and the item/character flags are stored as raw bytes.** §6.1 documents `0 = yes, 1 = no` for `hasSpecialMoves`; keeping the stored `i8` verbatim (rather than a boolean) is what makes the write byte-identical for any legacy value, as the board reader keeps `closed = -1`.
- **Legacy item walk frames.** At `minor < 4` the two-tile-tall walk frames are read as sixteen `(top, bottom)` pairs then two rest tiles; only read/write agreement matters for round-tripping since no fixture exercises minor < 4.

## Plan Change Log

- 2026-10-11 — initial implementation; the three layouts were verified field-by-field against the five sample actor files before the readers were finalised, including the 34-byte vector-bases tail and the enemy's 2-byte `i32` tail.

## Review Triage Log

## Design Notes

- No new dependency: `Uint8Array`/`DataView` only, through the shared binary primitives.
- The three files cite `format-spec §6.1`, `§6.2` and `§6.3` in their headers (G7); the shared model helpers cite §6 and §1.2.
- `CharacterSpecialMove` (a character's special-move learn slot) is named to avoid colliding with the battle format's `SpecialMove` (`.spc`, §8.1) in the single `@rpgtoolkit/core` entry point (AD-22).
- `readBoundedStrings`/`readBases`/`readStances` check the stored bound against the bytes remaining before looping (§1.2), so a damaged file cannot make a reader run past the end.

## Verification

**Commands (all in the worktree, baseline `05de90c`):**
- `pnpm install --frozen-lockfile` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 228 tests, 227 pass, 1 skip (the pre-existing `.gam` sample skip; no `.gam` ships), 0 fail (12 in `format-actor.test.ts`).
- `pnpm lint` — exit 0; `check-core-deps: 1 core runtime dependency matches the allowlist`, eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (100 modules, 288 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 187 files`, `0 violations`.
- `uv run _bmad/method/scripts/tickets.py --project-root . status` — exit 0, entry 2.6 shown as done.

**Sample actors (all five: zero trailing bytes, zero residue, byte-identical round-trip):**
- `demo/Chrs/start.tem` (major 2, minor 8) — "Frap", body slots `[0,1,1,1,1,1,1]`, idleTime 3, speed 0.05, two vector bases (collision 4 points, activation 4 points).
- `Basic/Chrs/start.tem` — byte-identical to the demo copy.
- `demo/Item/man.itm` (minor 7) — "man", speed 0.1, idleTime 3, two vector bases.
- `demo/Item/oldman.itm` (minor 7) — parses and round-trips.
- `demo/Enemy/pirate.ene` (minor 1) — "Pirate Bob", six stance slots (slot 5 empty), `i32` custom-stance bound.

The fixture test guards on presence (`skip` when `fixtures/legacy/` is absent), and the `Basic` copies of the item and enemy samples do not exist in the corpus, which the extension-based collection handles.

## Code Review

### 2026-10-11

**Code review complete.** 0 `decision-needed`, 10 `patch`, 2 `defer`, 22 rejected. The decision was resolved on 2026-10-11 and became a patch; checked items are applied. Every patch is applied (2026-10-11).

Scope: 8bc1111; diff excludes the ticket's own plan file. Lenses run: blind-hunter, edge-case-hunter, verification-gap, intent-alignment (thorough). Decision, patch and defer counts are entries after grouping; the rejected count is findings.

- [x] [Review][Patch] Sample-corpus tests are skipped in CI (fixtures are only fetched in the golden job) — decided 2026-10-11 (user: harden the test ecosystem); applied as the recommended option: the `golden` job now runs `pnpm test` right after `pnpm fixtures:fetch` and `pnpm fixtures:check` (`.github/workflows/ci.yml`, described in `CONTRIBUTING.md`), so the real `.tem`/`.itm`/`.ene` samples' parse and byte-identical round trip execute in CI instead of being skipped in `unit`.
- [x] [Review][Patch] writeCharacter serialises the 201 special-move slots in the wrong order [packages/core/src/formats/actor/character.ts:376-391] — emit each slot as `str file, i32 minExp, i32 minLevel, str condVar, str condValue` like the reader, dropping the two-block split — applied 2026-10-11: `writeCharacter` writes each of the 201 special-move slots as file, `minExp`, `minLevel`, `condVar`, `condValue`, the order the reader reads (format-spec §6.1).
- [x] [Review][Patch] Ignored writer.str results silently truncate unencodable output [packages/core/src/formats/actor/character.ts:350-448, packages/core/src/formats/actor/item.ts:359-477, packages/core/src/formats/actor/enemy.ts:206-238] — assign each `writer.str(...)` result and return a `writerError` on failure — applied 2026-10-11: Every `writer.str(...)` result in the three writers is checked (27 sites); an unencodable string is a located error.
- [x] [Review][Patch] Character version-conditional rows (minor < 8) have no test anywhere [packages/core/test/format-actor.test.ts:441] — add `buildCharacter({ minor: 3 })` and `buildCharacter({ minor: 4 })` round-trips — applied 2026-10-11: Characters at minor 3 and 4 round-trip byte for byte.
- [x] [Review][Patch] Item version-conditional rows (minor < 4) have no test anywhere [packages/core/test/format-actor.test.ts:441] — add `buildItem({ minor: 2 })` (and a `minor: 6` item) round-trips — applied 2026-10-11: Items at minor 2 and 6 round-trip byte for byte.
- [x] [Review][Patch] Non-empty residue is never round-tripped [packages/core/test/format-actor.test.ts:569] — add one trailing-bytes case per actor format — applied 2026-10-11: One trailing-bytes case per actor format checks the residue, its warning and the byte-identical re-emit.
- [x] [Review][Patch] Writer-failure paths are untested [packages/core/test/format-actor.test.ts] — cover the fixed-block length mismatch and the unencodable-string error — applied 2026-10-11: Tests cover an unencodable name in all three formats and the fixed-block length mismatch for character and item (enemy has no fixed-size block).
- [x] [Review][Patch] Synthetic tests never populate a special-move slot or pin field order with distinguishable values [packages/core/test/format-actor.test.ts:120-126] — populate one slot with distinguishable values and round-trip it — applied 2026-10-11: A slot with distinguishable values round-trips; the test fails with the old slot order.
- [x] [Review][Patch] The raw stored flags kept verbatim are untested [packages/core/test/format-actor.test.ts] — read/write non-canonical flag bytes and assert the byte-identical re-emit — applied 2026-10-11: Non-canonical flag bytes are read and re-emitted byte for byte.
- [x] [Review][Patch] The sample-layout test silently no-ops when a named sample is absent [packages/core/test/format-actor.test.ts:601-624] — assert each expected sample path was found — applied 2026-10-11: The sample-layout test fails when a named sample is missing instead of skipping silently.
- [x] [Review][Defer] A stored upper bound below -1 is accepted as "none" [packages/core/src/formats/binary/reader.ts:40] — deferred: root cause in ticket 2.1's binary primitive (readUpperBound); fixing it there fixes this reader
- [x] [Review][Defer] The accepted minor values for .tem and .itm are not stated in the spec [docs/format-spec.md §6.1, §6.2] — deferred: pre-existing spec gap (§1.4 requires each format to state its minors); the fix edits the spec under G7's doc-first rule, not this ticket's code

**Rejected**
- blind-hunter: The legacy-text diagnosis is made before the magic is checked, so non-actor files are reported as 2.x text actors — low: only a non-actor file misrouted here (byte 13 non-NUL) hits it, and the fix adds a magic-prefix branch
- blind-hunter: A negative `major` is reported at the `minor` offset — low: a 2-byte offset error in a message for an already-invalid file
- blind-hunter: `ENEMY_MAJOR` is declared and never used, and the major invariant is unenforced — low: §1.4 makes `major` informational, so not enforcing it is correct, and the plan deliberately exports the constants
- blind-hunter: The writers accept a `minor` they cannot serialise — low: only reachable by hand-building a model the reader can never emit; the fix adds range validation
- blind-hunter: `?? []` on a fixed-count block is dead and yields a misleading message — low: the result is still a loud `FormatError`; only the wording differs
- blind-hunter: `readBases` never checks the bases bound against the bytes remaining — low: every inner read is bounds-checked, so it fails safely
- blind-hunter: `writeStrings` discards the inner failure's location when it wraps it — low: error-location cosmetics on the same path as the writer.str fix
- blind-hunter: `readStats` is built by parallel array plus a double cast — low: no current caller diverges; harm needs a future edit to the `order` array
- blind-hunter: The header preamble and the `minor >= N` ladder are triplicated — low: refactor with no named defect
- blind-hunter: `BATTLE_STANCE_COUNT = 5` is exported and referenced nowhere — low: dead spec constant; deleting it contradicts the plan's explicit constants task
- blind-hunter: The enemy's six-slot stance invariant is neither enforced nor surfaced — low: §6.3 stores the bound as 5, so a conforming file is unaffected
- blind-hunter: The bound rule exists in two shapes in the same file — low: a duplicated one-liner with no behavioural divergence
- blind-hunter: Thirteen generic helper names became package-level public API — low: tsc/graph are green and no actual collision exists
- blind-hunter: The barrel's summary comment was not updated — low: comment-only, and the list was already incomplete
- blind-hunter: Avoidable allocations on hot-pure paths — low: micro-optimisation; the special-moves `.map()` goes with the E1 fix
- blind-hunter: `readBoundedStrings`' guard error points at the first entry, not the bound — low: the offset is defensible (points at the payload after the bound)
- intent-alignment: D1 — the four trap tests live at the spec surface, while the intent anchors the traps at the sample bytes — low: the traps are asserted on both surfaces and the sample side's CI exposure is covered by the decision item
- intent-alignment: D2 — the implied acceptance signal (`remaining === 0`) is not discriminating; the check moved to residue — false: `checkActor` asserts `residue.length === 0` and the absence of a residue warning, which is strictly stronger
- intent-alignment: D3 — R1 vs R2 (scope): the diff stops at the format layer, the intent's motivation names the runner — false: the plan's tasks bound the deliverable to the format layer; the runner consumer landed later (2.11, 2aa135e)
- intent-alignment: D4 — R3 vs R4 (text forms): the diff refuses the text forms rather than converting them — false: the plan's frozen "Never" clause mandates refusing the 2.x text forms and §6.3's minor 0
- intent-alignment: D5 — R5 vs R6 (normalisation): the diff stores raw values rather than applying §6 consumer rules — false: the byte-exact-write requirement and the plan's "Never: drop empty slots" require verbatim storage
- intent-alignment: D6 — R7 vs R8 (six enemy stances): the reader is bound-driven, not structurally six — low: §6.3 documents the bound as "stored as 5"
