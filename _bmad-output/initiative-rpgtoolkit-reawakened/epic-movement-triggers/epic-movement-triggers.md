---
type: epic
title: "Sprites move, collide and fire triggers as legacy did"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-3", "CAP-4", "CAP-8"]
assignee: ""
risk: high
---

# Sprites move, collide and fire triggers as legacy did

## Description

Players and items walk, animate, collide, path-find and follow waypoints; programs fire from step-on, key-press, repeat, item, board-entry, edge and global-key triggers with the exact observable rules; keyboard, mouse and gamepad input drive it. Operates over the Unified Actor model (AD-32) and the synchronous, deterministic world event queue (ADR 0004, AD-32), dispatching triggers and movement through plain-data event hooks.

## Outcome

A player can walk the sample worlds and meet NPCs and scripts as in legacy; the CAP-3 and CAP-4 success checks, the demo's NPC intercept and battle trigger end to end headlessly, are the signal.

## Done when

1. Recorded-input play of the sample games reproduces solid, sliding, stairs, board-edge and sprite-blocking diversion outcomes.
2. All three pathfinders reach or approach targets and invalidate their cache on vector edits.
3. Unit tests cover once-per-entry, repeat distance, key-press vs step-on, items-before-regions precedence, layer matching and run-if/then-set.
4. Keyboard, mouse click-to-move and gamepad inputs map as E-110 to E-113 state, and `wait()` returns legacy key names.
5. Movement, sprite and input built-ins register with the VM and behave as their catalogue entries state.

## Boundaries

Core movement, collision, pathfinding, triggers and input mapping. Not battle rules (epic battle), not menus, and not draw-list building beyond sprite ops from epic board-rendering. Timing keeps perceived speeds and drops frame-rate quirks (E-04).

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-2, AD-13, AD-14, AD-25, AD-26, AD-32
- constraint - docs/guardrails.md, section G3
- reference - docs/spec/engine/movement-and-collision.md#e-20 to E-34, E-40 to E-49, E-110 to E-113

## Notes

- Proposed (pending entry 5.1 owner approval): the outcome oracle is authored docs/spec-derived recorded-input/state-outcome evidence plus the reachable demo NPC intercept and battle-trigger handoff; this epic makes no legacy pixel-parity claim.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on legacy-formats because: character, item and board data.
- Waits on rpgcode-vm because: program execution for triggers.
- Waits on board-rendering because: world model and loop.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: Jensen, 2026-10-15: `docs/spec/` replaces `docs/format-spec.md` and `docs/engine-features.md` as the normative spec (ADR 0007, entry 1.13); the owner attests it is clean (extraction-log round 4).
- Source conflict (rule at inception): docs/spec/engine/movement-and-collision.md against `docs/spec/engine/`: speed is 4 px per `speed` with game speed as `speed − 100 ms × gameSpeed` vs E-04's ±10% (R-50); a sprite that loses a collision freezes 2 s vs E-27's diversion (R-51); the last matching board program wins (R-52); edge arrival keeps the position along the edge vs E-28's grid alignment (R-53); sliding at ≥ 45°, ≥ 27° on iso boards (R-54). Default polygons and animation fall-backs are R-09. Source: discovery/docs-spec-reconciliation.md, section D.
- Evidence: docs/spec gives path-finding limits (1000 node expansions, goal moved to the nearest free point) and the sprite state table; these are inputs to the authored outcome oracle.
- Handoff (epic board-rendering inception, 2026-10-16): epic 4 delivers the compositor's `SpriteDraw` input (`id`, `key`, and the strict order of its entry 4.1: layer, then screen-space reference-point y, then `drawId` with players before items, each by index; R-55 fixed; entry 4.15), a `CameraTarget` port for camera following (4.16), the `core/input` module and the raw-event half of the `input` section (key queue, held keys, pointer state; 4.19), boot and `send` with test doubles for first-player creation, the no-player check and the saved-game port (4.20; ports named in 4.29), and reset, quit and the lifecycle built-ins `reset`, `mainFile`, `win`, `gone` and `over` (4.31). This epic's `sprites` section supplies `SpriteDraw` lists, `CameraTarget` and the presence port; it extends `input` with bindings, click-to-move, gamepad and button slots (drawn by 4.25's overlay) and owns `wait`, `get`, `clearBuffer`, `setButton`, `checkButton` and `clearButtons`; it applies the `gone` effect to `triggers` and the first-player effect of start-up, registers its sections into 4.31's reset seam, and raises path-finding invalidation on the vector-edit effect (4.12). Built-in effects apply before the next instruction of the same turn (4.11). Run-time item numbering compacts empty slots (R-06) in the `world` section's placement list, which `sprites` hydrates from.
- Handoff, key consumption (epic board-rendering inception, 2026-10-16): key waits claim keys by input sequence number (a wait stores the sequence at park, the engine records the claim in the `engine` section, the input owner prunes claimed keys; entries 4.1 and 4.19). `get` and `clearBuffer`, which this epic owns, claim or prune through the same protocol, and the button slots and bindings it adds to `input` keep sequence numbers monotonic.
- Proposed (pending entry 5.1 owner approval): entry 2 is the sole fixture producer and entries 3 to 11 name its scenes; item multitask threads are owned by the sprites lifecycle and are started, stopped and reloaded with their items.
- Sequenced (proposed pending entry 5.1 owner approval): entry 5.1 is the owner-approval docs checkpoint; entry 5.2 produces the movement/trigger/animation/encounter fixtures; the tracer bullet is entry 5.3 through actor hydration, player presence, SpriteDraw and one fixed-tick movement state; entry 5.12 is the closing replay and contract sweep, not a second implementation lane.
- Proposed (pending entry 5.1 owner approval): the numeric VM instruction budget remains an Epic 3 provider contract; entry 5.12 verifies its movement-visible behavior and may open a docs-first amendment if required.
- Handoff: 2026-10-18: entry 5.6 defines the plain-data button slot `{ id, x, y, w, h, action, enabled }` consumed by board-rendering entry 4.25's overlay; cursor-map rendering remains Epic 4.
- Decision: Jensen, 2026-10-18: approved the Epic 5 inception package and the proposed rulings R-50 to R-54 and E-112 as written in discovery/inception-proposal.md, section 2. The "Proposed (pending entry 5.1 owner approval)" notes above are approved by this decision; entry 5.1 still has to write the rulings into docs/spec (G7, docs first) before any implementation entry starts.
