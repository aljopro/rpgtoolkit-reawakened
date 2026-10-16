---
title: "Refactor sweep"
type: 'chore'
ticket: '14'
created: '2026-10-16'
status: in-progress
risk: 'low'
review: 'thorough'
context: ['{project-root}/docs/guardrails.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/deferred-work.md']
---

## Intent

**Problem:** Epic 2's format readers and resolver have cleanup explicitly deferred by their reviews. The resolver duplicates the path composition already provided by the main-file layout helper, and the ZIP reader retains an unreachable L16 filter branch after L3 enforces the same declared-size bound earlier.

**Approach:** Apply only these two behavior-preserving cleanups. Route game-folder reference construction through `resolveReference`; retain the package-root exception because packages do not insert a `Game/<projectPath>/` prefix. Remove the unreachable `skipped` bookkeeping and L16 filter handling; L3 continues to reject oversize entries during central-directory parsing. Correct the stale `.gam` test comment to reflect the fetched corpus.

## Boundaries & Constraints

**Always:** Follow `docs/guardrails.md` G1–G7. Cite `format-spec §1.5` and §13 as applicable. Preserve all observable resolver and package-reader behavior.

**Never:** Change format behavior, tests beyond stale commentary, golden files, specifications, or unrelated deferred findings.

## Tasks & Acceptance

- [x] `packages/core/src/formats/resolver/resolver.ts` — use the canonical layout helper for game-folder paths while preserving the package-root path.
- [x] `packages/core/src/formats/package/zip.ts` — remove unreachable L16 filter rejection and its bookkeeping, relying on the existing L3 central-directory check.
- [x] `packages/core/test/format-main-file.test.ts` — correct stale corpus commentary; `demo.gam` coverage is exercised by the dump gate.
- [x] No golden files or format behavior changed.

**Acceptance:** `pnpm test:strict` passes without skipped tests after fetching fixtures; typecheck, lint, dependency graph, licence, provenance, fixture/catalogue checks, dump expectations and golden replay pass. Every code cleanup traces to a deferred review finding.

## Review Triage Log

- 2026-10-16 — implemented the two deferred cleanup findings from `_bmad-output/initiative-rpgtoolkit-reawakened/deferred-work.md` lines 105–106 and 123–124. Corrected the stale `.gam` test comment from lines 185–187.
