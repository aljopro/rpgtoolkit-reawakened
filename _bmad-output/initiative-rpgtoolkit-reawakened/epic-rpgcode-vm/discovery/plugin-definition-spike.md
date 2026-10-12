# Spike 3.23: the rest of `PluginDefinition`, the trust model and E-99

Status: proposal for the owner's review, revised after an independent critique (`spike-23/spike-critique.md`, 19 findings, all applied or listed below). Three independent researchers produced `spike-23/spike-shape.md` (fields and first consumers), `spike-23/spike-trust.md` (threat model and sandbox options) and `spike-23/spike-legacy.md` (what legacy plugins did). This page is the synthesis; the three documents are the evidence.

## Recommendation in one paragraph

Ship v1 with **no third-party plugin code** (no foreign code and no author-shipped plugins). `PluginDefinition` stays a trusted, in-process registration shape that grows one field at a time, added by the entry that first needs it. Legacy plugins are replaced by **first-party native command packs** (the most-used ones) and a located diagnostic for the rest. The sandboxed extension point of E-99 is designed at the boundary level now and built after gates. **This defers part of CAP-5's stated intent** (a sandboxed extension point replacing native plugins); CAP-5's success check is still met by entries 21 and 22. Decision 5 below records that deferral in the spec.

## What all three agree on

1. ADR 0004 says community plugins share the in-process contract; AD-17 and E-99 say games are untrusted and the extension mechanism is sandboxed. Both stay true if they are **two tiers**: a trusted in-process `PluginDefinition` (built-ins, domain modules, `plugin-tk2-compat`) and an untrusted tier reached only through host requests (`extension.call` and `extension.result`, already in AD-5 and AD-17).
2. The untrusted tier answers commands by name only. It cannot add decoders, subsystems, dialects, event hooks or state. Invariant: **capability gating applies only to the untrusted tier; the trusted tier is ungated by design**, and the untrusted tier's returned effects are validated against its manifest's grants.
3. Every legacy plugin the corpus uses is a TK2-era command pack. Menu, battle and event plugin kinds are TK3-only and unused by the archived games, so `subsystems` and `events` wait for their first consumer (epics 7, 8, 5).
4. Unknown commands already get a recorded-effect stub and a located diagnostic (entries 21 and 22), which satisfies "every command responds" without loading anything.
5. A foreign-code sandbox needs determinism proof (G3) and a snapshot story (G1) before any implementation. If those cannot be met, keep the declarative and RPGCode tier (author-shipped manifests plus `.prg` run inside the VM, which pass G1, G2 and G3 by construction) and drop foreign code. That declarative tier is the realistic untrusted tier; it is Phase 1 and is **not** in the MVP.
6. Guard-rail check: nothing in this recommendation breaks G1, G2, G3, G6 or G7.

## Where they differed, and the ruling I recommend

| Question | Shape said | Trust said | Recommended |
|---|---|---|---|
| Is the sandboxed tier a `PluginDefinition`? | No, a separate game manifest answering command names | One interface with a `kind` and `capabilities` field, two trust tiers | **Separate manifest.** A trusted registration shape that also described untrusted plugins would carry fields (subsystems, decoders) an untrusted plugin must never have. `capabilities` lives on the manifest only; the trusted tier is ungated and its safety is code review, not enforcement. |
| `dialects` field | Never; core-internal registry | An id list | **Never a field.** Rejects even the id-list form; the TK2 and TK3 frontends are a core-internal registry (ADR 0004 decision 1). |
| Can an untrusted plugin shadow a built-in? | not addressed | No: untrusted plugins may not replace built-in or first-party names | **Already guaranteed by construction, so no new rule for you to rule on.** The untrusted tier is reached only through `extension.call`, the last lookup tier (AD-8), so it never sees a name a built-in already owns. Your last-registered-wins rule stays as set, for the trusted tier. If an in-registry untrusted tier (Phase 1) is ever built, built-ins win by the same ordering; that is stated here so it is not forgotten. |
| Build the sandbox entry now? | Add entry 24 | Phase 2, gated, unscheduled | **Do not slice an implementation yet.** Record it as post-MVP, behind the gates below. |

## Field add-order

| Order | Field | Added by | Note |
|---|---|---|---|
| 1 | `id`, `version`, `commands` | entry 3 | the only seam anything needs now |
| 2 | `decoders` | entry 14 | closes the AD-31 conflict; trusted only |
| 3 | `activation` | entry 15 | TK2 compat plugins turn on from the `.gam` plugin list |
| 4 | `state` | first plugin needing persistent state | namespaced slot under `vm`, versioned in the schema; absent plugin on restore keeps the data and warns |
| 5 | `subsystems.battle`, `.menu` | epics 7, 8 | singletons per kind |
| 6 | `events` | epic 5 with the event bus | ordered by priority then registration index |
| 7 | `subsystems.dialogue` | epic 4 or the dialogue entry, not sliced | deferred; no consumer yet |
| 8 | editor metadata | epic 11 | last |

## Doc amendments to approve (doc-first, one commit)

ADR 0004: add `decoders?` to the interface, say clashes use last-registered-wins with a warning, soften "community extensions share the exact same runtime contract", add a decision stating the trust boundary, and rewrite the two Consequences bullets that contradict the new rules (the ecosystem-parity bullet and the command-collision mitigation that still says collisions are rejected). AD-31 is already right once the field exists. Also record the deferral: CAP-5's intent and the spec's open question on the extension API (`spec-rpgtoolkit-reawakened.md` lines 38 and 124), the spine open question (AD-17), and `epic-rpgcode-vm.md` Done-when 6 get a note that the sandboxed extension point is post-MVP behind the gates. The exact ADR text is in `spike-23/spike-shape.md` section 6. This lands inside entries 3 and 14 as planned.

## New ticket recommended (replaces the sandbox implementation entry)

**Native packs for the most-used legacy plugins**, ranked by use in 2,783 archived programs (`spike-23/spike-legacy.md`): Triuken pack (71 programs), GsMiscPlugins (57), filereadwrite (47), FTP (41, declined), XFMWin (16), proplug (13), E-Mail (10, declined), TWButton (6), Kaimu (3). The counts are **occurrences across source files and packages** in a corpus of 2,783 `.prg` and `.gam` units, not numbers of programs. Multiplayer (`multip.dll`, 4 occurrences) uses sockets and is declined. Rebuild first: GsMiscPlugins, the Triuken pack, `filereadwrite` (as the sandboxed file I/O of E-97), `proplug` string and math helpers, then XFMWin and Kaimu as aliases.

**Owner and shape (proposed entry 24, not yet added to `tickets.toml`):** these are TK2-era compat commands, so they live in the compat plugin, not in new domain code. One story in this epic, `after` entries 15 and 22, `covers` CAP-5: a static table maps each legacy plugin identity (the `tkplug0` to `tkplug4` slots and file names in the `.gam` plugin list, plus Multi-Plug `plugins.ini` entries) to a native pack or to a declined diagnostic, and each pack's commands register through `PluginDefinition.commands` and record their effects for the domain epics to apply. Legacy-name mapping is therefore owned by entry 15 (activation) plus entry 24 (the table and packs). Domain behaviour stays with the domain epics. It also adds entry 24 to the sweep's `after`. FTP, sockets, E-Mail, DragSound, Flash and anything that needs Win32 handles are declined with a diagnostic (they break AD-17 and have no portable equivalent).

## Gates before any foreign-code sandbox (Phase 2)

Demand (3 documented plugin requests that RPGCode plus a manifest cannot serve), consent UI in both editor hosts, a determinism proof of the step budget across Node and a headless browser, a Worker-hosted path that can always be stopped, a written snapshot policy (a plugin call is a blocking host request whose reply is recorded), and a licence and size check (QuickJS in wasm is the only foreign-code candidate that passes both the licence gate and the authoring bar; several others, such as wasmtime, wasm3, Duktape and JerryScript, also pass the licence gate: `spike-23/spike-trust.md` lines 218 to 227). If determinism cannot be shown, drop foreign code.

## Decisions for you

1. Two tiers, with the untrusted tier a separate manifest (not a `PluginDefinition`). Yes or no.
2. (Dropped: shadowing is impossible by construction, see the table.) Confirm only that the trusted tier is ungated.
3. No sandbox implementation entry in the MVP; add the native-packs entry instead. Yes or no.
4. Declined plugins (FTP, E-Mail, sockets, DragSound, Flash): answer them with a located "not supported" diagnostic now, and revisit only if the Phase 2 demand gate is met. Recommended: yes.
5. Accept that CAP-5's sandboxed extension point is post-MVP, and amend the spec, the spine open question and the epic Done-when to say so. Recommended: yes. If you say no, the MVP needs the declarative tier built, which adds a story.
6. Plugin shapes deferred, each to the entry that first needs it: `kind`, `aliases`/`legacyNames` on the definition (the legacy-name table is entry 24's instead), and event-hook shape. Recommended: defer.
