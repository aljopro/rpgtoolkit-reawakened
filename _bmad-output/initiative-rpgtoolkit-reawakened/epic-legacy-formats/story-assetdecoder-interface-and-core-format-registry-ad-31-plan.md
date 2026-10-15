---
title: 'AssetDecoder interface and core format registry (AD-31)'
type: 'feature'
ticket: '13'
created: '2026-10-11'
status: done
baseline_revision: '7ff33f40a790f689d3fc2e9fd8a267b4957b0fce'
route: 'oneshot'
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

**Problem:** Format ingestion is spread across two places: `core` holds the readers, but the only thing that decides *which* reader a file's extension names is `dump`'s private table in `runner-headless`. AD-31 wants pluggable ingestion — one `AssetDecoder` interface and one core format registry that dispatches by extension and magic header — so modern formats and community decoders can slot in (CAP-1, CAP-12, CAP-15).

**Approach:** Add the `AssetDecoder` interface (AD-31) and an `AssetResolver` decode context (over the landed `AssetIndex`/`AssetRoot`) to `core/formats/registry`, register every landed reader as a decoder in one core table, and give the registry extension and magic-header lookup. `dump` reads its data-format rows from that registry and decodes through it, so the project has one dispatch; its skip rows stay in the dump. Registration via `PluginDefinition.decoders` is out of scope (epic Notes, decision 2026-10-11).

## Boundaries & Constraints

**Always:** `core` stays pure and deterministic (G2, G3) — no host, no clock, no new dependency; every decoder cites its format-spec section (G7). The dump's report, digests and counts are unchanged, so `pnpm dump:check` still matches. New exports stay additive in the shared index files.

**Never:** do not add `PluginDefinition.decoders` or any plugin wiring (epic Notes). Do not change a reader's behaviour, a digest, or the committed `golden/legacy-corpus.json`. Do not treat a skip as a failure. Do not open the legacy source (G7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| REGISTER+EXT | A custom decoder with extension `zzz` | `byExtension("zzz")` returns it; `resolve("zzz", header)` returns it | No error expected |
| REGISTER+HEADER | A custom decoder whose `detect` accepts `7F` | `byHeader(bytes)` returns it even when the extension is unknown | No error expected |
| UNKNOWN | An extension no decoder claims | `byExtension` is undefined; `resolve` falls back to the header | No error — the caller skips |
| DUPLICATE | Two decoders claim one id or one extension | `register` throws (a programmer error, AD-18) | Throw |
| CORE DECODE | Each built-in decoder over bytes its writer produced | `decode` returns the model its direct reader returns | A bad file is `ok: false` (AD-18) |

</frozen-after-approval>

## Code Map

- `packages/core/src/formats/board/{model,pre-vector-reader}.ts` — `BOARD_VECTOR_MINOR` (4), `PRE_VECTOR_MINOR_MIN`/`MAX` (2/3); the §4.1 thresholds move into `board/layout.ts`.
- `packages/core/src/formats/{binary/reader,image/index,tileset/tileset,main-file,animation,battle,actor}/**` — the readers each decoder wraps; `BinaryReader(bytes, path)` for the reader-style ones, `(bytes, path)` for `readTileset`/`decodeTexture`.
- `packages/core/src/formats/resolver/model.ts` — `AssetIndex`, `AssetRoot`, `PACKAGE_ROOT` for the decode context.
- `packages/core/src/formats/result.ts` — `Result`, `ok`, `err`, `FormatError`.
- `packages/runner-headless/src/dump/{formats,parse,report,cli}.ts` — the dispatch table to re-source and the decode call to route.
- `packages/core/test/format-image.test.ts` — the `zlibSync` PNG-building pattern a registry test can copy.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/core/src/formats/board/layout.ts` — `BoardLayout`, `boardLayout(minor)`, `DecodedBoard` — the §4.1 version dispatch moves out of the dump so one place decides the board branch.
- [ ] `packages/core/src/formats/registry/decoder.ts` — `AssetDecoder<T>`, `AssetResolver` (AD-31).
- [ ] `packages/core/src/formats/registry/registry.ts` — `AssetRegistry`, `createAssetRegistry`, `register`/`byExtension`/`byHeader`/`resolve`.
- [ ] `packages/core/src/formats/registry/core-decoders.ts` — `CoreDecoders`, `CORE_DECODERS`, `CoreFormatId`, `CORE_REGISTRY` wrapping every landed reader.
- [ ] `packages/core/src/formats/registry/index.ts`, `packages/core/src/formats/index.ts`, `packages/core/src/formats/board/index.ts` — additive exports.
- [ ] `packages/runner-headless/src/dump/formats.ts` — `classify` reads data rows from `CORE_REGISTRY`; only the skip rows remain.
- [ ] `packages/runner-headless/src/dump/{parse,report,cli}.ts` — decode through `CORE_DECODERS[format]` with an `AssetResolver` context.
- [ ] `packages/core/test/format-registry.test.ts` — registration and dispatch over synthetic bytes, plus every built-in decoder.
- [ ] `packages/runner-headless/test/dump.test.ts` — follow the moved `boardLayout`.

**Acceptance Criteria:**
- Given a registered custom decoder, when the registry is asked by extension and by header, then it returns that decoder.
- Given any bytes, when a core decoder decodes them, then it returns exactly what its own reader returns on the same bytes; and for bytes the tileset writer produced, the model equals the writer's model.
- Given the fetched corpus, when `pnpm dump:check` runs, then it matches `golden/legacy-corpus.json`.

## Implementation Notes

- Route is `oneshot` because the outer harness already delegated implementation to this session; the plan is small and the author is the implementer.
- `AssetDecoder` carries `section` beyond AD-31's four fields: the dump's rows name the format-spec section (G7), and moving the rows onto the registry means the section must live with the decoder. Recorded as an assumption; the spine's AD-31 text is left alone (its `PluginDefinition.decoders` conflict is the epic's open item).
- The board decoder returns `DecodedBoard { board, layout }` so the dump's "(pre-vector, converted to vectors)" summary line survives without the dump re-peeking the header; the digest stays over the `Board` alone, so `dump:check` is unaffected.
- The quick review added: `register` validates and lowercases extensions; `parseFile` fills the file's path into a failed decoder error (AD-31's decode has no path); `classify` ignores a decoder whose id is not a core format; and the registry test compares every core decoder with its own reader.

## Design Notes

- The registry is a small mutable object (`register` throws on a duplicate id or extension — a programmer error, AD-18). The dump builds no registry of its own: it reads `CORE_REGISTRY`/`CORE_DECODERS`, so the extension table and the decode table cannot drift.
- `byHeader` scans decoders in registration order and returns the first `detect` that accepts the leading bytes; `resolve` tries the extension first, then the header (AD-31 dispatch).
- The dump decodes each file independently and resolves no cross-file references, so its `AssetResolver` carries the package's real `AssetIndex` and a package root; no landed decoder reads it.

## Verification

**Commands:**
- `pnpm typecheck && pnpm lint && pnpm test && pnpm graph && pnpm provenance && pnpm licence` — expected: exit 0.
- `pnpm fixtures:fetch && pnpm dump:check` — expected: both games match `golden/legacy-corpus.json`.

## Review Triage Log

Quick lens, 2026-10-11 (one pass; 4 findings, all real — 4 patches applied, 0 rejected):

- **Every built-in decoder must be tested against its direct reader** — `high`, patch. The test only decoded the tileset. Fixed: `packages/core/test/format-registry.test.ts` now compares *every* core decoder with its own reader on the same byte samples (success and failure paths), and the tileset case asserts the writer's model; the corpus gate (`pnpm dump:check`) still covers the sample-game files of every registered extension end to end. Acceptance criterion 2 was reworded to state exactly that property (a full writer-produced model fixture per format was not a simple fix, and the corpus gate already proves it for real files).
- **`register` accepted a non-lowercase or dotted extension** — `medium`, patch. `byExtension` lowercases the query but `register` stored the raw string, so `"PNG"` slipped past the duplicate check and shadowed nothing. Fixed: `register` now refuses a dotted or empty extension and stores the lowercased key, so the duplicate check sees it.
- **Decoders dropped the file path from `FormatError`** — `low`, patch. `AssetDecoder.decode` takes bytes, not a path, so every reader error lost `path` (the report drops it anyway, but the exported `parseFile` result weakened). Fixed: `parseFile` fills `path: file.path` into a failed decoder result unless the decoder set one.
- **`classify` trusted a mutable `CORE_REGISTRY` with an unchecked id cast** — `low`, patch. A host registering a decoder into the shared registry would give `classify` an id `parse.ts` cannot decode. Fixed: `dataClass` returns `undefined` unless the id is one of `CORE_DECODERS`' own keys, so such an extension falls back to the skip table instead of failing the dump.

## Plan Change Log

- 2026-10-11 — review loopback: acceptance criterion 2 reworded from "every built-in decoder over its writer's bytes" to "every core decoder returns exactly what its reader returns on the same bytes, plus the tileset writer's model". Reason: a per-format writer fixture for the actor, board and battle models is large, while the same property over the fetched corpus is already CI-enforced by `pnpm dump:check`, which compares against an expectation recorded from the readers. KEEP: the uniform decoder-versus-reader equivalence test — it is what closed the gap.
