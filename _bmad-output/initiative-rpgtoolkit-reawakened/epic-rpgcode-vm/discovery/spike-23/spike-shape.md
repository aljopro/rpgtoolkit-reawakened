# Spike 23 — the rest of `PluginDefinition`: shape, trust, first consumers

Status: research proposal, no code. Written 2026-10-11 for the owner to rule on.
Sources are repo docs only (G7). Every claim cites a file:line; anything not
observed is marked `[INFERENCE]`.

Entry 23 (`epic-rpgcode-vm/tickets.toml:243-251`) asks five things: the seam
inventory, per-field recommendations, the ADR 0004 vs AD-17/AD-31 reconciliation,
the rules for adding fields without breaking saves, and the add-order. This
document answers all five, and ends with the digest the task asked for.

---

## 0. Where we are today (facts, not proposals)

* `PluginDefinition` is defined in one place, ADR 0004 decision 2
  (`docs/adr/0004-script-ast-step-ir-and-plugins.md:29-38`): `{ id, version,
  commands?, subsystems?: { battle?, menu?, dialogue? } }`.
* Jensen's ruling (`_bmad-output/.../epic-rpgcode-vm/epic-rpgcode-vm.md:52`, and
  `tickets.toml:2`): it **starts with `commands` only** and grows as entries need
  it. Entry 3 ships `{ id, version, commands }`
  (`tickets.toml:44-48`); entry 14 adds `decoders` (`tickets.toml:256-261`).
* The two unreconciled conflicts:
  1. **decoders** — AD-31 says decoders register through `PluginDefinition.decoders`
     (`architecture-...md:346`), but ADR 0004's interface has no such field
     (`epic-legacy-formats.md:50`).
  2. **trust** — ADR 0004 decision 2 says "core commands and community extensions
     share the exact same runtime contract" (`0004...md:27`) and it is an
     in-process interface; AD-17 says the core's only path to the host is
     `StepReport.requests`, and "the E-99 extension mechanism uses these same
     requests" (`architecture-...md:248`); E-99 says the mechanism is
     **sandboxed** and games are untrusted (`docs/engine-features.md:311`,
     `epic-rpgcode-vm.md:55`).
* The conflict is **recorded, not settled**: "Unreconciled; this epic builds the
  first-party mechanism only" (`epic-rpgcode-vm.md:55`).
* One fact bounds all of this: **`PluginDefinition` is never serialised into
  state.** AD-7 keeps compiled code outside state and rebuilds it on restore
  (`architecture-...md:129-135`). So adding registration-only fields cannot break
  a snapshot; only fields that introduce *state* can.

---

## 1. Seam inventory

Every extension seam the spine, the ADRs and the epics already imply. "Kind" is
how the seam is expressed; "first consumer" is the epic/entry that needs it
first.

| # | Seam | Where it is implied | Kind | First consumer |
|---|---|---|---|---|
| S1 | **Commands** | ADR 0004 d.2 `0004...md:32-33`; AD-8 `architecture-...md:140`; E-94 `engine-features.md:301`; §9.11 `format-spec.md:822` | field `commands` | entry 3; every domain epic |
| S2 | **Asset decoders** | AD-31 `architecture-...md:346`; epic-legacy-formats 2.13/entry 14 | field `decoders` | entry 14 (wires epic 2.13) |
| S3 | **Subsystems — battle** | ADR 0004 d.2/d.5 `0004...md:33-37,61-67`; E-79 `engine-features.md:260` | field `subsystems.battle` | epic-battle (default UI + custom fight programs) |
| S4 | **Subsystems — menu** | ADR 0004 d.2/d.5; E-80 `engine-features.md:266` | field `subsystems.menu` | epic-menu-party-save |
| S5 | **Subsystems — dialogue** | ADR 0004 d.2 `0004...md:35` | field `subsystems.dialogue` | board-rendering message window (E-50..E-63) / E-96 `engine-features.md:305` — not yet sliced |
| S6 | **Dialect frontends** | ADR 0004 d.1 `0004...md:46-48`; entry 15 `tickets.toml:274` | internal frontend registry (see §2.6) | entry 15 (TK2); a possible v1 later |
| S7 | **Event hooks** | ADR 0004 d.4 `0004...md:50-59`; AD-32 pillar 3 `architecture-...md:356` | engine bus + optional `events` field | epic-movement-triggers ("plain-data event hooks", `epic-movement-triggers.md`) |
| S8 | **Draw-list / audio-cue emission** | ADR 0004 d.5; G4 `guardrails.md:74`; AD-3 `architecture-...md:97`; AD-16 | return contract of S3–S5, **not a field** | epic-board-rendering / epic-audio-synth |
| S9 | **Owned state sections** | AD-10 `architecture-...md:150-176`; AD-23 `architecture-...md:286-291`; AD-7 `:129` | fixed section list; plugin slot namespaced (see §2.9) | (no consumer yet; see §2.9) |
| S10 | **Lifecycle / activation** | ADR 0004 d.3 `0004...md:44`; format-spec §2 row 29 `format-spec.md:147`; E-99 | declarative `activation` + assembly (see §2.10) | entry 15 (tk2-compat auto-activates) |
| S11 | **Editor-side contributions** | T-14 `docs/editor-features.md:44`; recovery `plugins.md:26-30` | `description` / `capabilities` metadata | epic-editor-foundation (main-file editor T-14); LSP catalogue `epic-rpgcode-tooling.md` |
| S12 | **Wait kinds** | AD-9 `architecture-...md:143-148`; entry 9/22 | engine registry, **not** a plugin field | entry 9 (input/sleep), domain epics add kinds |
| S13 | **Sandboxed third-party extension** | E-99 `engine-features.md:311`; AD-17 `:248`; AD-5 `:118-120`; entry 22 | `extension.call` / `extension.result` host channel (see §3) | a future E-99 entry (§5) |

S8, S12 and (for now) S9 are **not** `PluginDefinition` fields — they are
engine-owned seams a plugin uses indirectly. This matters: the field list must
not grow to mirror the whole engine.

---

## 2. Field-by-field recommendations

Shape sketches follow the repo's plain-data style (AD-7). All new fields are
**optional**, so adding one is a non-breaking change to the interface.

### 2.1 `id: string` — REQUIRED, already shipped (entry 3)
Identity for the override warning (`tickets.toml:45`). First-party ids are the
package name; third-party ids are declared in a future manifest (§3). No state,
no determinism impact.

### 2.2 `version: string` — REQUIRED, already shipped
Used for the "last registered wins, warn on override" diagnostic and for the
schema record if the plugin declares state (§4). No state impact. `[INFERENCE]`
semver is implied by the repo's package conventions (`architecture-...md`, Stack:
"npm packages follow semver from 1.0").

### 2.3 `commands?: Record<string, CommandHandler>` — SHIPPED (entry 3)
The one contract every domain epic and every command in the §9.11 catalogue uses
(`epic-rpgcode-vm.md:52`; entries 21/22). `CommandHandler` is AD-8's functional
form `(view, args) -> { out, effects, wait? }` (`tickets.toml:45`). Touches no
state directly: commands *record* effects; the owning module applies them
(`tickets.toml:45,80`). First-party **and** third-party (through the sandbox, §3).

### 2.4 `decoders?: AssetDecoder[]` — ADD NOW (entry 14)
Shape (AD-31 `architecture-...md:346`):
```ts
interface AssetDecoder<T = unknown> {
  id: string;
  extensions: string[];                 // lower-case, no dot
  detect(header: Uint8Array): boolean;  // magic sniff
  decode(bytes: Uint8Array, ctx: AssetResolver): Result<T, FormatError>;
}
```
* **First consumer:** entry 14 (`tickets.toml:256-261`), wiring epic 2.13's
  registry (`epic-legacy-formats` tickets.toml:138-142).
* **Can it wait?** No — it is the oldest recorded conflict and epic 2 already
  handed it over.
* **State/snapshot:** none. Decoders run at load, produce models; the model is
  read-only residue-aware data (AD-18). No determinism risk beyond G3 already
  applying to decoders.
* **Trust:** first-party/in-process now (entry 14 states it:
  `tickets.toml:257`). A third-party decoder is a **capability** the game asks
  for; it must go through the sandbox path (§3), never in-process.
* **Conflict:** `extensions` + `detect` mean two decoders can claim the same
  file; resolve with the same last-registered-wins + warning rule as commands
  (§4.3).

### 2.5 `subsystems?: { battle?, menu?, dialogue? }` — ADD WHEN FIRST NEEDED
Shape (ADR 0004 d.2/d.5 `0004...md:33-37,61-67`), expressed as plain-data step
machines that emit draw lists and cues — never renderers (G4):
```ts
interface BattleSubsystem {
  id: string;
  step(view: DeepReadonly<BattleView>, step: number): { draw: DrawCommand[]; cues: AudioCue[]; effects: EffectRecord[] };
  // FIGHT_STRUCT / FIGHT_EVENT equivalents, E-79 engine-features.md:260
}
interface MenuSubsystem  { id: string; open(screen: MenuScreen, view: MenuView): { draw: DrawCommand[]; cues: AudioCue[]; wait?: Wait }; }
interface DialogueSubsystem { id: string; say(view: UiView, text: string): { draw: DrawCommand[]; wait?: Wait }; }
```
`BattleView`/`MenuView` are `DeepReadonly` views of the AD-10 sections the
subsystem owns/reads (AD-10 `:150-176`).
* **First consumers:** battle → epic-battle (E-79, `engine-features.md:260`);
  menu → epic-menu-party-save (E-80, `:266`); dialogue → board-rendering's
  message window / E-96 (`:305`) — **not sliced yet**, so `dialogue` can wait.
* **Can it wait?** Yes. Each half is added by the epic that first needs it
  (per Jensen's ruling `epic-rpgcode-vm.md:52`). There is exactly **one**
  subsystem of each kind (a game has one menu, one battle system), so the field
  is a singleton, not a list.
* **State/snapshot:** subsystems must keep their own state in their AD-10 section
  (`battle`, `menu`, `ui`) — no closures, no state held in the subsystem object
  (G1 `guardrails.md:21-26`). That keeps snapshots whole.
* **Determinism:** subsystems step in the `battle`/`menu` phases of AD-26
  (`architecture-...md:307-313`); RNG through `RngPort` only (AD-12).
* **Trust:** first-party only in v1. A third-party menu/battle system is the
  E-99 replacement case (E-99 `:311`, `plugins.md:20-22`) and must run in the
  sandbox, publishing only draw lists/cues back.

### 2.6 `dialects` — DO **NOT** ADD; keep frontends internal
ADR 0004 d.1 makes TK2 and TK3 **core** frontends producing one Unified AST
(`0004...md:46-48`); entry 15 builds the TK2 frontend inside the VM epic
(`tickets.toml:274`). A plugin-provided dialect parser would have to run before
the VM's compiler exists and would need to be in-process to lower to Step IR,
which contradicts the sandbox.
* **Recommendation:** keep a **core internal** dialect registry
  (`core/script`, ADR 0004 d.1) — not a `PluginDefinition` field. A future v1
  (TK 1.x) frontend is added to that registry by core; it is a nice-to-have
  (`tickets.toml:191`), and if it ever ships as a package it is still first-party.
* **Rejected:** exposing dialects as a plugin field — no consumer needs it and it
  puts a compiler seam in the untrusted half.
* If the owner later wants a plugin dialect, the field would be
  `dialects?: DialectFrontend[]` with `{ id, detect(sourceText): boolean,
  parse(text): Ast }` — added by whoever ships that dialect.

### 2.7 `events?: PluginEventHook[]` — BUS NOW, HOOK FIELD CAN WAIT
ADR 0004 d.4 fixes both the queue and the hook shape (`0004...md:50-59`); AD-32
pillar 3 puts the queue in `world.eventQueue` (`architecture-...md:356`).
```ts
interface PluginEventHook {
  event: string;                        // "board:entity_moved", "battle:turn_start"
  priority: number;                     // total order (AD-25)
  handle(event: EngineEvent, ctx: StepContext): EffectRecord[];  // data in, effects out
}
```
* **First consumer (bus):** epic-movement-triggers — its Description says
  triggers dispatch "through plain-data event hooks"
  (`epic-movement-triggers.md`).
* **Can it wait (field)?** Yes. The **bus** is movement-triggers' work; the
  **plugin hook field** has no first-party consumer until a domain needs an
  external subscription. Until then commands and subsystems suffice.
* **State/snapshot:** the queue is plain data in `world.eventQueue` — it
  snapshots with the world section (ADR 0004 d.4; AD-10 `world` row). A
  `handle` must be **pure data in, effects out** (no mutation, no closure) so it
  cannot desync a replay.
* **Determinism:** hooks fire in a named AD-26 phase at fixed rank; ordering is
  `(priority, registrationIndex)` — a total order (AD-25 `:295`).
* **Trust:** a first-party hook is in-process; third-party subscription is an
  E-99 concern (§3).

### 2.8 Draw/audio cue emitters — NOT A FIELD
ADR 0004 d.5 requires subsystems to **emit** `DrawCommand[]` and audio cues
(`0004...md:65-67`), and G4 forbids anything but a replay (`guardrails.md:74`).
This is a **return contract** (S8), not a registration field. There is nothing to
add to `PluginDefinition`. Recommendation: document that S3–S5 subsystem methods
return draw lists/cues; no new field.

### 2.9 Plugin-owned state — NO NEW SECTION; a namespaced slot under `vm`
AD-10 says `GameState` has **exactly** a fixed section list with one owner each
(`architecture-...md:150-158`), and AD-23 versions schemas per section (`:286-291`).
A plugin adding a top-level section would break that invariant and the
per-section migration chains.
* **Recommendation:** plugins declare state, they do not own a section. Add an
  optional declaration:
  ```ts
  interface PluginDefinition {
    state?: {
      id: string;              // namespaced, e.g. "tkreawakened.tk2-compat"
      version: string;         // schema version of THIS plugin's slot
      // the actual value must satisfy PlainData (AD-7)
    };
  }
  ```
  The bytes live in one engine-owned slot — `vm.extension[pluginId]` — owned by
  `core/script` like the rest of `vm` (AD-10 `vm` row). The section schema
  (`GameState.schema.vm`, AD-23) records `{ pluginId, version }`.
* **First consumer:** none yet — `[INFERENCE]` the first plugin to keep
  persistent state is tk2-compat (entry 15) if its adapters need memory, or the
  first E-99 sandboxed extension. **Can wait** (no field until then).
* **Snapshot rules:** the slot is plain data and must pass `canon`/`hashState`
  (AD-11 `:202`). If a save references a plugin that is not loaded, keep the slot
  as opaque residue with a `Logger` warning (AD-24) — never silently drop
  (AD-18 residue rule, `:251`).
* **Rejected:** letting a plugin own a top-level AD-10 section — breaks AD-10's
  one-owner table and AD-23's per-section chains; and it would let an unloaded
  game's save shape depend on a plugin.

### 2.10 Lifecycle / activation — DECLARATIVE, engine-decided
Legacy activation came from the game's `.gam` plugin list (format-spec §2 row 29
`format-spec.md:147`) plus `menuPlugin`/`fightPlugin`; ADR 0004 d.3 auto-activates
tk2-compat when a TK2 project loads (`0004...md:44`); Multi-Plug read a
`plugins.ini` (`zip-survey.md`, "Plugin loading").
* **Recommendation:** **no `activate()` callback**. Keep it declarative so the
  core never runs plugin code at load:
  ```ts
  interface PluginDefinition {
    activation?: {
      kind: 'always' | 'game' | 'dialect';   // 'game' = named in the .gam list; 'dialect' = TK2 detected
      // dialect ids come from the core dialect registry (§2.6)
    };
  }
  ```
  The engine decides when to register a plugin from the `.gam` list and the
  detected dialect. "Enable/disable" is a `GameSettings`/editor flag (T-14
  `editor-features.md:44`), not plugin code.
* **First consumer:** entry 15 (tk2-compat) and ADR 0004 d.3. **Can wait** — the
  compat plugin can be registered unconditionally by entry 15 and this field
  lands with the engine's game-load path.
* **Why no callback:** a load-time `activate()` would run plugin code outside a
  step, breaking G1's "no I/O or timers in core" and making activation
  non-deterministic. If a plugin needs per-game setup, it does it in a command or
  an event hook inside a step.

### 2.11 Editor-side metadata — `description` / `capabilities`, LATER
T-14 shows each plugin's self-declared description on add
(`editor-features.md:44`; recovery `plugins.md:26-30`), and the legacy type flags
were `PT_RPGCODE=1 / PT_MENU=2 / PT_FIGHT=4` (`plugins.md:18-22`;
`findings/06-plugin-sdk.md`, "Plugin kinds").
```ts
interface PluginDefinition {
  description?: string;
  capabilities?: ReadonlyArray<'rpgcode' | 'menu' | 'battle' | 'decoder' | 'dialect'>;
}
```
* **First consumers:** epic-editor-foundation main-file editor (T-14, in T-01..T-14
  scope `epic-editor-foundation.md:30`) and the LSP catalogue
  (`epic-rpgcode-tooling.md`, "hover and call tips from the built-in catalogue").
* **Can it wait?** Yes. `id` already identifies a plugin; `description` and
  `capabilities` are host-facing nicety, added by the editor epic.
* **Note:** `capabilities` is derived data — it must be consistent with which
  fields are present, and the assembly function should warn if a plugin declares
  `menu` but ships no `subsystems.menu` (`[INFERENCE]`, a lint, not a rule).

---

## 3. Trust model: reconcile ADR 0004 with AD-17 and E-99

**The conflict.** ADR 0004 d.2 says community extensions share "the exact same
runtime contract" in-process (`0004...md:27`). AD-17 makes the host boundary the
only door and routes "the E-99 extension mechanism" through `StepReport.requests`
(`architecture-...md:248`); AD-5 already lists `extension.call → extension.result`
(`:118-120`); E-99 says sandboxed, games untrusted (`engine-features.md:311`;
AD-17 `:244-248`; the spec lists it as a constraint, `spec-...md:37,93`). Entry 23
must recommend, not ask.

**Recommendation — two tiers, one command contract.**

* **Tier A — in-process `PluginDefinition` (trusted, first-party).**
  The engine's own built-ins, the domain epics' modules, and
  `@tk-reawakened/plugin-tk2-compat`. Registered by the assembly function at
  `createEngine`, fixed module order, last-registered-wins + warning (entry 3,
  `tickets.toml:45`). They may define commands, decoders, subsystems, events,
  dialects and state slots. This is exactly ADR 0004 d.2's interface — it stays.

* **Tier B — sandboxed extensions (untrusted, third-party/game-shipped).**
  The E-99 mechanism. **It is not a `PluginDefinition`.** It is a game-shipped
  manifest plus a sandboxed code environment whose *only* privilege is to be
  asked about commands:
  * The VM's extension lookup tier (AD-8 precedence `architecture-...md:140`;
    entry 3's "empty extension tier", `tickets.toml:45`) resolves an unknown
    command name to the sandbox.
  * The engine emits `extension.call { reqId, name, args }` (AD-17 `:248`; the
    payload shape is already pinned in `story-contract-types-...-plan.md:97`,
    `extension.call.name`/`args`).
  * The host runs the sandbox out-of-process/worker and replies
    `extension.result { reqId, result }` (AD-5 `:118-120`).
  * The sandbox declares the commands it answers **by name only** in its
    manifest; it cannot add decoders, subsystems, dialects, event hooks, or a
    state slot in v1. Its only interaction with state is through the recorded
    effect it returns, which the owning module validates and applies.
  * It gets no DOM, no `fs`, no timers, no host globals (G2 `guardrails.md:38-45`);
    its reach is AD-17's request vocabulary, which the engine — not the
    extension — chooses to use.

**Why this is the right cut.** It keeps ADR 0004's real achievement (one command
contract, dogfooded standard library) while making AD-17's boundary true: the
untrusted half never touches core memory. Third-party commands are "peers" at the
*script-author* level, not at the *process* level. The legacy engine's model —
dispatch an unknown command string to a plugin's `TKPlugQuery`/`TKPlugExecute`
(`zip-survey.md`, "Query/Execute protocol") — maps cleanly onto
`extension.call { name, args }` / `extension.result`, so a manifest's command
table is the modern `commandMap[]` (`findings/06-plugin-sdk.md`, "Adding RPGCode
commands") without the DLL.

**Rejected (one line each).**
* *Single in-process tier for everyone* — violates AD-17/E-99 and G2; a game DLL
  equivalent could read memory or block.
* *Make `PluginDefinition` itself the sandbox manifest* — conflates a trusted
  registration shape with an untrusted declaration; the fields (subsystems,
  decoders) are exactly the capabilities an untrusted plugin must not have.
* *Drop the in-process contract and sandbox the core built-ins too* — abandons
  ADR 0004 d.2's dogfooding and would put the whole §9.11 catalogue behind
  `extension.call`, destroying golden determinism.
* *Reintroduce a per-plugin `activate()` to gate trust* — load-time code
  execution, non-deterministic (see §2.10).

---

## 4. Design rules (adding fields without breaking, conflicts, order)

### 4.1 Field versioning and snapshots
* **Registration-only fields** (`commands`, `decoders`, `subsystems`, `events`,
  `activation`, `description`, `capabilities`) are **not state**. AD-7 rebuilds
  compiled code on restore (`architecture-...md:129-135`), so adding any of them
  is a non-breaking interface change — no schema bump. Snapshots don't contain
  plugin objects at all.
* **State-bearing fields** (`state`, §2.9) touch the `vm` section and therefore
  follow AD-23: `GameState.schema.vm` gains a record of `{ pluginId, version }`;
  a change to a plugin slot's shape bumps *that* record, and a fixture save must
  still restore (AD-23 check `:290-291`, AD-7 check `:135`).
* **The compiler version is already part of the schema** (AD-23 `:288-291`).
  A `PluginDefinition` change that changes Step IR or a `*State` type is a
  compiler/schema bump, same as any VM change.
* **Rule:** every `PluginDefinition` field is optional except `id`, `version`,
  `commands`. Fields are added by the entry that first needs them
  (`epic-rpgcode-vm.md:52`); removing a field is never done without an ADR.

### 4.2 How a plugin declares owned state
* Namespaced id + version in `state` (§2.9); bytes live in `vm.extension[pluginId]`
  owned by `core/script` (AD-10 `vm` row). Must satisfy `PlainData` (AD-7) and
  pass `canon`/`hashState` (AD-11). Missing plugin on restore → keep residue,
  warn through `Logger` (AD-24) — never drop silently.
* A third-party (Tier B) plugin gets **no** state slot in v1; it is stateless
  between `extension.call`s unless the engine later grants a namespaced slot
  (§3). `[INFERENCE]` this is the conservative first cut.

### 4.3 Conflict resolution (already decided: last-registered-wins + warning)
Jensen's ruling stands (`epic-rpgcode-vm.md:65`; entry 3 verify
`tickets.toml:46`): the later registration wins and one warning diagnostic names
both. Extend it uniformly:
* **commands** — later `name`/alias wins; warn (`command.overridden`,
  `tickets.toml:46`).
* **decoders** — same `extensions`+`detect` claim: later wins; warn.
* **subsystems** — singleton per kind: later wins; warn (there is one battle
  system per game).
* **events** — not a conflict: all hooks run, ordered by `(priority,
  registrationIndex)`.
* **state** — two plugins with the same `state.id` is a hard error at assembly
  (`[INFERENCE]` — a namespaced id must be unique; unlike commands it cannot be
  "last wins" without losing data).
* This replaces AD-8's "rejects duplicate names" (`architecture-...md:140`), which
  is already recorded as the intended amendment (`tickets.toml:45`).

### 4.4 Fixed assembly order
One pure assembly function (entry 3) builds the registry in a fixed order; the
order fixes both the override direction and the AD-9 wait-kind/event ordering:
1. **Core built-in modules**, in AD-26 phase/module rank
   (`architecture-...md:307-313`).
2. **First-party domain modules** — the epics' `builtins[]`/subsystems, in a
   documented fixed list (board, movement, audio, battle, menu, save).
3. **First-party compatibility plugins** — tk2-compat (ADR 0004 d.3).
4. **Game-declared trusted plugins** — from the `.gam` list (§2.10), in the order
   the file lists them.
5. **Sandboxed extensions (Tier B)** — last, matching AD-8's precedence
   "redirect, script function, built-in, **extension**" (`architecture-...md:140`)
   and the legacy "offered to each loaded plugin in order" behaviour
   (`zip-survey.md`).
Higher tiers can override lower ones with a warning (last-registered-wins applies
within the whole ordered list). The order is data in one place; the LSP reads the
same order (AD-8 `:140`).

### 4.5 Determinism rules for plugin content
* No `Date`, `Math.random`, `performance.now`, `Intl` — use the injected clock
  and `RngPort` (G3 `guardrails.md:57-72`; AD-12).
* Plugin callbacks (`handle`, subsystem `step`) are **pure data in, effects out**
  — no closures, no state on the object (G1 `guardrails.md:21-26`).
* Iteration uses the declared total orders (AD-25 `:295`).
* Every plugin entry point runs inside a named AD-26 phase.

---

## 5. Add-order and tickets

### 5.1 Recommended add-order (each field by the entry that first needs it)
| Order | Field | Added by | Why then |
|---|---|---|---|
| 1 | `id`, `version`, `commands` | entry 3 (built) | the only seam anything needs yet |
| 2 | `decoders` | entry 14 (sliced) | closes the AD-31 conflict and epic-2's hand-off |
| 3 | `activation` | the game-load entry (entry 15 or engine) | tk2-compat needs auto-activation from the `.gam` |
| 4 | `state` | first plugin with persistent state (tk2-compat or E-99) | AD-23 wiring only exists when something needs it |
| 5 | `subsystems.battle` | epic-battle | E-79 custom fight programs |
| 6 | `subsystems.menu` | epic-menu-party-save | E-80 replaceable menu |
| 7 | `events` | epic-movement-triggers (bus) + first subscriber | bus precedes the plugin hook field |
| 8 | `subsystems.dialogue` | board-rendering / E-96 | not sliced yet; can wait |
| 9 | `description`/`capabilities` | epic-editor-foundation (T-14) | editor-only, last |
| — | `dialects` | never (core internal registry) | see §2.6 |

### 5.2 New entries needed
Only **one** new entry is required: the E-99 implementation, which does not exist
yet. Everything else is added by an entry that already exists. Proposed in house
`tickets.toml` format (epic-rpgcode-vm):

```toml
[[entry]]
id = 24
type = "story"
title = "E-99 sandboxed extension mechanism: manifest, extension.call host contract"
description = "Implements the untrusted extension tier of ADR 0004's new decision 6 (the trust boundary): a game-shipped extension manifest that declares command names only, the VM's extension lookup tier resolving an unknown command to `extension.call { reqId, name, args }`, the host-side sandbox contract replying `extension.result { reqId, result }`, and the separation from the in-process `PluginDefinition` (Tier A). No third-party decoders, subsystems, dialects, event hooks or state slots in this entry. First consumer of the mechanism is a game-shipped command extension; the ftp/http plugin stubs of entry 22 become the first manifest's commands when it lands."
verify = "A fixture extension manifest registering `httpRead` resolves through the extension tier instead of a stub, the engine emits `extension.call` with the pinned payload shape and resumes from `extension.result`, the same command twice returns equal results and restores a snapshot taken mid-wait with an identical state hash, and no `core` package gains a host API."
covers = ["CAP-5"]
after = ["3", "14", "22"]
hitl = true
risk = "high"
references = [
  "reference - docs/engine-features.md, E-99",
  "spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-5, AD-8, AD-17, AD-24",
  "adr - docs/adr/0004-script-ast-step-ir-and-plugins.md, decision 6 (trust boundary)",
  "research - /tmp/spike-shape.md, sections 3 and 4",
  "evidence - _bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/zip-survey.md, the Query/Execute protocol and plugin inventory",
]
notes = ["Recommendation of spike entry 23; the sandbox is not a PluginDefinition. (Spike 23, 2026-10-11)"]
```

No new entry is needed for `subsystems`, `decoders` (entry 14), `events`
(movement-triggers), `activation` (entry 15) or the editor metadata
(editor-foundation) — they are added by existing epics.

---

## 6. Doc reconciliation — exact amendments

Two conflicts are recorded; both are fixed by amending **ADR 0004** (the
authoritative statement of the interface), once, in a doc-first commit (G7).

### 6.1 AD-31 vs ADR 0004 — the `decoders` field
Amend **`docs/adr/0004-script-ast-step-ir-and-plugins.md`, decision 2**. Replace
the interface block (currently `0004...md:29-38`) with:

```typescript
export interface PluginDefinition {
  id: string;
  version: string;
  commands?: Record<string, CommandHandler>;
  decoders?: AssetDecoder[];          // AD-31: dispatched by extension and magic header
  subsystems?: {
    battle?: BattleSubsystem;
    menu?: MenuSubsystem;
    dialogue?: DialogueSubsystem;
  };
}
```
and add one sentence after the block:

> `decoders` registers the `AssetDecoder` implementations of AD-31 with the core
> format registry; two decoders claiming the same extension or magic header
> resolve by the same last-registered-wins rule as commands, with a warning.

**AD-31 is not changed** — its sentence "Decoders register through the
`PluginDefinition.decoders` array" (`architecture-...md:346`) becomes true once
the field exists. Amend only ADR 0004.

### 6.2 ADR 0004 vs AD-17/E-99 — the trust model
Amend **`docs/adr/0004-...md`** in two places:

**(a) Correct decision 2's overclaim.** Change the sentence "Core commands and
community extensions share the exact same runtime contract"
(`0004...md:27`) to:

> Core commands and first-party extension plugins share the exact same in-process
> runtime contract. Command-extending third-party plugins share the same *command*
> contract (name, arguments, by-reference outputs) but are reached across the host
> boundary as AD-17 requires; see decision 6.

**(b) Add a new decision, after decision 5** (number it 6):

> 6. **Trust boundary: two tiers, one command contract.** `PluginDefinition`
>    (this decision 2, above) is the **in-process, trusted** registration shape.
>    It is used by the engine's own built-ins, the domain epics' modules and the
>    first-party compatibility plugins (`@tk-reawakened/plugin-tk2-compat`). A
>    game-shipped third-party plugin is **untrusted** (AD-17: games are untrusted
>    input) and is **not** a `PluginDefinition`: it is declared by a manifest
>    listing the command names it answers, and is reached only through the
>    engine's extension lookup tier, which emits `extension.call { reqId, name,
>    args }` and resumes from `extension.result { reqId, result }` (AD-5, AD-17).
>    In v1 a sandboxed extension registers **commands only** — no decoders,
>    subsystems, dialects, event hooks or state sections. This resolves the
>    conflict recorded in epic rpgcode-vm; the E-99 mechanism is AD-17's
>    boundary, not an in-process peer.

**E-99 (`docs/engine-features.md:311`) is not changed** — it already says
"equivalent **sandboxed** extension mechanism". AD-17 (`architecture-...md:248`)
is not changed — it already routes the mechanism through requests. The only
document that overclaimed was ADR 0004.

### 6.3 Epic notes to close
* `epic-rpgcode-vm.md:55` — mark the source conflict resolved by decision 6, and
  the open question at `:56` answered (trust model = two tiers, §3).
* `epic-legacy-formats.md:50` — mark the AD-31 conflict resolved by the decision-2
  amendment (§6.1).
Both are housekeeping notes on the entries that recorded the conflict; the
authoritative fix is the ADR 0004 commit.

---

## 7. Rejected options (one line each)
* **One in-process tier for all plugins** — breaks AD-17/E-99 and G2.
* **`PluginDefinition` *is* the sandbox manifest** — mixes trusted capabilities
  (subsystems/decoders) into the untrusted half.
* **Per-plugin `activate()`/`deactivate()` callbacks** — load-time code, breaks
  G1 determinism.
* **Plugins own top-level AD-10 sections** — breaks the one-owner table and
  AD-23 per-section chains.
* **`dialects` as a plugin field now** — no consumer; puts a compiler seam in the
  untrusted half; core-internal registry suffices.
* **Duplicate rejection for commands (AD-8 status quo)** — already overturned by
  Jensen's last-registered-wins ruling (`epic-rpgcode-vm.md:65`).
* **Per-plugin arbitrary state shape without a schema record** — a save could not
  report an out-of-date plugin slot; violates AD-23.

---

## 8. Digest (10 lines)

1. `PluginDefinition` stays the **in-process, trusted** shape (`{ id, version,
   commands?, decoders?, subsystems?, events?, state?, activation?, description?,
   capabilities? }`); no field breaks a snapshot because AD-7 keeps plugin code
   out of state.
2. Seam inventory: 13 seams — commands, decoders, subsystems×3, dialects, events,
   draw/cue emission, state, lifecycle, editor metadata, wait kinds, sandbox;
   draw/cue, wait kinds and dialects are **not** fields.
3. **`decoders` comes next** (entry 14), then `activation` (entry 15), then
   `subsystems` by the battle/menu epics, then `events`, then editor metadata;
   `state` only when a plugin needs memory; `dialects` never (core-internal).
4. Trust: **two tiers, one command contract** — first-party is in-process
   `PluginDefinition`; third-party is a sandboxed manifest reached through
   `extension.call`/`extension.result` (AD-5/AD-17) answering **commands only**.
5. Amendment 1: add `decoders?: AssetDecoder[]` to ADR 0004 decision 2 (AD-31 is
   unchanged; only ADR 0004 overclaimed by omission).
6. Amendment 2: soften ADR 0004 d.2's "community extensions share the same
   contract" and add **decision 6** stating the trust boundary verbatim (§6.2).
7. Conflicts stay last-registered-wins + one warning (already ruled); subsystems
   are singletons, events are all-run in `(priority, registrationIndex)`, and a
   duplicate `state.id` is a hard error.
8. Assembly order is fixed: core modules → domain modules → compat plugins →
   game-declared trusted plugins → sandboxed extensions (matches AD-8 precedence).
9. Owned state is a namespaced slot `vm.extension[pluginId]`, versioned in
   `GameState.schema.vm` (AD-23), residue-preserved with a warning if unloaded.
10. **One new entry (24)** implements the E-99 sandbox; slot it after 3/14/22;
    everything else is added by an entry that already exists.
