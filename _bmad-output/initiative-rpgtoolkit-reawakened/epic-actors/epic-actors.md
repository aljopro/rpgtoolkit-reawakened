---
type: epic
title: "Actors: one data model for party members, enemies and NPCs, with behaviours and stock packages"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-3", "CAP-9", "CAP-10", "CAP-11"]
assignee: ""
risk: high
---

# Actors: one data model for party members, enemies and NPCs, with behaviours and stock packages

## Description

One actor model for everything that has stats and a life in the game: party members, enemies, NPCs and board sprites. Core owns the actor DATA and the interpretation rules that hold for any game (fallen, status countdown, equipment bonuses, level-up default). Everything specific to one battle implementation is RPGCode in a package. Behaviours let a package override a default; actors save data and a behaviour name only, and behaviours are re-attached by name when a save loads. The epic also scaffolds the two stock packages, `stock-battle` and `stock-menu`, and the `.gam` plugins mapping that names them.

## Outcome

A game's party, enemies and NPCs are one plain-data actor model. A Zelda-style game with 12 hearts and an FF-style game with 9999 HP are two battle scripts over the same actors. A save holds only data and behaviour names, so it cannot go stale against new package code, and a missing package gives core defaults and a diagnostic rather than a refused load. The stock packages exist as real packages for Epics 7 and 8 to fill.

## Done when

1. The actor model inventory (every stat and state of character, enemy, item, status and NPC/board sprite, with source field, type, writer, rule owner and evidence) is written in docs/spec and approved.
2. Party members, enemies, NPCs and board sprites are plain-data actors in one owned section, loaded from the legacy data, readable and writable from RPGCode through the owner.
3. The core rules fallen (default HP <= 0), status countdown (`advanceStatus(n)`), equipment bonuses and level-up default work from data and are hooks with core defaults.
4. A package registers named behaviours that override the hooks; an actor carries only the behaviour name.
5. Saves hold actor data and behaviour names only (no callables); load re-attaches behaviours by name; a missing behaviour gives the core default and a diagnostic, never a refused load.
6. Actors, boards and the game emit the ruled events through Epic 19's emitters, and stock actor code re-emits `fallen` on the game.
7. `stock-battle` and `stock-menu` exist as loadable packages; new-project templates list them in `.gam` plugins; legacy `tk3fight.dll` and `tk3menu.dll` map in memory to them.
8. Two authored battle scripts (12 hearts, 9999 HP) run over the same actor model with a save mid-fight, pinned in goldens; every legacy golden is unchanged.

## Boundaries

Core actor data, its interpretation rules, loading, hydration, save section and script exposure; the two stock package shells; the `.gam` mapping as core data. Does not include ATB, damage formulas, AI levels or battle UI (Epic 7, the stock battle package), menu screens and inventory rules (Epic 8), or the editor's save action. Movement, collision and triggers of board sprites stay Epic 5's observable behaviour.

## References

- spec - `_bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md`, section Capabilities (CAP-3, CAP-9, CAP-10, CAP-11)
- spine - `_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md`, AD-10, AD-26, AD-32
- constraint - `docs/guardrails.md`, G1, G2, G3, G7
- reference - `docs/spec/engine/plugins-and-battle.md#e-72` to E-79, E-85, E-99; `docs/spec/formats/character.md`, `enemy.md`, `item.md`, `battle-data.md`, `main-file.md`
- discovery - `discovery/inception-proposal.md`, `discovery/actor-readiness.md`; `epic-battle/discovery/all-rpgcode-battle-architecture.md`
- owner decisions - the 2026-10-19 party session (all recorded in Notes)

## Notes

- Decision: Jensen, 2026-10-19: new epic 20, "Actors": the actor model inventory; actors cover party members, NPCs and enemies (board sprites included); behaviours and hydration; the stock packages `stock-battle` and `stock-menu`.
- Decision: Jensen, 2026-10-19: Epic 7 (epic-battle) becomes "the stock battle package", built on Epics 19 and 20: ATB loop, damage, AI levels and battle UI all in RPGCode. Its envelope is annotated, and its initiative `after` adds 19 and 20. Epic 7's breakdown is a later inception.
- Decision: Jensen, 2026-10-19: boundary (supersedes the narrower reading of the 2026-10-18 all-RPGCode note; aligns with E-79 "rules in core, battle systems drive core ops"): core owns actor DATA and its INTERPRETATION rules that hold for any game: fallen (default HP <= 0), status-effect lifetime as a countdown (`advanceStatus(n)`; the battle script decides when a "round" passes: per action or turn in FF-style, by time or hits in Zelda-style), equipment bonuses, level-up default from data.
- Decision: Jensen, 2026-10-19: everything specific to a particular battle implementation is RPGCode in the stock battle package: ATB charge (+3 per tick, 75 and 123), damage formulas, AI levels 0 to 3, UI. A Zelda-style real-time game with 12 hearts and an FF-style game with 9999 HP are two battle scripts over the same actor model.
- Decision: Jensen, 2026-10-19: the 3.1 `.ste` "each round while charged" semantics live in the stock battle, not core.
- Decision: Jensen, 2026-10-19: pattern: data gives default behaviour; a behaviour overrides it (fallen, level-up and damage-taken are actor hooks with core defaults).
- Decision: Jensen, 2026-10-19: saves: actors save DATA only (stats, status counters, a behaviour NAME such as `behaviour: "stock-rpg/hero"`). Never callables on actors.
- Decision: Jensen, 2026-10-19: on load, behaviours are hydrated by name from installed packages ("a service that takes the actor"); a missing behaviour gives the core default plus a diagnostic, never a refused load. Package version governs code; saves cannot go stale against new code.
- Decision: Jensen, 2026-10-19: script closures (threads parked mid-wait, locals) remain saved per 18.6; script state is the only place callables are saved.
- Decision: Jensen, 2026-10-19: legacy: new project templates list `stock-battle` and `stock-menu` in `.gam` plugins (".gam is the csproj of the toolkit"). Legacy `fightPlugin = tk3fight.dll` and `menuPlugin = tk3menu.dll` map in memory to the stock packages and are written to the file explicitly only when saved from the editor.
- Decision: Jensen, 2026-10-19: the actor model inventory is an early entry (20.2) that other entries depend on: a table of every stat and state for character .tem, enemy .ene, item .itm, status .ste and NPC/board sprites with source field, type, who may write, core-rule versus battle-rule and evidence.
- Decision: Jensen, 2026-10-19: if the 19.2 spike shows the stock ATB tick or cancelable emits do not fit `STEP_BUDGET`, this epic's design changes; 20.1 applies the result.
- Decision: Jensen, 2026-10-19: AD-10 / StatsPort RESOLVED: actors own their stats in the actor section (party, enemies, NPCs; level and experience included). Legacy 3.1 `.tem`-named stat globals (e.g. `HP!`, `Level!`) become live read/write ALIASES (virtual variables) resolving to that character's actor stat: one owner, no copies; AD-10 is amended, not overruled. Costs: save shape change with one deliberate golden re-record (G5); reset clears the actor section; `kill()` on an alias is a catchable runtime error, `kill.system-owned` (superseded wording: it no longer resets the stat to its .tem default); the virtual-variable port (`packages/core/src/script/virtuals.ts`, read-only today) needs a write path, built in 20.4. 20.1 rules this and amends AD-10, removing StatsPort's "vm.globals owner" wording.
- Decision: Jensen, 2026-10-19: AD-26's core `battle` phase is being changed by the owner: the core `battle` phase is removed or repurposed, because battle is a package, not a core phase. 20.1 rules the AD-26 amendment (or the earliest entry that needs the phase list changed, which then does it); 19.15 reconciles the phase list. Handoff recorded in Epic 7's Notes.
- Source conflict: epic-battle Done when 1 to 4 (core formulas, AI levels in core) vs the boundary above. Epic 7's envelope is annotated; its Done when is re-sliced at its own inception.
- (A-1 resolved by the AD-10 Decision above: the actor section owns actor stats; `vm.globals` character stats are aliases onto it.)
- Assumption A-2 (to confirm): package distribution form (project folder versus zip) and how packages reach the editor are undecided. Taken: the stock packages are authored `.prg` source under a repo `stock/` folder, referenced by name from `.gam`; hosts bundle them. Exact emitter API names are Epic 19's A-2.
- Assumption A-3 (to confirm): whether party or battle need to be built-in emitters (same open item as Epic 19's A-3). Taken: no.
- Decision: Jensen, 2026-10-19: actors: level and experience are stats. Abilities (derived values, level-up, the experience curve, damage taken and the like) are standard equations defined in code with defaults (one-line RPGCode or TypeScript defaults, as 20.1 rules), overridable by behaviours. 20.1 rules a default level-up equation, which resolves the `experienceIncrease` (R-16) assumption; 20.2 lists level and experience as stats and each ability as a defaulted equation; 20.6 builds the defaults as hooks. Epic 7 inherits the rule.
- Sequenced: after 19.1 and the 19.2 spike for 20.1; the inventory (20.2) then feeds every other entry; lane A core/actors (20.3, 20.5, 20.6, 20.7, 20.8, 20.10), lane B script bindings (20.4), lane C packages and `.gam` (20.11, 20.12).
- Handoff: Epic 7 builds the stock battle in `stock-battle` over this model; Epic 8 builds menu, party and inventory in `stock-menu` and the party save section over it; Epic 9 consumes both via the manifest.
- Handoff: new-project templates (20.12) are core data; the editor epics (11, 12) consume them and own the explicit-write-on-save action.
- Principle: see the initiative Notes Decision of 2026-10-19 (3.1 is a compatibility layer, not the model); 19.1 writes ADR 0009 and the CLAUDE.md working note.
- Decision: Jensen, 2026-10-19: `kill()` ruling (see Epic 19's Notes): actor stat aliases (`HP!`, `Level!`, any .tem-named stat) can never be killed; `kill()` on one is a catchable runtime error (`kill.system-owned`, per the amendment in Epic 19's Notes; supersedes "located diagnostic and no-op"), and the value and engine link are untouched. This replaces the earlier "kill(alias) resets the stat to its .tem default". Writes to an alias write through to the actor stat (a write to a read-only one is the catchable error `assign.read-only`); the link never breaks. 20.4 builds the alias write path and the kill error.
- Decision: Jensen, 2026-10-19: "fallen" is a state (default HP <= 0, behaviour-overridable), never a removal: actors stay in the party; revival is the state changing back (HP raised, or a behaviour-defined revive), and both `fallen` and `revived` events fire. Built in 20.6 (state) and 20.9 (events).
- Decision: Jensen, 2026-10-19: custom event types on actors are allowed, and a character, enemy or NPC asset may declare them (EMIT-12, `rpgcode-modules-and-objects.md`, Proposed rulings pending owner review). Declarations are asset data read by name on load, never saved on the actor; legacy `.tem`, `.ene` and `.itm` files declare none and load unchanged. 20.1 rules the built-in event names that a declaration may not reuse; 20.2 lists declared events beside each actor's stats with the field spellings; 20.9 emits only the built-in set.
- Decision: Jensen, 2026-10-19: event naming (EMIT-13): notifications are past tense lowerCamelCase (`fallen`, `revived`, `leveledUp`, `entered`, `left`); cancelable pre-events are `before` plus the present (`beforeDamage`, `beforeEnter`, `beforePlay`); events on an actor need no prefix (the target scopes them); events a package emits on shared emitters (game, board, media) use the package namespace prefix, for example `quests.questDone`. This epic's `level-up` event is renamed `leveledUp`.
- Decision: Jensen, 2026-10-19: EMIT-12 declarations are advisory at runtime (undeclared type gives a located `emit.undeclared-type` diagnostic and still runs); strictness is tooling (language server and editor warnings and autocomplete, handoff to Epics 10 and 11).
- Decision: Jensen, 2026-10-19: EMIT-13 "Standard events" is one table each epic extends, seeded here with fallen, revived, status, leveledUp, entered, left, board `beforeEnter` (cancelable: the step does not happen) and `entered`, and the game `error` event. Engine-originated cancelable listeners cannot wait on the player (EMIT-11).
- Decision: Jensen, 2026-10-19: `fallen` is core and fires only on the transition into the fallen state; `detail` carries `cause` (damage, status, script) and `source` (responsible actor or null). `defeated` belongs to the battle package (once per enemy per battle; Epic 7 handoff). Rule in 20.6 and emit in 20.9. Dialogue events (for example `talked`) are owned by 20.9.
