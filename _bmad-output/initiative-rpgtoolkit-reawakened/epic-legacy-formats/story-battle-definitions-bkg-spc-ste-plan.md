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
