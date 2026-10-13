---
title: 'Enforce the amended boards, actors and battle rules in the readers'
type: 'feature'
ticket: '18'
created: '2026-10-12'
status: 'built'
baseline_revision: '71a0c1fb1f31626906987ec0c0c4ccb33b6624d8'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['docs/guardrails.md', 'CLAUDE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `docs/format-spec.md` was amended (PR #42, entry 2.17) with rules the readers may not enforce yet: section 4.2 and 14 (a run marker followed by a negative LUT index is invalid; a run past the end of the grid is read in full, keeps the extra indices and reports a warning; the LUT is absent only for upper bound -1, otherwise index 0 is the empty "no tile" entry and no other negative bound is valid; isometric detection is bit 1 or 2), the accepted `minor` ranges (section 6.1 actors `.tem` 0-8, 6.2 `.itm` 0-7, 6.3 `.ene` per its text, 8.1 `.spc`, 8.2 `.ste`, 8.3 `.bkg` each 2-3, all refusing out-of-range and negative versions and the text form as section 1.4 says), and `.ste` and `.bkg` must report a short read before probing the detection byte, as `.spc` already does.

**Approach:** Audit each reader against those spec passages, change only what disagrees, and pin each rule with a synthetic file test. The spec is the only source (G7); never open `../rpgtoolkit`.

## Boundaries & Constraints

**Always:** refuse or warn exactly as the spec words it (refuse vs warn matters: an over-long run is a warning and the board still round-trips verbatim, AD-18); located errors with path, offset and section as existing readers give; `core` stays pure (G2, G3); sample files keep round-tripping; tests that encoded an old guess change to the amended rule.

**Never:** edit `docs/` or the spine (a spec gap goes in Implementation Notes); touch golden files or hash vectors unless a changed expectation forces it (say why); add dependencies; push.

</frozen-after-approval>

## Code Map

- `docs/format-spec.md` sections 1.2, 1.4, 4.2, 6.1-6.3, 8.1-8.3, 14 — rules; read only.
- `packages/core/src/formats/board/reader.ts` (and `writer.ts` for the round-trip), `packages/core/src/formats/actor/*.ts`, `packages/core/src/formats/battle/*.ts` (find `.spc`, `.ste`, `.bkg` readers; the `.spc` reader is the short-read model).
- Existing tests under `packages/core/test/format-*.test.ts`; extend the matching file per reader.

## Tasks & Acceptance

**Execution:**
- [x] Audit each rule above against its reader; record agree/disagree in Implementation Notes.
- [x] Fix each disagreement.
- [x] A synthetic test per rule: negative index after a run marker refused; over-long run warns, keeps extra indices and round-trips; negative LUT bound other than -1 refused; index 0 of an existing LUT; iso detection for bit 1 and bit 2; each accepted minor range edge (accepted lowest and highest, refused one below and one above, negative, text form); truncated `.ste` and `.bkg` report a short read.
- [x] Commit `feat(core): enforce the amended board, actor and battle rules in the readers (epic 2.18)`, staging only your files.

**Acceptance Criteria:**
- Given a synthetic file for each rule, when read, then it is refused or warned as the spec says.
- Given a truncated `.ste` and `.bkg`, when read, then a short read is reported before the detection byte is probed.
- Given the sample files, when `pnpm test:strict`, `pnpm golden`, `pnpm dump:check` run, then they pass and still round-trip.

## Implementation Notes

Audit of each amended rule against its reader (agree = no code change; disagree = fixed):

**Board (§4.2, §14)** — `packages/core/src/formats/board/reader.ts`
- Run marker followed by a negative LUT index is refused — **agree** (`readTileMatrix` already returns a located §4.2 error).
- A run past the end of the grid is read in full, keeps the extra indices and warns — **agree** (the loop stops once the grid is covered, after pushing the whole run; the overshoot pushes a warning and the stored runs round-trip).
- The LUT is absent only for `lutUpperBound` -1; index 0 is the empty entry; no other negative bound — **agree** (`readUpperBound` refuses any stored bound below -1 with a §1.2 error; -1 yields no entries; a ≥ 0 bound reads `bound + 1` entries including index 0).
- Isometric detection is bit 1 or 2, but only bit 2 expands the grid — **agree** (`boardGrid` keys the `(sizeX + sizeY)²` shape on bit 2 alone; bit 1 and bit 4 keep `sizeX × sizeY`).
- No code change was needed; the four rules are now pinned by tests.

**Actors (§6.1–§6.3, §1.4)** — **agree**, no code change.
- `.tem` accepts `minor` 0–8, `.itm` 0–7, `.ene` the single binary minor 1; all three refuse out-of-range minors with a located error, and `header()` refuses a negative version at its own byte (§1.4); the text form is refused at each format's detection byte.
- The accepted ranges are now pinned at both edges, one below/above, negative and text form.

**Battle (§8.1–§8.3, §1.4)** — **disagree**, fixed.
- None of `.spc`, `.ste` or `.bkg` enforced the accepted `minor` 2–3 range (each read the header, checked only the magic, and read on). Added `BATTLE_MIN_MINOR`/`BATTLE_MAX_MINOR` and the shared `unsupportedBattleMinor` helper, and a range check in all three readers.
- `.ste` and `.bkg` probed the detection byte *before* the header, so a file too short to carry the byte reported the probe's "detection byte out of range" (§1.3) instead of the header's short read. Reordered both to read the header first and probe second (as `.spc` already did), so a truncated file reports the §1.1 short read.
- Tests that encoded the old minor-0 guess (`packages/core/test/format-battle.test.ts` builders/assertions, and the `.spc`/`.ste` fixtures in `packages/runner-headless/test/dump.test.ts`) changed to the amended minor 2.

**Tests added** — a synthetic case per rule: the board run/LUT/iso rules (board test), the actor minor edges (actor test), the battle minor range and the `.ste`/`.bkg` short read before the detection byte (battle test).

No spec gap was found: every rule above was already worded in `docs/format-spec.md`.

## Plan Change Log

## Review Triage Log

## Verification

Dependencies and fixtures are installed in this worktree.

**Commands:**
- `pnpm typecheck && pnpm lint && pnpm test:strict && pnpm golden && pnpm dump:check && pnpm graph && pnpm provenance` -- expected: all pass, no skipped tests

Verification (orchestrator): typecheck, lint, test:strict (474 pass, 0 skipped), golden, dump:check (Basic 16, demo 30 digests match), graph, provenance all pass; samples round-trip.

Pass 1 (quick lens): high 0, medium 0, low 2, false 0.

| Verdict | Route | Finding and evidence |
|---|---|---|
| low | patch | The test named "isometric detection is bit 1 or bit 2…" only checks grid cell counts; no code exposes an is-isometric predicate (grep finds none), so the name overclaimed. Renamed to what it checks. |
| low | patch | Plan checkboxes and Verification results were unrecorded; recorded here. |
