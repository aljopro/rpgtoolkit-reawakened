---
title: 'AssetDecoder wiring: add decoders to PluginDefinition'
type: 'feature'
ticket: '14'
created: '2026-10-16'
status: 'draft'
baseline_revision: '5a7ad22679581abdda690a0232f1f1e2208af3dc'
route: 'full'
route_source: 'pinned'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0004-script-ast-step-ir-and-plugins.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/epic-rpgcode-vm.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/plugin-definition-spike.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-legacy-formats/story-assetdecoder-interface-and-core-format-registry-ad-31-plan.md']
---

## Open Questions

1. **Decoder collision policy:** adopt the recommended later-plugin-wins policy for a repeated decoder id or extension, emitting one `decoder.overridden` warning per replaced claim; keep the low-level `createAssetRegistry` strict for direct callers. Alternative: retain 2.13's throw for every collision, which preserves the original registry contract but prevents plugin layering from matching command composition. The recommended policy is proposed for owner approval.

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `AssetDecoder` and `CORE_REGISTRY` are complete, but `PluginDefinition` cannot contribute decoders, leaving AD-31's plugin seam unwired. This prevents a plugin definition from adding a format that dispatches by extension or magic header.

**Approach:** Add optional `decoders` to the existing in-process, ungated `PluginDefinition`, then add a pure ordered assembly function that starts with the core decoder set and layers plugin decoders through the 2.13 registry. Amend ADR 0004 only (doc-first) so its interface and collision wording match the shipped API; leave AD-31, trust decisions, and deferred subsystem fields unchanged.

## Boundaries & Constraints

**Always:** Preserve G1/G2: decoder definitions and registry state are registration-time code, while decode results remain pure over bytes and `AssetResolver`; keep `core` host-free. Reuse `AssetDecoder`, `AssetResolver`, `CORE_DECODERS`, `createAssetRegistry`, extension folding, and existing `Logger`. Keep the core formats available as the base layer. Reject duplicate id/extension claims within one plugin. Later layers follow the approved collision policy and magic-header dispatch has deterministic layer order. Keep all format readers, dump behavior, and existing 2.13/16.8 registrations unchanged.

**Never:** Add `subsystems`, activation, manifest, trust/capability gates, dialect hooks, state slots, or host loading. Do not move decoder ownership into `runner-headless`, alter decoder models or format behavior, change golden expectations, or open `../rpgtoolkit`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| CORE_ONLY | Empty plugin list | Assembled registry resolves every `CORE_DECODERS` extension/header exactly as `CORE_REGISTRY` | None |
| CUSTOM | Plugin with one decoder and extension `zzz`, whose `detect` accepts `0x7f` | Extension and unknown-extension/header lookups return the plugin decoder; `decode` receives bytes and resolver unchanged | None |
| OVERRIDE | Later plugin repeats an id or extension from an earlier layer | Later decoder resolves; earlier claim is replaced; warning data names conflict, previous and replacement plugins | Depends on owner ruling; proposed warning, not throw |
| SELF_DUPLICATE | One plugin repeats an id or extension in its own `decoders` | Assembly refuses the definition before returning a registry | Throw programmer error naming plugin/claim |
| HEADER_ORDER | Two layered decoders accept the same header | Deterministic later-layer precedence, without changing extension-first resolution | No decode-time fallback or nondeterminism |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/plugin.ts` — add `decoders?: readonly AssetDecoder[]`; import the existing format contract as a type. Keep command and subsystem scope unchanged.
- `packages/core/src/formats/registry/registry.ts` — retain strict direct registration and expose the reusable registry behavior needed by assembly (including deterministic layer precedence without weakening 2.13 validation).
- `packages/core/src/formats/registry/assembly.ts` — new pure `assembleDecoders(plugins, logger)` seam; seed core decoders, validate per-plugin claims, layer later plugin contributions, and emit plain-data override warnings.
- `packages/core/src/formats/registry/index.ts`, `packages/core/src/formats/index.ts` — export the assembly function and its public types if any.
- `packages/core/test/format-registry.test.ts` — extend synthetic registration coverage for plugin definitions, extension/header dispatch, warning records, self-duplicate rejection, and unchanged core registrations.
- `docs/adr/0004-script-ast-step-ir-and-plugins.md` — doc-first amendment to decision 2: add the optional decoder array and the approved layering rule; do not amend trust or deferred subsystem decisions.

## Tasks & Acceptance

**Execution:**
- [ ] `docs/adr/0004-script-ast-step-ir-and-plugins.md` — amend decision 2 first, documenting `decoders` and the selected collision policy — satisfies G7 before code.
- [ ] `packages/core/src/script/plugin.ts` — add the optional `AssetDecoder` array — makes the hand-off type-safe.
- [ ] `packages/core/src/formats/registry/{registry,assembly,index}.ts` — implement pure plugin decoder assembly over the existing core registry — connects definitions to AD-31 without host access.
- [ ] `packages/core/test/format-registry.test.ts` — cover the matrix and verify decoding remains delegated to the registered decoder — prevents registry/PluginDefinition drift.

**Acceptance Criteria:**
- Given a plugin definition with a decoder, when its assembled registry resolves by extension or magic header, then that decoder is returned and its `decode` receives the original bytes and resolver.
- Given two plugin layers claiming the same decoder id or extension, when assembled, then the approved later-wins behavior and exactly one warning per replaced claim are observable.
- Given one plugin repeating its own id or extension, when assembled, then assembly rejects it as a programmer error.
- Given the shipped core and TK2 decoder sets, when the assembled registry is queried, then all existing 2.13/16.8 dispatches remain available and no dump or golden behavior changes.
- Given ADR 0004 and AD-31, when read together, then the interface and registration ownership are consistent without adding trust or subsystem scope.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

The assembly layer should not mutate the exported `CORE_REGISTRY`; each call builds an independent registry so tests and hosts cannot leak plugin registrations across runs. Keep decoder dispatch extension-first as specified by AD-31, and make header precedence an explicit property of the assembled layer order.

## Verification

**Commands:**
- `pnpm typecheck && pnpm test:strict && pnpm lint && pnpm graph && pnpm provenance && pnpm licence` — expected: all pass.
- `pnpm golden` — expected: pass with no golden-file diff.
- `pnpm dump:check && pnpm dump:check:examples` — expected: existing format expectations remain unchanged.

**Manual checks:**
- Read the ADR amendment beside `packages/core/src/script/plugin.ts` and `packages/core/src/formats/registry/assembly.ts`; confirm only decoder registration was added and the one ungated plugin ruling remains intact.
