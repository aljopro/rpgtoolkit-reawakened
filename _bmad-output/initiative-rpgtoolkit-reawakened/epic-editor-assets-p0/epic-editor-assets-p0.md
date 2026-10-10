---
type: epic
title: "P0 asset editors: board, character, item, animation, tile bitmap, packaging"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-15"]
assignee: ""
risk: medium
---

# P0 asset editors: board, character, item, animation, tile bitmap, packaging

## Description

The board editor (tiles, layers, vectors, programs, sprites, images, properties), character, item, animation and tile bitmap editors, and packaging let an author build a complete game inside either host.

## Outcome

A person can author a game from scratch; the CAP-15 success check, such a game loading and playing in the web runner from either host, is the signal.

## Done when

1. A new game is created, edited with every P0 editor and played in the web runner, from the VS Code host and from the PWA.
2. The board editor covers all object modes, tools, undo and the coordinate-system aware snapping of T-20 to T-35 that P0 names.
3. Each editor reads and writes its legacy format so unchanged data round-trips.
4. Packaging produces a single-file game that loads in the web runner.

## Boundaries

P0 tools of editor-features section 11 only. P1 tools (epic editor-p1) and P2 tools (epic editor-p2) are excluded.

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- reference - docs/editor-features.md, sections 3, 6, 7, 8 and 11
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-18, AD-19, AD-29
- constraint - docs/guardrails.md, section G2

## Notes

- Open question: where P0 draws the line inside T-20 to T-35 (editor-features names priority per tool, not per feature); settle at inception.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on editor-foundation because: editor-ui and both hosts.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
