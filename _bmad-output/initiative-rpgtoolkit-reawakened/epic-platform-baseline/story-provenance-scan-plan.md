---
title: 'Provenance scan'
type: 'chore'
ticket: '6'
created: '2026-10-10'
status: done
baseline_revision: '6e827f564ea3a211514b1453224ad294cf9373f8'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context:
  - '{project-root}/docs/guardrails.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Guard-rail G7 ("Clean-room provenance") and CAP-13 require automated CI enforcement against GPL-2 legacy code, authors, identifiers, and VB6 syntax, but no scanner exists and `.github/pull_request_template.md` lacks a dedicated checkbox requiring authors to cite governing `docs/` sections.

**Approach:** Commit `tools/provenance/markers.json` with categorized markers traceable to repo documents, implement `tools/provenance/scan.mjs` scanning source and config files (using an extension allowlist, path exclusions, multiline comment normalization, and structural VB6 regexes), add runtime-fixture Node tests in `tools/provenance/test/provenance.test.mjs`, update `.github/pull_request_template.md` with the dedicated checkbox, configure `package.json` scripts, and add `.github/workflows/provenance.yml`.

## Boundaries & Constraints

**Always:**
- Keep marker database in `tools/provenance/markers.json` across 5 categories: `gplLicenseHeaders`, `legacyCopyrightHolders`, `legacyIdentifiers`, `vb6SyntaxMarkers`, and `bannedExtensions`. Each category specifies `caseSensitive` (`true` for VB6; `false` for others) and a `sources` string citing the governing repo document.
- Trace every marker to repo documentation: identifiers `trans3`, `tkCommon`, `CBoardEditor`, `CProgram`, `actkrt3` (`docs/guardrails.md` §G7); copyright holders `Christopher B. Matthews`, `Colin James Fitzpatrick`, and contributor `Jonathan D. Hughes` (`people.md`); public FSF GPL header text; public VB6 syntax. Never ban engine format magic strings.
- Each marker entry carries `examples` (must match) and optional `nonExamples` (must not match: `trans30`, `xtrans3`, `CProgramming`, prose "end of sub-list", mid-line `'Dim x As'`).
- `tools/provenance/scan.mjs [root] [--markers <file>]` loads `tools/provenance/markers.json` by default (overridden by `--markers`). Accepts optional `[root]`, normalises path separators to `/`, prints `scanned N files`, exits 1 if N is 0, and exits 0 on clean tree, 1 on violations.
- Pre-validate markers before scanning: unknown categories, empty markers, invalid regexes, missing file, or non-existent root exit 1 with named diagnostics.
- Scan only source/config files by extension allowlist (`.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`, `.yml`, `.yaml`, `.toml`, `.html`, `.css`, `.c`, `.cc`, `.cpp`, `.cxx`, `.h`, `.hh`, `.hpp`, `.hxx`). Never scan prose: skip `*.md`, `LICENSE`, `THIRD_PARTY_NOTICES`, `pnpm-lock.yaml`.
- Skip root-relative `docs`, `_bmad`, `_bmad-output`, and `tools/provenance/markers.json` (nested `packages/*/docs/` scanned). Skip `node_modules`, `dist`, `build`, `coverage` by name at any depth. Skip dot-directories except `.github`. Do not follow symlinks. Skip binary files (NUL in first 8 KB), except a file that starts with a UTF-16 byte-order mark (`FF FE` or `FE FF`), which is decoded as UTF-16 text and scanned; UTF-16 without a byte-order mark is still skipped.
- Banned extensions (`.vbp`, `.vbg`, `.frm`, `.bas`, `.cls`, `.ctl`, `.dsr`) flag violations by file name regardless of allowlist.
- Identifiers match with word boundaries (`\b<id>\b`).
- Phrase markers (GPL text and authors) match across line breaks and comment leaders via normalised view (stripping `//`, `/*`, `*`, `#`, `'`, collapsing whitespace, case-folding) mapped back to line:col. Use distinctive FSF sentence ("you can redistribute it and/or modify it under the terms of the GNU General Public License"), not bare licence names.
- Structural VB6 markers use case-sensitive line-anchored patterns: `^\s*Attribute\s+VB_Name\b`, `^\s*Begin\s+VB\.`, `^\s*End\s+(Sub|Function|Property)\s*$`, `^\s*(Private|Public|Friend)\s+(Static\s+)?(Sub|Function|Property\s+(Get|Let|Set))\s+\w+`, `^VERSION\s+5\.00`, `^\s*Option\s+Explicit\s*$`, and `^\s*Dim\s+\w+\s+As\s+\w+`.
- The ONLY file permitted to contain marker literals in scanned tree is `tools/provenance/markers.json`. Tests build fixtures at runtime in temp dirs from `markers.json`; wrapped headers synthesized with comment leaders (`/*`, `*`, `#`). No line of `scan.mjs` or test file may match any marker.
- Use Node.js built-ins only; zero external npm dependencies.
- Update `.github/pull_request_template.md` with dedicated checkbox right after G7 line:
  `- [ ] I cited the `docs/` sections this change implements (E-xx / T-xx IDs or format-spec sections), or this change implements no behaviour.`
- Expose `package.json` scripts `provenance` and `provenance:test`; run both in `.github/workflows/provenance.yml` (Node 24.21.0).

**Never:**
- Do not edit `docs/guardrails.md` or ADRs (G7 is normative).
- Do not allow inline comment suppressions. Approved exceptions require config updates in `markers.json`/exclusions in a PR citing an ADR.
- Do not add external npm dependencies.
- Do not scan prose files (`*.md`, `LICENSE`, `THIRD_PARTY_NOTICES`), root `docs/`, or `_bmad*`.
- Do not hardcode markers in scanner logic or test files; `markers.json` is the sole source of truth.
- Do not permit any source file containing a legacy marker to pass.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean tree pass | Repository source/config files | `pnpm provenance` exits 0 with 0 violations | No error expected |
| GPL header (block comment) | .ts file with wrapped FSF sentence (`*` leaders) | Exits 1 (`gplLicenseHeaders`), reports line:col | CLI error |
| GPL header (hash comment) | .yml file with wrapped FSF sentence (`#` leaders) | Exits 1 (`gplLicenseHeaders`), reports line:col | CLI error |
| Legacy author | Source with `"Christopher B. Matthews"` or `"Colin James Fitzpatrick"` | Exits 1 (`legacyCopyrightHolders`), reports line:col | CLI error |
| Legacy identifier match | Source with `trans3`, `trans3.exe`, or `CProgram` | Exits 1 (`legacyIdentifiers`), reports line:col | CLI error |
| Identifier boundary non-match | Source with `trans30`, `xtrans3`, or `CProgramming` | Passes (exits 0); `\b` boundary avoids hit | No error expected |
| VB6 structural syntax | Source with `Attribute VB_Name`, `End Sub`, or `Option Explicit` | Exits 1 (`vb6SyntaxMarkers`), reports line:col | CLI error |
| VB6 syntax negative case | .ts file with comment "end of sub-list" or mid-line string `'Dim x As'` | Passes (exits 0); line-anchored regex avoids hit | No error expected |
| Banned extension | File named `module.bas` or `project.vbp` | Exits 1 (`bannedExtensions`), reports file path | CLI error |
| Prose file skipped | Marker in `README.md`, `CLAUDE.md`, or root `docs/` (fixture also holds one clean source file, so the zero-files guard does not fire) | Exits 0; skipped by extension/path exclusions | No error expected |
| Binary file skipped | Binary file with NUL byte in first 8 KB (fixture also holds one clean source file, so the zero-files guard does not fire) | Exits 0; skipped by binary detector | No error expected |
| C/C++ source | `.cpp` file with a legacy identifier and `.h` file with the GPL sentence, beside one clean `.ts` | Exits 1 (`legacyIdentifiers`, `gplLicenseHeaders`), reports line:col | CLI error |
| UTF-16 source | `.ts` files in UTF-16LE and UTF-16BE, each with a byte-order mark, holding a legacy identifier | Exits 1 (`legacyIdentifiers`), reports line:col | CLI error |
| Zero files found | Root directory whose files are all skipped or absent (for example only `README.md`) | Exits 1, reports zero scannable files found | CLI error |
| Invalid marker config | `markers.json` with invalid regex, empty marker, or bad category | Exits 1 with named validation error before scan | CLI error |
| Missing root argument | `node tools/provenance/scan.mjs /does/not/exist` | Exits 1 naming missing directory | CLI error |
| Cite docs PR checkbox | `.github/pull_request_template.md` | Contains checkbox specified in Always directly after G7 | Template check (manual) |

</frozen-after-approval>

## Code Map

- `tools/provenance/markers.json` -- new. Categorized markers traceable to docs (`sources`), examples/nonExamples per entry, caseSensitivity flags, banned extensions, extension allowlist, path exclusions. Sole file containing marker literals.
- `tools/provenance/scan.mjs` -- new. Zero-dependency CLI scanner and evaluator (`scanProvenance(root, options)`, `loadAndValidateMarkers(path)`). Extension allowlist, comment-stripping multiline normalizer, structural regexes, diagnostic reporter, `--markers` support.
- `tools/provenance/test/provenance.test.mjs` -- new. Node test suite generating runtime temp-dir fixtures from `markers.json` (no marker literals in test code). Covers all matrix scenarios.
- `.github/pull_request_template.md` -- updated. PR template checklist updated with the checkbox specified in Always.
- `package.json` -- updated. Root scripts `provenance` (`node tools/provenance/scan.mjs`) and `provenance:test` (`node --test tools/provenance/test/provenance.test.mjs`).
- `.github/workflows/provenance.yml` -- new. CI workflow running frozen install, tests, and scan on Node 24.21.0.

## Tasks & Acceptance

**Execution:**
- [ ] `tools/provenance/markers.json` -- commit categorized legacy markers with `sources`, `examples`, `nonExamples`, and exclusions -- G7 policy truth
- [ ] `tools/provenance/scan.mjs` -- implement file walker, allowlist filter, comment normalizer, pattern matching, validation, and CLI reporter -- G7 scanner
- [ ] `tools/provenance/test/provenance.test.mjs` -- implement runtime fixture tests covering all matrix scenarios -- verification suite
- [ ] `.github/pull_request_template.md` -- add cite-the-docs checkbox specified in Always after G7 line -- review requirement
- [ ] `package.json` -- add `provenance` and `provenance:test` scripts -- developer interface
- [ ] `.github/workflows/provenance.yml` -- add CI workflow executing tests and scan -- automated CI gate

**Acceptance Criteria:**
- Given the clean repository, when `pnpm provenance:test` and `pnpm provenance` run, then both pass with exit code 0.
- Given a source file with a wrapped GPL block comment, wrapped `#` comment, or legacy author name, when scanned, then it fails with exit code 1.
- Given a source file with an identifier (`trans3`, `CProgram`), when scanned, then it fails with exit code 1; while boundary non-matches (`trans30`, `xtrans3`, `CProgramming`) pass with exit code 0.
- Given a source file with structural VB6 code, when scanned, then it fails with exit code 1; while prose phrases ("end of sub-list", `'Dim x As'`) pass with exit code 0.
- Given a file with a banned extension (`.bas`, `.vbp`), when scanned, then it fails with exit code 1 regardless of allowlist.
- Given prose files (`README.md`, `CLAUDE.md`, root `docs/`) or binary files with NUL bytes, when scanned, then they are skipped without error.
- Given C/C++ source or header files (`.c .cc .cpp .cxx .h .hh .hpp .hxx`), or UTF-16 files with a byte-order mark, holding a legacy marker, when scanned, then they fail with exit code 1; UTF-16 without a byte-order mark is still skipped as binary.
- Given an invalid `markers.json`, missing root path, or a root with zero scannable files, when scanned, then the scanner fails with exit code 1.
- Given `.github/pull_request_template.md`, when inspected manually, then it contains the checkbox specified in Always directly after G7.
- Given a pull request, when Actions run, then `.github/workflows/provenance.yml` executes `provenance:test` and `provenance`.

## Implementation Notes

- Decision (human, at the plan checkpoint, 2026-10-10): the legacy author names in the marker list are cited from `_bmad-output/initiative-rpgtoolkit-reawakened/research-what-survived-of-rpg-toolkit/people.md` (option a); no `docs/` note is added.
- Decision (human, after review, 2026-10-10): option 1 for review findings 3 and 4. UTF-16 without a byte-order mark stays skipped as a known limit.

## Plan Change Log

- Scope & Clean Tree: Scanned scope restricted to source/config extension allowlist; prose (*.md, LICENSE, THIRD_PARTY_NOTICES, pnpm-lock.yaml) and dot-dirs (except .github) skipped; verified 0 hits across repo.
- Test Isolation & Examples: Moved marker samples into `markers.json` (`examples`/`nonExamples`) for runtime temp-dir fixture synthesis; banned marker literals from scanner/test code.
- Normalisation & Structure: Added multiline wrapped-header comment normalizer; anchored VB6 regexes with `caseSensitive: true` to prevent plain JS false positives.
- Traceability & Policy: Cites repo documents (`sources`); dropped `legacyFileHeaders` (covered by GPL headers, authors, and `^VERSION 5\.00`); zero-file scan exits 1; added `--markers <file>`; added PR checkbox.
- **Iteration 1 (review loopback).** Trigger: review findings 3 and 4 (intent_gap), resolved by the human choosing option 1. Amended with the human's authority: the frozen allowlist bullet (adds `.c .cc .cpp .cxx .h .hh .hpp .hxx`), the frozen binary-skip bullet (a UTF-16 byte-order mark means text) and two matrix rows. Known-bad state avoided: legacy C/C++ source and UTF-16 text passing unscanned. KEEP: all other behaviour; the patches for findings 1, 5, 6 and 13 stand. The code was kept rather than reverted because the change is additive.
- **Follow-up review of the iteration 1 delta.** Findings 14, 15, 16 and 18 patched without changing the frozen block; row 7 partly reversed (string-literal punctuation and escapes are gaps in the normalised view). Known-bad state avoided: a regression that missed single-byte text behind a byte-order mark, and wrapped C string literals passing unscanned. KEEP: all earlier patches.

## Review Triage Log

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | Running `scan.mjs` through a symlinked path does nothing and exits 0: the `isMain` guard compares an unresolved `argv[1]` with the symlink-resolved `import.meta.url` | high | patch | Reproduced twice (reviewer and director): `node <symlinked dir>/scan.mjs <root>` printed nothing, exit 0; the real path exits 1 with a diagnostic. macOS `/tmp` is itself a symlink. Compare real paths and add a regression test through a symlinked directory. |
| 2 | The same guard in `tools/licences/check.mjs` (entry 1.5) | medium | defer | Reproduced by the director. Pre-existing and not in this diff; logged in `deferred-work.md` for the refactor sweep (entry 1.11). |
| 3 | The extension allowlist leaves out C and C++ (`.c .cc .cpp .cxx .h .hh .hpp .hxx`): a `CProgram` class in a `.cpp` and the GPL sentence in a `.h`, beside one clean `.ts`, give "0 violations" | high | intent_gap | Reproduced by the director. The cause is the allowlist bullet inside the frozen block ("Scan only ... by extension allowlist"), so only the human can widen it. Resolved: the human chose option 1 on 2026-10-10 (widen the allowlist to the C/C++ family; decode UTF-16 that starts with a byte-order mark); the frozen block was amended on that authority. |
| 4 | Allowlisted files with a NUL in the first 8 KB, including UTF-16 source with a byte-order mark, are skipped with no diagnostic | medium | intent_gap | Reviewer experiment: UTF-16 `.ts` files holding three markers reported no violations. The frozen block says to skip files with a NUL, so only the human can change it. Resolved: the human chose option 1 on 2026-10-10 (widen the allowlist to the C/C++ family; decode UTF-16 that starts with a byte-order mark); the frozen block was amended on that authority. |
| 5 | A header wrapped with `///` leaders is missed: `//` is stripped but the third `/` stays in the view | medium | patch | Reviewer experiment. The plan lists the leaders as a minimum, not an "only". |
| 6 | `<!--` and `-->` are not comment leaders, so a header wrapped one HTML comment per line in an `.html` file is missed | medium | patch | Reviewer experiment; `.html` is on the allowlist. A single multi-line comment already matches. |
| 7 | Wrapped text re-encoded as string concatenation, a JSON array of lines, escaped `\n`, a template-literal continuation or box borders is missed | low | reject (partly reversed by row 16) | Deliberate re-encoding, not accidental inclusion. The scanner is a tripwire against copy-paste, not a defence against obfuscation. |
| 8 | A symlink named with a banned extension is skipped before its name is checked | low | reject | Unlikely in everyday use: a git symlink carries no legacy content, and the fix adds a branch. |
| 9 | `\b` lets `_trans3`, `trans3_exe`, `trans3Engine` and `CProgram2` through | low | reject | The plan fixes `\b<id>\b` and the reviewer agrees it follows the plan. `\b` is what keeps words like `Trans3D` from false positives; the limit is accepted. |
| 10 | Author-name markers match exact strings only (`Chris Matthews` and `Christopher B Matthews` pass) | low | reject | Markers must trace to a repo document (G7); only the full names in people.md are documented. |
| 11 | VB6 patterns miss a trailing-comment `End Sub ' x`, `Dim a, b As Long` and lower case | low | reject | The plan lists these patterns verbatim. Legacy VB6 files are caught by banned extensions; the patterns only cover VB6 pasted into allowlisted file types. |
| 12 | Load-time validation does not check each marker against its own `examples` and `nonExamples` | low | reject | `provenance:test` checks the committed list and the workflow runs it before `provenance`; `--markers` is a test hook. |
| 13 | Diagnostics are ordered per directory, not by global path order (`a/b.ts` is reported before `a-b.ts`) | low | patch | Reviewer experiment; contradicts the doc comment. Sort the final list. |
| 14 | A file starting with `FF FE` or `FE FF` but holding single-byte text (no NUL) was decoded as UTF-16 and missed; before the UTF-16 change it was caught as UTF-8 | medium | patch | Follow-up review experiment (`FF FE` and `FE FF` followed by ASCII: scanned, no violation; caught before the change). A regression from this change. Treat a file as UTF-16 only when it has the mark and the first 8 KB contain a NUL; otherwise decode as UTF-8 as before. |
| 15 | UTF-32 files (`FF FE 00 00` prefix) were decoded as UTF-16, counted as scanned and not examined | low | patch | Follow-up review experiment. Treated as binary again (skipped, not counted) by the same condition as row 14. |
| 16 | The usual C/C++ form of a GPL notice, wrapped string literals (adjacent literals, `\n` escapes, `#define` with backslash continuations), is missed | medium | patch | Follow-up review experiment (`about.cpp`, `about2.c`, `macro.h`: scanned, no violation). In C and C++, which the human just added, this is normal code and not obfuscation, so row 7 is partly reversed: quotes, backticks, commas, `+`, `\|` and backslash escapes now count as gaps in the normalised view. Other re-encodings stay rejected. |
| 17 | The C/C++ extension list leaves out `.inl .ipp .tpp .rc .def .idl` and others | low | reject | The human chose the listed C/C++ family (option 1). Extending it is a one-line config change if wanted. |
| 18 | The new tests do not put the GPL sentence in a C/C++ file (matrix row "C/C++ source"), and do not cover a byte-order mark over non-UTF-16 bytes or UTF-32 | medium | patch | Matrix audit: the `.h` GPL half of the row had no covering test. Tests added with the fixes for rows 14 to 16. |
| 19 | `trans3` as a variable name in graphics code, a case-insensitive `cprogram`, and a stand-alone `VERSION 5.00` line in a `.h` are flagged in C/C++ | low | reject | These are the plan's markers applied to the languages the human added; no realistic C/C++ line tripped the VB6 patterns. An approved exception is a config change citing an ADR (no inline suppression). |

## Design Notes

- **Marker Examples & Dynamic Fixtures:** Storing `examples` and `nonExamples` directly in `markers.json` allows the test suite to synthesize violating and non-violating files in `mkdtempSync` sandboxes at runtime without embedding forbidden marker literals in test source.
- **Case Sensitivity & Line Anchors:** VB6 patterns require `caseSensitive: true` and explicit visibility/line anchors to avoid colliding with plain JS functions (e.g. `function fail(` in `tools/deps/graph.mjs`) while detecting legacy declarations.
- **Source vs. Prose Scope:** Scanning only source/config extensions avoids false alarms on `README.md` (which deliberately tributes the creator) and `CLAUDE.md`/`CONTRIBUTING.md` (which discuss G7 and the legacy GPL-2 codebase).
- **No Inline Suppressions:** Per entry 1.3's decision on ESLint, no comment directives are permitted; approved exceptions require config updates in `markers.json`/exclusions citing an ADR.
- **Marker Traceability & Medium Risk:** Markers cite repo documents (`docs/guardrails.md` §G7, `people.md`) or public specs, and G7's "legacy file headers" requirement is fully satisfied by `gplLicenseHeaders`, `legacyCopyrightHolders`, and `^VERSION 5\.00`. Risk is medium because a silent false negative in normalisation or regexes admits GPL-derived text, a legal rather than cosmetic failure.
- **Known limits:** UTF-16 without a byte-order mark is skipped as binary; `\b` identifiers do not match inside snake_case or camelCase compounds (`trans3_exe`, `trans3Engine`); author names match exactly as documented in `people.md`; the scanner is a tripwire against copy-paste, not a defence against deliberate obfuscation (text rebuilt from string pieces beyond adjacent literals, escapes, line continuations and `+`); UTF-32 is treated as binary.

## Verification

**Commands:**
- `pnpm provenance:test && pnpm provenance` -- expected: all fixture tests pass, clean tree exits 0 with 0 violations
- `node tools/provenance/scan.mjs` -- expected: exits 0 on current repository
- `pnpm typecheck && pnpm lint && pnpm graph && pnpm licence && pnpm test` -- expected: all existing checks remain green

**Manual checks (if no CLI):**
- Verify `.github/pull_request_template.md` contains the checkbox specified in Always placed immediately after G7.
- Verify `.github/workflows/provenance.yml` specifies `Node 24.21.0` and executes `pnpm provenance:test` and `pnpm provenance`.
