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

## Code Review

### 2026-10-11

**Code review complete.** 0 `decision-needed`, 4 `patch`, 3 `defer`, 24 rejected. The three decisions were resolved on 2026-10-11 and became patches; checked items are applied. Every patch is applied (2026-10-11).

Scope: d7bd3a6; diff excludes the ticket's own plan file. Lenses run: blind-hunter, edge-case-hunter, verification-gap, intent-alignment (thorough). Decision, patch and defer counts are entries after grouping; the rejected count is findings.

- [x] [Review][Patch] Fetch the sample main file so the real-file `.gam` test runs in CI [tools/fixtures/sources.json, tools/fixtures/fetch.mjs:409-413,451] — decided 2026-10-11 (user: harden the test ecosystem): the `golden` job now runs `pnpm test` after the fetch, but the corpus can never hold a `.gam` (the pin fetches only `build/game/<game>`), so the real-file case in `format-main-file.test.ts` still skips. A tooling change: extend the fixture pin to fetch `build/main/*.gam`; once nothing is skipped, a "no skipped tests in golden" check becomes possible. — applied 2026-10-11: The pin names `build/main` and `demo.gam`, and the fetch copies the file into `fixtures/legacy/demo/` (sparse checkout; the file is checked to exist and not to collide before checkout; it is counted, stamped and cached). Fetched from the real pin it is 1883 bytes and identical to the file the reviewers parsed. The real-file `.gam` test now runs, and the `golden` job runs the suite as `pnpm test:strict` (`tools/no-skips`), which fails on any skipped test. The corpus expectation gained the `demo.gam` digest.
- [x] [Review][Patch] `projectFolder` doubled the `Game/` prefix for the `projectPath` a real `.gam` stores [layout.ts] — decided 2026-10-11 (user guessed the path comes from the `.gam` and asked whether to resolve from both the working folder and the `.gam`'s own folder): the real demo `.gam` stores `Game\demo\`, relative to `<root>` (the folder that holds `Main/` and `Game/`), not to `Main/`, so one base is enough and the real ambiguity is the stored form. Applied: `projectFolder` accepts both forms (a first segment `Game` with more after it is root-relative; anything else is a bare name placed under `Game/`), format-spec §1.5 and §2 row 5 say so, tests pin `Game\demo\`, `game/demo`, bare `demo`, `Game\Game\` and bare `Game`, and the resolver finds assets under each. Finding `<root>` stays the host's job (the folder above the `.gam`'s own, or the folder the game was opened in).
- [x] [Review][Patch] `readMainFile` returned ok without consuming trailing bytes, and `writeMainFile` dropped them — decided 2026-10-11 (user: warn, and keep the residue where dropping it would make the saved file differ from the one read, which it does); applied: `MainFile` gains `residue`, `readMainFile` keeps the bytes and warns once, `writeMainFile` re-emits them (format-spec §1.7). The old `residue` field that held the reserved runs is renamed `reservedRuns`, so `residue` means the same thing in every model.
- [x] [Review][Patch] `writeMainFile` silently serialises models it cannot represent [`packages/core/src/formats/main-file/writer.ts:23-30`] — smallest fix: validate before serialising (magic, minor 0-9, `u8`/`i16`/`i32` field ranges, list lengths, exactly eight scan codes, each residue run's width for the minor) and fail with a located `FormatError` the way `board/writer.ts:33` does, instead of writing `minor 12`, wrapping `gameSpeed: 200` to `-56`, padding three scan codes to eight or shifting every later field. — applied 2026-10-11: `writeMainFile` validates before it writes (magic, minor 0 to 9, every field's range, list lengths, exactly eight scan codes, each reserved run's width) and returns a located error. Eight rejection tests each fail without the check.
- [x] [Review][Defer] A stored bound below −1 (e.g. −2) is read as "none" rather than reported [`packages/core/src/formats/binary/reader.ts:40`] — deferred: root cause in ticket 2.1's binary primitive (readUpperBound); fixing it there fixes this reader.
- [x] [Review][Defer] `resolveReference` has no consumer; the landed resolver duplicates its composition [`packages/core/src/formats/main-file/layout.ts:117`] — deferred: introduced by the later commit `acf48f8` (ticket 2.10), not by d7bd3a6.
- [x] [Review][Defer] Row-numbering citations reproduce §2's collision [`packages/core/src/formats/main-file/model.ts:75-92`] — deferred: the fix edits `docs/format-spec.md` §2 (G7 doc-first), behaviour unaffected.

**Rejected**
- blind-hunter: The declared upper bound is trustingly consumed instead of checked against remaining bytes — low: every read is bounds-checked and nothing is reserved up front, so the §1.2 harms cannot occur; only the error location on a corrupt file suffers, and the fix adds a guard branch.
- blind-hunter: §1.3 binary-vs-text detection is never applied to `.gam`; text input misreported / magic echoed unboundedly — low: a text-form `.gam` is still refused (probe: §1.1 "unterminated string" at offset 0) and §2 declares the format binary-only; the fix adds a detection path for a message-quality gain.
- blind-hunter: The registration-row quirk is committed to one on-disk shape with no detection — false: the real `demo.gam` bytes 14-26 are `02 00 09 00 01 00 4e4f434f4445 00` (the editor's i16 flag + "NOCODE", landing at 0x1B), so the i32-flag mis-alignment needs a file that was never written; `MAIN_PROJECT_PATH_OFFSET` is the format's documented offset.
- blind-hunter: §2's "up to 50" limit on extra run-time keys is enforced nowhere — false: the real `demo.gam` stores bound 50, i.e. 51 entries, so enforcing the limit would reject the sample; nothing mis-parses.
- blind-hunter: A stored non-zero high byte in a `color` cannot round-trip — false: §1.1 defines the high byte as zero in every legacy value and requires the writer to emit `0x00`, and the real file's colours already have a zero high byte.
- blind-hunter: `projectFolder` turns an absolute root into a relative path when the root is only separators — low: real (`projectFolder("/", …)` = `"Game/demo/"`) but a game rooted at `/` is not met in use, and the fix must split the `""`/`"/"` cases.
- blind-hunter: `resolveReference` cannot express "no reference" — low: no caller resolves an empty reference, and 2.10's index-based resolver reports one as a located "missing asset".
- blind-hunter: Separator normalisation is per-character and a leading separator survives — low: a scan of all 68 reference-like strings in the fetched corpus found none starting with or doubling a separator, and the fix adds normalisation branches.
- blind-hunter: The layout API covers only one of §1.5's three roots — false: the ticket's plan names the layout surface and its acceptance criterion covers only `<root>/Game/<projectPath>/…`; `Main/`/`Saved/` are other tickets' surface.
- blind-hunter: The §13 package exception is absent from the layout documentation — false: the only consumer (2.10's resolver) implements the package exception itself, so no caller is misled.
- blind-hunter: The golden-fixture test searches for `.gam` in the wrong place — false: the fetch lands each game at `fixtures/legacy/<game>/…` and `collectGam` recurses that root, so a `.gam` fetched from `build/main` would be found and round-tripped.
- blind-hunter: The module's own error and layout surface is partly untested — low: real coverage gaps, but the byte-for-byte tests pin the reader/writer behaviour and the fix is new tests.
- blind-hunter: Fixture construction is rebuilt 120 times and used for minors the format does not define — false: the out-of-range-minor fixtures assert header rejection at offset 16, the reader's documented order, and in-memory rebuilds cost nothing.
- blind-hunter: No comment ties §2's rows to engine behaviours (E-xx IDs) — low: a commit/comment citation nit against the repo's working note, with no behavioural harm.
- edge-case-hunter: A `root` of only separators makes the layout functions return a relative path — low: same real behaviour, unreached in use, and the fix adds a branch.
- edge-case-hunter: A `..` segment in `projectPath` or a reference escapes `<root>/Game` — low: `core` performs no I/O, 2.10's resolver looks the key up in a host-supplied index (an escaping key simply misses) and 2.10's loader enforces its own path limits, so nothing reads or writes outside the project.
- edge-case-hunter: A reference with a leading separator duplicates the type folder and leaves `//` — low: the trigger shape does not occur in the fetched corpus and the fix adds normalisation branches.
- edge-case-hunter: A `kind` outside `AssetKind` at runtime throws `TypeError` — false: `AssetKind` is a closed union and no caller in the repo passes a runtime string, so the throw needs a caller already violating the type.
- edge-case-hunter: A non-zero COLORREF high byte is dropped, so the round-trip is not byte-identical — false: duplicate of the earlier colour finding; §1.1 mandates the writer emit `0x00`.
- verification-gap: The "conditional rows are absent" test never calls the reader/writer — low: it exercises the fixture builder, while the byte-for-byte test catches reader/writer changes; the fix is a rewritten test.
- intent-alignment: Divergence (a) layout returns path strings, not the keyed-resolution surface — false: `foldPath` is the key helper and `typeFolder`/`ASSET_FOLDERS` the subfolder table, and the keyed index is 2.10's, as the module header states.
- intent-alignment: Divergence (b) layout takes a one-field projection, not "a main-file model" — false: `Pick<MainFile,"projectPath">` is a structural supertype any main-file model satisfies.
- intent-alignment: Divergence (d) plugins are raw entries, not "active plugins" — false: the model carries both stored shapes and the implied `tkplug<N>` name is derivable from the entry index, so no file information is lost.
- intent-alignment: Divergence (g) four conditional runs are opaque residue — false: §2 calls those runs "reserved — ignore"; keeping the raw bytes is what makes the writer byte-identical.
