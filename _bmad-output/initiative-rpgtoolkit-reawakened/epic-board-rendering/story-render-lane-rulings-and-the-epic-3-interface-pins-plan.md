---
title: 'Render-lane rulings and the epic-3 interface pins (doc-first)'
type: 'chore'
ticket: '21'
created: '2026-10-12'
status: 'in-review'
baseline_revision: 'e6f65e8'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'none'
review_source: 'pinned'
lenses_ran: []
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/docs/engine-features.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The render lane cannot be built from the documents. The render-readiness study
(`epic-board-rendering/discovery/render-readiness.md`) found 23 behaviours the format specification and the engine
inventory leave open — the isometric resample, draw order, under-vector promotion, shade and light arithmetic, the ambient
boundary, sprite z-order ties, parallax at its edges, the debug overlay flag bits, animated-tile frames, board constants,
`put`/`layerPut`, transparency, the message window's geometry and defaults, modal widgets, screen slots, canvases,
transitions, the camera's numbers, `viewBrd`, animation endings, text defaults and `send`'s cutover. Guard-rail G7 forbids
inventing any of them, so each would otherwise stall or fork its entry. Separately, four interfaces epic rpgcode-vm's
entries must code against were unnamed: the `waits` and `threads` phase-handler signatures and the phase registration
seam, the `GameState` section replacement rule against its placeholder aliases, the harness request-and-reply seam, and the
call the lifecycle makes to load a program and start a thread.

**Approach:** One docs-first ruling pass, in its own commits: format-spec §15 (file and data semantics) and
engine-features §15 (engine behaviour) carry the 23 rows, split into ratified (the sample data settles them), ruled here
(with a one-sentence reason), and deferred; the five judgement calls carry `<!-- OWNER: … -->` notes listing the
alternative. The four cross-epic contracts land in the AD that owns each (AD-26 phase steps and the program and thread
entry points; AD-10 section replacement; AD-5 replies in a harness; AD-8 manifest order).

## Boundaries & Constraints

**Always:** docs only, in their own commit (G7); every ruling cites the format section or E-id it settles, and every
reason is one sentence; ids and section numbers live in the References list at the end of each new section, not inline in
prose.

**Ask first:** none remaining — the rulings are written and this plan is at `review`, because the entry is `hitl` and the
five judgement calls are the owner's to confirm.

**Never:** amend the AD-8 duplicate rule or ADR 0004's manifest contract, which epic rpgcode-vm's entries 3.3 and 3.25
own; change a file format; touch the legacy source.

## Key Decisions

* Rulings live in one new section per document rather than editing twenty-odd places, mirroring format-spec §9.12 (the
  RPGCode rulings): one place to review, and the rows name the section each touches.
* A single total order on drawn geometry (RND-2) replaces a per-mode traversal loop, because the format states none and
  AD-25 requires a total order.
* Cell-bounding under-vector promotion (RND-3) rather than a pixel stencil, because the draw-command union has no polygon
  clip (AD-3).
* The ambient boundary is drawn at the builder (RND-6): board compositing tints, everything else carries a zero tint.

## References

* `_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/discovery/render-readiness.md` — the study, with each
  row's blocked entry.
* `docs/format-spec.md` §15; `docs/engine-features.md` §15; the spine's AD-5, AD-8, AD-10 and AD-26.
* Epic 3's draft plan `story-tracer-bullet-source-text-to-a-restored-snapshot-through-the-plan.md` (its Q3 and Q6 are the
  two answers the AD-10 and AD-26 pins supersede).

## Acceptance Criteria

* A person approves the two new sections and the four spine amendments.
* Every row of the render-readiness study is ruled or deferred with the entry it affects named; no row invents behaviour
  without saying so.
* The five judgement calls are listed in the sections' review lists and in the PR body.

## Verification

`docs/` and the spine only; `pnpm lint` and `pnpm test` stay green (no code changed); a repository search shows the new
sections are the only place the rulings live.

</frozen-after-approval>

## What landed

| Ruling | Where | Kind |
|---|---|---|
| RND-A1…A8 | format-spec §15.1 | ratified from the sample data (key, byte order, column-major, diamond mask, shade runs, empty parallax background, zero ambient, `.anm` frame key, `mwin.jpg`'s size) |
| RND-1, 2, 3, 5, 6, 7, 8, 9, 16, 18, 19, 21, 23 | format-spec §15.2 | ruled here; RND-1, 2, 3, 5 and 23 are the judgement calls |
| RND-24 | format-spec §15.3 | deferred to the entry that builds the iso renderer, if a golden disagrees with RND-2 |
| RND-A9, A10, RND-4, 10, 11, 12, 13, 14, 15, 17, 20, 22 | engine-features §15 | ratified and ruled (the window, widgets, slots, canvases, transitions, camera, `viewBrd`, animations, text defaults, `send`) |
| AD-26 | spine | phase steps and registration; `loadProgram` and `startThread` |
| AD-10 | spine | a section's type is its module's; the owner's entry replaces the placeholder alias and bumps the schema |
| AD-5 | spine | the harness takes a reply resolver and answers `asset` and `loadBlob` from its fixture folder |
| AD-8 | spine | a domain pack sits above the stub packs in the default manifest; the replacement warns on the Logger port |

No review lens ran: the change is documentation and decisions, and the review of record is the owner's ruling on the six items below.

## Open for the owner at review

1. **RND-1** nearest-neighbour isometric resampling (against bilinear).
2. **RND-2** the total order (against reconstructing the legacy traversal).
3. **RND-3** cell-bounding under-vector promotion (against a polygon stencil).
4. **RND-5** additive shade layers with a linear light falloff (against a maximum and a quadratic falloff).
5. **RND-23** the `+8 px` iso sprite offset applying at runtime (against editor-only).
6. **AD-26's** `loadProgram` and `startThread` signatures, which epic rpgcode-vm's entries 3.8 and 3.9 will now be
   written against.
