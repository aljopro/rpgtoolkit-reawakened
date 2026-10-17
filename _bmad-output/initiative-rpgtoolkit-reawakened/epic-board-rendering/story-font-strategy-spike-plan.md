---
title: 'Font strategy spike: pure core font library and bundled font assets'
type: 'spike'
ticket: 3
created: '2026-10-17'
status: draft
baseline_revision: 'cf04834d'
route: 'full'
route_source: 'pinned'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context:
  - 'docs/guardrails.md'
  - 'docs/adr/0003-permissive-licences-acceptable.md'
  - 'packages/core/tsconfig.json'
  - 'packages/core/dependency-allowlist.json'
  - 'tools/licences/blue-oak-list.json'
  - 'tools/licences/config.json'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/discovery/render-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AD-15 requires core-owned, deterministic text and glyphs, but no TrueType source has yet passed the combined G2, G3 and G6 gate. The existing F-14–F-17 evidence makes `opentype.js` 2.0.0 the lead, not a selection: it has no declarations, its bundle contains host-facing and unapproved-math paths, and only one outline technology has been exercised. The bundled default fonts also need a deliberate asset-licence decision.

**Approach:** Run a research-only spike in a temporary directory, in candidate order, using one exact wrapper API and one written evidence checklist. Do not install a candidate into the workspace, modify `packages/core/dependency-allowlist.json`, add font files, or implement the rasteriser. The spike produces `discovery/font-library-spike.md`, an owner decision, and the narrowly scoped ADR 0003 and licence-gate amendments needed by the later TrueType story.

## Boundaries and constraints

**Always:** Follow G2 (core has ES2022 only, no DOM/Node globals and no unapproved runtime dependency), G3 (the exact `Math` allowlist, no `**`/`**=`, cross-engine replay), G6 (Blue Oak list v16, blocked/unknown licences fail), AD-15's `FontRef` and metric contract from entry 4.1, and G7 docs-first clean-room rules. Keep the outline coverage fill in `core/raster`; a font library supplies parsed glyph outlines and metrics only. Treat macOS fonts used by the existing probes as temporary test inputs, never as assets to commit or redistribute.

**Never:** Run the spike as part of this plan PR; add a dependency; add a font file; change the core allowlist; copy legacy source; use host APIs as a fallback; treat the existing probes as complete evidence; claim legacy pixel parity for text; or broaden the OFL exception to software dependencies, user-supplied fonts, or arbitrary font assets.

## Candidate order and starting disposition

The spike evaluates these candidates in this order:

1. **`opentype.js` 2.0.0 (lead).** F-14–F-16 show MIT, zero declared dependencies, a 494,695-byte ESM bundle, successful parsing/path/kerning probes, and identical path hashes on V8 and JavaScriptCore for three TrueType `glyf` inputs. It still fails the spike's completion bar until its types, full licence/package contents, host globals, all reachable maths, coverage, and size are recorded.
2. **Typr.js 1.0.0 (weaker fallback).** F-17a records MIT and a small source but old publication, no declarations, a `window["TextDecoder"]` read and CommonJS load failure in the prior probe.
3. **fontkit 2.0.4 (weaker fallback).** F-17b records MIT but nine direct dependencies, each requiring its own licence/allowlist evidence, plus different Node/browser builds; it is not preferred unless it passes the same closure and core-host checks.
4. **fonteditor-core 2.6.3 (weakest fallback).** F-17c records an MIT file but no npm licence field, a dependency on `@xmldom/xmldom`, and host references in source; it requires explicit proof before consideration.

A candidate is not selected merely because its package metadata says MIT. The verdict must name the evidence or failure for every checklist line.

## Research procedure

1. Work outside the repository with a clean temporary directory. For each candidate, obtain the exact npm tarball for the pinned version, record the tarball SHA-256, package metadata, package licence files, direct dependencies and the complete packed file list. Do not rely on the current installed tree or a floating latest tag.
2. Expand the tarball and identify the exact shipped file(s) used by the wrapper. Record every bundled dependency or embedded third-party table/code path. Resolve each dependency's SPDX expression, recursively, against `tools/licences/blue-oak-list.json` version 16 and `tools/licences/config.json`; missing, Lead, blocked, copyleft, restricted or unknown identifiers fail. The report must distinguish a package's own licence from each bundled dependency's licence.
3. Build the smallest temporary wrapper matching the future core seam: load bytes supplied by an asset provider; parse a font; read family/name, `unitsPerEm`, hhea metrics, glyph lookup, glyph outline/path commands, advances, kerning, and the supported TrueType tables. The wrapper must not call SVG/canvas/write helpers, font generation, hinting-delta, variation, or other convenience paths unless the candidate is being tested for coverage. Compile the wrapper and a local declaration file under `packages/core/tsconfig.json` semantics (`lib: ["ES2022"]`, `types: []`), proving that no DOM or Node declaration is needed. A local `.d.ts` for a no-types tarball is evidence, not a permission to use host APIs.
4. Run the wrapper in a sandbox with `window`, `document`, `navigator`, `fetch`, `localStorage`, `requestAnimationFrame`, `process`, `Buffer`, `require`, timers and other host globals absent or trapping. Instrument reads and calls so the report records every touched global and whether it is reachable from the exact wrapper API. A candidate passes only when the selected API completes without a host global; unreachable helper paths may remain in a package only if the static/dynamic evidence proves the wrapper cannot reach them.
5. Produce a **static** census of the entire shipped bundle, not just the wrapper: every `Math.<member>`, every `**` and `**=`, and every host-global identifier/reference. Record file and location, classify each item as wrapper-reachable or unreachable, and compare maths to G3's allowlist (`abs`, `ceil`, `floor`, `round`, `trunc`, `sign`, `min`, `max`, `fround`, `imul`, `clz32`, `sqrt`). A static hit on an unapproved item is not automatically fatal if it is unreachable and the wrapper has a test preventing that path; a reachable unapproved item is a failure. If reachability cannot be demonstrated, treat it as reachable. The dynamic run separately logs every `Math` member executed and its call count.
6. Exercise the wrapper against the same pinned bundled test fonts at sizes 8, 12, 13, 16 and 24 and a fixed 50-character string. Hash canonical outline commands, glyph ids, advances, kerning and metric vectors. Run the identical script on Node/V8 and Bun/JavaScriptCore, comparing bytes and hashes. Include at least the TrueType `glyf` path used by the Liberation files; explicitly report whether CFF, variable fonts, composites, hinting, malformed tables and non-Latin glyphs are supported, unsupported, or out of scope. Existing F-16 hashes are prior evidence, not a replacement for this run.
7. Measure size from the packed tarball and the selected reachable subset separately: compressed and unpacked bytes, declarations/wrapper bytes, and any transitive closure that would enter core. Record the estimated shipped cost of the unmodified library and of a vendored subset. A library that passes behaviour but makes the core boundary or licence closure unreasonably broad must be rejected or sent to the owner as a fallback choice.
8. Repeat the checklist for the font assets: inspect the unmodified Liberation Sans, Liberation Serif and Liberation Mono upstream files and their OFL-1.1 text, verify the Reserved Font Name `Liberation`, record URLs/release/version and SHA-256, and state which is the default, family substitute and deterministic test font. Inspect the authored bitmap fallback's source and licence as part of this same evidence table.
9. Write the result to `discovery/font-library-spike.md` without adding a package or asset. Include raw command names, versions, hashes and concise output references so another worker can reproduce each result. Stop at the verdict; entry 4.9 owns implementation, the dependency allowlist addition, notices and conformance vectors.

## Written checklist and evidence contract

The note must have one row for each candidate and each line below. A row says `pass`, `fail`, or `not exercised`, with a command/output/file reference and a consequence for selection.

| Line | Required evidence | Pass condition |
|---|---|---|
| Licence and closure | Package SPDX/licence text; packed files; recursive dependencies/bundled code; Blue Oak v16 rating and `config.json` decision for every identifier | Every shipped/linked software licence is Bronze or better and not blocked; no unknown closure. |
| Pinned input | Exact version, tarball URL, integrity/SHA-256 and lockfile impact | The experiment and proposed implementation refer to one immutable version; no floating range. |
| Core load and types | Wrapper compile under core's ES2022/no-types tsconfig, local declarations where needed, parse and metrics/path calls from supplied bytes | No DOM/Node types, host import, or untyped escape that changes the public seam. |
| Host-global census | Static identifiers plus sandbox trap log, with reachability from the exact wrapper API | No reachable host global; unreachable helpers are proven unreachable or removed in a vendored subset. |
| Math census | Static every-member/`**`/`**=` census plus dynamic executed-member log | Every reachable operation is on G3's allowlist; the wrapper never reaches unvetted math. |
| Determinism | Node/V8 and Bun/JavaScriptCore hashes for outlines, metrics, kerning and advances at fixed sizes | Byte-identical canonical vectors for all selected fonts and exercised glyphs. |
| Coverage | Table/outline feature matrix, including limitations and malformed-input behaviour | The selected scope is sufficient for AD-15 and limitations are explicit; unsupported formats do not silently misparse. |
| Size | Packed and reachable bytes, including local types and dependency closure | Owner sees an explicit size cost and accepts it; no hidden dependency expansion. |
| Font assets | Licence text, upstream version/hash, Reserved Font Name terms, default/substitution/test/fallback roles | Every bundled asset has an explicit licence and notice; Liberation files remain unmodified. |

## Decision rule and fallbacks

**Selection rule:** recommend a candidate only if every required line passes for the exact wrapper API and selected font scope, with a reproducible static reachability proof. The owner must approve the candidate and its limitations before entry 4.9 consumes it. The selected path must remain a pure byte-in/outline-and-metrics-out core service; the library does not rasterise pixels and does not bring host globals into core.

**Preferred outcome:** select `opentype.js` 2.0.0 if its reachable wrapper closure passes the licence, type, host-global, G3 census, cross-engine, coverage and size lines. Its prior probe makes it the least risky lead, but `Math.pow`/`Math.log`, SVG/canvas `document` helpers, no declarations, and untested outline technologies must be resolved rather than waived.

**Fallback 1 — vendored subset:** if the package is otherwise suitable but the full bundle contains reachable or unverifiable helpers, vendor only the audited parser subset (or an equivalent generated subset) under the candidate's MIT terms, preserve required notices, and rerun the same static/dynamic/cross-engine checklist on the vendored source. This is preferred to a broad dependency when it removes host/unapproved paths without changing parsed vectors. The spike must record exactly what was retained and its provenance; it must not silently copy unrelated code.

**Fallback 2 — hand-written parser:** if no candidate or safe subset can satisfy the checklist, recommend a small hand-written TrueType `glyf` parser limited to the documented AD-15 table/features and pair it with the existing core rasteriser. It remains docs-first, fixed-point/deterministic, and must get its own vectors, malformed-input bounds, provenance note and owner approval. Do not start this implementation in the spike.

If a candidate fails one line but the owner wishes to accept it, the failure is not hidden: the note names the exact line, the proposed mitigation (usually vendoring), and the owner decision required. No candidate is added to `packages/core/dependency-allowlist.json` by this ticket.

## Bundled font and bitmap fallback decisions

The recommended bundled vector set is **unmodified upstream Liberation Sans, Liberation Serif and Liberation Mono**, all OFL-1.1. Liberation Sans is the default; Liberation Serif substitutes the Times New Roman/serif family and Liberation Mono substitutes Courier New/monospace. Recommend shipping all three rather than only Sans so the documented family substitutions are deterministic. Use one unmodified Liberation face (recommended: Liberation Mono Regular) as the TrueType test font so the test exercises a family distinct from the default; the exact upstream release and hash are settled by the spike. The Reserved Font Name `Liberation` means a modified or subset file must not retain that family name, so entry 4.9 ships these files unmodified and records the upstream licence text and terms in `THIRD_PARTY_NOTICES`.

Recommend an authored, minimal 8×8 bitmap fallback font in the repository, released under this project's MIT licence (or CC0-1.0 if the owner prefers a data-only licence), with deterministic glyph cells and an explicit replacement glyph. It is not derived from the GPL legacy source and does not reuse an unlicensed TK2 `BASE.FNT`; the TK2 reader can render fetched `BASE.FNT` fixtures later. The spike must state the source file, covered code points, licence text and whether the fallback is used for missing glyphs or only for no-TrueType/TK2 projects. A licensed third-party bitmap is acceptable only if its licence and notice pass the same written checklist.

### Proposed ADR 0003 amendment (owner approval required)

Entry 4.3 should add this exact narrow rule to ADR 0003's Decision/Terms and update its consequences:

> **Bundled font assets.** By owner decision on 2026-10-17, OFL-1.1 is admitted only for the unmodified upstream **Liberation Sans, Liberation Serif and Liberation Mono** font files that this project itself bundles as data. Their upstream licence text, release/hash and Reserved Font Name `Liberation` terms must be included in `THIRD_PARTY_NOTICES`; the files must remain unmodified. This is an asset-only exception: it does not admit OFL-1.1 software dependencies, does not change the Bronze-or-better rule for code, and does not apply to fonts supplied by users. Any other font licence is judged case by case under Decision 2; if it is not on the pinned Blue Oak list, it needs its own explicitly approved ADR exception. Fonts are data and are never linked into executable code.

This amendment must be visibly limited to those three project-bundled families. It must not add OFL-1.1 to `blue-oak-list.json`, `blocked`, or the software exception list.

### Licence-gate handoff to entry 4.9

The later TrueType story, not this spike, must make the tooling change. It should extend `tools/licences/config.json` with an explicit, path-scoped bundled-asset record (for example `bundledAssets.fonts`) naming the three exact font paths, `OFL-1.1`, `ADR-0003`, upstream release/hash and required notice. `tools/licences/check.mjs` must scan those records and require the file, matching licence text and notice, while permitting OFL-1.1 only for those exact paths. It must continue to reject OFL-1.1 if it appears as a package/dependency licence and continue to evaluate software through Blue Oak v16. Tests must cover an allowed Liberation asset, a missing notice/hash, an unlisted OFL asset path and an OFL software dependency. Entry 4.9 also adds the selected library (if any) to `packages/core/dependency-allowlist.json`, adds its software notice, and ships the font notices; entry 4.3 adds none of these files.

## AD-15 amendment note

After the owner approves the verdict, amend AD-15's current assumption sentence with one concise note linking `discovery/font-library-spike.md`: name the selected library and pinned version, or say `vendored subset`/`hand-written TrueType glyf parser`; name the exact supported table scope and state that the wrapper is core-tsconfig-compatible, host-free, and G3-audited. Replace the current unresolved `[ASSUMPTION: a pure-TS TrueType rasteriser ... library or hand-written chosen in epic board-rendering.]` wording; do not claim a library is selected before the spike's owner approval. Keep the existing core rasteriser and platform-font opt-in language unchanged.

## `discovery/font-library-spike.md` structure

The implementation of this plan must create the note with these sections:

1. **Scope, date and environment:** candidate versions, Node/V8 and Bun/JavaScriptCore versions, clean-room and no-asset/no-dependency statement.
2. **Candidate inventory:** F-14–F-17 starting evidence and the exact tarballs/hashes tested.
3. **Wrapper contract:** supplied bytes, parse/name/glyph/path/metrics/kerning calls, deliberately excluded APIs, local declarations and core tsconfig result.
4. **Licence closure:** package and bundled dependencies, Blue Oak v16 ratings, blocked/unknown results and notice requirements.
5. **Static census:** every `Math` member, `**`/`**=`, host global and location, with wrapper reachability and disposition.
6. **Dynamic sandbox evidence:** trapped globals and executed `Math` member log.
7. **Cross-engine vectors:** font hashes, metric/kerning vectors, sizes, tested features and explicit limitations.
8. **Font asset table:** Liberation files, upstream OFL-1.1 text/hash/Reserved Font Name, default/substitution/test roles, and authored bitmap fallback licence/source.
9. **Verdict and owner ruling:** selected library, vendored subset or hand-written parser; failed lines and fallback; exact version/feature scope.
10. **Handoffs:** AD-15 note, ADR 0003 amendment text, entry 4.9 licence-tool/config/notice changes, and the no-dependency/no-allowlist-change boundary.

## What is verifiable now and what waits for the spike

**Verifiable now from the repository:** G2/G3/G6 wording and core's ES2022/no-types tsconfig; the allowlist currently contains only `fflate`; Blue Oak list v16 and the existing `config.json` policy; F-14–F-17's prior package/probe observations; AD-15's core-owned text seam; the owner decision dated 2026-10-17 for unmodified Liberation Sans/Serif/Mono and the narrow OFL asset amendment. These facts are constraints and starting evidence, not the verdict.

**Only verifiable during the spike:** fresh tarball contents, pinned integrity and complete recursive/bundled licence closure; local declaration and core-tsconfig compilation; exact static census and wrapper reachability; dynamic host-global and Math logs; coverage/malformed-input behaviour; byte-identical vectors on the selected Liberation fonts under V8 and JavaScriptCore; packed/reachable size; upstream font release/hash and Reserved Font Name text; and the authored fallback's final glyph/licence evidence. The spike does not run in this plan PR and no result may be inferred from the prior two probes alone.

## Owner decisions required

1. **Approve the plan and checklist.** Recommendation: approve this exact wrapper, strict per-line evidence, and the rule that an unproven reachability path fails rather than being assumed safe.
2. **Select the implementation path after evidence.** Recommendation: `opentype.js` 2.0.0 if every line passes; otherwise an audited vendored subset; use a hand-written `glyf` parser only if both fail. The owner should approve any unsupported-table scope explicitly.
3. **Confirm the bundled family set.** Recommendation: ship all three unmodified Liberation Sans/Serif/Mono files, with Sans default and Serif/Mono substitutions, and use Liberation Mono Regular as the deterministic test font. The owner may reduce this to Sans only, but that would require changing the family-substitution contract.
4. **Approve the narrow ADR 0003 OFL-1.1 asset amendment and gate design.** Recommendation: admit OFL-1.1 only for those three project-bundled, unmodified Liberation files; leave the Blue Oak list and software dependency policy unchanged; require exact path, hash, licence text and notice checks.
5. **Approve the bitmap fallback.** Recommendation: author the small 8×8 fallback under the project's MIT licence (or CC0-1.0 as a data-only alternative), rather than bundle an unverified legacy or third-party bitmap.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Unreachable-looking library helpers become reachable after a wrapper change | Keep one exact wrapper API, static call/reachability evidence, sandbox traps and a regression test/lint rule in entry 4.9. |
| Unapproved `Math.pow`, `Math.log`, `**` or host globals affect only an untested path | Treat uncertain reachability as failure; vendor a subset or hand-write the bounded parser. |
| Node and JavaScriptCore parse different outline/metric bytes | Compare canonical outline, metrics, kerning and advance hashes on both engines before selection; keep cross-engine vectors. |
| Candidate licence closure expands through bundled/transitive code | Resolve every package and embedded dependency against Blue Oak v16 before selection; reject unknown/Lead/copyleft and record notices. |
| OFL-1.1 is mistaken for a general software exception | Scope ADR 0003 and the checker to three exact unmodified asset paths; package licences still use Blue Oak and OFL software still fails. |
| Reserved Font Name is violated by subsetting/patching Liberation files | Ship upstream files unmodified; if a subset is ever needed, use a separately named font and obtain a fresh case-by-case licence decision. |
| No candidate covers all desired TrueType technology | Publish the supported `glyf`/table scope and fail unsupported inputs deterministically; owner chooses the bounded fallback rather than silently accepting another format. |
| Bitmap fallback becomes an accidental legacy-parity claim | Author it from project docs, mark it a regression baseline, and keep TK2 `BASE.FNT` as a separately fetched input. |

## Files touched by the later implementation (not this plan)

After owner approval, the spike/result PR may add only the research note and the agreed docs handoffs: `discovery/font-library-spike.md`, the ADR 0003 amendment, the AD-15 note and the licence-tool plan/fixtures if the owner approves them. Entry 4.9 owns all implementation files, font assets, `THIRD_PARTY_NOTICES`, `packages/core/dependency-allowlist.json`, conformance vectors and the actual `tools/licences` change. This plan PR adds only this plan file.

## Verification

**Commands for the later implementation/review (not run by this plan worker and not a substitute for the spike):**

- `pnpm licence` and `pnpm licence:test` — package dependencies remain Blue Oak compliant; only the exact approved font-asset records pass.
- `pnpm typecheck` — the eventual wrapper and local declarations compile under core's host-free tsconfig.
- `pnpm lint` and `pnpm graph` — no host imports/globals or dependency-direction violation.
- The spike's recorded V8/JavaScriptCore scripts — canonical outline/metric/kerning hashes match for every selected test vector.
- `git diff --check` and link/anchor review — plan/note/ADR/AD-15 references are complete.
- `python3 _bmad/method/scripts/tickets.py --project-root . status initiative-rpgtoolkit-reawakened` — no ticket-store ordering or dependency errors; this plan does not edit tickets.toml.

Per the ticket acceptance, this plan worker does not run the spike, install candidates, add dependencies or execute the implementation/build/test/licence checks.

</frozen-after-approval>
