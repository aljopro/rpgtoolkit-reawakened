# Spike 3.23: the rest of `PluginDefinition`, the trust model and E-99

Status: proposal for the owner's review. Three independent researchers produced `spike-23/spike-shape.md` (fields and first consumers), `spike-23/spike-trust.md` (threat model and sandbox options) and `spike-23/spike-legacy.md` (what legacy plugins did). This page is the synthesis; the three documents are the evidence.

## Recommendation in one paragraph

Ship v1 with **no third-party code**. `PluginDefinition` stays a trusted, in-process registration shape that grows one field at a time, added by the entry that first needs it. Legacy plugins are replaced by **first-party native command packs** (the most-used ones) and a located diagnostic for the rest. A sandboxed mechanism for game-shipped plugin code (E-99) is designed now at the boundary level and built only after gates prove it can be deterministic and snapshot-safe.

## What all three agree on

1. ADR 0004 says community plugins share the in-process contract; AD-17 and E-99 say games are untrusted and the extension mechanism is sandboxed. Both stay true if they are **two tiers**: a trusted in-process `PluginDefinition` (built-ins, domain modules, `plugin-tk2-compat`) and an untrusted tier reached only through host requests (`extension.call` and `extension.result`, already in AD-5 and AD-17).
2. The untrusted tier answers commands by name only. It cannot add decoders, subsystems, dialects, event hooks or state in v1.
3. Every legacy plugin the corpus uses is a TK2-era command pack. Menu, battle and event plugin kinds are TK3-only and unused by the archived games, so `subsystems` and `events` wait for their first consumer (epics 7, 8, 5).
4. Unknown commands already get a recorded-effect stub and a located diagnostic (entries 21 and 22), which satisfies "every command responds" without loading anything.
5. A foreign-code sandbox needs determinism proof (G3) and a snapshot story (G1) before any implementation. If those cannot be met, keep the declarative and RPGCode tiers and drop foreign code.

## Where they differed, and the ruling I recommend

| Question | Shape said | Trust said | Recommended |
|---|---|---|---|
| Is the sandboxed tier a `PluginDefinition`? | No, a separate game manifest answering command names | One interface with a `kind` and `capabilities` field, two trust tiers | **Separate manifest.** A trusted registration shape that also described untrusted plugins would carry fields (subsystems, decoders) an untrusted plugin must never have. Add `capabilities` only on the manifest. |
| `dialects` field | Never; core-internal registry | An id list | **Never a field** in v1. The TK2 and TK3 frontends are core-internal (ADR 0004 decision 1). |
| Can an untrusted plugin shadow a built-in? | not addressed | No: last-wins applies plugin-to-plugin, but untrusted plugins may not replace built-in or first-party names | **Adopt.** Otherwise a downloaded package can hijack `save` or `giveItem`. Needs your confirmation; it narrows the last-wins rule you set. |
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
| 7 | editor metadata | epic 11 | last |

## Doc amendments to approve (doc-first, one commit)

ADR 0004: add `decoders?` to the interface, say clashes use last-registered-wins with a warning, soften "community extensions share the exact same runtime contract" and add a decision stating the trust boundary. AD-31 is already right once the field exists. The exact text is in `spike-23/spike-shape.md` section 6. This lands inside entry 3 and entry 14 as already planned.

## New ticket recommended (replaces the sandbox implementation entry)

**Native packs for the most-used legacy plugins**, ranked by use in 2,783 archived programs (`spike-23/spike-legacy.md`): Triuken pack (71 programs), GsMiscPlugins (57), filereadwrite (47), FTP (41, declined), XFMWin (16), proplug (13), E-Mail (10, declined), TWButton (6), Kaimu (3). Rebuild first: GsMiscPlugins, the Triuken pack, `filereadwrite` (as the sandboxed file I/O of E-97), `proplug` string and math helpers, then XFMWin and Kaimu as aliases. FTP, sockets, E-Mail, DragSound, Flash and anything that needs Win32 handles are declined with a diagnostic (they break AD-17 and have no portable equivalent).

## Gates before any foreign-code sandbox (Phase 2)

Demand (3 documented plugin requests that RPGCode plus a manifest cannot serve), consent UI in both editor hosts, a determinism proof of the step budget across Node and a headless browser, a Worker-hosted path that can always be stopped, a written snapshot policy (a plugin call is a blocking host request whose reply is recorded), and a licence and size check (QuickJS in wasm is the only candidate the research found that passes licensing). If determinism cannot be shown, drop foreign code.

## Decisions for you

1. Two tiers, with the untrusted tier a separate manifest (not a `PluginDefinition`). Yes or no.
2. Untrusted plugins may not shadow built-in or first-party names. Yes or no.
3. No sandbox implementation entry in the MVP; add the native-packs entry instead. Yes or no.
4. Which of the declined plugins (FTP, E-Mail, sockets) do you want to answer with a "not supported in the browser" diagnostic versus a future capability. My recommendation is the diagnostic.
