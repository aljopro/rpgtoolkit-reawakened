---
title: 'Rule the path case-fold: AD-5 against the foldPath helper'
type: 'bugfix'
ticket: '21'
created: '2026-10-12'
status: 'built'
baseline_revision: '2f94faf'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The ruling is merged (PR #38: AD-5 and format-spec §1.5 fold ASCII `A`-`Z` only), but `foldPath` and its siblings still call `toLowerCase`, so `U+212A` collides with `k` and `U+0130` becomes two code points.

**Approach:** One `asciiLower` helper in `core/formats/main-file/layout.ts`; `foldPath`, `stripTypeFolder`, `projectFolder`'s `Game` test, the §1.6 tile-reference extension match and the format registry's extension keys use it. A test pins the Kelvin sign and `U+0130`.

</frozen-after-approval>

## Implementation Notes

Oneshot: about 40 lines in 4 files, one rule already ruled in the spec. The host-side dump tool lowercases file extensions of real OS file names; it is not part of the core fold and is left alone. Verified: typecheck, lint, test:strict (459 pass, 0 skipped), golden, dump:check, graph, provenance pass; the new test fails against `toLowerCase` and passes against `asciiLower`.

## Review Triage Log

Pass 1 (quick lens): high 0, medium 0, low 2, false 0.

| Verdict | Route | Finding and evidence |
|---|---|---|
| low | patch | Comments at `layout.ts` header and `registry.ts` still said "lower-cases" / "lowercased". Reworded to ASCII fold. |
| low | patch | The `projectFolder("GAME/demo")` assertion passes under `toLowerCase` too, so it pinned nothing. Removed; the Kelvin and `U+0130` assertions on `foldPath` and `stripTypeFolder` carry the rule (test fails against `toLowerCase`, checked). |
