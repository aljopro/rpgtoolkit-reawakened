---
title: 'Plugin manifest and the engine''s default manifest'
type: 'feature'
ticket: 25
created: '2026-10-16'
status: draft
baseline_revision: 'a51613603f16df30a83311c79a584c869f1e2def'
route: 'full'
route_source: 'auto'
risk: 'medium'
context: ['docs/guardrails.md', 'docs/architecture-options.md', 'docs/adr/0004-script-ast-step-ir-and-plugins.md', 'docs/spec/engine/plugins-and-battle.md', 'docs/spec/engine/main-loop-and-startup.md', 'docs/spec/formats/main-file.md']
---

## Questions for the owner

- Confirm the plugin-manifest entry shape. The ticket names `{ id, enabled?, options? }`; ADR 0004 says only that entries are ordered plain data, while its request-timeout rule names manifest `options`. Decide whether an optional `version` selector is part of the entry, the allowed `options` plain-data value, and whether unknown fields are rejected.
- Confirm the default pack list at this checkpoint. `core` is required and pinned, while catalogue stubs and later domain packs are currently separate definitions. Decide which definitions the default manifest names now and which are added only by later entries.
- Confirm patch semantics. Decide the exact data operation for remove, disable, reorder, replace and append; whether duplicate ids are rejected; and whether replacement/`options` are whole-entry replacement or merge. A patch that removes every default id still leaves pinned `core` unless the owner chooses a different rule.
- Confirm the pinned-`core` failure policy. If a user removes, disables, reorders or replaces `core`, decide which operations produce a located diagnostic, which are repaired/ignored, and whether the resolved list always puts the engine `core` definition at the bottom.
- Confirm resolution diagnostics. Decide the stable code and location for an unresolved id (manifest path plus entry index, or another `Diagnostic` location), whether a disabled entry is resolved at all, and whether resolution continues with the other entries after a failure.
- Confirm how manifest `options` reach a plugin without changing ADR 0004's `(view, args, next)` handler signature. Decide whether options are carried on an immutable per-command view, a resolved layer context, or another plain-data value, and whether the VM or only the plugin reads them.
- Confirm the host/core seam. The host must map ids to loadable `PluginDefinition` values and core must not load modules or files. Decide whether the reusable patch/type functions live in `core` while resolution is a host adapter, and which runner/engine entry first proves that the default manifest is the actual assembly path.

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** ADR 0004 makes the manifest the single plain-data selector and ordering mechanism for first-party and third-party plugins, but the current script service path still receives an already-resolved plugin array and implicitly prepends the built-in layers. There is no manifest patch operation, default-manifest value, host resolution seam, or located failure for an id that cannot be resolved. The engine therefore cannot use the same editable configuration for its own built-ins and for a game's plugins.

**Approach:** Add a data-only plugin-manifest contract and the engine's default manifest. Apply a user/game patch to the default by id, enforce the pinned `core` rule, and preserve the resulting order as command-layer order. Keep id-to-code resolution in the host: it supplies resolved `PluginDefinition` values and plain-data options to core, while an unresolved id becomes a located diagnostic and does not prevent other resolvable entries from assembling. Make the harness use this same default-manifest path, then remove the VM's implicit built-in insertion so the registry is assembled exactly once from the resolved list.

## Boundaries & Constraints

**Always:** Keep manifest state and options plain JSON data under G1; keep the core I/O-free and free of module loaders, filesystem APIs and host globals under G2; preserve the fixed TypeScript core/runner seam from `docs/architecture-options.md` §2 and §8; preserve ADR 0004's one ungated `PluginDefinition` contract, manifest order as layer order, `next` delegation, and pinned `core`; emit diagnostics through the AD-24 `Logger`/located-diagnostic channels rather than `console`; keep a disabled or unresolved optional entry from changing the order of entries that did resolve; distinguish this plugin manifest from the distribution package's `manifest.json { schema, main, index }` in `docs/spec/formats/packaging-and-paths.md`.

**Never:** Add dynamic imports, file reads, network access or plugin loading to `core`; introduce a trust tier, capability grant or sandbox (ADR 0004 decision 6 explicitly defers that); change the distribution package manifest shape; move menu/battle/subsystem/decoder fields into this ticket before their owning entries; make plugin options closures, host handles or other non-plain state; silently drop an unresolved id; or implement `createEngine` (owned by the engine epic).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Engine default | No user/game patch; host's id table contains the engine packs | The default manifest resolves to the same ordered definitions the engine assembles, with `core` at the pinned bottom layer | A malformed built-in default is a configuration failure, not a silent fallback |
| Add and append | A patch names a new id after the defaults | The host resolves it and the resulting definition is the last command layer | An unresolved id is located and the other entries still assemble |
| Remove by id | A patch removes a default id other than `core` | That definition is absent; every remaining entry keeps its relative order | Removing an unknown id follows the settled duplicate/unknown-id policy |
| Disable by id | A patch marks an existing id disabled | The definition is omitted from assembly without changing other order | A disabled entry is either not resolved or reports according to the owner ruling; it is never silently treated as enabled |
| Reorder | A patch supplies an order for existing ids | Resolved definitions follow the patched order, and later definitions still run first for an overridden command | Missing or repeated ids are rejected or diagnosed according to the settled patch grammar |
| Replace | A patch replaces an id's definition selection while retaining its position | The host resolves the replacement and command layers use that position | Replacement of pinned `core` follows the settled pinned-core policy |
| Pinned core | A patch tries to remove, disable, reorder or replace `core` | `core` remains enabled and at the bottom, or the owner-selected refusal behavior is observed | A located diagnostic identifies the manifest entry and stable rule/code when the operation is refused |
| Options | An enabled entry carries only plain-data options | The selected plugin receives the exact options through the settled immutable context; no options enter saveable VM state as host objects | Non-plain, malformed or unsupported options are rejected with a located diagnostic |
| Unresolved id | An enabled entry has no host definition | Other entries resolve and assemble; no module loader runs in core | One located unresolved-plugin diagnostic names the id and manifest location |
| Duplicate ids | The patch or effective list repeats an id | The settled duplicate policy is deterministic and cannot create an accidental second instance | Rejection/diagnostic names the repeated id and location; no partial ambiguous registry is exposed |
| Empty replacement | A patch removes every non-core default | The effective manifest contains only pinned `core` unless the owner explicitly rules another protected default | The result remains executable and deterministic |
| Distribution manifest | A package has `manifest.json { schema, main, index }` | Package loading continues to use that independent descriptor; plugin selection is not inferred from archive indexing | Existing format validation and diagnostics remain unchanged |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/plugin.ts` — current `PluginDefinition`, `CommandView` and plain-data command result contract; this is the seam for the settled options delivery without changing `(view, args, next)`.
- `packages/core/src/script/builtins.ts` — current `CORE_PLUGIN`; retain it as the protected definition but stop treating its export as an implicit assembly step.
- `packages/core/src/script/catalogue-stubs.ts` — current catalogue layer; decide whether its id belongs in the default manifest now or remains an explicit later pack.
- `packages/core/src/script/registry.ts` — current ordered layer assembly and `next` chain; consume the manifest-resolved list without adding a second precedence path.
- `packages/core/src/script/vm.ts` — current `createScriptServices` prepends `CORE_PLUGIN` and the catalogue layer; cut over to a final resolved plugin list/default-manifest input and leave module loading outside core.
- `packages/core/src/script/index.ts` and `packages/core/src/index.ts` — export the plugin-manifest data contract and the default/patch helpers from the public core surface.
- `packages/core/src/ports/logger.ts` and `packages/core/src/ports/engine.ts` — carry plain warning/error records and located `Diagnostic` values for protected ids and unresolved host definitions.
- `packages/runner-harness/src/script-host.ts` — the current VM host; resolve the default manifest through the same adapter used by the tests, and rebind the resolved list on snapshot restore.
- `packages/runner-harness/test/script-host.test.ts`, `packages/core/test/script-registry.test.ts`, `packages/core/test/script-catalogue.test.ts` and related VM tests — migrate direct plugin-array setup and add manifest patch, resolver, options, protected-core and diagnostic coverage.
- `packages/core/src/formats/manifest.ts` and `packages/core/test/format-manifest.test.ts` — distribution-package `manifest.json` is intentionally unrelated; use these only to ensure the two contracts do not get conflated.

## Tasks & Acceptance

**Execution:**

- [ ] Settle and record the seven owner rulings above before implementation; keep this plan at the checkpoint until they are answered.
- [ ] Define the plugin manifest entry/list types as plain data, including the settled options/version/unknown-field rules, and export the engine default manifest with the settled current pack ids.
- [ ] Implement the pure default-patch operation with deterministic id/order handling and the protected `core` behavior; add located diagnostics for invalid patch operations.
- [ ] Add the host-side id resolver seam. It accepts the effective manifest, maps ids to loadable definitions, passes plain options through the settled context, reports unresolved ids and returns the remaining ordered definitions without any loader in `core`.
- [ ] Cut `createScriptServices`, the VM host and callers over to the final resolved list. Remove implicit `CORE_PLUGIN`/catalogue insertion so the default manifest path and explicit engine assembly cannot diverge.
- [ ] Add matrix tests for default assembly, every patch operation, protected `core`, unresolved ids, duplicate ids, options, snapshot restore rebinding and the unchanged distribution manifest reader/writer.

**Acceptance Criteria:**

- Given the engine's default manifest and its host resolver, when the registry is assembled, then it is the same ordered registry the engine uses, with the protected `core` layer at the bottom and no hidden built-in insertion in the VM.
- Given a user/game patch that removes, disables, reorders, replaces and appends entries, when it is applied, then the effective ordered definitions and command `next` chain match the settled patch rules and remain deterministic.
- Given an attempt to remove or disable `core`, when the effective manifest is resolved, then `core` remains available according to the pinned rule and a located diagnostic is produced when the settled policy requires refusal.
- Given an enabled manifest id that the host cannot resolve, when the manifest is loaded, then one located diagnostic identifies the id and manifest location, the remaining resolvable entries assemble, and `core` does not import a loader or file API.
- Given plain-data plugin options, when a command runs, then the plugin receives the exact settled options without a closure, host handle or non-JSON value entering VM state.
- Given a snapshot restore, when the host rebinds the same effective manifest, then command resolution and state/hash behavior are identical to the original run.
- Given the existing distribution `manifest.json { schema, main, index }`, when a package is read and written, then its format behavior is unchanged and no plugin entries are confused with archive indexing.
- Given the full typecheck, tests, lint, dependency graph, provenance, licence and headless golden checks, when they run, then they pass without an intentional golden or distribution-manifest change.

## Implementation Notes

- `core` should own only the serialisable manifest value/patch contract and default data. The host owns the id-to-definition table and any dynamic loading; this preserves the narrow data-only seam described by `docs/architecture-options.md` §2 and the explicit host-resolution rule in ADR 0004 decision 6.
- `CORE_PLUGIN` is code, not a manifest entry resolver. The implementation must make the default manifest's resolution path the one exercised by the harness and later engine assembly, rather than retaining a convenience path that silently prepends it.
- Plugin options are manifest configuration, not saved VM state. The implementation must keep their ownership and lifetime explicit so a command can read them while preserving AD-8 purity and G1 serialisability.
- This is a plan checkpoint: no implementation or verification starts until the owner answers the open rulings and approves this frozen plan.

## Plan Change Log

- 2026-10-16 — initial checkpoint draft from ticket 3.25, ADR 0004 decision 6, AD-8/AD-17/AD-24, `docs/spec/engine/plugins-and-battle.md`, `docs/spec/engine/main-loop-and-startup.md`, `docs/spec/formats/main-file.md`, `docs/architecture-options.md`, and the current 3.3 registry/VM seam.

## Review Triage Log

No review has run; this is the plan-checkpoint draft.

## Design Notes

The implementation order is data contract and default list first, pure patch semantics second, host resolution third, then the VM/harness cutover and matrix tests. The registry remains the only command-layer assembler: manifest order supplies its plugin order, and `next` continues to mean the lower layer from ADR 0004. The distribution package manifest remains in the formats lane and is not reused for plugin selection.

## Verification

**Commands:**

- `pnpm typecheck && pnpm test && pnpm lint && pnpm graph && pnpm provenance && pnpm licence` — expected: all pass.
- `pnpm fixtures:fetch && pnpm test:strict && pnpm golden` — expected: pass with no intentional golden change and no tracked golden diff.
- `grep -rn "import(\|require(\|from ['\"]node:fs\|from ['\"]node:path" packages/core/src` — expected: no plugin/module loader or filesystem import added to core.
- `grep -rn "CORE_PLUGIN\|CATALOGUE_STUBS_PLUGIN" packages/core/src/script/vm.ts` — expected: no implicit prepend remains in the VM service constructor; the default path is explicit and manifest-driven.

**Manual checks:**

- Compare the plugin-manifest type and default list against ADR 0004 decision 6 and `docs/spec/engine/plugins-and-battle.md#e-99`; compare the host/core boundary against `docs/architecture-options.md` §2.
- Read the plugin manifest implementation beside the unrelated distribution manifest rules in `docs/spec/formats/packaging-and-paths.md`, confirming both descriptors retain separate names, fields and readers.

</frozen-after-approval>
