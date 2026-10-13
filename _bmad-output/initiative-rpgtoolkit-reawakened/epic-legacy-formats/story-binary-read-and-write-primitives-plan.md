---
title: 'Binary read and write primitives'
type: 'chore'
ticket: '1'
created: '2026-10-11'
status: 'done'
baseline_revision: 'e2f4fd77add2664306b3310e88b3dd64f947ded9'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'thorough'
review_source: 'pinned'
lenses_ran: ['blind-hunter', 'edge-case-hunter', 'verification-gap', 'intent-alignment']
review_loop_iteration: 2
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 reads a dozen binary legacy formats, and every one of them starts with the same handful of primitives: little-endian integers, NUL-terminated Windows-1252 strings, COLORREFs, and the "upper bound" count rule of format-spec §1.2. There is no shared reader or writer yet, and no shared way to report a bad file (AD-18 requires readers to return a `Result`, never throw).

**Approach:** Add `packages/core/src/formats/` with the shared `Result`/`FormatError` contract (AD-18) and `formats/binary/` with a pure, deterministic `BinaryReader` and `BinaryWriter` built on `Uint8Array`/`DataView`. Readers return `Result`, never throw, and report the field's byte offset with the citing format-spec section. The count rules (upper bound vs. true count), the Windows-1252 codec and the COLORREF layout live in one place each so later readers cannot drift.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no imports of other packages. Determinism (G3): only the allowlisted `Math` members, no `**`, no `Date`/`performance`/`Intl`/`Math.random`. Every implementing file names its `docs/format-spec.md` section (G7). One public entry per package (AD-22): consumers import `@rpgtoolkit/core`, never a deep path. `kebab-case.ts` files, `PascalCase` types, `camelCase` functions.

**Never:** add a runtime dependency (that is a later ticket), touch the legacy GPL source, edit `golden/**`, or change the existing `canon`/`ports`/`validate` exports.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/result.ts` — `FormatError { path?, offset, section, message }` and `Result<T, E = FormatError> = ok(value, warnings) | err(error)`, with `ok`/`err` constructors — AD-18.
- [x] `packages/core/src/formats/binary/cp1252.ts` — the Windows-1252 decode/encode table, with the five undefined bytes documented — §1.1.
- [x] `packages/core/src/formats/binary/color.ts` — `Colorref { r, g, b }` and `packColorref`/`unpackColorref` for `0x00BBGGRR` — §1.1.
- [x] `packages/core/src/formats/binary/reader.ts` — `BinaryReader` for `u8`/`i8`/`u16`/`i16`/`u32`/`i32`/`f64`, `bool`, `readBytes`, `str`, `color`, `header`, `readUpperBound(width)`, `readTrueCount(width)`, `isBinaryAt(offset)`, `seek`/`skip`, plus position getters; `upperBoundCount`/`trueCount` as the two named count rules — §1.1–§1.4.
- [x] `packages/core/src/formats/binary/writer.ts` — `BinaryWriter` producing the same primitives plus `writeBytes`/`bool`/`str`/`color`, returning the bytes via `toBytes`.
- [x] `packages/core/src/formats/binary/index.ts`, `packages/core/src/formats/index.ts` — re-exports; `packages/core/src/index.ts` gains `export * from "./formats/index.ts";` (existing exports and comment style kept).
- [x] `packages/core/test/format-binary.test.ts` — 25 `node:test` cases over synthetic buffers: exact round-trips, count rules, codec policy, COLORREF order, and located EOF/bounds errors.
- [x] `tickets.toml` entry 1 — corrected `core/format/binary` to `core/formats/binary` (typo fix only; the directory the spine names is `core/formats/*`, AD-6/AD-28).

**Acceptance Criteria:**
- Given a synthetic buffer, every primitive round-trips exactly, including negative integers, `u32` values with the high bit set, and `f64` `-0`/`NaN`/`±Infinity`.
- Given a truncated buffer, every read returns `ok: false` with `FormatError.offset` equal to the field's first byte and `section` citing `format-spec §1.1` (or §1.2/§1.3 where relevant), and the cursor does not advance.
- Given an upper bound `n`, the entry count is `n + 1`, `-1` is none, and a true count is exactly `n`; the two rules are distinct, named and tested.
- Given a string with a character outside Windows-1252, the writer reports a `FormatError` and appends nothing.

## Implementation Notes

- **Layout.** `packages/core/src/formats/` (not `format/`) matches the package directories named in the spine: `core/formats/package` (AD-6) and `core/formats/image` (AD-28). `tickets.toml` had the singular typo; fixed in this commit.
- **Never throws (AD-18).** `FormatError.offset` is the failing field's first byte, which is what locates it; `path` is included only when the reader was constructed with one (the compiler's `exactOptionalPropertyTypes` forbids an explicit `undefined`).
- **cp1252 undefined-byte policy.** Bytes `0x80`–`0x9F` are the Windows-1252 extensions except five the code page leaves undefined: `0x81`, `0x8D`, `0x8F`, `0x90`, `0x9D`. Windows and the WHATWG `windows-1252` index map each to its own C1 control code point (`0x81` → U+0081, …). This decoder does the same, so it is **total** (decoding never fails) and **lossless** (`0x81` → U+0081 → `0x81`, satisfying AD-18's residue/round-trip requirement). The encoder reports any character with no code-page byte — e.g. U+0100 or a lone surrogate — instead of substituting `'?'`.
- **Pass-through vs. scan.** The five undefined bytes and their C1 code points are identity in both directions; the table holds each undefined byte's own code point so the encoder can find it.
- **Count rules kept apart.** `upperBoundCount(n) = n + 1` (`-1` → 0) for the "upper bound" rule of §1.2; `trueCount(n) = n` for the formats that store a true count (`tileCount` §3.1, `frameCount` §3.5, `.sav` counts §11). `readUpperBound`/`readTrueCount` take the stored width (`"i16"` default, `"i32"` for `.tem`/`.itm`/`.ene` custom stances and vector bases §6.1–§6.3) so no call site hardcodes `i16`.
- **Boolean write.** The read rule is "0 = false, any non-zero = true" (the legacy `-1` included); the writer emits the canonical `1` in an `i16` and never `-1`.
- **COLORREF.** `0x00BBGGRR`, red in the low byte. The reader ignores the high byte; `packColorref` masks it to `0x00`.
- **Signedness.** `i16`/`i32` preserve the sign, which negative run markers and `closed = -1` depend on (tested explicitly).
- **`str` at EOF.** A missing NUL before the end of the data is a `FormatError` at the string's first byte; the scan is bounded by the buffer, so it never runs away or hangs.
- **Detection probe.** `isBinaryAt(offset)` reads `0x00` (binary) vs. CR/LF (text) per §1.3 without moving the cursor; callers pass `len(magic)` or a format's fixed offset (12/13/14/16) where that section overrides the `len(magic)` rule.

## Plan Change Log

- 2026-10-11 — spec audit: directory renamed `format` → `formats`; `tickets.toml` typo fixed; added `readBytes`/`writeBytes`, width-parameterised `readUpperBound`/`readTrueCount`, `trueCount`, `header`, `isBinaryAt`, and `bool`; the cp1252, boolean and sign decisions made explicit here and in tests.

## Review Triage Log

### Round 2 — 2026-10-13 (`review-r1`, tickets 2.1–2.4 + chore `68d7839`)

| # | Lens | Finding | Verdict | Route |
|---|---|---|---|---|
| 1 | blind-hunter | `readBytes`/`take` accept `NaN` (cursor set to `NaN`, later reads silently from offset 0) and fractional lengths (cursor desync) | real | open — needs `Number.isInteger(size)` in `take` |
| 2 | intent-alignment | exported `upperBoundCount`/`trueCount` return a value for invalid negatives that `readUpperBound` rejects — two behaviours for the §1.2 rule | real | open — needs the two helpers to return `Result` or be made private |
| 3 | edge-case-hunter | on a semantically invalid field (`readUpperBound` `< -1`, `header()` negative version) the cursor has already advanced, but the acceptance criterion says "the cursor does not advance" (it only covers truncation) | real, low impact | accepted — harmless (every caller aborts) and a documented contract choice |
| 4 | guardrail-sweep | G2/G3/G6/G7 clean (`check-core-deps` 1 allowlisted dep, no banned `Math`/`Date`/`Intl`, `Math` allowlist is enforced by eslint) | clean | — |
| 5 | independent-oracle | cp1252 table, count rules, f64 `-0`/`NaN`/`±Infinity`, little-endian layout all verified against §1 | clean | — |

Chore `68d7839` (§1 amendment), covered by the same report:

| # | Lens | Finding | Verdict | Route |
|---|---|---|---|---|
| 1 | verification-gap | §1.2's new "a reader must also check `n` against the bytes that remain" is not implemented by the animation or board readers, so "the readers already follow these rules" is not accurate | real, low impact | open — needs a softened §1.2 sentence or the explicit checks |
| 2 | intent-alignment | the §1.2 `i32` claim matches §6.1/§6.2/§6.3; the §1.3 offset list is complete; "sample files all carry `major` 2" is true of every magic-bearing fixture; §3.1 true-count and §3.6 inclusive-bounds additions match the code | clean | — |
| 3 | guardrail-sweep | G7 provenance unaffected (docs-only commit) | clean | — |

## Design Notes

- No new dependency: `Uint8Array` and `DataView` only. `core` was already `lib: ["ES2022"], types: []`, so a host global would not even compile.
- `readBytes`/`writeBytes` copy their spans rather than aliasing the caller's buffer, so a later reader cannot mutate the source through a subarray.

## Verification

**Commands (all in the worktree, baseline `e2f4fd7`):**
- `pnpm install --frozen-lockfile` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 102 tests pass, 0 fail (25 of them in `format-binary.test.ts`).
- `pnpm lint` — exit 0; `check-core-deps: 0 core runtime dependencies matches the allowlist`, eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (59 modules, 142 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 147 files`, `0 violations`.
- `uv run _bmad/method/scripts/tickets.py --project-root . status` — exit 0, entry 1 shown.

## Code Review

### 2026-10-11

**Code review complete.** 0 `decision-needed`, 4 `patch`, 0 `defer`, 19 rejected. Every patch is applied (2026-10-11).

Scope: e8f2d43, 68d7839; diff excludes the ticket's own plan file. Lenses run: blind-hunter, edge-case-hunter, verification-gap, intent-alignment (thorough). Decision, patch and defer counts are entries after grouping; the rejected count is findings.

- [x] [Review][Patch] A stored upper bound below -1 is silently read as "none" instead of being reported [packages/core/src/formats/binary/reader.ts:40-42,207-210] — smallest fix: `readUpperBound` returns a `FormatError` citing `COUNT_SECTION` (§1.2) when the stored bound is `< -1`, plus a test through a written `i16(-2)`, so the clamp can no longer be deleted unnoticed. — applied 2026-10-11: `readUpperBound` reports a stored bound below -1 (format-spec §1.2) at the bound's offset; a test goes through a written `i16(-2)`.
- [x] [Review][Patch] `header()` returns a negative `major`/`minor` as a valid header [packages/core/src/formats/binary/reader.ts:185-199] — format-spec §1.4 (pinned in 68d7839) calls a negative version field invalid, and at HEAD the three battle readers (2.7) and the animation reader's `major` (2.4) rely on `header()` alone and accept such files; smallest fix: `header()` returns a located `FormatError` citing `format-spec §1.4` when `major < 0 || minor < 0`, plus a test over a written negative version. Revised in the cross-ticket audit: the first triage pass rejected this as false ("every consumer checks"), which does not hold for the battle and animation readers. — applied 2026-10-11: `header()` reports a negative `major` or `minor` (format-spec §1.4) at that field's own offset; a test covers both. The message mirrors the main-file reader's wording, which an existing test pins. The board, pre-vector board, character, item and enemy readers each kept their own negative-version guard, which `header()` now makes unreachable; those copies are removed.
- [x] [Review][Patch] `readUpperBound`'s JSDoc wrongly lists vector bases as an `i32` bound [packages/core/src/formats/binary/reader.ts:204-206] — smallest fix: drop "and vector bases"; the §6.1/§6.2 vector-base bounds are `i16` and §6.3 has none. — applied 2026-10-11: The JSDoc no longer lists vector bases as an `i32` bound.
- [x] [Review][Patch] `header()`/`FormatHeader` JSDoc claims every binary Toolkit file starts with magic+major+minor [packages/core/src/formats/binary/reader.ts:22,183] — smallest fix: scope both comments to magic-carrying files, since §1.4 exempts `.tst`/`.iso` (and `.prg`). — applied 2026-10-11: `header()` and `FormatHeader` are scoped to magic-carrying files; `.tst`, `.iso` and `.prg` have none.

**Rejected**
- blind-hunter: §1.2's "check n against the bytes that remain" has no home in the primitives — false: `take()` errors at the first element read past EOF and no consumer allocates from a bound (board/reader.ts:44-64, 100-110).
- blind-hunter: `trueCount`/`readTrueCount` return a negative count unvalidated — false: the only caller (tileset.ts:119-123) reports `tileCount < 0`, so no caller-side throw occurs.
- blind-hunter: `BinaryWriter.str` writes an embedded NUL straight through — low: no read path can produce a NUL-bearing string, and the fix adds a guard to the codec.
- blind-hunter: §1.2's `i32` parenthetical omits §7.1 frames and §4.8 threads — false: the rule defers to "unless the section says otherwise", both sections state `i32`, and both readers pass `"i32"`.
- blind-hunter: `take()` accepts a non-integer or NaN `size` — low: every in-repo caller passes an integer length, and the fix adds a guard.
- blind-hunter: `isBinaryAt` classifies any non-zero byte as text — false: §1.3 prescribes exactly that ("otherwise it is text").
- blind-hunter: `decodeCp1252` substitutes 0 outside the span — low: only a caller-side bad span reaches it, and the fix adds range guards.
- blind-hunter: no `writeUpperBound`/`writeTrueCount` — false: the frozen Execution list defines the writer's surface without one, and the intent's drift clause is about readers.
- blind-hunter: §1.4's "3.1.0 sample files all carry `major` 2" vs §11/§3.6 — false: verified the corpus itself carries `major` 2 in every magic-bearing file; §11/§3.6 are about `.sav`/`.tbm`.
- blind-hunter: test-coverage holes — false: no bad outcome is claimed, and I exercised the reserve-doubling path, a `subarray` reader and the `toBytes()` copy — all correct.
- blind-hunter: §14's detection-offset checklist omits the new offsets — false: that bullet is scoped to battle formats and stays accurate; §1.3 is the normative list.
- edge-case-hunter: a stored bound larger than the remaining bytes is accepted unchecked — false: `take()` stops every read past EOF and nothing preallocates from a bound.
- edge-case-hunter: a negative stored true count is returned unvalidated — false: tileset.ts:119-123 validates it.
- edge-case-hunter: a non-integer/NaN length slips past the `take()` guard — low: same as above; the trigger is a caller-side non-integer.
- edge-case-hunter: `decodeCp1252` decodes an out-of-range span as U+0000 — low: same as above; the trigger is a caller-side bad span.
- intent-alignment: §1.2's remaining-bytes check has no home in the diff — false: same as the first rejection.
- intent-alignment: only an `i16` `bool` helper exists — false: `bool()` documents `i16`, the `i8` form is `u8()/i8() !== 0`, and no caller is misled.
- intent-alignment: the count rules are single-sourced forward only — false: same as the write-side rejection.
- intent-alignment: the writer silently wraps out-of-range values — low: documented, permitted by AD-18 and the frozen criteria, and in-repo writers pass in-range values.

### Round 2 — 2026-10-13

**Code review (round 2, second independent reviewer `review-r1`).** Verdict: PASS WITH FINDINGS. 3 live findings (3 MINOR), plus 1 MINOR on the chore `68d7839` this ticket's review also covered. The reviewer's first pass ran against a stale checkout (`docs/epic3-2-plan-refresh` @ `3ec2ab9`) and was re-baselined against `origin/main` (`9d4d336`); every finding is LIVE there and none is stale. All four findings are open (the `readBytes`/`take` `NaN` and fractional-length guard; the two exported count helpers that skip §1.2 validation; and §1.2's "check `n` against the bytes that remain" MUST, which no reader implements); the cursor-advance asymmetry is accepted as a documented contract choice. Round 1 above is unchanged.
