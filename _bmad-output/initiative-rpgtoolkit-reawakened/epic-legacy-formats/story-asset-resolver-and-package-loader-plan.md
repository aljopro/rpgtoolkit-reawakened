---
title: 'Asset resolver and package loader (.tpk, appended-ZIP EXE)'
type: 'chore'
ticket: '10'
created: '2026-10-11'
status: 'done'
baseline_revision: '06b250e7c9449e7ac00c5c9b70818ad7e26b3d5b'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-legacy-formats/discovery/package-limits.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 reads a dozen legacy formats, but nothing yet turns a *reference* inside those files into the bytes they name, and nothing reads a game that arrives as one file. Format-spec §1.5 fixes the path rules (case-insensitive, `\` and `/` equivalent, a path relative to its type's folder) and §13 fixes the container (a `.tpk` ZIP, or a standalone EXE whose last 12 bytes are a `CMP1` trailer naming an appended ZIP). Games are untrusted input (AD-17), and the discovery report measured that `fflate` trusts an entry's declared sizes: an entry declaring 1,000 bytes while holding 10,000,000 came back as 1,000 bytes with no error.

**Approach:** Add `packages/core/src/formats/resolver/` — the pure resolver of AD-5, mapping a logical reference to a canonical `AssetKey` over a host-supplied `AssetIndex` — and `packages/core/src/formats/package/` — the loader of AD-6, which reads a loose folder, a `.tpk` or an appended-ZIP EXE into one file list plus an index. Both return `Result` with a located `FormatError` and never throw (AD-18). The loader does the work `fflate` will not: it checks the declared size before inflating (through `unzipSync`'s `filter`), proves each entry's own stream holds exactly the declared number of bytes, verifies the CRC-32, and enforces one exported set of limits (L1–L26 of the discovery report) that every rejection names.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no file system, no other workspace package. `fflate/browser` synchronous APIs only (AD-6). Determinism (G3): only the allowlisted `Math` members (`round`, `max`), no `**`, no `Date`/`performance`/`Intl`/`Math.random`. Every implementing file cites its `docs/format-spec.md` section (G7): §1.5 for the resolver, §13 for the loader. One public entry per package (AD-22). `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. Games are untrusted (AD-17): bounded allocation, no path that escapes the package root, no recursion.

**Never:** add a runtime dependency (`fflate` is already on the allowlist), read the legacy GPL source, touch `golden/**`, change the existing `canon`/`ports`/`validate` exports, or commit sample packages or ZIP fixtures.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/resolver/model.ts` — `AssetIndex` (the host's paths plus their folded keys), `AssetRoot` as a package root or a game-folder root (AD-5) — §1.5.
- [x] `packages/core/src/formats/resolver/resolver.ts` — `createAssetIndex`, `assetKey`, `resolveAsset`: fold (case, separator), strip a leading type folder, prepend the type's folder, insert `Game/<projectPath>/` only for a game folder, and look the key up — §1.5, AD-5.
- [x] `packages/core/src/formats/package/limits.ts` — `PACKAGE_LIMITS`, the one exported object holding L1–L26's numbers, each documented with its rule id.
- [x] `packages/core/src/formats/package/path-rules.ts` — `checkEntryPath`: the shared path rules (NUL, absolute, drive letter, `..`, and the length/depth/basename caps), used by both the ZIP reader and the loose-folder loader — L6–L9, L26.
- [x] `packages/core/src/formats/package/zip.ts` — `readZip`: EOCD search (L15), central-directory walk with the structural limits, ZIP64/encryption/method/duplicate refusal, local-header agreement (L19), declared-size proof (L17), CRC-32 (L18) — §13, AD-6.
- [x] `packages/core/src/formats/package/package.ts` — `readAppendedZip` (the `CMP1` trailer, L20/L21) and `loadPackage` dispatching the three forms to one `LoadedPackage`; the loose folder enforces L22–L26.
- [x] `packages/core/src/formats/package/{model.ts,index.ts}`, `packages/core/src/formats/resolver/index.ts`, `packages/core/src/formats/index.ts` — the types, re-exports and the two new barrel lines.
- [x] `packages/core/test/format-resolver.test.ts` — 11 cases: canonical keys, case in both directions, `\`/`/`, the type-folder prefix, subfolders, package vs game-folder root, located miss, odd references, folding.
- [x] `packages/core/test/format-package.test.ts` — 22 cases over ZIPs built byte by byte in the file (store, deflate, a hand-written store-mode DEFLATE stream and a local CRC-32; no zip dependency, no committed fixture).
- [x] Discovery correction recorded below: §13 states the trailer's `i32`s are little-endian, so the report's open question about endianness is answered by the spec, not an inference.

**Acceptance Criteria:**
- Given a synthetic `.tpk` and a synthetic appended-ZIP EXE, both load to the identical asset tree (paths, bytes and canonical keys) as the equivalent loose folder.
- Given an index, `Boards/INN.brd` resolves to `boards/inn.brd`, `village\shop.brd` to `boards/village/shop.brd`, and `Item\npc.itm` to `item/npc.itm`; a package ignores the project path and a game folder inserts `Game/<projectPath>/`.
- Given an entry declaring less than it holds (with the CRC-32 patched to match the lie), the loader rejects it, and never returns the truncated prefix.
- Given a corrupted CRC, a local/central disagreement, or any breach of L1–L26, the loader returns a located error whose message names the rule.
- Given any bytes at all, the loader returns a `Result` and never throws.

## Implementation Notes

- **Reuse, not duplication.** `toSlashes`, `foldPath`, `stripTypeFolder`, `typeFolder` and `projectFolder` already live in `formats/main-file/layout.ts` (§1.5's helpers from ticket 2.9) and the resolver calls them rather than growing a second path convention. `crc32` is the PNG/zlib/ZIP polynomial already landed at `formats/image/crc32.ts` (§10), so the loader uses it instead of shipping another CRC.
- **What a canonical key is.** `AssetKey` is the folded path (`boards/village/shop.brd`), so the same file referred to as `Boards/Village/Shop.BRD`, `boards\village\shop.brd` or `Boards/Boards/../…` has one key. The resolver returns the key of the *matching index entry*, never a synthesised path: a reference that is not in the index is `ok: false`, so a malicious reference cannot name a file the host did not list.
- **Folding is `foldPath`'s.** AD-5 says "ASCII-only case fold [ASSUMPTION]"; the landed `foldPath` lower-cases with `String.prototype.toLowerCase` (locale-independent, but not ASCII-restricted). Reusing it keeps the resolver, the index and ticket 2.9 in lockstep; if ASCII-only folding is ever required, both sides change together. Flagged as an open question for the human rather than silently forked here.
- **The declared-size proof (the report's probe).** `unzipSync` sizes its output from the header, so an entry declaring 1,000 while holding 10,000,000 decodes to 1,000 bytes and reports success. The loader therefore inflates each deflate entry's own stream *before* `unzipSync` runs, with `inflateSync(span, { out: new Uint8Array(declared) })`: `out` bounds the decompression to the declared size, so a bomb cannot make the check itself allocate more than the header promised, a longer stream throws, and a shorter one comes back under-length — both are L17. `unzipSync` then decodes the entry for the file bytes, and the decoded length and CRC-32 are checked again. Two inflations per deflate entry is deliberate: the verification is independent of the library whose behaviour it is checking.
- **The `filter` hook.** `unzipSync`'s `filter` enforces the per-entry declared-size limit at the point `fflate` would allocate, and skips directory entries. The same limit is also checked while the central directory is parsed (L3), which is where the error is normally raised (it is located on the entry and costs no decode); the filter is the second, allocation-point guard the ticket asks for.
- **Locality.** `FormatError.offset` is the entry's local-header offset for entry-level failures and the EOCD offset for package-level ones, so a message points at the bytes it is about; `section` is always `format-spec §13` for packages and `format-spec §1.5` for the resolver.
- **Names.** Entry names are decoded with `fflate`'s own `strFromU8` (UTF-8 when flag bit 11 is set, else byte-per-character), so the loader's entry names and the keys `unzipSync` returns always agree. Path *bytes* are counted in UTF-8, after `\` becomes `/` (L6/L8).
- **Directories.** An entry whose name ends in `/` (or whose DOS attribute byte says directory) counts toward the entry limit and is path-checked, but is never served; `files` holds files only, so a package and its extracted folder produce the same list.
- **The loose folder is not a second format.** It applies L22–L26 through the same `checkEntryPath`, the same duplicate rule and the same size budget, so a game behaves identically from a folder, a `.tpk` or an EXE. Symlinks are rejected (L23): the host reports them as entries of kind `link`, and a link could point outside the folder.
- **Nested archives stay opaque (L14).** Nothing recurses: a `.zip` or `.tpk` inside a package is an ordinary file. Depth is therefore 0 and the size budget stays single-level; the test loads a ZIP containing `Misc/inner.zip`.

### Security notes

Each limit exists to bound a specific attack, not to describe the corpus:

- **L1 / L2 / L4 (input size, entry count, total declared size)** — bound the memory and work spent *before* any decoding, so a small file cannot make the loader walk or allocate without a ceiling.
- **L3 / L16 / L17 (declared entry size, before and after inflating)** — stop a single entry from exhausting memory and, more importantly, catch a header that lies about its size. This is the probe's attack: `fflate` trusts the header, so the loader proves the length from the stream itself.
- **L5 (compression ratio)** — a zip bomb: a few hundred compressed bytes that inflate to gigabytes. Checked from the headers, before any inflation.
- **L6 / L7 / L8 (path length, depth, basename)** — keep pathological names from reaching any host API that materialises a path.
- **L9 (zip-slip)** — absolute paths, drive letters, `..` segments and NUL are the ways an archive entry escapes the folder it is extracted into. The core never writes, but the host will.
- **L10 (case-insensitive duplicates)** — §1.5 matching is case-insensitive, so two entries differing only by case are ambiguous, and the resolver could serve the wrong one.
- **L11 / L12 (encryption, compression method)** — encrypted content cannot be validated and is out of scope; only stored and deflate are the `fflate` surface AD-6 allows.
- **L13 (ZIP64)** — keeps the reader on 32-bit fields, which L1 already caps far below.
- **L14 (nested archives)** — no recursion, so no recursion bomb and no second size budget.
- **L15 (EOCD search window)** — the record cannot hide behind an unbounded scan of a large file.
- **L18 (CRC-32)** — detects corruption and tampering that a size check misses.
- **L19 (local/central agreement)** — a disagreement is how a header trick gets one reader to decode what another would refuse.
- **L20 / L21 (the `CMP1` trailer)** — the appended ZIP must lie inside the file and must not overlap the trailer, so a crafted EXE cannot make the loader read outside its own bytes.
- **L22–L26 (the loose-folder equivalents)** — the same budgets for the same reasons, so switching form cannot switch off a limit.

**The limit values are PROPOSALS.** Every number in `PACKAGE_LIMITS` comes from the discovery report's table, which derived them from a 134-file, 6.3 MB corpus of two sample games and from `fflate`'s documented behaviour — and neither sample ships a package, so the package numbers have no corpus evidence at all. They are not measured requirements, and `pnpm test` pins them so a change is deliberate. The likeliest to need changing is L5: the corpus's most compressible file compresses 33.97:1 outside a ZIP, and repetitive tile data in a real `.tpk` could exceed the proposed 100:1.

## Plan Change Log

- 2026-10-11 — implementation: added the L3 check in the central-directory walk (so an oversize entry is located and rejected before any decode) alongside the filter's L16 guard; the declared-size proof became a bounded `inflateSync(span, { out })` before `unzipSync`, because the probe's truncation surfaces as either a truncated buffer or a thrown error depending on the deflate block type.
- 2026-10-11 — spec audit: §13 states the two trailer `i32`s are little-endian, resolving the report's endianness question; the report's "endianness unstated" note is stale (the spec's §14 list repeats it).

## Review Triage Log

## Design Notes

- **Why not `unzipSync` alone?** It is the decoder AD-6 names, but its output is sized from the header, and the report measured it returning a truncated buffer with no error. Using it as the decoder *and* proving the length independently is the only defence that holds whatever a future `fflate` does.
- **`AssetIndex` holds a `Map`.** It is a host-supplied lookup built once at load, not VM state (G1's plain-data rule is about script state), and iteration order is insertion order, so it is deterministic.
- **Nothing is copied that can be shared.** Loose-folder bytes are the host's arrays, and stored entries may be views into the archive buffer; the doc comment says the bytes are "exactly as the package holds them".
- **`readAppendedZip` is exported** as well as `loadPackage`, because the trailer rule is part of §13 and is worth testing and reusing on its own.
- **The unresolvable references are not errors of their own.** A reference with `..`, a drive letter or a NUL simply matches no index entry (the resolver only ever answers with a key the host listed), which is the `asset: null` reply of AD-5, not a new failure mode.
- **Directory entries are not local-header checked.** They are never served or inflated, so there is nothing to validate beyond the count and the path rules.

## Verification

**Commands (all in the worktree, baseline `06b250e`):**
- `pnpm install --frozen-lockfile` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 272 pass, 0 fail, 10 skipped (33 of them new: 11 resolver, 22 package).
- `pnpm lint` — exit 0; `check-core-deps: 1 core runtime dependency matches the allowlist` (fflate), eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (114 modules, 344 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 201 files`, `0 violations`.
- `pnpm licence` — exit 0; `Licence check PASSED`, 0 violations.
- `uv run _bmad/method/scripts/tickets.py --project-root . status` — entry `2.10` reported `done`.
