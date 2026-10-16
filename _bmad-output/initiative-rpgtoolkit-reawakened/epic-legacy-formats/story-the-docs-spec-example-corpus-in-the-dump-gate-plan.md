---
title: 'The docs/spec example corpus in the dump gate'
type: 'feature'
ticket: '26'
created: '2026-10-16'
status: built
baseline_revision: '8f2e5b623a43f36c60991c2ca498c9bc9fae6ce7'
route: 'full'
route_source: 'auto'
risk: 'low'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0007-docs-spec-is-the-normative-specification.md', '{project-root}/golden/legacy-corpus.json', '{project-root}/packages/runner-headless/src/dump/expectation.ts', '{project-root}/packages/runner-headless/src/dump/cli.ts', '{project-root}/docs/spec/examples/README.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** Today `golden/legacy-corpus.json` gates only the fetched sample games `demo` and `Basic` (3.1 formats, 46 digests). It leaves the clean-room, independently authored example corpus under `docs/spec/examples` (`game/`, `files/`, `versions/`) outside any continuous gate. While `game/` and modern versions parse cleanly, the historical Toolkit 1/2 text formats and TK2 binary minors are not yet gated, risking undetected regressions as readers and decoders evolve. Furthermore, there is no mechanism to track expected failures for formats awaiting subsequent tk2-support stories (16.4, 16.5, 16.6) or to enforce that current formats parse with 0 residue.

**Approach:**
1. Extend `runner-headless` dump expectation schema to support `ignore` (for non-game directories like `listings` and `renders`), `expectedFailures` (mapping path to ticket ID, e.g. "16.4", "16.5", "16.6"), and `expectedResidue` (mapping path to ticket ID, e.g. "16.6").
2. Enhance `compareGame` and `driftLines` to verify:
   - Every current-format file in `game/` and `versions/` parses with 0 failures and 0 residue; any unlisted residue or failure is a gate failure.
   - Any file listed in `expectedFailures` that starts passing cleanly triggers a failure with a message stating the ticket that cleared it, requiring the author to update the expectation rather than having silent passes.
   - Any file listed in `expectedResidue` that reads with 0 residue triggers a failure naming the ticket that cleared it.
   - Existing `legacy-corpus.json` comparison remains 100% backward-compatible (no expectedFailures or residue tracking needed there).
3. Commit `golden/spec-examples.json` recording 19 digests for `game`, 0 for `files` (3 skipped), 42 digests for `versions`, 14 `expectedFailures` (cleared by 16.4, 16.5, 16.6), and 2 `expectedResidue` (`character_minor3.tem` and `character_minor4.tem`, cleared by 16.6).
4. Update `pnpm dump:check` in `package.json` to verify both `golden/legacy-corpus.json` and `golden/spec-examples.json`, and provide sibling scripts (`dump:check:examples`, `dump:record:examples`).
5. Document the new expectation in `CONTRIBUTING.md`.

## Boundaries & Constraints

**Always:**
- Keep `golden/legacy-corpus.json` completely untouched (G5).
- Ensure `golden/spec-examples.json` uses canonical JSON serialization (`serializeExpectation`) with sorted keys.
- Validate that current formats produce 0 residue and 0 failures.
- Reject any unexpected failure or unexpected residue with located details.
- Trigger gate failure if an expected failure passes or expected residue clears without updating the expectation.
- Typecheck with `noUncheckedIndexedAccess`, no `ok` from `node:assert/strict` in strict test contexts.
- Keep `core` dependency-free and untouched (G2, G6).

**Never:**
- Do not modify files in `docs/spec/examples` (they are frozen normative examples).
- Do not commit `docs/spec/tools/__pycache__`.
- Do not read or copy legacy GPL source (G7).
- Do not change `formats.ts` or `core-decoders.ts` unnecessarily.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Current format in `game/` | 19 parsed files in `docs/spec/examples/game` | 19 digests match, 0 failures, 0 residue | — |
| Single files folder in `files/` | `docs/spec/examples/files` (3 skipped: `.tpk`, `.gph`, `.exe.bin`) | 0 parsed, 3 skipped, 0 failed; counts match | — |
| Current format in `versions/` | 40 current-format files with 0 residue | 40 digests match, 0 residue | Any residue or parse failure is a gate error |
| Expected failure in `versions/` (text forms) | 12 text files (`.anm`, `.tem`, `.ene`, `.itm`, `.gam`, `.spc`, `.ste`, `.bkg`) | Parsing fails with located FormatError, matches `expectedFailures` entry ("16.4" / "16.5") | Fails gate if file suddenly parses cleanly |
| Expected failure in `versions/` (binary minors) | `main_minor1.gam`, `main_minor2.gam` | Parsing fails with EOF error, matches `expectedFailures` entry ("16.6") | Fails gate if file suddenly parses cleanly |
| Expected failure starts passing | A reader implements the format without updating expectation | Gate fails with `expected to fail (cleared by <ticket>), but parsed successfully` | Exit 1, error output |
| Expected residue in `versions/` | `character_minor3.tem`, `character_minor4.tem` (326 residue bytes) | Parsed, digest matches, residue warning matches `expectedResidue` ("16.6") | Fails gate if file has 0 residue without expectation update |
| Expected residue cleared | A reader eliminates residue without updating expectation | Gate fails with `expected residue (cleared by 16.6), but parsed with 0 residue` | Exit 1, error output |
| Unexpected residue | A current-format file produces residue | Gate fails with located residue detail | Exit 1, error output |
| Unexpected failure | A current-format file fails to parse | Gate fails with located error section/offset/message | Exit 1, error output |
| Unlisted directory | A directory in `gamesDir` that is not in `games` and not in `ignore` | Gate fails: `holds game folder(s) the expectation does not name` | Exit 1, error output |
| Ignored directory | `listings`, `renders` directories in `docs/spec/examples` | Filtered by `ignore` list, not reported as unlisted | — |
| Record corpus with expected failures | `dump --record golden/spec-examples.json docs/spec/examples` | Records digests, preserves `ignore`, `expectedFailures`, `expectedResidue` | Only refuses if an unexpected failure occurs |
| Legacy corpus gate untouched | `pnpm dump:check` over `fixtures/legacy` | 46 digests match, unchanged | Exit 0 |

</frozen-after-approval>

## Code Map

**The expectation engine (`packages/runner-headless/src/dump/expectation.ts`).**
- `ExpectationGame`: gains optional `expectedFailures?: { readonly [path: string]: string }` and `expectedResidue?: { readonly [path: string]: string }`.
- `Expectation`: gains optional `ignore?: readonly string[]`.
- `toPlainData`: serializes `ignore`, `expectedFailures`, and `expectedResidue` deterministically.
- `parseExpectation`: validates `ignore`, `expectedFailures`, and `expectedResidue`.
- `compareGame`: checks digests, unexpected failures, expected failures that passed, unexpected residue, and expected residue that cleared.
- `driftLines`: formats clear, actionable failure messages naming the file, the clearing ticket, and the drift condition.

**The CLI gate runner (`packages/runner-headless/src/dump/cli.ts`).**
- `checkCorpus`: respects `expectation.ignore` when scanning `gamesDir` for unlisted directories.
- `recordCorpus`: preserves `comment`, `ignore`, `expectedFailures`, and `expectedResidue` from an existing expectation, and allows expected failures during recording.

**The committed expectation (`golden/spec-examples.json`).**
- Holds expectation for `game` (19 digests), `files` (0 digests, 3 skipped), and `versions` (42 digests, 14 expected failures, 2 expected residue).
- Ignores `listings` and `renders`.

**Tests and Scripts:**
- `packages/runner-headless/test/dump.test.ts`: test cases for expected failures, expected failures that passed, residue detection, expected residue cleared, `ignore` list filtering, and expectation round-trip.
- `package.json`: updates `dump:check` to check both legacy corpus and spec examples, adds `dump:check:examples` and `dump:record:examples`.
- `CONTRIBUTING.md`: documents `golden/spec-examples.json` and the example corpus dump gate.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/runner-headless/src/dump/expectation.ts` — extend `ExpectationGame` and `Expectation`, implement residue checking (`hasResidue`), expected-failure and expected-residue drift detection in `compareGame` and `driftLines`, and serialize/parse support.
- [ ] `packages/runner-headless/src/dump/cli.ts` — update `checkCorpus` to filter out directories in `expectation.ignore`, and `recordCorpus` to preserve expected failures and residue while recording.
- [ ] `golden/spec-examples.json` — commit the baseline expectation covering `docs/spec/examples/{game,files,versions}` with the 14 expected failures and 2 expected residues.
- [ ] `package.json` — update `dump:check` to run both gates and add `dump:check:examples` / `dump:record:examples`.
- [ ] `packages/runner-headless/test/dump.test.ts` — add unit tests covering the new expectation features: expected failures passing, unexpected failures, expected residue clearing, unexpected residue, `ignore` directory filtering, and round-trip serialization.
- [ ] `CONTRIBUTING.md` — document the spec examples dump gate.

**Acceptance Criteria:**
- Given `docs/spec/examples/game`, when checked against `golden/spec-examples.json`, then all 19 current-format files parse with 0 failures, 0 residue, and matching digests.
- Given `docs/spec/examples/files`, when checked, then 0 files fail and 3 files skip, matching counts.
- Given `docs/spec/examples/versions`, when checked, then 42 files parse with matching digests, the 14 TK1/TK2 text forms and TK2 binary minors fail as expected (naming 16.4, 16.5, 16.6), and the 2 character minors with residue match `expectedResidue` (naming 16.6).
- Given any current-format file that fails to parse or leaves residue, then `pnpm dump:check` exits non-zero and reports the file and error.
- Given an expected failure that starts passing without updating `golden/spec-examples.json`, then `pnpm dump:check` exits non-zero and states that the file was expected to fail and names the clearing ticket.
- Given an expected residue file that reads with 0 residue without updating `golden/spec-examples.json`, then `pnpm dump:check` exits non-zero and states that the file was expected to leave residue and names ticket 16.6.
- Given `pnpm dump:check`, when run on a clean workspace with fetched fixtures, both legacy corpus (`fixtures/legacy`) and spec examples (`docs/spec/examples`) pass with 0 exit code.

## Implementation Notes

- **Residue Definition:** A parsed file has residue if its warnings contain `"residue"` or `"trailing byte"`. Current formats require 0 residue. Only `character_minor3.tem` and `character_minor4.tem` (TK2 binary minors) currently produce 326 residue bytes, which ticket 16.6 will clear.
- **Expected Failure Semantics:** The 14 failing files in `versions` are either TK1/TK2 line-oriented text forms (cleared by 16.4 or 16.5) or binary minors with layout mismatches (`main_minor1.gam` and `main_minor2.gam`, cleared by 16.6). Naming the clearing entry directly in the expectation turns subsequent feature delivery into flipping a row rather than having to author new test fixtures.
- **Backward Compatibility:** `golden/legacy-corpus.json` has no `ignore`, `expectedFailures`, or `expectedResidue`. The extended schema is strictly optional and additive, ensuring `golden/legacy-corpus.json` remains completely untouched.

## Plan Change Log

- 2026-10-16 — initial plan from ticket 2.26, `docs/spec/examples` inventory, `expectation.ts` architecture, and reconciliation notes.

## Design Notes

- The gate compares the `docs/spec/examples` folders directly from disk (`game`, `files`, `versions`), using `ignore: ["listings", "renders"]` to skip human-readable listings and render images.
- Canonical JSON format with sorted keys guarantees deterministic serialization.

## Verification

**Commands:**
- `pnpm typecheck` — expected: all packages and test suites pass.
- `pnpm test` — expected: all unit tests pass, including new expectation tests.
- `pnpm lint && pnpm graph && pnpm provenance && pnpm licence` — expected: all pass.
- `pnpm fixtures:fetch && pnpm dump:check && pnpm golden` — expected: both legacy corpus and spec examples pass with exit code 0.
