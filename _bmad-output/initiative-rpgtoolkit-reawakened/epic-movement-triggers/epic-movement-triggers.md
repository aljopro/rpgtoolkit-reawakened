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

- Unknown: how closely legacy movement outcomes can be checked without legacy output; the oracle for outcomes must be agreed at inception.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on legacy-formats because: character, item and board data.
- Waits on rpgcode-vm because: program execution for triggers.
- Waits on board-rendering because: world model and loop.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: Jensen, 2026-10-15: `docs/spec/` replaces `docs/format-spec.md` and `docs/engine-features.md` as the normative spec (ADR 0007, entry 1.13); the owner attests it is clean (extraction-log round 4).
- Source conflict (rule at inception): docs/spec/engine/movement-and-collision.md against `docs/spec/engine/`: speed is 4 px per `speed` with game speed as `speed − 100 ms × gameSpeed` vs E-04's ±10% (R-50); a sprite that loses a collision freezes 2 s vs E-27's diversion (R-51); the last matching board program wins (R-52); edge arrival keeps the position along the edge vs E-28's grid alignment (R-53); sliding at ≥ 45°, ≥ 27° on iso boards (R-54). Default polygons and animation fall-backs are R-09. Source: discovery/docs-spec-reconciliation.md, section D.
- Evidence: docs/spec gives path-finding limits (1000 node expansions, goal moved to the nearest free point) and the sprite state table, which can help with the outcome-oracle Unknown above.
- Handoff (epic board-rendering inception, 2026-10-16): epic 4 delivers the compositor's `SpriteDraw` input (`id`, `key`, and the strict order of its entry 4.1: layer, then screen-space reference-point y, then `drawId` with players before items, each by index; R-55 fixed; entry 4.15), a `CameraTarget` port for camera following (4.16), the `core/input` module and the raw-event half of the `input` section (key queue, held keys, pointer state; 4.19), boot and `send` with test doubles for first-player creation, the no-player check and the saved-game port (4.20; ports named in 4.29), and reset, quit and the lifecycle built-ins `reset`, `mainFile`, `win`, `gone` and `over` (4.31). This epic's `sprites` section supplies `SpriteDraw` lists, `CameraTarget` and the presence port; it extends `input` with bindings, click-to-move, gamepad and button slots (drawn by 4.25's overlay) and owns `wait`, `get`, `clearBuffer`, `setButton`, `checkButton` and `clearButtons`; it applies the `gone` effect to `triggers` and the first-player effect of start-up, registers its sections into 4.31's reset seam, and raises path-finding invalidation on the vector-edit effect (4.12). Built-in effects apply before the next instruction of the same turn (4.11). Run-time item numbering compacts empty slots (R-06) in the `world` section's placement list, which `sprites` hydrates from.
- Handoff, key consumption (epic board-rendering inception, 2026-10-16): key waits claim keys by input sequence number (a wait stores the sequence at park, the engine records the claim in the `engine` section, the input owner prunes claimed keys; entries 4.1 and 4.19). `get` and `clearBuffer`, which this epic owns, claim or prune through the same protocol, and the button slots and bindings it adds to `input` keep sequence numbers monotonic.
