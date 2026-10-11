---
title: 'Animation (.anm) reader and writer'
type: 'chore'
ticket: '4'
created: '2026-10-11'
status: 'done'
baseline_revision: '68d7839ca5b6a416a5316f0bf171e99b162e1c7a'
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

**Problem:** Epic 2 must read and write every legacy Toolkit data format. The animation format (`.anm`, format-spec §7.1) is a fixed run of frame slots — each with an image reference, its own transparent colour and an audio cue — plus one `f64` delay. The samples store 51 slots, many of them empty, and the frame images may be plain pictures, tile references (`set.tstN`, §1.6) or `.tbm` bitmaps. Nothing parses it yet.

**Approach:** Add `packages/core/src/formats/animation/` built on the ticket-2.1 `Result`/`FormatError` contract (AD-18) and `BinaryReader`/`BinaryWriter` (§1). The reader rejects any minor other than 3, expands the `i32` upper bound to `n + 1` slots (using `readUpperBound("i32")`), keeps every slot and every image string verbatim, and reads the trailing `f64` delay. The writer reproduces the same bytes. A pure classifier maps a frame image to a tile reference, a `.tbm`, a picture path or nothing, without resolving it against a project.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no imports of other packages. Determinism (G3): only the allowlisted `Math` members where maths is needed, no `**`, no `Date`/`performance`/`Intl`/`Math.random`. Every implementing file names its `docs/format-spec.md` section (G7). One public entry per package (AD-22): consumers import `@rpgtoolkit/core`. `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. Readers return `Result` and never throw (AD-18).

**Never:** add a runtime dependency, touch the legacy GPL source, edit `golden/**`, resolve asset paths in `core` (§1.5 belongs to the asset resolver), drop empty frame slots, or commit fixture data.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/animation/model.ts` — `Animation`, `AnimationFrame`, `ANIMATION_MAGIC`, `ANIMATION_MINOR`, `ANIMATION_SECTION`; the model keeps every frame slot and each frame's raw image string and own `Colorref` — §7.1.
- [x] `packages/core/src/formats/animation/image-reference.ts` — `classifyImageReference`: `default.tst12` → tileset `default.tst` + index 12 (§1.6), `.tbm` → tile bitmap (§3.6), anything else → picture path, empty → empty, no file resolution.
- [x] `packages/core/src/formats/animation/reader.ts` — `readAnimation(reader)`: `header()`, magic check, minor must be 3 (else a located `FormatError`), `i32` width/height, `readUpperBound("i32")` slots, per-frame `str`/`color`/`str`, then `f64` delay.
- [x] `packages/core/src/formats/animation/writer.ts` — `writeAnimation(model) -> Result<Uint8Array>` reproducing the layout, deriving the stored bound back from the slot count (`-1` when empty) — §1.2.
- [x] `packages/core/src/formats/animation/index.ts`, `packages/core/src/formats/index.ts` — re-exports; the formats barrel gains `export * from "./animation/index.ts";`.
- [x] `packages/core/test/format-animation.test.ts` — `node:test` over synthetic buffers: header values, minor rejection, wrong magic, `n → n + 1` and `-1 → none` slots, kept empty images, per-frame colours, the classifier, the `f64` delay, byte-identical round-trip, located EOF errors, and a fixture test over every sample `.anm` (skipped when fixtures are absent).
- [x] `packages/core/test/node-env.d.ts`, `types/node-test.d.ts` — added the test-only `existsSync`, binary `readFileSync`, recursive `readdirSync`, `console`, and the `test(name, options, fn)` overload the new test needs (no host globals reach `core`; G2).

**Acceptance Criteria:**
- Given a `.anm` with minor 3, the reader returns magic/major/minor, width, height, every frame slot (empty ones kept) with its own transparent colour and sound, and the delay, consuming the file exactly.
- Given a minor other than 3, the reader returns `ok: false` with a `FormatError` at the minor field offset and section `format-spec §7.1`.
- Given a stored bound `n`, the reader returns `n + 1` slots and `-1` returns none (§1.2).
- Given a parsed model, `writeAnimation` returns bytes identical to the input, including empty slots and varied transparent colours.
- Given the fetched fixtures, every `.anm` under `demo` and `Basic` parses with `reader.remaining === 0` and round-trips byte-for-byte.

## Implementation Notes

- **Bound round-trip.** The model stores the frame slots, not the stored bound; the writer emits `frames.length - 1`, or `-1` when there are none. `upperBoundCount` makes this exact for every valid stored bound (`-1`, `0`, `n`).
- **Empty frames are data.** A frame with an empty image is skipped at *playback* time only; the reader keeps the slot so the writer can reproduce the file.
- **Image strings verbatim.** The reader never rewrites a reference, so a round-trip cannot silently re-case or re-separate a path. Classification is a separate, pure helper.
- **Classifier grammar (§1.6).** Split at the last `.`; the three characters after it are the extension and the rest, when it is all digits, is the 1-based index. Only `tst`/`iso` with a digit run are tile references; `.tbm` is a tile bitmap; everything else is a picture. Extension matching is case-insensitive (§1.5).
- **Errors (AD-18).** Header/magic/minor errors carry `section: "format-spec §7.1"`; EOF and short reads propagate the `BinaryReader`'s `§1.1` error with the field's first byte. The reader never throws.

## Plan Change Log

- 2026-10-11 — initial plan; the sample layout is 51 slots (stored bound 50) with empty slots, confirming the upper-bound rule of §1.2 over a plain count.

## Review Triage Log

## Design Notes

- No new dependency: `Uint8Array`/`DataView` via the existing binary primitives only.
- The classifier returns a tagged union so callers narrow on `kind` rather than re-parsing strings; it deliberately does not resolve paths, keeping `core` I/O-free (G2, §1.5).

## Verification

**Commands (all in the worktree, baseline `68d7839`):**
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 116 tests pass, 0 fail, 0 skipped; the fixture test round-tripped **26** sample `.anm` files.
- `pnpm lint` — exit 0; `check-core-deps: 0 core runtime dependencies matches the allowlist`, eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (65 modules, 161 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 153 files`, `0 violations`.

## Code Review

### 2026-10-11

**Code review complete.** 0 `decision-needed`, 2 `patch`, 2 `defer`, 18 rejected. The two decisions were resolved on 2026-10-11 and became patches; checked items are applied.

Scope: 9eaf6bc, cca70e3; diff excludes the ticket's own plan file. Lenses run: blind-hunter, edge-case-hunter, verification-gap, intent-alignment (thorough). Decision, patch and defer counts are entries after grouping; the rejected count is findings.

- [x] [Review][Patch] Sample-corpus tests are skipped in CI (fixtures are only fetched in the golden job) — decided 2026-10-11 (user: harden the test ecosystem); applied as the recommended option: the `golden` job now runs `pnpm test` right after `pnpm fixtures:fetch` and `pnpm fixtures:check` (`.github/workflows/ci.yml`, described in `CONTRIBUTING.md`), so the parse and byte-identical round trip of the 26 sample `.anm` files execute in CI instead of being skipped in `unit`.
- [x] [Review][Patch] Trailing bytes are silently dropped instead of being kept as residue — decided 2026-10-11 (user: warn, and keep the residue where dropping it would make the saved file differ from the one read, which it does); applied: `Animation` gains `residue`, `readAnimation` keeps the bytes and warns once, `writeAnimation` re-emits them (format-spec §1.7), tests cover both, and `golden/legacy-corpus.json` was re-recorded because the 26 `.anm` digests now include the empty residue.
- [x] [Review][Defer] Negative upper bounds below -1 are accepted as zero slots [packages/core/src/formats/animation/reader.ts:58] — deferred: root cause in ticket 2.1's binary primitive (readUpperBound); fixing it there fixes this reader
- [x] [Review][Defer] A negative `major` is accepted by `readAnimation` [packages/core/src/formats/animation/reader.ts:42] — deferred: root cause in ticket 2.1's binary primitive (`header()` accepts a negative version, which §1.4 calls invalid; see its patch); fixing it there fixes this reader (a negative `minor` is already refused by the `minor !== 3` check).

**Rejected**
- blind-hunter: reader.ts:58 trusts the stored frames bound and never compares it with reader.remaining — low: inner reads are bounds-checked and fail safely with located FormatError; only error offset/section on corrupt input differs; fixing it adds branches
- blind-hunter: The text form is neither handled nor diagnosed — low: 2.x text animations are rejected with located FormatError at offset 0; no text animation exists in the corpus; §1.3 only mandates supporting binary forms; fixing it adds an isBinaryAt probe and error branch
- blind-hunter: image-reference.ts covers only two of §1.6's four tile-reference extensions — low: format-spec §7.1 and plan define tile references for animation frames as set.tstN / set.isoN; neither rock.gph nor water.tan appears in any animation file in the corpus; fixing it adds variants to ImageReference and branches
- blind-hunter: The classifier's kind names do not line up with AssetKind — false: ImageReference is a semantic decomposition of animation frame contents (including index numbers for tilesets) rather than an asset directory kind, and stripTypeFolder in resolveAsset already handles type folder prefixes
- blind-hunter: `index` is unvalidated and lossy — low: AnimationFrame.image preserves raw string verbatim for round-trip; everyday tile references are small positive integers; invalid indices like 0 or 1e+30 fail safely during asset lookup; fixing it adds bounds-checking branches
- blind-hunter: The case-insensitivity claim is only half true — false: preserving the source string's case in the tileset field while case-insensitively recognizing extensions is intentional and correct; case-folding lookup is handled by the asset resolver via foldPath per §1.5
- blind-hunter: Writer/reader invariant asymmetry — false: writers across all formats in the repo re-emit model header fields verbatim to ensure byte-exact round-tripping per AD-18; writers are encoders, not model validators
- blind-hunter: reader.ts:44 locates the minor error as reader.offset - 2 — false: reader.offset - 2 correctly identifies the start of the 2-byte minor field consumed by header(), matching format-spec §1.3/§1.4 and sibling readers; verified by test at format-animation.test.ts:102
- blind-hunter: Test gaps for documented or helper-dependent behaviour — low: synthetic test suite has 13 tests covering all acceptance criteria; all sample files round-trip byte-identically; adding tests for minor edge cases is not worth fixing
- blind-hunter: The fixture test asserts nothing about the corpus it claims to cover — low: format-animation.test.ts:271-283 asserts remaining === 0 and byte-identical round-trip for every sample animation, satisfying the plan's acceptance criteria; lack of an explicit count assertion or pinned facts table is cosmetic
- edge-case-hunter: Tile references rock.gph, water.tan and bare set.tst fall through to picture — low: same substance as #5; bare set.tst has no tile index and is not a valid tile reference under §1.6; fixing it adds branches
- edge-case-hunter: Unbounded digit run yields a tile index beyond Number.MAX_SAFE_INTEGER — low: same substance as #7; raw string is preserved verbatim and everyday tile references never exceed safe integer limits; fixing it adds branches
- edge-case-hunter: Image beginning with a dot yields a tile with empty tileset name — low: .tst12 is corrupt input that fails asset resolution regardless of classification; everyday files never begin with a dot; fixing it adds a branch
- intent-alignment: D1 — Intent claim "51 slots, many empty" vs diff tests — false: the 51-slot mention in the plan is background motivation for why the upper-bound rule must be preserved, not a test acceptance requirement; all named acceptance criteria are fully met
- intent-alignment: D2 — Intent claim "images may be pictures / tile references / .tbm" vs diff coverage — false: the 2004 sample corpus only contains tile references; testing picture and .tbm branches using synthetic unit tests is the only possible way to test them and is properly implemented
- intent-alignment: D3 — Intent §1.6 citation vs classifier scope — low: same substance as #5; .gph and .tan are not used in animations, and the plan explicitly specified set.tstN; fixing it adds branches and modifies public types
- intent-alignment: D4 — Writer version enforcement vs "rejects any minor other than 3" — false: same substance as #9; the plan specifies reader rejection of minor !== 3 and writer verbatim re-emission; writer emission of model.minor verbatim matches all writers in the repo
- intent-alignment: D5 — "Verbatim" scope: transparent stored as struct (Colorref) — false: COLORREF high byte is ignored on read and 0 on write per §1.1; unpacked Colorref struct is uniform across core; all sample files round-trip byte-identically
