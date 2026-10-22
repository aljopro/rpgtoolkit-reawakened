---
title: "Rulings: the media object, its events, the game-file audio settings and the retired surface"
type: 'feature'
ticket: 1
created: '2026-10-21'
status: 'built'
baseline_revision: '9de95b3e9d57336f41e3d4bb59ef71fbd57249e9'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/audio-media.md'
  - 'docs/spec/engine/rpgcode-modules-and-objects.md'
  - 'docs/spec/engine/rpgcode-functions.md'
  - 'docs/spec/formats/main-file.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 6's procedural media API is not the approved Reawakened model. Later audio work needs one final, owner-approved script contract before code starts.

**Approach:** Rule the media, track and voice objects, their event surface, game-file audio settings, and the exact procedural commands that are retired. Preserve the existing deterministic playback, cue, wait and fade rules and all Toolkit 3.1 audio calls.

## Boundaries & Constraints

**Always:** Documentation first under G7; every owner ruling has evidence and a rejected alternative. Reuse Epic 19's object, emitter and engine-phase cancelable-dispatch rules. Keep audio state plain data and preserve the 3.1 compatibility surface.

**Never:** Change TypeScript, fixtures, goldens, cue/state timing, runner protocol, or Epic 9 handoff. Do not edit the command catalogue in this ruling; the removed-name inventory must be checked against it for the later cutover.

## Key Decisions

1. Use global `media`, `media.track(name)` and built-in track properties such as `media.music`. `mediaPlay(file[, options])` returns a data-only voice identified by track, slot and `cueId`; it reads `track`, `file`, `state`, `position`, `length`, `volume` and `loop`, and goes stale when its slot is replaced. Options are named `track`, `loop`, `volume`, `priority`, `sync` and `wait`. Hydrated voice methods are `stop`, `pause`, `resume`, `seek(seconds)`, `fade(percent, seconds)` and `wait`.
2. Retain the case-insensitive `mediaStop(track[, voice])` extension alongside the 3.1 no-argument `mediastop()` call. Object control is through voice methods; the compatibility extension remains available.
3. Store audio settings in a separate additive TKR extension beside the package-list block: ordered named tracks and voice counts, voice cap, and optional `defaultSoundFont`. Without the block, use Epic 6 defaults; settings are not saved.
4. Events are past-tense state changes (`started`, `stopped`, `ended`, `looped`, `paused`, `resumed`, `faded`) with plain-data details `track`, `slot`, `cueId`, `file` and `tick`; tracks and `media` re-emit voice events. `beforePlay` is the one cancelable event, with sources `script`, `board`, `animation`, `battle`, `menu` and `video`; listeners may cancel or change `file`, `volume` and `loop`.
5. Engine-originated cancelable dispatch follows Epic 19's EMIT-11 rule. Preserve the established 3.1 audio aliases and their behavior. Replace the old SoundFont deferral with the game-file setting decision.

</frozen-after-approval>

## Code Map

- `docs/spec/engine/audio-media.md#media-command-family` — current P3/P6/P7 procedural signatures, limits, errors, examples and legacy mapping; preserve timing/cue/wait/fade rules outside the replaced API surface.
- `docs/spec/engine/audio-media.md#audio-deferrals` — current default-SoundFont deferral to supersede with the owner decision.
- `docs/spec/engine/rpgcode-functions.md` audio rows — authoritative inventory for checking retired names and unchanged 3.1 aliases; do not edit in this ticket.
- `docs/spec/engine/rpgcode-modules-and-objects.md#oop-12`, `#emit-1`, `#emit-11` — data-only hydrated methods, event fields, and engine-originated cancelable dispatch; cite rather than redefine.
- `docs/spec/formats/main-file.md` — existing additive TKR package-list extension; preserve legacy rows and package-list encoding.
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-media-objects/epic-media-objects.md` — recorded 2026-10-19 owner decisions and remaining assumptions; the 21.2–21.6 plans consume this ruling.
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-platform/story-rulings-objects-receivers-packages-emitters-and-the-trust-baseline-plan.md` and `story-cancelable-emit-parked-dispatch-cancel-and-event-mutation-plan.md` — completed Epic 19 object/emitter rulings.

## Tasks & Acceptance

**Execution:**
- [x] `docs/spec/engine/audio-media.md` — replace the procedural Reawakened surface with anchored `media-1` through `media-5` sections for objects and `mediaPlay` return, events and fields, `beforePlay`, game-file settings, and removed commands; explain simply first, then specify deterministic behavior.
- [x] `docs/spec/engine/audio-media.md` — preserve and cross-reference the existing 3.1 alias table and Epic 6 playback/cue/wait/fade contracts; resolve the SoundFont deferral and cite EMIT-11 for engine-phase cancelable dispatch.
- [x] `docs/spec/engine/audio-media.md` — inventory every removed Reawakened command/query/argument and verify its exact catalogue spelling without editing the catalogue.

**Acceptance Criteria:**
- Given the approved rulings, when an author reads the media section, then every object, event, setting and retired surface has an exact name and behavior that later tickets can implement without choosing semantics.
- Given each owner ruling, when the spec is reviewed, then its row has an `OWNER` marker, evidence and a rejected alternative, and every 2026-10-19 decision maps to a row.
- Given the final removed-name inventory, when compared with the command catalogue, then the names match exactly and every 3.1 audio alias and its call behavior remains unchanged.
- Given the spec anchors, when later Epic 21 entries cite them, then no later entry depends on an unresolved media contract.

## Implementation Notes

- Replaced the procedural Reawakened author surface with MEDIA-1 through MEDIA-5 while retaining deterministic playback behavior and Toolkit 3.1 call semantics.
- Resolved the game-file audio settings and SoundFont precedence; the save projection excludes configuration and restores playback against the loaded game's settings.
- Incorporated the quick-review correction: built-in voice counts remain overridable by the game file; their fixed order and defaults are retained.

## Verification

**Manual checks:**
- Check all five `media-*` anchors and their inbound links; confirm no removed command remains described as the Reawakened author API and the Toolkit 3.1 alias names, signatures and behavior remain unchanged.
- Run `pnpm provenance` and `pnpm licence`; both are expected to pass.

**Results:** All five anchors are present, and their in-spec MEDIA-4/5 links resolve; no current Epic 21 follow-up plan links to these anchors yet. The alias names, signatures and behavior are preserved. `git diff --check`, `pnpm provenance` (0 violations), and `pnpm licence` (0 violations) passed; the quick review's one finding was patched and rechecked.

## Review Triage Log

- **medium — patch (resolved):** Review found that MEDIA-4's built-in default-count wording conflicted with Q14's requirement to enlarge `sfx` for overlapping frame and script sounds. MEDIA-4 now states that defaults apply unless overridden, while built-in order and uniqueness remain fixed.
