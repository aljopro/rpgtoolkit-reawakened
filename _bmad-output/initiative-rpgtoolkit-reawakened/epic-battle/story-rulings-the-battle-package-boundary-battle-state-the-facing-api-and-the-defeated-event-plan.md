---
title: "Rulings: the battle package boundary, battle state, the facing API and the defeated event"
type: 'feature'
ticket: 1
created: '2026-10-19'
status: draft
baseline_revision: '4255ec6f520af495d3aa2db8ed2553cb685ea3ab'
risk: "high"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md#e-70 to E-79, the `fightInform` codes and the callback table"
  - "spec - docs/spec/formats/battle-data.md (.bkg, .ste, .spc)"
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (EMIT-8, EMIT-13)"
  - "spec - docs/spec/engine/actors.md as ruled by 20.1"
  - "spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-10, AD-26"
  - "discovery - _bmad-output/initiative-rpgtoolkit-reawakened/epic-battle/discovery/all-rpgcode-battle-architecture.md"
---

## Intent

Rule before code. New page `docs/spec/engine/battle.md` (anchored BAT-1 to BAT-15) settles the 2026-10-19 boundary for the stock battle package and the core: the core owns the actor data and the `battle` section (fighter references and charge), and the `stock-battle` RPGCode package owns the loop, charge rate, damage, status round effects, AI, outcomes sequence, music cues and UI. The page also settles the `BattleSection` shape, the rebuild mapping of E-79's callbacks 114-132, the `defeated` event, R-57, R-16, R-11, outcomes 0-4, the no-enemies message, the party source, battle music and the default UI's primitives.

The page's fifteen rows: BAT-1 boundary, BAT-2 `BattleSection`, BAT-3 API, BAT-4 charge/R-57, BAT-5 damage/R-57/R-11, BAT-6 status, BAT-7 AI, BAT-8 outcomes/R-16, BAT-9 starts and the party source, BAT-10 music, BAT-11 UI primitives, BAT-12 events and `defeated`, BAT-13 save/restore and reset, BAT-14 package loading and the no-package path, BAT-15 determinism and golden policy.

Amendments: E-71's "engine" steps become package steps; E-72 to E-79 gain a pointer to `battle.md` where the legacy protocol and the rebuild differ (notably E-79's `fightTick`, which the package's loop replaces); E-77's outcome table says which side applies each outcome; EMIT-13's `defeated` row gains its detail fields; AD-10's `battle` row says "fighter references and charge; status effects live on the actor". The `save/sections.ts` comment and the placeholder itself are code, so 7.2 changes them with the section's shape.

## Boundaries

Documentation only. No TypeScript, fixtures or package code. Builds on 20.1's actor boundary and does not re-rule actor ownership, fallen/revived, status lifetime, equipment or the level-up equation; 20.1's default level-up equation settles R-16 and this entry cites it rather than writing a second curve. Does not implement the battle section (7.2), the API (7.3) or any package behaviour.

## Key Decisions

1. **Split and legacy mapping (BAT-1).** The core owns the actor model and the `battle` section. The `stock-battle` package owns the charge-bar loop, damage, status round effects, enemy AI, the outcome sequence, battle music cues and the UI. E-71's "the engine sets up, ticks, applies statuses, lets enemies act, resolves the players' actions and gives rewards" becomes: the core sets up the section and the actors, and the package performs the rest through the ruled operations. `fightTick` is not a core operation; the package's loop is the tick. *Rejected:* keeping a core rules engine behind the default UI, which would keep two rule owners.

2. **`BattleSection` shape (BAT-2).** One active battle: `id`, `boardKey`, `background` (the `.bkg` name), `canRun`, `outcome` (0-4 or null), and two ordered parties of `{ party: 0 | 1, actorId, charge }`. Party 0 is enemies, party 1 is the player's party. Status effects, HP and SMP stay on the actor and are never copied. A dangling or duplicate `actorId` is a located load diagnostic. Reset clears the section. *Rejected:* a battle-local copy of stats, which would need a merge rule and would break the 20.3 identity.

3. **The battle-facing API (BAT-3).** The rebuild's replacement for E-79 callbacks 114-132: `battle.partySize(party)`, `battle.fighter(party, index)` returning the actor object, `battle.charge(party, index)` / `addCharge` / `setCharge` / `releaseCharge`, `battle.chargePercent(party, index)`, `battle.canRun`, `battle.outcome` / `finish(code)`, plus the actor's stat and status methods for HP, max HP, SMP, max SMP, FP, DP, name, animation, add/remove status. Fighter handles resolve from `source`, `target`, a party-member name and an enemy reference. No `fightTick`. *Rejected:* a bespoke `fight*` callback object, which would keep the legacy plugin ABI in the rebuild.

4. **Charge and damage, R-57 (BAT-4, BAT-5).** Initial charge is a seeded draw from 0 to the fighter's threshold minus 1 (OWNER; the docs give no range; *rejected:* always 0, which removes the staggered starts). Each tick adds `3 + 2 × active speed effects − 2 × active slow effects`, floored at 0. Players act at 75, enemies at 123; a disabled fighter does not charge. `skill` is always −1 on the random path. Damage is `FP` with ±10% variance, one seeded draw, integer-rounded by the one ruled rule; DP is subtracted unless a critical (from `takeCrit`/`giveCrit`, 1-in-N) bypasses it; the minimum is 1; a special removes FP from HP and its target SMP drain from SMP, costs the user SMP, applies its status and plays its animation; HP and SMP clamp at 0. `attackall`/`drainall` deal their amount without criticals. R-11: the `.spc` battle/menu flags are normalised on read and write so a file authored in the 3.1 editor behaves as authored; the format page records the inversion (*rejected:* exposing the raw stored bits, which makes the flag names lie).

5. **Status and AI (BAT-6, BAT-7).** A `.ste` is applied by file, re-applying restarts its rounds, and it lasts its number of rounds. The round boundary is the fighter becoming charged: the package calls the core's `advanceStatus(1)` and then applies the status's ±HP, ±SMP and optional program, with `source`/`target` = the fighter. Speed/slow contribute ±2 per active effect; disable is a reference count and freezes at one or more. Core ages and expires; the package applies. The four AI levels are E-76's table, transcribed verbatim into BAT-7: 0 random target with a 50/50 physical or special choice, 1 special moves until SMP runs out, 2 weakest target with a 50/50 choice, 3 weakest target with specials first. Where E-76's level 1 row does not name a target, BAT-7 records the reading used rather than leaving it open; random draws are in a fixed order, "weakest" is lowest current HP with party-index tie-break, an unaffordable special falls back to a physical attack, curative specials pick the lowest-HP ally, and a custom `useCode` AI program runs with `source` = enemy and `target` = a random player. *Rejected:* an engine-side AI, which would make a custom fight program unable to replace it.

6. **Outcomes, rewards and `defeated` (BAT-8, BAT-12).** The package calls `battle.finish(code)`. Codes 0/2/4 are automatic: the core runs the run program, or gives the summed gold as one plain-data inventory effect plus the summed experience to every party member and runs the defeat programs, or runs the game-over program (or `reset()`). Codes 1/3 are package-handled and the core does nothing. Level-up is the 20.6 default; R-16 is that one equation. `defeated` is emitted on the enemy actor once per enemy per battle, with `{ cause: "damage" | "status" | "script", source: actorId | null }`; a global listener gets `battle.defeated` re-emitted on the game (EMIT-13's namespace rule). The `fightInform` codes map to `battle.damage`, `battle.attack`, `battle.special`, `battle.item` and `battle.charged`; 6 is the actor's `defeated` and 7 is `battle.partyDefeated`, both detected by the package, never sent as informational codes. The no-enemies message is shown by the start path and no battle starts. *Rejected:* mapping 6 and 7 to informational events, which repeats the legacy engine's silent gap.

7. **Starts, package loading and music/UI (BAT-9, BAT-10, BAT-11).** The 5.11 handoff's drawn enemies are hydrated with 20.5 and start party 0; party 1 is the actor store's ordered party. `Fight`/`FightEnemy` use the same path. A main-file custom fight program replaces the package's loop, not the core API. The stock package loads by name; with no battle package a battle ends immediately (the spec's rule). Battle music plays through the 21.5 media object with source `battle`; on the outcome the battle track stops and the board's music is re-posted from `boardKey`; `beforePlay` may replace or cancel it, and audio is not saved. The default UI uses the existing 3.1 primitives (`fillrect`, `drawrect`, `text`, `pixelText`, `bitmap`, `drawcanvas`, `rendernow`) and adds no `drawBox` or `drawBar`. *Rejected:* new screen primitives for the first UI, which would widen the rendering core before a second use.

8. **Save, loading and determinism (BAT-13 to BAT-15).** The section is saved with the battle's fighters and charge, validated on load with located diagnostics, and cleared by reset. The package is named in the manifest and mapped in `.gam`; a missing package ends a battle immediately rather than hanging. Battles use only the seeded shared RNG and tick-counted waits, and a draw-list or save golden is re-recorded only deliberately (G3, G5). *Rejected:* saving audio or UI state, which would make a loaded battle replay a track it is not playing.

## Acceptance

1. `docs/spec/engine/battle.md` exists with BAT-1 to BAT-15, each row carrying an OWNER marker, evidence and a rejected alternative.
2. AD-10's `battle` row says fighter references and charge only, with status effects on actors; the code comment and placeholder are 7.2's, not this entry's.
3. EMIT-13's `defeated` row carries `{ cause, source }`, once per enemy per battle, and the game re-emit is `battle.defeated`.
4. E-71 to E-79 point to `battle.md`; E-79 no longer presents `fightTick` as a rebuild operation.
5. R-57, R-16 and R-11 each have one rule with evidence; no later entry depends on an unruled behaviour.
6. A person approves the plan checkpoint and the done checkpoint.

## Verification

Documentation link and anchor check; `pnpm provenance` and `pnpm licence` are unaffected but run in the PR; the owner reads the BAT rows and approves. Grep `docs/spec` and the spine for the old "battle rules in the core" and "status effects in the battle section" wording and confirm each is reconciled.
