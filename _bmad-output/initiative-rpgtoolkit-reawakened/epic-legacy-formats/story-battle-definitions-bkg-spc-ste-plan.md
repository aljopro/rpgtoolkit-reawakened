---
title: 'Battle definitions (.bkg, .spc, .ste)'
type: 'chore'
ticket: '7'
created: '2026-10-11'
status: 'done'
baseline_revision: 'cca70e3681e5ee6ae064bae5ab9e9c33d75fcb3b'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 must read and write every legacy Toolkit data format. The three battle-data formats of `docs/format-spec.md` §8 are still unparsed: special moves (`.spc`, §8.1), status effects (`.ste`, §8.2) and battle backgrounds (`.bkg`, §8.3). Each is a `str` magic plus an `i16 major`/`i16 minor` header followed by a short, fixed field list, and each has a 2.x-era line-oriented text form that a naive binary read would mis-parse. Nothing reads them yet, so the sample battle background cannot be loaded.

**Approach:** Add `packages/core/src/formats/battle/` built on the ticket-2.1 `Result`/`FormatError` contract (AD-18) and `BinaryReader`/`BinaryWriter` (§1). For every format the reader probes its documented detection byte (`isBinaryAt`: `.spc`/`.ste` at offset 16, `.bkg` at 12; §1.3), refuses a text file with a located `FormatError` naming the text form as unsupported, then checks the magic and reads the §8.1/§8.2/§8.3 field list in order. A writer per format reproduces the same bytes exactly.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no imports of other packages. Determinism (G3): no banned `Math`, no `**`, no `Date`/`Intl`/`Math.random` (none are needed here). Every implementing file names its `docs/format-spec.md` section (G7). One public entry per package (AD-22): consumers import `@rpgtoolkit/core`. `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. Readers return `Result` and never throw (AD-18). The status effect keeps its per-round amounts signed (a negative heals, §8.2).

**Never:** add a runtime dependency, implement the 2.x text forms, validate `minor` (the sections constrain no value), error on trailing bytes, touch the legacy GPL source, edit `golden/**`, or commit fixture data.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/battle/model.ts` — `SpecialMove`, `StatusEffect`, `BattleBackground` and each format's `MAGIC`, `DETECT_OFFSET` and `SECTION` constants, plus `unsupportedTextForm` (a located `FormatError` naming the text form) — §8.1–§8.3, §1.3.
- [x] `packages/core/src/formats/battle/special-move.ts` — `readSpecialMove(reader)`: detection byte at 16, magic check, `str name`, `i32 damage`, `i32 smpCost`, `str program`, `i32 targetSmpDrain`, `i8 usableInBattle`, `i8 usableFromMenu`, `str statusEffect`, `str animation`, `str description`; `writeSpecialMove(model) -> Result<Uint8Array>` — §8.1.
- [x] `packages/core/src/formats/battle/status-effect.ts` — `readStatusEffect(reader)`: detection byte at 16, magic check, `str name`, ten `i16` fields (`rounds`, `speedUp`, `slowDown`, `disable`, `hpEnabled`, `hpPerRound`, `smpEnabled`, `smpPerRound`, `runProgram`), `str program`; the signed `i16` per-round amounts are kept; `writeStatusEffect` — §8.2.
- [x] `packages/core/src/formats/battle/battle-background.ts` — `readBattleBackground(reader)`: detection byte at 12, magic check, then `str image`, `str music`, `str menuMoveSound`, `str menuChooseSound`, `str readySound`, `str cantDoSound`; `writeBattleBackground` — §8.3.
- [x] `packages/core/src/formats/battle/index.ts`, `packages/core/src/formats/index.ts` — re-exports; the formats barrel gains `export * from "./battle/index.ts";`.
- [x] `packages/core/test/format-battle.test.ts` — `node:test` over synthetic buffers: exact round-trips, every field at its documented width and signedness, negative `hpPerRound`/`smpPerRound`, empty vs non-empty strings, the magic check, and located `FormatError`s for a wrong magic, a short file and a text-form file; a fixture test over `demo/Bkrounds/bkg.bkg` (skipped when the fixtures are absent).

**Acceptance Criteria:**
- Given a binary `.spc`/`.ste`/`.bkg`, the reader returns the magic, major/minor and every documented field, consuming the file exactly (`reader.remaining === 0`).
- Given a text-form file (non-NUL at the detection offset), the reader returns `ok: false` with a `FormatError` at that offset whose section is the format's §8 section and whose message names the text form as unsupported.
- Given a wrong magic, the reader returns a located `FormatError` at offset 0 and never throws.
- Given a parsed model, its writer returns bytes identical to the input.
- Given the fetched fixtures, `demo/Bkrounds/bkg.bkg` parses with `reader.remaining === 0` and round-trips byte-for-byte.

## Implementation Notes

- **Detection before the header.** Reaching `str magic` on a text file would scan for a NUL that is not there and report a misleading unterminated-string error, so the detection byte is checked first and refuses the text form outright (§1.3).
- **No minor validation.** Unlike `.anm` (§7.1, minor 3 only), §8.1–§8.3 list no accepted `minor` values, so the readers keep the version verbatim and reject nothing on its account.
- **Signed per-round amounts (§8.2).** `hpPerRound`/`smpPerRound` are `i16`; a negative value heals, so the reader keeps the sign rather than masking to an unsigned width.
- **Errors (AD-18).** Header/magic/text-form errors carry the format's `section`; EOF and short reads propagate the `BinaryReader`'s `§1.1` error with the field's first byte. The reader never throws.
- **Text forms are named, not parsed.** Each error message states the 2.x line-oriented form is unsupported, so a caller can tell a genuinely malformed file from an old one.

## Plan Change Log

- 2026-10-11 — initial plan.

## Review Triage Log

## Design Notes

- No new dependency: `Uint8Array`/`DataView` via the existing binary primitives only.
- One file per format keeps each reader beside its writer and its cited section; `model.ts` holds the shared models, constants and the one text-form error builder all three readers use.

## Verification

**Commands (all in the worktree, baseline `cca70e3`):**
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 153 tests pass, 0 fail, 0 skipped; the fixture test parsed `demo/Bkrounds/bkg.bkg` with zero trailing bytes and round-tripped it.
- `pnpm lint` — exit 0; `check-core-deps: 0 core runtime dependencies matches the allowlist`, eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (76 modules, 203 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 162 files`, `0 violations`.

## Code Review

### 2026-10-11

**Code review complete.** 0 `decision-needed`, 6 `patch`, 3 `defer`, 12 rejected. The decision was resolved on 2026-10-11 and became a patch; checked items are applied. Every patch is applied (2026-10-11).

Scope: 44fb20f; diff excludes the ticket's own plan file. Lenses run: blind-hunter, edge-case-hunter, verification-gap, intent-alignment (thorough). The first blind-hunter run returned no findings list (only its arithmetic line) and was rerun once; the blind-hunter findings come from the rerun. Decision, patch and defer counts are entries after grouping; the rejected count is findings.

- [x] [Review][Patch] Trailing bytes are silently dropped instead of being kept as residue — decided 2026-10-11 (user: warn, and keep the residue where dropping it would make the saved file differ from the one read, which it does); applied: `SpecialMove`, `StatusEffect` and `BattleBackground` gain `residue`, the three readers keep the bytes and warn once, the writers re-emit them (format-spec §1.7), tests cover each format, and `golden/legacy-corpus.json` was re-recorded because the `.bkg` digest now includes the empty residue.
- [x] [Review][Patch] A failed detection probe is fatal, so truncated files get a §1.3 "detection byte out of range" error [packages/core/src/formats/battle/special-move.ts:32] — read the header first and treat a failed probe as non-fatal (`detection.ok && !detection.value`) as `board/reader.ts:167` does, and update the two probe tests. — applied 2026-10-11: `.spc` reads the header first and treats a failed detection probe as non-fatal, as the board reader does, so a truncated file reports the short read. `.ste` and `.bkg` still probe first; noted in `deferred-work.md`.
- [x] [Review][Patch] The `.ste` tests cannot pin field order [packages/core/test/format-battle.test.ts:283] — give `speedUp`/`disable`/`smpEnabled`/`smpPerRound`/`runProgram` distinct non-zero values in one read and one round-trip case. — applied 2026-10-11: The `.ste` tests give the five flag and count fields distinct non-zero values in one read and one round trip.
- [x] [Review][Patch] Vacuous assertion in the short-read test [packages/core/test/format-battle.test.ts:242] — assert the expected section (`"format-spec §1.1"`) instead of `typeof … === "string"`. — applied 2026-10-11: The short-read test asserts the section.
- [x] [Review][Patch] The `.bkg` fixture test hard-codes one path and asserts no parsed values [packages/core/test/format-battle.test.ts:436] — `collect()` the `.bkg`/`.spc`/`.ste` fixtures under `demo` and `Basic` as `format-actor.test.ts:540` does, and assert the sample's parsed fields (`minor 3`, `image "bkg.jpg"`, `music "VIP - Boss1.mid"`). — applied 2026-10-11: The `.bkg`, `.spc` and `.ste` samples are collected as the actor test does, and the parsed fields are asserted (minor 3, image `bkg.jpg`, music `VIP - Boss1.mid`).
- [x] [Review][Patch] Model doc comments describe raw `i8`/`i16` flags as booleans [packages/core/src/formats/battle/model.ts:72] — reword to "kept verbatim; non-zero is true and `-1` is possible (§1.1)" for the five flag fields and disambiguate `disable`. — applied 2026-10-11: The raw `i8`/`i16` flag comments say the value is kept verbatim, non-zero is true and -1 is possible; `disable` is described as a raw value.
- [x] [Review][Defer] §1.4 promises each format states its accepted `minor` values; §8.1–§8.3 state none [docs/format-spec.md:§1.4] — deferred: pre-existing spec gap (the fix is a doc-first spec edit, G7), so it is not this change's to patch.
- [x] [Review][Defer] The `.spc`/`.ste` layouts have no external authority anchor [packages/core/test/format-battle.test.ts:96] — deferred: pre-existing corpus gap, `find fixtures -iname '*.spc'` and `'*.ste'` return 0 files, so the only anchor is `demo/Bkrounds/bkg.bkg` (§8.3); needs an independently authored or sourced byte fixture.
- [x] [Review][Defer] The three battle readers accept a negative `major`/`minor` [packages/core/src/formats/battle/special-move.ts:41] — deferred: root cause in ticket 2.1's binary primitive (`header()` accepts a negative version, which §1.4 calls invalid; see its patch); one guard there fixes all three readers, whereas the per-reader guard the first triage pass proposed (as `actor/character.ts:132` does) would duplicate it. Verified by probe: `major = -5, minor = -3` parses `ok`.

**Rejected**
- blind-hunter: probe runs before the magic check, so non-text files are diagnosed as text — false: §1.3 defines the non-NUL detection byte as the text form, the plan's acceptance criterion 2 mandates that error, and `board/reader.ts:167` behaves identically.
- blind-hunter: no `fail()` helper, the located-error literal is inlined three times — low: real duplication but no named harm; the fix adds a helper.
- blind-hunter: the writers never check `model.magic` — low: identical to the actor writers (`actor/character.ts:350`) and no hand-built-model caller exists; the fix adds a guard.
- blind-hunter: `readStatusEffect` has no short-read or out-of-range-probe test — low: those EOF paths use the shared primitives the `.spc`/`.bkg` error tests cover; the fix adds two test cases.
- blind-hunter: the unencodable-string writer tests assert too little — low: the failing path is exercised; naming the field/section is test polish.
- blind-hunter: `unsupportedTextForm` lands on the public `@rpgtoolkit/core` surface — low: three modules share it deliberately; the harm is a hypothetical future name clash.
- blind-hunter: the barrel comment is not updated — low: cosmetic and already corrected after this ticket by a later commit in the 2.9/2.10 chain.
- intent-alignment: the product-level reading (R2) is not implemented — false: the plan's acceptance criteria are module-level and the consumer landed with epic 2.11 (`2aa135e`, `runner-headless/src/dump/parse.ts:191`).
- intent-alignment: detection offset is cursor-relative / the wrong-magic offset is not absolute 0 — false: at the only call convention the offsets coincide (tests assert 0) and a reader positioned mid-file still reads correctly; §1.3's `len(magic)` wording is magic-relative.
- intent-alignment: writers key on `model.magic` — low: same as the writer-magic finding above.
- intent-alignment: the plan says "ten `i16` fields" but lists nine — rejected: its fix is to edit the plan under review; the reader follows §8.2's nine fields.
- intent-alignment: the shared message calls `.bkg`'s text form "line-oriented" — low: the message still names the text form as unsupported, which the acceptance criterion requires; accurate wording would need a parameter or duplicated messages.
