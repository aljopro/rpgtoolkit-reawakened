---
title: "Refactor sweep"
type: feature
ticket: 15
created: '2026-10-19'
status: done
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "low"
context:
  - "epic - epic-rpgcode-platform.md, Done when"
---

## Intent

Final sweep; waits on every entry, including the closing fixtures.

## Boundaries

No new behaviour.

## Key Decisions

None beyond the epic Notes.

## Acceptance

1. Shared seams reconciled.
2. Done when satisfied.

## Verification

All gates.

## What the sweep changed

Docs first (own commit, G7), then code. No behaviour changes and no golden moves.

* **Phase list.** AD-26 in the spine and `c4.md` list `events` after `threads`, as `ENGINE_PHASES` and the phase-order tests (`engine.test.ts`, `epic5-closing.test.ts`) already did. The saved `EnginePhase` union (`save/sections/engine.ts`) and `ENGINE_PHASES` were two hand-kept lists; `ENGINE_PHASES` now `satisfies` the union and a compile-time check fails if either gains a phase the other lacks. Epic 20 removes or repurposes the `battle` phase (AD-26 amendment, 20.1); that is not touched here.
* **`GameState` section list.** AD-10's table and diagram gain the `events` section (owner `core/events`, EMIT-15); the `state.ts` and `sections.ts` headers and the `script-state.test.ts` header say 19 sections and name `events` as module-owned; the unused `EVENTS_SCHEMA_VERSION` (a second copy of `SCHEMA_VERSIONS.events`) is removed.
* **Registration.** The id to definition table for `core`, `media`, `catalogue` and the native packs was written twice (engine boot and the harness host); it is now `ENGINE_PLUGIN_TABLE` (`script/engine-plugins.ts`), and `script-manifest.test.ts` pins that its ids are exactly the default manifest's. Built-in emitter registration has one path (`registerEmitter`), `registerPlugin` has one (`addRegistration` over the environment table, no `resolveCall` tier: `script-register-plugin.test.ts`), native listeners have one (`registerNativeListeners`), and objects have one table (`ObjectRecord`).
* **Boot.** E-02 step 3 and `main-file.md` described the pre-19.9 behaviour (legacy plugin table); they now describe the TKR package list that feeds the manifest, and `engine-boot.test.ts` pins the order and the located diagnostic.
* **Docs links.** `emit-9` and `emit-15` anchors exist; `main-file.md` no longer separates the legacy version-dependent paragraph from its table; ADR 0004 and OOP-11 name the built op `get_member_bound { name }` and record that 19.4 built receivers; entry 3's code reference points at `script/state.ts`.
* **Epic 20.** Its Notes carry the committed 19.2 step-budget result (Done when 9).

Left as is on purpose: `LEGACY_PLUGIN_TABLE`, `lookupLegacyPlugin` and `getDeclinedPluginDiagnostic` no longer feed boot but stay as the corpus-sourced identity table for the menu and battle plugin mapping (Epics 7, 8, 20.12); the `sections` lists of the catalogue's `load` and `reset` rows (the `reset` row is shadowed by the world pack and `load` has no `events` applier, so listing it would only queue an unowned effect); the follow-ups #495, #497, #498, #519, #520, #529.

## Done when, item by item

| # | Evidence |
|---|---|
| 1 | `script-dictionary-objects.test.ts` (literals, `obj.prop`, `obj->prop`, `obj["prop"]`, `kill`); `script-class-objects.test.ts` ("a class instance and a dictionary are the same record shape in the same handle table", "... hold each other across a wait and a restore (one object runtime)"); OOP-10 |
| 2 | `script-dictionary-objects.test.ts` ("dictionary callable members bind this for direct calls, tear-offs and arrows, while bindThis rebinds a copy", "standalone lambda this is null ..."); OOP-11 |
| 3 | `script-manifest.test.ts` (package entry: name, version, namespace, declared requests); `script-package-namespaces.test.ts` (later wins, `ns.name`); `script-register-plugin.test.ts` ("no new resolution tier exists in resolveCall"); PKG-1 to PKG-6, MOD-4 |
| 4 | `format-main-file.test.ts` (TKR package extension round-trips, legacy rows byte-identical); `engine-boot.test.ts` (names feed the manifest in order; legacy rows add nothing) |
| 5 | `events-emitter.test.ts`, `events-cancelable.test.ts`, `events-game.test.ts` (`on`/`off`/`once`/`emit`, queued plain emit, parked cancelable emit, game emitter, one bus with TypeScript listeners); EMIT-1 to EMIT-22 |
| 6 | `events-emitter.test.ts` and `events-cancelable.test.ts` ("a save taken at every tick of a dispatch restores and finishes with the same hash"); `script-platform-fixtures.test.ts` (a save at every tick of each fixture) |
| 7 | `script-step-counters.test.ts`; PKG-8 |
| 8 | ADR 0008; `plugins-and-battle.md#e-99` and "Choosing the plugin language" |
| 9 | `discovery/step-budget-spike.md` and `step-budget-spike.test.ts`; Epic 20 Notes (this entry) |
| 10 | `golden/` diff is empty in this change; the gates listed in the PR |
