# Epic 8 readiness audit

Baseline: `origin/main` at `7fe9f1fb0aaa362fe4d40ce4b00854fd97d07033` (Epic 20 closeout blockers recorded in #581).

## Requirements

- CAP-10 and CAP-11 stay the main menu/party/inventory/save outcomes, traced to E-80–87 and E-120–123.
- Owner approved the additional CAP-5/CAP-9 dialogue-completion wrapper and actor `talked` bridge, including the proposed `dialogue.completed` payload, on 2026-10-22.
- Epic 8's envelope and initiative entry carry all four CAP IDs. Entry 1 is docs-only and records unresolved legacy-save and running-thread compatibility rules before implementation.

## Provider seams

- Epic 3 supplies saveable VM threads and waits; Epic 5 supplies board/party state; Epic 7 supplies battle state and a real battle item-use consumer; Epic 20 supplies actor records, actor emitters and stock packages; Epic 21 supplies media sounds.
- Epic 4 owns rendering and the existing modal/message/input contracts, including issue #406 (4.21); Epic 8 owns menu flow and the interaction wrapper, not a new Epic 4 metadata callback.
- #564 is removed from Epic 20 and becomes Epic 8.12, with stable `tracker_id = "#564"`. This makes the whole-epic Epic 20 gate acyclic.

## Blockers and unknowns

- Entry 1 resolves legacy `.sav` import and thread-restore compatibility; these block only dependent implementation, not the docs ruling.
- Any question about exact menu API aliases, section ownership, and wrapper entry point is explicitly assigned to entry 1 rather than guessed.
- Ticket-tree status/next passed on this origin/main worktree with 14 planned stories and only 8.1 ready. Epic parent #582 and all 14 story issues are on the roadmap project; all 14 stories are linked as its sub-issues. The user's dirty checkout remains untouched.
