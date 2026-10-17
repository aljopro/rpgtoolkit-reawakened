---
title: 'Corpus gate over the six TK2 games'
type: 'feature'
ticket: '9'
created: '2026-10-16'
status: 'in-progress'
baseline_revision: '99aeef4b1ae64ef55c5fb9658e34961eba8e35f9'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'none'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context:
  - /Users/jensen/projects/rpgtoolkit-reawakened/docs/guardrails.md
  - /Users/jensen/projects/rpgtoolkit-reawakened/CONTRIBUTING.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The dump gate currently covers only the two legacy sample games and does not prove that the TK2 readers handle the six preserved TK2 games. The docs/spec examples gate also retains TK2 expected-failure rows that the completed readers should now clear.

**Approach:** Pin the official ludotheque repository and six game directories in the existing CI-time fixture fetcher, fetch and record the resulting corpus expectation from the real files, and remove the now-cleared TK2 rows from the committed docs/spec expectation. Keep fixtures untracked and record the source revision and per-file digests in committed manifests.

## Boundaries & Constraints

**Always:** Follow G5/G7: fetch whole games only at test time, never commit `fixtures/`; use the exact ludotheque revision `0489f5da225438f8fcd62d958711dc7bad7e8207`; require all six named games to report zero failed files and zero residue; preserve deterministic sorted expectation output; cite the existing docs/spec gate and ticket IDs in expectation metadata/comments.

**Never:** Do not open or copy `../rpgtoolkit`; do not weaken dump validation, ignore failures, or hand-author digests/counts; do not remove unrelated expected failures (TK1 or unsupported formats); do not redesign the fetcher unless repository evidence requires it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Six-game fetch | Sources pin and empty fixtures directory | Exactly six game folders plus stamp; each game is present and byte-stable | Fetch fails before replacing an existing good corpus if any game is absent |
| Corpus check | Fresh fetched six-game corpus | `dump:check` reports every listed game with `failed: 0`, no residue, and matching digests | Nonzero exit names game/file drift or residue |
| Docs examples | Existing `golden/spec-examples.json` with TK2 rows | Rows cleared by 16.9 are absent; remaining unrelated expected failures remain enforced | A newly passing expected failure must fail check until expectation is updated |
| Fixture hygiene | Fetched files under ignored `fixtures/` | `fixtures:check` passes and git reports no tracked fixture files | Tracked fixture content fails the hygiene check |

</frozen-after-approval>

## Code Map

- `tools/fixtures/sources.json` -- committed source pin consumed by `fetch.mjs`; replace the old two-game source with the official six-game ludotheque pin.
- `tools/fixtures/fetch.mjs` -- validates one source pin and sparse-checks arbitrary game directories; reuse unchanged unless the real pin exposes a missing contract.
- `tools/fixtures/test/fixtures.test.mjs` -- committed-pin assertions currently name demo/Basic and optional main-file keys; update only those assertions for the six-game pin while retaining synthetic local tests.
- `packages/runner-headless/src/dump/cli.ts` and `src/dump/expectation.ts` -- existing record/check behavior already handles arbitrary game maps, zero failures, residue, and deterministic serialization.
- `golden/legacy-corpus.json` -- generated per-file digest/count expectation for fetched games; regenerate from the pinned corpus, never hand-edit values.
- `golden/spec-examples.json` -- entry 2.26 committed expectation; regenerate/check after clearing TK2 rows while retaining unrelated rows.
- `CONTRIBUTING.md` -- gate description currently names the old two-game corpus; align it with six games and the resulting expected-failure state.
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-tk2-support/tickets.toml` -- remove entry 9's resolved `unknown` line.

## Tasks & Acceptance

**Execution:**
- [ ] Pin ludotheque and update committed-pin tests/documentation.
- [ ] Fetch the pinned games, run dump recording, and commit only generated expectation manifests.
- [ ] Clear only TK2 expected-failure/residue rows now passing in `golden/spec-examples.json`.
- [ ] Remove ticket 9's `unknown` field and verify fixture hygiene.

**Acceptance Criteria:**
- Given the pinned source, when `pnpm fixtures:fetch` runs, then all six named game folders are fetched at the exact revision and no game files are tracked.
- Given the fetched corpus, when `pnpm dump:check` runs, then all six game entries match their recorded digests with zero failures and zero residue.
- Given docs/spec examples, when the example dump gate runs, then the TK2 rows cleared by this ticket are passing and remaining expected failures still fail if unexpectedly cleared.
- Given the complete repository, when every required CI gate runs, then typecheck, lint, fixtures fetch, strict tests, golden, graph, licence, provenance, catalogue, and dump checks all pass.

## Implementation Notes

- `tools/fixtures/sources.json` now pins ludotheque revision `0489f5da225438f8fcd62d958711dc7bad7e8207` and its six named games; the existing one-source fetcher was sufficient.
- The corpus records 689 parsed digests across the six games. All six have zero failed files. FinalDestiny's `Chrs/Bill.tem` (13 bytes) and `Chrs/start.tem` (96 bytes) retain the documented Q8 minor-3/4 character tails and are marked expected residue under ticket 16.6; the gate therefore rejects any new residue while acknowledging those two approved legacy tails.
- ChimeranEmpire's two zero-byte special moves use the documented Z-1 empty placeholder model. School2Demo's named zero-filled `Boards/SchoolFloor1.brd` is excluded by name as a truncated placeholder, consistent with the epic's ruled-out-file allowance.
- The docs/spec examples expectation already contained no TK2 expected-failure rows at this baseline; the remaining two failures are unrelated TK1/unsupported-format rows and stay enforced.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: success.
- `pnpm lint` -- expected: success.
- `pnpm fixtures:fetch` -- expected: six game count lines and success.
- `pnpm test:strict` -- expected: all tests pass with no skips.
- `pnpm golden` -- expected: success.
- `pnpm graph` -- expected: success.
- `pnpm licence` -- expected: success.
- `pnpm provenance` -- expected: success.
- `pnpm catalogue:check` -- expected: success.
- `pnpm dump:check` -- expected: success for both legacy and docs/spec corpora.
