---
type: discovery
title: "Readiness audit: what Epic 19 builds and what exists today"
date: 2026-10-19
baseline_revision: 0975a26b54f8d7bf569f463a02b783b16ec0ea98
---

# Readiness audit: RPGCode as a platform

Raw audit behind the Epic 19 rulings (the render analogue of `language-readiness.md`). Each finding names the entries it blocks.

| # | Finding | Evidence | Blocked entries |
|---|---|---|---|
| F-01 | Dictionary literals parse and then refuse at lowering: "a dictionary literal parses but its runtime storage is not available yet (object entry)". | `packages/core/src/script/lower.ts:292` | 3, 4, 5, 7, 8, 11 |
| F-02 | `CallableValue.receiver` exists and is validated for shape only; no instruction makes a non-null receiver, `bindThis` and the auto-bound member access are not built. | `packages/core/src/script/errors.ts:61`; ADR 0004 decision 8; 18.6 "Known limits" | 4, 7, 8 |
| F-03 | `registerPlugin(def)` is the designed route in MOD-4 and ADR 0004 decision 8 and was recorded by 18.7 as not built; no `registerPlugin` or `bindThis` exists in `packages/core/src`. | `docs/spec/engine/rpgcode-modules-and-objects.md` MOD-4 status; grep of `packages/core/src` | 8 |
| F-04 | The plugin manifest entry is `{ id, enabled?, options? }` and `PluginDefinition` is `{ id, version, commands, doc?, decoders? }`: no package name separate from id, no namespace, no declared host requests, no entry program. | `packages/core/src/script/manifest.ts:13`, `plugin.ts:139` | 6, 7, 9 |
| F-05 | The main file reads plugin DLL names (rows 23, 24 menu and fight plugin, 37 and 38b command plugins) as strings; nothing feeds them to a manifest. | `docs/spec/formats/main-file.md` | 9, Epic 20 (12) |
| F-06 | There is no emitter. The spine's Event Bus pillar describes a synchronous priority-ordered queue in `world.eventQueue`; the owner ruled a queued plain emit and a parked cancelable emit. | AD-32; ADR 0004 line 68 | 10, 11, 12 |
| F-07 | `STEP_BUDGET = 1000` per thread per tick; a waiting thread uses no budget. Whether a stock ATB tick plus per-hit events plus cancelable emits fits is unmeasured. | `packages/core/src/script/vm.ts:96`; THR-3 | 2, 10, 11, Epic 20 |
| F-08 | Wait kinds are owner-namespaced and register one `poll` (AD-9), so a cancelable emit's `event.dispatch` wait fits the existing contract. | AD-9 | 11 |
| F-09 | Per-package attribution of steps has no data anywhere; the VM counts steps per thread. | `packages/core/src/script/vm.ts` step loop | 13 |
| F-10 | Trust today: E-99 says "not trust-gated for now"; AD-17 sandboxes file I/O through host requests; native plugins are author-installed. Nothing is written as an ADR. | `docs/spec/engine/plugins-and-battle.md#e-99`; AD-17 | 1, 6 |

## What is reusable

The 18.5 environment table and `bindingOf`, 18.6 closure save and collection, the AD-9 wait contract and the `PluginManifest` patch operations are reused as-is; this epic adds no second dispatch or wait mechanism.
