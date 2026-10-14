---
title: 'Distribution package writer with manifest'
type: 'chore'
ticket: '12'
created: '2026-10-11'
status: 'done'
baseline_revision: '751b19806ce15ba66f1671c0628063994de6fa11'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'thorough'
review_source: 'pinned'
lenses_ran: ['blind-hunter', 'edge-case-hunter', 'verification-gap', 'intent-alignment']
review_loop_iteration: 2
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-legacy-formats/discovery/package-limits.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2's Done-when 5 is "the distribution package round-trips with its manifest". Ticket 2.10 landed the *reader*: `loadPackage` turns a loose folder, a `.tpk` and an appended-ZIP EXE into one `LoadedPackage` (files plus the resolver's index, AD-5), under one exported set of untrusted-input limits. AD-6 also requires `core/formats/package` to **write** the project's own distribution package — a `.tpk`-compatible ZIP plus `manifest.json { schema, main, index }` — and nothing writes one yet. Until it exists, "a built game" is a folder nothing guarantees the reader will accept.

**Approach:** Add `packages/core/src/formats/package/write.ts` exporting `writeDistributionPackage(input)`, where `input` is the asset tree (every file as `{ path, bytes }`) plus the manifest. It validates the manifest and every file against the same `PACKAGE_LIMITS` and path rules the reader applies, lays out a ZIP container whose every field is derived from the input alone (so the output is byte-deterministic, G3), reads its own bytes back through the landed `readZip` before returning them, and returns `Result<Uint8Array>` — never throwing (AD-18).

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no file system, no other workspace package; only `fflate/browser`'s synchronous exports. Determinism (G3): the ZIP's DOS timestamp fields are fixed constants (the ZIP epoch, 1980-01-01 00:00:00), never a clock or a time zone; only the allowlisted `Math` members (`round`, `max`); no `**`, no `Date`/`performance`/`Intl`/`Math.random`. Every implementing file cites its `docs/format-spec.md` section (G7): §13, with §1.5's path rules and AD-5/AD-6/AD-17/AD-18/AD-23/AD-25/AD-28. One public entry per package (AD-22). `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. Games are untrusted (AD-17): a package the writer cannot prove the reader accepts is refused with a located error naming the rule.

**Never:** add a runtime dependency (`fflate` is already on the allowlist), read the legacy GPL source, touch `golden/**`, change the reader's behaviour or the existing `limits`/`model`/`package`/`zip` exports, or commit sample packages or ZIP fixtures.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/package/write.ts` — `MANIFEST_FILE_NAME`, `DistributionManifest { schema, main, index }`, `DistributionInput { files, manifest }` and `writeDistributionPackage`: manifest and path validation, the L2/L3/L4 budgets, the L5-safe store/deflate choice, the deterministic ZIP container (local headers, central directory, EOCD), and the `readZip` self-check — §13, AD-6.
- [x] `packages/core/src/formats/package/index.ts` — one `export * from "./write.ts"` line; the reader is untouched.
- [x] `packages/core/test/format-package-writer.test.ts` — 14 `node:test` cases: the round-trip (a nested folder, four kilobytes of compressible data and an empty file), byte determinism, the reader's checks and resolver equivalence with the extracted folder, the L5 ratio guard, and the refusals (`..`, absolute, duplicate-by-case, a caller file named `manifest.json`, a missing or malformed manifest, a mismatched index, the L2 entry count and the L6 path length).
- [x] `packages/core/test/node-env.d.ts` — declared `TextDecoder` alongside `TextEncoder`, so the test can parse the manifest it read back (module-only, no globals; unaffected by ticket 2.11's files).

**Acceptance Criteria:**
- Given an asset tree and a manifest, `writeDistributionPackage` followed by `loadPackage({ kind: "tpk" })` yields the identical paths, bytes and manifest.
- Given the same input twice, the written bytes are identical.
- The written package passes the reader's CRC-32, declared-size and limit checks, and resolves through the same resolver as the extracted folder (`Boards/inn.brd`, `Boards\Village\Shop.BRD`, `Tiles\default.tst`).
- Given a `..`/absolute/duplicate-by-case path, a missing or malformed manifest, a mismatched index, or a tree past an exported limit, the writer returns a located `FormatError` naming the rule.
- Given any input at all, the writer returns a `Result` and never throws.

## Implementation Notes

### Reading AD-6's `manifest.json { schema, main, index }`

AD-6 names the manifest's three fields in one word each; the plan records how they were read, because the words alone are ambiguous:

- **`schema`** — the *project-level* integer schema version of AD-23 ("project-level files the project owns carry an integer `schema` too"), not `GameState.schema`'s per-section object (that is a save, not a distribution). The writer requires a non-negative integer and refuses anything else, naming `project schema, AD-23`.
- **`main`** — the in-package path of the main file (the `.gam`), e.g. `Main/demo.gam`, so a consumer can boot without listing the archive. It is a *file*, not the game-folder root: AD-5/§13 make a package ignore the main file's `projectPath`, so a root would name nothing. The writer requires it to be a valid file path that is present in the tree.
- **`index`** — the relative paths the resolver keys on (AD-5): every game file in the tree, once each. It is the caller's index, validated to match the tree exactly (set equality after case/separator folding), so a consumer can build the resolver's `AssetIndex` without walking the archive. `manifest.json` itself is the descriptor and is *not* part of the index the caller supplies; the reader's index does list it, because it is built from every archive entry — the test asserts the reader's index is exactly the extracted folder's.

### Why the container is written here rather than by `zipSync`

`fflate`'s synchronous `zipSync` stamps every entry with a DOS date/time derived from `new Date(mtime)` using **local** getters (`getFullYear`, `getMonth`, `getDate` …). Passing a fixed millisecond value does not fix that: the same value maps to a different date in a different time zone, and the first attempt with the ZIP epoch even threw `date not in range 1980-2099` in this worktree's zone (the epoch is 1979-12-31 there). G3 bans `Date` and time-zone-sensitive behaviour in `core`, so the writer builds the container itself with `strToU8` (names and the manifest's bytes) and `deflateSync` (compression), and writes fixed DOS date/time constants. AD-6's requirement — `fflate/browser`, synchronous APIs only — is met by `deflateSync`; the container is 30-byte local headers, the central directory and the 22-byte end-of-central-directory record, exactly the shape `readZip` parses.

### How the writer guarantees the reader accepts its output

- **The budgets are checked before anything is written** — entry count (L2), per-file size (L3), the total (L4) and every path rule (L6–L10) — under the same `checkEntryPath` and `foldPath` the reader uses, so the two cannot disagree.
- **The L5 ratio (zip-bomb guard) is designed around, not asserted.** `compress` deflates an entry, and uses deflate only when it both shrinks the entry and stays at or below `maxCompressionRatio`; otherwise the entry is stored (ratio 1:1). A 200,000-byte run of zeroes therefore writes as stored, which the test proves by reading it back — a deflated entry would have been refused by the reader at L5.
- **The finished bytes are read back through `readZip`** and compared path-for-path against the input. A mismatch or a reader error is a located failure, not a package that escapes.
- **A caller file named `manifest.json` is refused** (after folding, L10), because the writer writes that name itself; likewise a `main` that names it.

### Determinism

Entries are ordered by path with an explicit code-unit comparator (never `localeCompare`, AD-25) and each is stored or deflated by the same rule, so the same input gives byte-identical output. The manifest's JSON is serialised from a freshly built `{ schema, main, index }` object, so its key order does not depend on the caller's object, and `index` is copied in the caller's order. The test writes the fixture twice plus once from a rebuilt tree and compares bytes.

## Plan Change Log

- 2026-10-11 — implementation: replaced the first `zipSync`-based container with the hand-written one after `zipSync`'s local-time DOS timestamp threw `date not in range 1980-2099` in this worktree's time zone; a fixed millisecond `mtime` still varies by zone, so only writing the fields removes the clock and zone from the output (G3).
- 2026-10-11 — implementation: the file-path *shape* rule (empty, trailing separator, `.`/empty segment) was separated from the §1.5 escape/length rules and the escape check runs first, so a path like `/etc/passwd` reports `path escape, L9` rather than the shape rule.

## Design Notes

- **One deflate per entry.** `compress` returns both the method and the body, so an entry is deflated once and the result reused, rather than being deflated to decide and again to write.
- **The CRC is `formats/image/crc32.ts`'s.** The same reflected polynomial the reader verifies with (§10), so the writer cannot ship a CRC the reader would compute differently.
- **The name flag mirrors `fflate`'s rule.** Bit 11 (UTF-8) is set exactly when the path's UTF-8 byte length differs from its string length; the reader and `unzipSync` decode names with the same rule, so names round-trip whatever their characters.
- **`readZip` is the self-check, not a second implementation.** The reader's limits, CRC and declared-size proofs are the acceptance test, so the writer's guarantee is tested by the code that will consume the package.
- **The manifest is written last, then the whole list is sorted.** The manifest's position in the archive is therefore deterministic too, and it sits at the root (its path has no separator).
- **`offset` is always 0 in these errors.** A package being written has no meaningful byte offset; the message names the rule instead, which is what a caller can act on.

## Verification

**Commands (all in the worktree, baseline `751b198`, rebased onto `2aa135e` — ticket 2.11's merge, which touched no file here):**
- `pnpm install --frozen-lockfile` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 318 tests, 308 pass, 0 fail, 10 skipped (14 of them new).
- `pnpm lint` — exit 0; `check-core-deps: 1 core runtime dependency matches the allowlist` (fflate), eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (125 modules, 390 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 212 files`, `0 violations`.
- `pnpm licence` — exit 0; `Licence check PASSED`, 0 violations.
- `uv run _bmad/method/scripts/tickets.py --project-root . status` — entry `2.12` reported `done` with no orphan row.

## Review Triage Log

### Round 2 — 2026-10-13 (`review-r3-package-ci`)

| # | Lens | Finding | Verdict | Route |
|---|---|---|---|---|
| 1 | edge-case-hunter | `write.ts:383`: `index` keeps the caller's order, so logically identical trees give different bytes (3534 vs 3536); undocumented reproducibility limit | confirmed (open at HEAD) | fixed — branch `fix/epic2-fold-and-zip-work-bound` (`6514031` fix, `c87c82e` docs, `9759eb8` test) |
| 2 | blind-hunter | `write.ts:416`/`:192`: L1 is proved after all entries are deflated, so an over-limit tree pays compression first | confirmed (open at HEAD) | fixed — branch `fix/epic2-fold-and-zip-work-bound` (`6514031` fix, `9759eb8` test) |
| 3 | blind-hunter | 0xFFFF entry-count and 0xFFFFFFFF size/offset overflows are unreachable (L2 < 65,535; L1/L3/L4 cap sizes); UTF-8 name flag rule sound; CRC consistent with the reader | verified-ok | rejected |
| 4 | verification-gap | Writer output → landed reader → third-party `unzipSync` all agree; EOCD counts/offsets consistent | verified-ok | rejected |

## Code Review

### 2026-10-11

**Code review complete.** 0 `decision-needed`, 9 `patch`, 1 `defer`, 7 rejected. The decision was resolved on 2026-10-11 and became a patch; checked items are applied. Every patch is applied (2026-10-11).

Scope: ddf854d; diff excludes the ticket's own plan file. Lenses run: blind-hunter, edge-case-hunter, verification-gap, intent-alignment (thorough). Decision, patch and defer counts are entries after grouping; the rejected count is findings.

- [x] [Review][Patch] Nothing in the product read `manifest.json`, so the descriptor's contract (and the index's meaning) was unverified — decided 2026-10-11 (user: we need to do that): `readDistributionManifest(pkg)` now exists in `formats/package/manifest.ts` and shares the writer's validation; format-spec §13 documents the manifest (exactly `schema`, `main` and `index`; `index` lists every game file but `manifest.json`); tests round-trip write → load → read and refuse the malformed cases (bad JSON, wrong shape, missing or extra keys, bad schema, `main` or index entries not in the archive, unlisted files, duplicates). `loadPackage` is unchanged: a legacy package has no manifest and still loads.
- [x] [Review][Patch] Writer throws instead of returning a `Result` on malformed `input`, file paths or `bytes` [packages/core/src/formats/package/write.ts:351,385-386,409] — require a non-null object `input`, and each element a non-null object with a string `path` and a `Uint8Array` `bytes`, returning a located failure before use. — applied 2026-10-11: The writer returns a located failure for a non-object input, a non-array file list, a non-object entry, a non-string path and bytes that are not a `Uint8Array`; one test per case.
- [x] [Review][Patch] Writer validates normalised/folded paths but emits the caller's raw strings [packages/core/src/formats/package/write.ts:259,418,443-447,470] — write `toSlashes(file.path)` as the entry name and the tree's own spelling for `main` and each `index` entry. — applied 2026-10-11: Entry names and the manifest's `main` and `index` use the tree's normalised spelling; a backslash path round-trips.
- [x] [Review][Patch] The L1 budget is checked only after the whole container is allocated and written [packages/core/src/formats/package/write.ts:276,326] — compare the computed `localBytes + centralBytes + EOCD_BYTES` before `new Uint8Array`. — applied 2026-10-11: The L1 size is computed and checked before the output is allocated. No test: the limit is hundreds of MiB.
- [x] [Review][Patch] L3/L4 budget accounting excludes the manifest's own bytes [packages/core/src/formats/package/write.ts:409-420] — serialise `manifestBytes` before the budget loop and add its length to the running total. — applied 2026-10-11: The manifest's bytes count toward L3 and L4. No test, for the same reason.
- [x] [Review][Patch] The self-check passes a file name where `readZip` expects the package name [packages/core/src/formats/package/write.ts:461] — pass a descriptive placeholder instead of `MANIFEST_FILE_NAME`. — applied 2026-10-11: The self-check passes a descriptive package name to `readZip`.
- [x] [Review][Patch] The new path-shape rule cites L9, which is the zip-slip rule [packages/core/src/formats/package/write.ts:115] — drop the wrong row number from the message. — applied 2026-10-11: The path-shape message no longer cites L9.
- [x] [Review][Patch] Writer validation branches are unpinned by the test suite [packages/core/test/format-package-writer.test.ts:105-270] — add a path-shape case and a non-ASCII fixture path (the malformed-input cases belong with the entry above). — applied 2026-10-11: Tests added for a path-shape case and a non-ASCII path (`Média/café.dat`).
- [x] [Review][Patch] Unused `paths` in the test helper [packages/core/test/format-package-writer.test.ts:80,85] — delete the field from the return type and the object. — applied 2026-10-11: The unused `paths` field is removed from the test helper.
- [x] [Review][Defer] The feature catalogue and the commit's IDs do not mention the distribution manifest (G7 doc-first) [docs/editor-features.md T-70…T-74, docs/engine-features.md E-131] — deferred: format-spec §13 now documents the manifest (2026-10-11); what remains is a catalogue edit, which edits specs.

**Rejected**
- blind-hunter: lone-surrogate path rewritten as U+FFFD — low: ill-formed UTF-16 cannot come from a file system, so it is not met in everyday use and the fix is added surrogate validation, not a direct correction.
- blind-hunter: reader/writer phrase the same condition differently — false: all three `checkEntryPath` call sites append "." (zip.ts:203, package.ts:105, write.ts:387).
- blind-hunter: L2 ignores the directories the folder form holds — low: reachable only at ~9,995 files and the fix adds implied-directory accounting.
- intent-alignment: the guarantee lives at the container surface — false: `loadPackage`'s tpk path is `readZip` + a total `createAssetIndex`, so no package can pass the self-check and fail `loadPackage`; the block itself calls the gap latent.
- intent-alignment: "the same limits" partly by-construction — false: every reader limit is explicitly checked or guaranteed by construction, with the readZip self-check as the backstop.
- intent-alignment: determinism asserted one level wide — low: the "same input twice" AC holds; bytes depend on the pinned fflate build and fixing that would mean dropping compression.
- intent-alignment: the seam of the container-surface and manifest-index divergences — false: it names no bad outcome, restating those two findings and concluding both are deliberate interpretation decisions.

### Round 2 — 2026-10-13

**Code review (round 2, independent reviewer `review-r3-package-ci`).** Verdict: PASS WITH FINDINGS. 2 live findings (2 MINOR). The first pass ran against a stale checkout (`3ec2ab9`) and was re-baselined against `origin/main` (`9d4d336`); both LIVE, none stale. Both are fixed on branch `fix/epic2-fold-and-zip-work-bound` (`6514031` fix, `c87c82e` docs, `9759eb8` test): the manifest `index` is written in code-unit order (so two writes of one tree are byte-identical), and the L1 budget is proved as each entry is compressed rather than after the whole tree. Round 1 above is unchanged.
