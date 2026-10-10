---
title: 'Sample-game fixture fetch'
type: 'chore'
ticket: '7'
created: '2026-10-10'
status: done
baseline_revision: '6bb4068bed7518c4eda5be20690fd67974e9fb3f'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/docs/guardrails.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** G5 rule 4 says the legacy `demo` and `Basic` games are fetched at CI time and never committed, but nothing fetches or pins them, and nothing stops one of their files being committed. Entry 1.9's golden job needs them on disk.

**Approach:** `tools/fixtures/` holds a pin file, a fetch script that fills `fixtures/legacy/` atomically and reuses it while the pin is unchanged, a check that nothing under `fixtures/` is tracked, tests against a local git repository, and `.github/workflows/fixtures.yml`. The provenance skip owed in `deferred-work.md` lands here too.

## Boundaries & Constraints

**Always:**
- Pin file `tools/fixtures/sources.json`: `url`, `rev` (40 lowercase hex; a branch, tag or short id is rejected), `gamesPath`, `games`. A pin change is a PR that edits only that file.
- Source and pin (human decision, 2026-10-10): `https://github.com/chrisbmatthews/rpgtoolkit` at `9191b9191c9bda0998c6faae16929b3331ed2ead`, the tip of `master` (2019-07-11). `build/game/demo` has 75 files and `build/game/Basic` has 58.
- Enforcement (human decision, 2026-10-10): `pnpm fixtures:check` runs in this entry's `fixtures.yml` and, once built, in entry 1.9's required golden job. No other workflow is edited here. The change owed to entry 1.9 is logged in `deferred-work.md`.
- Layout, read by entry 1.9: `fixtures/legacy/<game>/…` (the game folder's own paths) and `fixtures/legacy/.fetched.json` (url, rev, file count per game).
- Commands: `pnpm fixtures:fetch`, `pnpm fixtures:check`, `pnpm fixtures:test`. Entry 1.9's golden job runs `fixtures:fetch`.
- Fetch: shallow, blobless, sparse `git fetch` of exactly `rev` with `core.autocrlf=false`; `FETCH_HEAD` must equal `rev`; every game must be a folder holding at least one file. It builds in `fixtures/.staging-<pid>/` and renames to `fixtures/legacy` only when complete. Failure removes the staging folder; leftovers are removed at start.
- Isolation: the staging folder sits inside the project's own git work tree, so every git call names the staging repository with `--git-dir` and `--work-tree`, and `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE` and `GIT_COMMON_DIR` are removed from the child environment. Before any `sparse-checkout` or `checkout`, `git rev-parse --show-toplevel` must equal the staging work tree (compared by real path, because temp folders can sit behind a symlink), else exit 1. The project's HEAD, index, config and files are never touched. Tests that run fetches use a temp root that is a git repository with `/fixtures/` ignored.
- Hygiene: git is spawned without a shell, arguments as an array, with `--` before the url; `url` must not start with `-`; `gamesPath` is relative with no `..` segment and no leading `/`; git >= 2.25 is required (`sparse-checkout --no-cone`), with a named error that includes the version found.
- Cache: when `.fetched.json` matches the pin and each game folder holds its recorded file count, print `cached` and run no git command; otherwise refetch.
- Check: fails if `git ls-files` lists anything under root `fixtures/`, if `fixtures/` is not ignored, or if the rule is not anchored (`packages/x/test/fixtures/…` and `tools/fixtures/…` must not be ignored), or if the root is not a git work tree.
- CLI: optional `[root]`; fetch also takes `--sources <file>` (tests inject a local repository). Unknown flags, a second positional and a missing value exit 1 with a named error. The entry guard compares real paths. Node built-ins and `git` only.
- Root `fixtures` joins `scope.skipRootPaths` in `tools/provenance/markers.json`; nested `fixtures` folders stay scanned.
- No file under `tools/` or `.github/` holds a legacy marker. Tests build everything at run time and never touch the network.

**Never:** commit, bundle or publish fetched files; open the legacy tree beyond the two game folders; edit `.gitignore`, `docs/`, ticket text or other workflows; add npm dependencies or a tar reader; report success having done nothing.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First fetch | No `fixtures/`; pin to a local repo with both games (a file holding CR, LF and NUL; a name with a space) | Exit 0 `fetched`; both folders byte-identical to the source; stamp has url, rev, counts; no staging left | No error expected |
| Cache reuse | Rerun, same pin, source repo since deleted | Exit 0 `cached`; nothing rewritten | No error expected |
| Pin moved or cache damaged | `rev` changed, or stamp rev differs, or a game folder lost a file | Refetched; new content replaces old, stale files gone | No error expected |
| Game missing | Source lacks `Basic`, or it is a file | Exit 1 naming the game; no `fixtures/legacy` created | CLI error |
| Fetch fails | `rev` absent from the source, source unreachable, no `git` on PATH, or git older than 2.25 (stub `git` on PATH) | Exit 1 naming the git step, and the version found for an old git; no staging left; an earlier good folder untouched | CLI error |
| Project repo untouched | Root is a git work tree with a committed file and `/fixtures/` ignored (as in CI) | After a fetch, also one that fails, the root's HEAD, index, config (no sparse-checkout setting) and tracked files are unchanged and `git status --porcelain` is empty | No error expected |
| Interrupted earlier run | Stale `fixtures/.staging-1` | Removed; fetch succeeds | No error expected |
| Bad pin file | Missing, not JSON, `rev` a branch, short or upper case, empty url, `url` starting with `-`, `gamesPath` absolute or containing `..`, game `..` or with `/`, duplicate game, unknown key | Exit 1 naming the field, before any git call | CLI error |
| Bad CLI use | Unknown flag, two roots, `--sources` without value, missing root | Exit 1 naming it | CLI error |
| Symlinked path | Tool run through a symlinked folder | Same result as the real path (first fetch exits 0) | No error expected |
| Check passes | Temp git repo with `/fixtures/` ignored, fetched files untracked, `packages/a/test/fixtures/x` and `tools/fixtures/y` tracked | Exit 0, `0 tracked` | No error expected |
| Fixture tracked | `git add -f fixtures/legacy/demo/x` | Exit 1 naming the file | CLI error |
| Ignore lost | `.gitignore` lacks the rule, or it is unanchored | Exit 1 naming the rule | CLI error |
| Not a git tree | Root without `.git` | Exit 1 | CLI error |
| Provenance skip | Marker in root `fixtures/legacy/demo/x.ts` and in `packages/a/test/fixtures/x.ts` | Root file skipped; nested file flagged | Nested hit exits 1 |
| CI (CI check) | Pull request | `fixtures.yml` runs tests, cache, fetch, check; log lists both games; a rerun restores the cache | CI job fails |

</frozen-after-approval>

## Code Map

- `tools/fixtures/sources.json` -- new. The pin: url and rev from the Source and pin decision, `gamesPath` `build/game`, `games` `["demo","Basic"]`.
- `tools/fixtures/fetch.mjs` -- new. Exports `loadSources`, `fetchFixtures`; CLI.
- `tools/fixtures/check.mjs` -- new. Tracked-file and ignore-rule check.
- `tools/fixtures/test/fixtures.test.mjs` -- new. Temp git repositories, one test per matrix row, plus the committed pin.
- `tools/provenance/markers.json`, `tools/provenance/test/provenance.test.mjs` -- add `fixtures` to `skipRootPaths`; test the provenance-skip row.
- `package.json` -- scripts `fixtures:fetch`, `fixtures:check`, `fixtures:test`.
- `.github/workflows/fixtures.yml` -- new. Shape of `provenance.yml`.
- `tools/provenance/scan.mjs` -- `isEntryPoint` to copy. `.gitignore` already holds `/fixtures/`.

## Tasks & Acceptance

**Execution:**
- [ ] `tools/fixtures/sources.json` -- write the pin -- one file to change the revision
- [ ] `tools/fixtures/fetch.mjs` -- validate pin, cache check, staged sparse fetch, verify, swap -- G5 rule 4
- [ ] `tools/fixtures/check.mjs` -- tracked-file and anchored-ignore check -- nothing from the games reaches git
- [ ] `tools/fixtures/test/fixtures.test.mjs` -- one test per matrix row, plus the committed pin: valid, `demo` and `Basic` named -- every row runs
- [ ] `tools/provenance/markers.json`, `tools/provenance/test/provenance.test.mjs` -- skip root `fixtures` and test it -- deferred-work item owed to 1.7
- [ ] `package.json`, `.github/workflows/fixtures.yml` -- scripts; steps install, `fixtures:test`, `actions/cache@v4` (path `fixtures/legacy`, key `legacy-games-${{ hashFiles('tools/fixtures/sources.json') }}`), `fixtures:fetch`, `fixtures:check`; Node 24.21.0 -- CI fetch with cache

**Acceptance Criteria:**
- Given a clean clone and the pinned revision, when `pnpm fixtures:fetch` runs, then `fixtures/legacy/demo` and `fixtures/legacy/Basic` hold the counts in `.fetched.json` (75 and 58) and `git status` stays clean.
- Given a populated `fixtures/legacy`, when `pnpm fixtures:fetch` runs again, then it prints `cached` without network access.
- Given the populated folder, when `pnpm fixtures:check`, `pnpm provenance`, `pnpm lint` and `pnpm typecheck` run, then all pass.
- Given a pull request, when Actions run, then `fixtures.yml` passes and its log shows both games fetched.

## Implementation Notes

- Decisions (human, 2026-10-10, at the plan checkpoint): Open Question 1, option (a): the `master` tip above. Open Question 2, option (a): entry 1.9's golden job also runs `pnpm fixtures:check`; logged in `deferred-work.md`. The plan's Open Questions section was removed once both were answered.

## Plan Change Log

## Review Triage Log

Clean review pass by independent reviewer (review-1-7): 0 defects found. All 4 acceptance criteria, 49 offline tests, G5 untracked fixtures, and G7 provenance skip verified.

## Design Notes

- **Source evidence.** `people.md` names `chrisbmatthews/rpgtoolkit` as the legacy repository; `docs/guardrails.md` G5, `docs/format-spec.md` and `docs/architecture-options.md` name `build/game/demo` and `build/game/Basic` "from the legacy repo". `git ls-remote`, then a blobless clone and `git ls-tree` (names only): master is `9191b919…` (2019-07-11); `build/game/Basic` has 58 files (3,149,861 bytes), `build/game/demo` 75 (3,158,111), all regular files, no case-colliding names. Their tree ids (`4c158cd…`, `ed9a4fd…`) are the same at `037cca6…`. Tag `cbm_lastcommit` has no `build/`.
- **Method.** Sparse `git fetch --depth 1 --filter=blob:none <sha>` plus `sparse-checkout`: measured 0.64 MiB pack, about 2 s, only git and Node; the commit id proves the content; failures are git exit codes. GitHub tarball for the commit: 23.2 MB, about 9 s, the whole tree; Node has no tar reader, so it needs system `tar`; the commit id is not a content hash of the bytes; `api.github.com` allows 60 unauthenticated requests an hour (the tarball host was not measured). Chosen: sparse git. A path-limited `git checkout <sha> -- <paths>` fetched blobs one at a time (44 s), so `sparse-checkout` is used.
- **Cache.** The fetch is small, so the cache mainly removes GitHub as a failure point on reruns; the key changes exactly when the pin file does. The stamp is verified on every run, so a stale cache cannot pass.
- **Anchoring.** `tools/fixtures/` is tracked only because the ignore rule is `/fixtures/`; the check keeps it so.
- **Licensing facts.** The repo records say SourceForge lists GPLv2 and BSD for the project; GitHub's licence API found no licence on the sibling repos `trans3` and `editor`; nothing records a licence for the game folders. `people.md`: the "VIP" MIDI packs shipped with the sample games are by Chris and Craig Reeves (VIP Entertainment Ltd.). The trans3 test game (a different folder) probably uses assets from a community game. 62 of the 133 files are `.mid`. The games are fetched for tests only and never committed, bundled or published (G5 rule 4, G7 rule 3), so `THIRD_PARTY_NOTICES` does not list them. Their files and `build/*.txt` were not opened.
- **Risk.** Raised from low (the ticket) to medium: a git command aimed at the wrong repository could rewrite the project's own work tree (guarded by the Isolation rule and its test), and the games come from a third-party repository that can disappear (a project-owned mirror was considered and not chosen).

## Verification

**Commands:**
- `pnpm fixtures:test` -- expected: every test passes, offline
- `pnpm fixtures:fetch && pnpm fixtures:fetch && pnpm fixtures:check` -- expected: `fetched`, then `cached`, then 0 tracked (needs network)
- `pnpm provenance:test && pnpm provenance` -- expected: pass with the games on disk
- `pnpm typecheck && pnpm lint && pnpm graph && pnpm licence && pnpm test` -- expected: still green

**Manual checks (if no CLI):**
- In the first pull request's Actions log, `fixtures` shows both games fetched; a rerun shows the cache restored and `cached`.
