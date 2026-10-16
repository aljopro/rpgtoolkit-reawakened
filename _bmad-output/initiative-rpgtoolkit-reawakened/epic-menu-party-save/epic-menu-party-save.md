---
type: epic
title: "Menu, party, inventory and saves work, including running threads"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-10", "CAP-11"]
assignee: ""
risk: high
---

# Menu, party, inventory and saves work, including running threads

## Description

The default menu, inventory, equipment, shop, inn, party, gold and play-time systems follow legacy rules and can be replaced from RPGCode; save and load restore the complete game state, including running threads, the live board item list and RNG state.

## Outcome

Players manage a party and save and resume anywhere; the CAP-10 and CAP-11 success checks, mid-script save/load with identical state hashes, are the signal.

## Done when

1. Scripted play exercises use, equip, remove, drop, buy, sell, party swap and inn with the expected state.
2. The menu, equip, abilities and inventory screens can each be opened directly and replaced by RPGCode.
3. Save then load mid-script resumes with identical state hashes and identical later behaviour under replay.
4. Saving is refused on boards that forbid it, and saves go through `saveBlob`/`loadBlob`/`listBlobs` keyed by `GameId`.
5. Menu, inventory, party and save built-ins register with the VM.

## Boundaries

Core menu rules and default menu draw lists, inventory, equipment, shop, party, gold, time, and the new save format. Legacy `.sav` import is excluded pending the open question.

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-7, AD-10, AD-11, AD-17, AD-23
- constraint - docs/guardrails.md, sections G1 and G3
- reference - docs/spec/engine/plugins-and-battle.md#e-80 to E-87, E-120 to E-123

## Notes

- Open question: is legacy `.sav` import (E-122) in scope? Entries for it wait on the spec's answer.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on rpgcode-vm because: thread snapshot support.
- Waits on movement-triggers because: party and board state.
- Waits on battle because: battle state to save.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: Jensen, 2026-10-15: `docs/spec/` replaces `docs/format-spec.md` and `docs/engine-features.md` as the normative spec (ADR 0007, entry 1.13); the owner attests it is clean (extraction-log round 4).
- Evidence (R-13): docs/spec/formats/save-game.md now specifies legacy `.sav` minors 0–4 in full, including each thread's serialised program state, so the E-122 open question above is only a scope decision. docs/spec recommends restarting saved threads, because their positions index the original compiler's instruction list. docs/spec/examples/game/Saved/slot1.sav is a sample.
