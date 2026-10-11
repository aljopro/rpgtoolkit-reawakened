- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-provenance-scan-plan.md`
  summary: tools/licences/check.mjs (entry 1.5) does nothing and exits 0 when run through a symlinked path, because its isMain guard compares an unresolved argv[1] with a symlink-resolved import.meta.url.
  evidence: Reproduced in review: `node <symlink to tools/licences>/check.mjs` printed nothing and exited 0 while the real path ran. The fix is a realpathSync on argv[1] (as now done in tools/provenance/scan.mjs); it belongs in the refactor sweep (entry 1.11).
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-provenance-scan-plan.md`
  summary: Entry 1.7 (sample-game fixture fetch) must add the ignored root `fixtures/` folder to scope.skipRootPaths in tools/provenance/markers.json, or a local `pnpm provenance` after the fetch will scan the legacy sample files.
  evidence: scan.mjs walks the working tree, not git-tracked files, and `/fixtures/` is gitignored but not in skipRootPaths. CI is unaffected because the provenance job does not fetch fixtures.
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-sample-game-fixture-fetch-plan.md`
  summary: Entry 1.9's golden job must also run `pnpm fixtures:check` (after `pnpm fixtures:fetch`), so the "nothing under fixtures/ is tracked" check is part of a required job.
  evidence: Human decision at the entry 1.7 plan checkpoint (Open Question 2, option a). Entry 1.10's required list has no `fixtures` job, so without this the check in `fixtures.yml` could be skipped at merge. Entry 1.7 does not edit the ticket text of entry 1.9.
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-contract-types-canonical-form-and-hashes-plan.md`
  summary: `encodeLog` (entry 1.8) throws `TypeError` on a plain record shaped exactly `{ t: 'bytes', hex: string }`, because `decodeLog` would read it back as bytes, and it passes non-plain leaves (undefined, functions, NaN) through to `canon`. A valid `PortData` value of that shape therefore aborts recording.
  evidence: Review F8. Only free-form positions can carry such a record (`ExtensionResult.result`, `ExtensionCallRequest.args`), and the E-99 extension API is not defined yet. Revisit when it is: games are untrusted (AD-17), so recording must not abort on a script-controlled value. An escape scheme (wrap the records that would collide) makes `encodeLog` total.
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-contract-types-canonical-form-and-hashes-plan.md`
  summary: `canon` (entry 1.8) recurses without a depth bound, so nesting beyond about 3,900 levels raises `RangeError` at a host-dependent depth instead of `TypeError`.
  evidence: Review F10, measured on Node 26.8.1 (`canon` fails at depth 3906 and `encodeLog` at 3515; `JSON.stringify` copes with 200,000). The VM epic must bound script-created nesting well below this (AD-17), or `canon` gets a fixed explicit limit so the failure is identical on every runner (G3).
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-contract-types-canonical-form-and-hashes-plan.md`
  summary: `canon` (entry 1.8) costs about 13 times `JSON.stringify` (3.9 ms against 0.3 ms on a 264 KB state; `hashState` 6.4 ms), and `Object.keys(items)` on every array allocates about 107 MB for a 1M-element array.
  evidence: Review F11, not a correctness issue. Decide when the engine epic wires `hashState` into `advance` (the Design Notes say it runs on every `advance`): replace the density check with a loop over `i in items`, skip the per-property descriptor read on the common path, or hash while serialising.
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-runner-harness-driver-synth-scaffold-and-the-golden-job-plan.md`
  summary: The golden test double (entry 1.9) does not model the focus pause of AD-14/E-03 (it throws on focus, and the driver throws when advance reports 0 steps run). Pause replay lands with the engine epic.
  evidence: Review finding F2. Revisit when the engine epic implements E-03 pause state.
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-runner-harness-driver-synth-scaffold-and-the-golden-job-plan.md`
  summary: `audio.ended` and `video.ended` emission by the headless runner is deferred because it requires parsed durations from audio readers that core currently lacks.
  evidence: Review finding F2 / Design Notes. Revisit in the audio-synth epic.
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-runner-harness-driver-synth-scaffold-and-the-golden-job-plan.md`
  summary: An exported `./testing` entry point for runner-harness (AD-22) is deferred because dependency-cruiser rule r2 bans subpath imports.
  evidence: Review finding F17 / probe b2. Revisit when DAP needs runner-harness testing helpers.
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-runner-harness-driver-synth-scaffold-and-the-golden-job-plan.md`
  summary: The harness driver (entry 1.9) throws if a step report contains non-empty requests or diagnostics.
  evidence: Review finding F10 / Design Notes. Revisit when a real engine emits diagnostics or blocking requests.
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-required-ci-checks-branch-protection-and-contributor-docs-plan.md`
  summary: If a merge queue is ever enabled for `main`, `merge_group:` must be added to `ci.yml`'s `on:`.
  evidence: GitHub reports required checks for a queue entry only from workflows triggered by `merge_group`; without it every required check stops reporting and the merge fails. No merge queue exists today (entry 1.10).
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-refactor-sweep-plan.md`
  summary: `uv run _bmad/method/scripts/tickets.py find <id>` aborts with ``frontmatter lists must be inline: `key: [a, b]` `` because ten of the epic's plan files use a block-style `context:` list, so the ticket CLI cannot be used to read tickets for this epic.
  evidence: Reproduced by the entry 1.11 planner and reviewer at `eddc75c`: the strict re-parse inside `tickets.py`'s `load_folder` (the raise is around line 167, called around line 360) rejects a block list, so `find`, `status`, `next` and `pull` all abort identically — `cmd_find` never parses frontmatter itself, and ten plans use a block list. Fixing it either way — the strict re-parse in `load_folder`, or inline lists across ten historical plans — edits method-owned tooling or plan history, so entry 1.11 logged it instead of changing it.
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-refactor-sweep-plan.md`
  summary: `tools/deps/graph.mjs` and `tools/check-core-deps.mjs` have no entry guard at all, so importing either would execute the check as a side effect; and `packages/runner-headless/src/cli.ts` resolves only `argv[1]` with `realpathSync`, not `import.meta.url`.
  evidence: Entry 1.11 review finding F10. Neither tool exports anything and every call site spawns a child process (`tools/deps/test/graph.test.mjs`, `packages/core/test/lint-rules.test.ts`, the root `package.json` scripts), so there is no live defect; `cli.ts` still detects its entry because Node realpaths the main module by default (no `--preserve-symlinks` anywhere in the repo). A guard is needed only if a caller ever imports them.

## Resolved

- `deferred-work` §2 (the ignored `fixtures/` folder missing from the provenance scan's `scope.skipRootPaths`) — resolved by entry 1.7; `tools/provenance/markers.json` lists `"fixtures"`.
- `deferred-work` §3 (entry 1.9's golden job must also run `pnpm fixtures:check`) — resolved; the required `golden` job in `.github/workflows/ci.yml` runs `fixtures:fetch` then `fixtures:check`.
- `deferred-work` §1 (the licence tool's entry guard silently did nothing through a symlinked path, so the G6 gate exited 0 having checked nothing) — resolved by entry 1.11: `tools/licences/check.mjs` resolves both sides with `realpathSync` (the pattern `tools/provenance/scan.mjs` and `tools/fixtures/fetch.mjs` already use), and `tools/licences/test/licences.test.mjs` gained a regression row that fails against the old file and passes against the new one.
- `CLAUDE.md`'s stale G3 summary (recorded in the entry 1.1 plan, line 50) — resolved by entry 1 in commit `bb6c540`; the guard-rail text and the pull-request template row carry the `Math` allowlist and the `**` ban.
