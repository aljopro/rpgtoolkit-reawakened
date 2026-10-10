---
title: 'ADR 0002 and the doc amendments'
type: 'chore'
ticket: '1'
created: '2026-10-10'
status: done
baseline_revision: '462bbacca3b9016486506219ac26d96b59a49b63'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/docs/guardrails.md'
  - '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The architecture spine needs three things the binding docs forbid or omit: a reference rasteriser, glyph rasterisation and image decoding in `core` (AD-4, AD-15, AD-28); a `Math` allowlist and `**` ban as extra G3 enforcement (AD-13); and a note that the dev-only `ovsx` tool (EPL-2.0) is outside G6's shipped tree. G7 and guardrails.md require an ADR first, and a doc commit before any code.

**Approach:** Write ADR 0002 as `Proposed`, amend `docs/guardrails.md` and `docs/architecture-options.md` §2 to match it, confirm the spec companion `packages.md` already matches, and make one doc-only commit. The human accepts the ADR; status then becomes `Accepted`.

## Boundaries & Constraints

**Always:** Follow the format of ADR 0001. State each decision as a rule that matches AD-4, AD-13 and AD-15 in substance. Cite spine AD ids and E-xx, format-spec sections where they apply. Keep each amended passage minimal. Link between the ADR, guardrails.md and architecture-options.md. Write in plain language (human decision, 2026-10-10): the ADR opens with a short plain summary of what changes and why; each decision and each amended rule states its reason in one sentence; jargon (rasteriser, draw list, implementation-approximated) is defined on first use; AD ids and spec sections go in a references list at the end rather than inline.

**Never:** Touch any file outside `docs/` and the spec companion `packages.md` (human renegotiated 2026-10-10: also update the G3 line in `CLAUDE.md` and the G3 item in `.github/pull_request_template.md`, and tighten G4's test to exact key and tint match per AD-3). Change a guard-rail's intent beyond what ADR 0002 states. Edit the spine, spec or epics. Put code, lint config or CI in this change. Mark the ADR `Accepted` before the human accepts it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Acceptance | Human reads ADR 0002 and accepts | Status line becomes `Accepted` with the date | If rejected, revise before any commit |
| Rule wording | G3 and G4 text amended | Old rules still read as intended for every case ADR 0002 does not touch | A reader cannot find a contradiction between G4 and the in-core rasteriser |

</frozen-after-approval>

## Code Map

- `docs/adr/0001-typescript-core.md` -- format and tone model for ADR 0002; do not edit.
- `docs/guardrails.md` -- G3 Enforcement lint bullet (line 68), G4 Rule 1 (line 76, lists "CPU rasteriser" as a renderer) and Enforcement test bullet (line 85, "CPU rasteriser"), G6 Enforcement (line 114); amend. Header line 5 already says rules change only by ADR. G5 rule 1 (line 93) "CPU rasteriser" stays true (the harness uses `core/raster`); do not edit.
- `docs/architecture-options.md` -- §2 seam diagram `tick(dt)` (line 42) and `read-back requests` (line 46); bullets "No pixels in the core" (53), "Text layout" (54), "Blocking script calls" `tick` (56); amend. §1 R4 (line 22), §6 table (209) and §8 `runner-headless` (243) stay true; do not edit.
- `_bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/packages.md` -- verified: line 7 (`core` owns image decoding, text layout, glyph rasterisation, reference rasteriser), line 11 (harness uses `core`'s rasteriser) and line 28 (seam, `advance`) already match; no edit.
- `_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md` -- AD-4 (line 106), AD-13 (214), AD-15 (228), AD-27 surfaces (312), AD-28 (319), AD-6 `fflate` as first `core` allowlist entry (124), Deferred "ADR 0002" (456); source only, do not edit. `ovsx` appears only in the deployment diagram (413) and Deferred.
- `CLAUDE.md` -- G3 one-line summary mentions only the banned globals; outside this ticket's boundary, noted for entry 3 or the sweep.

## Tasks & Acceptance

**Execution:**
- [ ] `docs/adr/0002-core-pixels-and-deterministic-maths.md` -- new ADR, status Proposed, dated 2026-10-10; Context, Decision (1 reference rasteriser, glyph rasterisation and image decoding in core; 2 `Math` allowlist, `**` ban, `fmath`; 3 dev-only tools outside G6's shipped tree, naming `ovsx`), Consequences, Alternatives (runner read-back with a G3 exception; retained canvas command lists), Guard-rail changes -- records the amendments as one reviewable decision
- [ ] `docs/guardrails.md` -- G3 Enforcement: add the `Math` allowlist and `**`/`**=` ban; G4 Rule 1: drop "CPU rasteriser" from the renderer list and state that the single reference rasteriser lives in `core/raster`, is pure, and is not a renderer in this sense; G4 Enforcement test: compare `core/raster` with WebGL2; G6 Enforcement: dev-only tools never shipped or linked sit outside the production-tree scan and are named in ADR 0002 -- keeps the normative text aligned
- [ ] `docs/architecture-options.md` -- §2: replace `tick(dt)` with `advance`, replace read-back requests with core-owned persistent surfaces, rewrite the "No pixels" and "Text layout" bullets, and link ADR 0002 -- removes the contradiction with the spine
- [ ] `_bmad-output/.../spec-rpgtoolkit-reawakened/packages.md` -- confirm the seam section matches; edit only if it does not -- the entry names it explicitly

**Acceptance Criteria:**
- Given ADR 0002, when it is read, then it states the three decisions, each matching AD-4, AD-13 or AD-15 in substance, and its status is `Proposed` until accepted.
- Given `docs/guardrails.md`, when G3, G4 and G6 are read, then G3 lists the `Math` allowlist and `**` ban, G4 rule 1 does not contradict a rasteriser in `core`, and G6 names the dev-only tool carve-out.
- Given `docs/architecture-options.md` §2, when read, then it says neither "no pixels in the core" nor "text layout is a runner capability" without the ADR 0002 amendment, and it links ADR 0002.
- Given the working tree after the change, when staged files are listed, then only `docs/` files and the spec companion `packages.md` appear.
- Given every relative link in the three docs, when followed, then it resolves.

## Implementation Notes

- After review, the human asked to fix the two deferred items in this ticket: `CLAUDE.md` G3 line, PR template G3 checkbox (same stale wording), and G4 Enforcement exact match for key and tint (AD-3). ADR 0002's Guard-rail changes records both. The deferred entries were removed.

## Plan Change Log

- 2026-10-10, review pass 1. Trigger: quick-lens finding that §1 R4 (architecture-options line 22) contradicts amended §2 once read-back moves to `core/raster`. Amended: Code Map note "R4 stays true; do not edit" is wrong; R4 gets a one-line ADR 0002 parenthetical. Known-bad state avoided: a doc that says runners must copy pixels back while §2 says the core serves read-back. Handled as a patch, not a revert, because the fix is one parenthetical and the rest of the diff is sound. KEEP: the ADR's plain summary, Terms section, one-sentence reasons and references-at-end layout.

## Review Triage Log

Pass 1 (quick lens): high 0, medium 2, low 4, false 1, maybe-false 0.

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | ADR hot-path mitigation lets an injected rasteriser differ from `core/raster` | medium | patch | Undercuts Decision 1 and G3 rule 3; ADR now requires bit-identical output under the conformance fixtures. |
| 2 | Dev-only tool naming rule has no automated check | medium | patch | guardrails.md line 4 promises a check per rule; licence job now also fails on unnamed non-allowlisted dev tools. |
| 3 | architecture-options says platform fonts off in "golden runs" only | low | patch | ADR and AD-15 say golden and conformance; wording aligned. |
| 4 | Seam diagram shows surfaces as a draw-list op and push/pop as persistent canvases | low | patch | Contradicts AD-27; diagram reworded. |
| 5 | `advance` listed beside a separate input-events channel | low | patch | AD-1/AD-14 deliver inputs inside `advance`; folded in. The "ADR doesn't decide tick→advance" part is false: the rename comes from AD-1 and the ADR only records the doc alignment. |
| 6 | §1 R4 still requires runner CPU read-back | low | patch | Contradicts amended §2; see Plan Change Log. |
| 7 | Untracked plan file would break the "only docs/ staged" criterion | false | reject | Nothing is staged yet; the commit stages the three doc files by name. |

## Design Notes

Order: write the ADR as `Proposed`, present it for acceptance at the review checkpoint, set `Accepted` with the date only after the human accepts, then make the one doc-only commit. The ADR needs no G2 change for AD-28: `fflate` joins the existing `core` allowlist under AD-6, and G2 rule 3 already allows that.


AD-13's allowlist: `abs`, `ceil`, `floor`, `round`, `trunc`, `sign`, `min`, `max`, `fround`, `imul`, `clz32`, `sqrt`. Everything else on `Math` and the `**` operators are banned; `fmath` supplies the rest with `+ − × ÷` and `sqrt` only.

## Verification

**Commands:**
- `git diff --name-only` -- expected: only `docs/adr/0002-core-pixels-and-deterministic-maths.md`, `docs/guardrails.md`, `docs/architecture-options.md` (and `packages.md` only if edited)
- `grep -rn "No pixels in the core\|Text layout\*\* is a runner" docs/` -- expected: no unamended match

**Manual checks (if no CLI):**
- Read G4 rule 1 beside AD-4 and confirm they do not contradict.
