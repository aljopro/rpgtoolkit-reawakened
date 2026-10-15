---
type: epic
title: "Battles run on core rules with a default UI"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-9"]
assignee: ""
risk: medium
---

# Battles run on core rules with a default UI

## Description

Battles follow the charge-bar rules, damage, status effects, enemy AI levels and custom AI, rewards and levelling, with a default battle UI built from draw lists and with core operations that RPGCode-written battle systems can drive.

## Outcome

Players fight legacy battles with the legacy outcomes; the CAP-9 success check, seeded battles matching the stated formulas, is the signal.

## Done when

1. Seeded battles reproduce the E-72 to E-78 formulas and outcomes in unit tests.
2. Random and scripted battle starts work, and win, run and lose outcomes, rewards and level-up behave as E-77 and E-78 state.
3. The four AI levels and a custom AI program pick targets and moves as E-76 states.
4. A custom RPGCode fight program drives every core battle operation of E-79 in a test.
5. The default battle UI renders to a golden image.

## Boundaries

Battle rules, levelling, default battle UI and battle built-ins. Battle state holds fighter references, charge and status only; character stats stay in `vm.globals` behind `StatsPort`. Not menus and inventory (epic menu-party-save). Visual identity with the stock plugin is a nice-to-have.

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-8, AD-10, AD-12, AD-26
- constraint - docs/guardrails.md, section G3
- reference - docs/engine-features.md, E-70 to E-79
- reference - docs/format-spec.md, section 8

## Notes

- Decision: epic set approved by the user, 2026-10-10.
- Waits on legacy-formats because: enemy, special-move, status-effect and background data.
- Waits on rpgcode-vm because: battle built-ins and custom programs.
- Waits on movement-triggers because: random battle start and fighter state.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: Jensen, 2026-10-15: `docs/spec/` replaces `docs/format-spec.md` and `docs/engine-features.md` as the normative spec (ADR 0007, entry 1.13); the owner attests it is clean (extraction-log round 4).
- Evidence (rule at inception, R-57): docs/spec/engine/plugins-and-battle.md gives the charge model (+3 per tick, ±2 per speed/slow effect, act at 75 for players and 123 for enemies), `skill` always −1, outcome codes 0–4, `fightInform` codes 6 and 7 never sent, the AI table and the "No enemies of skill level N found." message. R-11: the 3.1 editor writes the `.spc` battle/menu flags inverted. R-16: the original uses `experienceIncrease` three different ways; choose one rule for E-78. Source: discovery/docs-spec-reconciliation.md.
