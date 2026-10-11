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
