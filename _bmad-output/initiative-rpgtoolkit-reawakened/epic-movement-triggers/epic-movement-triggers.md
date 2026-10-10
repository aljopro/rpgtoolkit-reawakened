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

Players and items walk, animate, collide, path-find and follow waypoints; programs fire from step-on, key-press, repeat, item, board-entry, edge and global-key triggers with the exact observable rules; keyboard, mouse and gamepad input drive it.

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
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-2, AD-13, AD-14, AD-25, AD-26
- constraint - docs/guardrails.md, section G3
- reference - docs/engine-features.md, E-20 to E-34, E-40 to E-49, E-110 to E-113

## Notes

- Unknown: how closely legacy movement outcomes can be checked without legacy output; the oracle for outcomes must be agreed at inception.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on legacy-formats because: character, item and board data.
- Waits on rpgcode-vm because: program execution for triggers.
- Waits on board-rendering because: world model and loop.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
