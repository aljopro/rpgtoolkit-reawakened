---
type: discovery
title: "Inception proposal: epic-rpgcode-platform (epic 19)"
date: 2026-10-19
baseline_revision: 0975a26b54f8d7bf569f463a02b783b16ec0ea98
---

# Inception proposal: RPGCode as a platform (epic 19)

## 1. Scope restatement

Epic 19 builds the object runtime, receiver binding, RPGCode packages on the single plugin manifest, the first-class event emitter (queued and cancelable), per-package step counters and the trust baseline, and runs an early spike that measures a stock ATB tick and cancelable emits against `STEP_BUDGET`. It exists because the Epic 7 (battle) preparation showed Epic 18 left the object runtime and `registerPlugin` unbuilt (see `platform-readiness.md`). All behaviour decisions are the owner's 2026-10-19 party-session rulings, recorded in the envelope Notes.

## 2. Decision table

| ID | Item | Taken | If ruled otherwise |
|---|---|---|---|
| D-01 | Single manifest, `registerPlugin` over the 18.5 table | Owner decision | n/a |
| D-02 | Emitter semantics (no bubbling/capture, queued emit, parked cancelable emit, one bus) | Owner decision | n/a |
| D-03 | Trust baseline | Owner decision; ADR 0008 | n/a |
| D-04 | Package distribution form | Assumption A-1: package folder referenced by name, loaded by the host | Entry 6 and 20.11 change the resolver contract |
| D-05 | Emitter API names | Assumption A-2: `on`, `off`, `once`, `emit`, `emitCancelable` | 19.10 to 19.12 and command docs rename |
| D-06 | Party and battle as built-in emitters | Assumption A-3: no | 19.12 and 20.9 gain event sources |
| D-07 | Undeclared host-request use | Assumption A-4: informational | 19.6 gains a Logger warning |
| D-08 | Step counters in the state hash | Assumption A-5: excluded | 19.13 re-records goldens |
| D-09 | Legacy classes on dictionaries | Assumption A-6: yes, in 19.5 | Defer 19.5; 19.7 and 19.8 still use dictionaries |
| D-10 | AD-32 synchronous event bus | Superseded in 19.1 | n/a |

## 3. Breakdown

| # | Title | after | hitl | Risk |
|---|---|---|---|---|
| 1 | Rulings: objects, receivers, packages, emitters and the trust baseline | 18.7, 3.23, 3.25 | yes | high |
| 2 | Spike: stock ATB tick and cancelable emits against STEP_BUDGET | 1, 18.5, 18.6 | yes | high |
| 3 | Dictionary object runtime: literals, member access and storage | 1 | no | high |
| 4 | Receiver auto-binding, this and bindThis | 3 | no | high |
| 5 | Legacy classes on the dictionary runtime | 4 | no | high |
| 6 | RPGCode package manifest: name, version, namespace and declared host requests | 1 | no | high |
| 7 | Package namespaces and name resolution | 6, 5 | no | high |
| 8 | registerPlugin as a layer over the environment table | 7 | no | high |
| 9 | Main-file plugins list: read, write and feed the manifest | 6, 2.9 | no | medium |
| 10 | First-class emitter: on, off, once and queued emit | 4, 5, 2 | no | high |
| 11 | Cancelable emit: parked dispatch, cancel and event mutation | 10 | no | high |
| 12 | Game emitter, emitter registration seam and one bus for TypeScript plugins | 11 | no | medium |
| 13 | Per-package VM step counters | 6, 11 | no | medium |
| 14 | Pure-RPGCode package fixtures and legacy golden verification | 5, 8, 9, 12, 13 | no | high |
| 15 | Refactor sweep | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 | no | low |

Lanes: A objects (3, 4, 5, then 13), B packages (6, 7, 8), C main-file list (9), D events (10, 11, 12). Shared seams: 10 owns the `events` section and its phase registration; 15 reconciles barrels, the phase list and the `GameState` section list.

## 4. Cross-epic `after` wiring

| Entry | Names | Initiative `after` needed |
|---|---|---|
| 19.1 | 18.7, 3.23, 3.25 | epics 18, 3 |
| 19.2 | 18.5, 18.6 | epic 18 |
| 19.9 | 2.9 | epic 2 |

Initiative `[[epic]]` 19 after: epic 3, epic 18, epic 2. Epic 20 after 19; Epic 7 gains 19 and 20; Epic 8 gains 20 (the stock-menu package).

## 5. Parallelism

After 19.1: 19.2 (spike), 19.3 (lane A), 19.6 (lane B) and 19.9 once 19.6 is done can run side by side; lane D waits for lane A (19.4) and the spike. The vm.ts step loop is touched by 19.13 only after 19.11.

## 6. Validation rounds

Round 1 (author, 2026-10-19): `tickets.py status` and `next` run; results recorded in the PR.
Round 2 (self-review against validate-checks.md, Ticket, Set, Dependencies; 2026-10-19): `status` and `next` clean (no cycle, `undeclared_after`, `unpinned_after`, `order_conflict`; only `ready_to_start` is 19.1). Findings fixed: 19.12 claimed per-board emitters whose board state belongs to Epics 4 and 5 and is not in epic 19's `after`, so it now builds the game emitter and the registration seam and 20.9 creates the board emitters; 19.7 and 19.10 shared vm.ts and the resolver with 19.5 with no path between them, so each now lists 5; 19.13's verify needed two-package fixtures that 19.14 builds later, so it authors its own.
