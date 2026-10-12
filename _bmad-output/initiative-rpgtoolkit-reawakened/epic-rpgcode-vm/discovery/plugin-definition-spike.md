# Spike 3.23: the rest of `PluginDefinition`, extensibility and E-99

Status: proposal for the owner's review. **Revised 2026-10-12 after the owner's ruling: one ungated, composable plugin contract; no trust tiers for now.** Three independent researchers produced `spike-23/spike-shape.md` (fields and first consumers), `spike-23/spike-trust.md` (threat model and sandbox options) and `spike-23/spike-legacy.md` (what legacy plugins did); `spike-23/spike-critique.md` reviewed the earlier two-tier synthesis. Those four are evidence. Where they argue for a gated untrusted tier, this page supersedes them.

## Ruling

Plugins are extensions of the application and may do what they need to. A command pack, a domain module, a compat layer and a game-shipped plugin are all the same thing: a `PluginDefinition` registered into the engine. There is **no untrusted tier and no capability gating** for now. A less-trusting model can be added later; this page keeps the seam for it (see "What stays open") but does not build it.

The mental model is polyfills and modules, not an inheritance hierarchy. Plugins are composed, not subclassed: each contributes pieces (commands, decoders, activation, state, subsystems, events), the registry layers them in a fixed order, and a later contribution to the same name overrides the earlier one, as a polyfill replaces a missing or older implementation.

## Recommendation in one paragraph

`PluginDefinition` is the single extension contract, in-process and ungated. It starts as `{ id, version, commands }` and grows one optional field at a time, added by the entry that first needs it. First-party native command packs, the TK2 compat layer and any third-party plugin register through the same shape, in the same fixed order, with last-registered-wins and one warning diagnostic on a repeated name. Legacy plugins are replaced by native packs (most-used first) and a located diagnostic for the rest. A third-party plugin is just another definition handed to the registry by the host.

## What the research still tells us

1. **Legacy plugins are command packs.** Every plugin the corpus uses is a TK2-era command pack. Menu, battle and event plugin kinds are TK3-only and unused by the archived games, so `subsystems` and `events` wait for their first consumer (epics 7, 8, 5).
2. **Unknown commands already respond.** Entries 21 and 22 give an unregistered name a recorded-effect stub and a located diagnostic.
3. **Composition falls out of decisions already made.** Fixed registration order plus last-registered-wins (`tickets.toml:45-49`) is the override mechanism. AD-8's duplicate rejection survives only for one plugin repeating itself.

## The manifest is the configuration, and ships with defaults

Owner ruling, 2026-10-12: if there is a manifest, the engine's own code uses it too. There is no separate, privileged way the built-in packs are wired in.

- **One manifest shape, plain data (G1).** An ordered list of plugin entries: `{ id, version?, enabled?, options? }`. Order is registration order, so last-registered-wins is simply "later in the list wins".
- **The engine ships a default manifest** that lists the packs we expect to be useful out of the box (the native packs of entry 24, the TK2 compat layer, and whichever domain modules are optional). It is the same file format a game or user writes, not a special case.
- **Nothing is sacred about the defaults.** A game or user manifest can remove a default entry, disable it, reorder it, replace it with their own plugin of the same id, or append new ones. Starting from the default and editing it is the normal path; starting from an empty list is allowed.
- **Resolution stays in the host (G2).** The manifest names plugins; the host maps each `id` to code it can load and hands the resulting `PluginDefinition` list to the registry. `core` never reads files or loads modules. An id the host cannot resolve is a located diagnostic, not a crash.
- **Where the line falls.** The RPGCode language itself (control flow, expressions, the step machine) is not a plugin and is not in the manifest: removing it would leave nothing to run. Command packs are plugins and are removable. Which commands belong to the language and which to a pack is a per-command call made when entries 21 and 22 register the catalogue; see the open question below.
- **This replaces the informational `needs` idea.** The manifest is the seam where a later trust model, consent prompt or per-entry grants would attach, as extra fields on the entry. Nothing needs to be carried on the definition now.

## What ungated does not mean: the engine rules still bind plugins

Removing the trust gate removes a *permission* check. It does not remove the correctness rules, because they are what make save, restore, replay and golden tests work for everyone's plugins:

| Rule | What it means for a plugin |
|---|---|
| G1 | State is plain JSON data; commands are step-machine friendly. A plugin that keeps a closure, a Promise or a class instance in state breaks restore. |
| G2 | `core` touches no DOM, Node, I/O or timers. A plugin that needs a file, a socket or a clock asks the host through a request (`extension.call` and the AD-17 requests); it does not reach out itself. This is a platform seam, not a sandbox. |
| G3 | Deterministic: no `Math.random`, `Date`, `Intl`; use the injected clock and seeded RNG. A non-deterministic command breaks replay and goldens. |
| G6 | Dependencies under a Bronze-or-better licence. |

For first-party packs these are enforced by lint and types. For plugins from outside the repo they are the documented contract, and the contract's own checks (effects validated against the plugin's declared schema, not against grants) catch most violations at registration or first use.

## Field add-order

| Order | Field | Added by | Note |
|---|---|---|---|
| 1 | `id`, `version`, `commands` | entry 3 | the only seam anything needs now |
| 2 | `decoders` | entry 14 | closes the AD-31 conflict |
| 3 | `activation` | entry 15 | TK2 compat plugins turn on from the `.gam` plugin list |
| 4 | `state` | first plugin needing persistent state | namespaced slot under `vm`, versioned in the schema; absent plugin on restore keeps the data and warns |
| 5 | `subsystems.battle`, `.menu` | epics 7, 8 | singletons per kind |
| 6 | `events` | epic 5 with the event bus | ordered by priority then registration index |
| 7 | `subsystems.dialogue` | epic 4 or the dialogue entry, not sliced | deferred; no consumer yet |
| 8 | editor metadata | epic 11 | last |

The earlier objection to one shape (that a trusted registration shape described untrusted plugins with fields they must never have) no longer applies, since there is nothing a plugin must never have. `dialects` is still never a field: the TK2 and TK3 frontends are a core-internal registry (ADR 0004 decision 1).

## Doc amendments (doc-first, one commit)

The direction of the conflict flips. ADR 0004 already says community plugins share the in-process contract, so it is now the accurate one, and what needs amending is the sandbox language:

- **AD-17, E-99, and the "games are untrusted" statements in the spec**: say that plugins are first-class extensions and ungated for now, that the engine rules above still bind them, and that a tighter trust model is a future decision rather than a design constraint.
- **ADR 0004**: add `decoders?` to the interface; say clashes use last-registered-wins with a warning; rewrite the command-collision mitigation that still says collisions are rejected; state the composition model in one decision.
- **`epic-rpgcode-vm.md`**: resolve the "Source conflict" and "Open question: trust model" Notes; Done-when 6 and CAP-5's "sandboxed extension point" wording become "a single plugin contract any author can use".
- `spec-rpgtoolkit-reawakened.md` lines 38 and 124 and the spine's AD-17 open question get the same note.

This lands inside entries 3 and 14 as planned.

## New ticket recommended

**Native packs for the most-used legacy plugins**, ranked by occurrences across 2,783 archived `.prg` and `.gam` units (`spike-23/spike-legacy.md`): Triuken pack (71), GsMiscPlugins (57), filereadwrite (47), FTP (41, declined), XFMWin (16), proplug (13), E-Mail (10, declined), TWButton (6), Kaimu (3). Multiplayer (`multip.dll`, 4) uses sockets and is declined. Rebuild first: GsMiscPlugins, the Triuken pack, `filereadwrite` (file I/O through a host request, per G2), `proplug` string and math helpers, then XFMWin and Kaimu as aliases.

**Proposed entry 24, not yet added to `tickets.toml`:** one story in this epic, `after` entries 15 and 22, `covers` CAP-5. A static table maps each legacy plugin identity (the `tkplug0` to `tkplug4` slots and file names in the `.gam` plugin list, plus Multi-Plug `plugins.ini` entries) to a native pack or to a declined diagnostic. Each pack registers through `PluginDefinition.commands` and records its effects for the domain epics to apply. FTP, sockets, E-Mail, DragSound, Flash and anything that needs Win32 handles are declined with a located "not supported" diagnostic (no portable equivalent).

## What stays open

- **Loading third-party code.** `core` cannot load modules itself (G2). The host loads a plugin and hands the `PluginDefinition` to the registry. How a game package ships plugin code, and in what form (JS module, wasm, `.prg` plus manifest), is a host and distribution question for a later entry. It is not blocked by anything here.
- **Reaching the thing you override.** Resolved above under "Core versus pack": a command receives `next`. Decide in entry 3 whether it is part of the first contract (recommended, since adding a parameter later breaks every pack) or added later.
- **Tightening later.** A less-trusting model (consent prompts, grants, a sandbox) attaches to the manifest entry as extra fields, so the plugin contract does not change.
- **Core versus pack (owner: a small core is expected; wrappers welcome if cheap).** Recommended split, with no per-command marking needed:
  - *Language constructs are IR, not commands.* Control flow, assignment, labels, calls and returns compile to step-IR ops (ADR 0004) that move the program counter and stack. They are not in the command chain, so they cannot be removed or wrapped. This is the genuine core and it stays small.
  - *Everything callable by name is a command in a chain.* The engine's own implementations form a built-in `core` pack at the bottom of the default manifest, pinned (it cannot be removed or disabled). Other packs layer above it.
  - *A layer can wrap the one below.* A command receives `next`, the definition it shadows: `(view, args, next) -> { out, effects, wait? }`. A wrapper can adjust args, call `next`, then add or drop effects, or ignore `next` and replace. Because `next` is a pure function of `(view, args)`, nothing about VM internals leaks and G1 holds. Only a command that returns a non-wrappable result (it cannot, by contract: control transfer is IR) is out of reach.
  - *Cost:* one extra parameter on the command contract in entry 3, and a registry that keeps a per-name stack of layers instead of one winner. Last-registered-wins is then just "top of the stack runs first".
- **Manifest layering.** Is a game manifest a full replacement of the default, or a patch over it (add, remove, disable by id)? Recommended: a patch, with "replace everything" expressed as removing every default id.
- **Frozen versus per-thread waits.** AD-5 makes a blocking request freeze all time; only AD-9 waits park a single thread. A plugin author needs to know which one a call gets. Entry 9 settles which requests are which and documents it per request kind.
- **Decoder duplicates.** The AssetDecoder registry in PR 37 refuses a duplicate decoder id or extension, unlike commands, which layer. Entry 14 rules it (recommended: layer, later wins with a warning).
- **Foreign-code determinism.** If third-party code is ever run in-process as arbitrary JS, G3 and the step-budget question from `spike-23/spike-trust.md` apply to it. That is a correctness concern independent of trust.

## Decisions for you

1. Confirm the single, ungated contract (this page), replacing the two-tier recommendation. Yes or no.
2. The engine ships a default manifest of the useful packs, in the same format a game or user edits, and the engine's own wiring reads it. Recommended: yes. Plus the two open questions above (core versus pack, patch versus replace).
3. Add entry 24 (native packs and the legacy-name table). Recommended: yes.
4. Declined plugins (FTP, E-Mail, sockets, DragSound, Flash) answer with a located "not supported" diagnostic. Recommended: yes.
5. Defer `kind`, `aliases`/`legacyNames` on the definition (the legacy-name table is entry 24's), the event-hook shape, and `super`-style delegation to the entries that first need them. Recommended: defer.
