- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-provenance-scan-plan.md`
  summary: tools/licences/check.mjs (entry 1.5) does nothing and exits 0 when run through a symlinked path, because its isMain guard compares an unresolved argv[1] with a symlink-resolved import.meta.url.
  evidence: Reproduced in review: `node <symlink to tools/licences>/check.mjs` printed nothing and exited 0 while the real path ran. The fix is a realpathSync on argv[1] (as now done in tools/provenance/scan.mjs); it belongs in the refactor sweep (entry 1.11).
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-provenance-scan-plan.md`
  summary: Entry 1.7 (sample-game fixture fetch) must add the ignored root `fixtures/` folder to scope.skipRootPaths in tools/provenance/markers.json, or a local `pnpm provenance` after the fetch will scan the legacy sample files.
  evidence: scan.mjs walks the working tree, not git-tracked files, and `/fixtures/` is gitignored but not in skipRootPaths. CI is unaffected because the provenance job does not fetch fixtures.
- source_plan: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-sample-game-fixture-fetch-plan.md`
  summary: Entry 1.9's golden job must also run `pnpm fixtures:check` (after `pnpm fixtures:fetch`), so the "nothing under fixtures/ is tracked" check is part of a required job.
  evidence: Human decision at the entry 1.7 plan checkpoint (Open Question 2, option a). Entry 1.10's required list has no `fixtures` job, so without this the check in `fixtures.yml` could be skipped at merge. Entry 1.7 does not edit the ticket text of entry 1.9.
