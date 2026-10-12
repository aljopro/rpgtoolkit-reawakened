---
type: epic
title: "TK2 games load: 2.x data formats"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-1"]
assignee: ""
risk: high
---

# TK2 games load: 2.x data formats

## Description

Every data file of the Toolkit 2 (2.x) era games reads in pure TypeScript from bytes, through the format registry of epic legacy-formats: the line-oriented text forms of boards, characters, items, main files, enemies, animations, special moves, status effects and battle backgrounds, the corrected binary 2.2 main file and character layouts, and the animated tile, single tile and font files that have no reader today. TK2 scripts are epic rpgcode-vm's.

## Outcome

A Toolkit 2 game such as *Final Destiny* opens with every data file read to its last byte; the dump of the six archived TK2 games reports no failed file and no unread residue.

## Done when

1. The dump tool parses every data file of the six archived TK2 games (FinalDestiny, LittleMan, BusDriver, Caoquest, School2Demo, ChimeranEmpire) with 0 failures and 0 residue bytes, apart from files ruled out by name.
2. Every layout the readers implement is stated in `docs/format-spec.md` before the code (G7), with the evidence it was derived from, and any fact taken from the legacy source follows ADR 0006.
3. The new readers are registered in the core format registry and dispatch by extension and magic (AD-31).
4. The TK2 games are CI fixtures fetched at test time and never committed, and the corpus gate fails on a regression.
5. `core` still builds with no DOM or Node types (G2) and imports only `fflate/browser`.

## Boundaries

Byte and text readers in `core`, their spec amendment, registry registration and the corpus gate. Not writers for the text forms (the project writes its own forms), not TK2 RPGCode (epic rpgcode-vm), not rendering. Zero-byte placeholder files are decided in the first reader entry.

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-18, AD-31
- constraint - docs/guardrails.md, section G7
- constraint - docs/adr/0006-clean-room-spec-extraction.md
- reference - docs/format-spec.md, sections 1.3, 1.4, 3, 4, 6, 7, 8
- research - /tmp/tk2-formats-research.md (coverage table, gap list, evidence index; move into the discovery folder when this epic is approved)

## Notes

- Decision: Jensen, 2026-10-11: TK2 games and TK3 games both play at launch; "there are so many V2 era games still around". Epic legacy-formats excluded text-era formats, so this is a new epic.
- Decision: Jensen, 2026-10-11: where archive evidence cannot answer a layout question, an extractor reads the legacy source under the clean-room split of ADR 0006 (option 2); implementers read only `docs/`.
- Waits on legacy-formats because: the binary readers, the registry (2.13) and the corpus expectation tooling (2.14).
- Unknown: exact text layouts of `.brd`, `.gam`, `.itm`, `.tem`; the true `.gam` 2.2 and `.tem` 3 to 4 field sets; `.fnt` internals. Whether 2.0 and 2.07 era data differs from the observed 2.1.4.a and 2.1.7.a files.
- Open question: where the six TK2 games are fetched from as fixtures, and their pinned hashes.
- Open question: zero-byte placeholder files (1 `.itm`, 1 `.spc`, 3 empty-name `.brd`): skip or tolerate.
