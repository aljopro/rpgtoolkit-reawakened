# Plugin-defined editors: battle systems, menus, and other extensions

**Origin.** Jensen, 2026-10-17: "The battle system plugins nearly are going to need to be custom editors themselves or we are going to need something robust for them." Treated as **Decided in direction** (the problem is real and must be designed, not deferred). Everything below is **Proposed**.

## Why this is a real problem

The legacy engine has **no built-in menu and no built-in battle screen**; both are plugins (`docs/spec/engine/plugins-and-battle.md`). The engine keeps the battle **model** (charge, damage, status effects, AI decisions) and the plugin owns the **loop and the UI**. The menu plugin "draws its own UI" for four requests: main menu, inventory, equipment, abilities. Reawakened's rule is one plugin contract used by the engine's own packs and by third parties alike, with the stock menu and battle **reimplemented natively** (E-99; ADR 0004, "Dogfooded Standard Library as Plugins", and "Typed Subsystems Emitting Draw Lists", which names battle, menu and dialogue subsystems and says replacements could be "Turn-based vs. Active Time vs. Tactical Grid").

Consequences for the editors:

1. **The Database needs extension points, not an entirely generic replacement.** Shared character/item/enemy fields keep their coherent hand-designed UI. A selected battle system may contribute extra data, specialised previews and whole editors where forms are insufficient. Tactical-grid support is an illustrative stress test, not a promised built-in system.
2. **Menus and battle screens are layouts**, which are best edited visually (the same need as the "screen designer" in `flows/02`).
3. **A plugin's commands** must show up in the block palette and in script completion (see `flows/08`, scenario B).
4. **ADR 0004's plugin contract has no editor surface.** `PluginDefinition` lists `id`, `version`, `commands`, `decoders` and `subsystems`; nothing declares asset kinds, fields, editors, previews or migrations. That is the gap.

## Jobs

- "Pick a battle system for my game" (and see what that changes in my project).
- "Edit my enemies and moves" whichever battle system I picked.
- "Redesign my battle or menu screen" visually.
- "Add a pack that adds elements/classes/crafting" and find its data in the Database.
- (Plugin author) "Ship a plugin whose data authors can edit without me building a whole editor".

## Legacy flow and where it hurts

| Step | What happens | Problem |
|---|---|---|
| Choose menu and battle plugins | The main file stores plugin names; legacy T-14 also provides a description when adding a plugin | D: a description alone cannot communicate all editing requirements |
| Plugin-specific data or extra tooling | [INFERENCE] Extension-specific data may need its own tooling; the legacy spec does not establish every plugin's file convention | The new contribution model must state ownership and discovery rather than assume it |
| Battle UI | The plugin draws its own screen | [INFERENCE] A specialised layout/fixture editor could shorten iteration; a separately launched battle test is not evidence that authors must run the entire game |
| A project uses a plugin you do not have | Missing file at runtime; without a menu plugin the menu key does nothing; without a battle plugin battles end immediately (spec) | S: silent failure, no warning at edit time |
| Enemy and move data are interpreted by whichever battle plugin runs | Same files, different meanings | S: the editor cannot tell the author what a field does under the chosen battle system |

## Redesigned flow

### 1. Three levels of editor support, chosen by the plugin author

| Level | What the plugin ships | What the author gets | Cost for the plugin author |
|---|---|---|---|
| **L0: typed commands** | Available command descriptions plus a **proposed authoring descriptor** for labels, units, pickers and examples where needed | Completion from the command catalogue; generic action controls where typed arguments suffice. Handwritten code remains first-class | Data descriptors; current runtime signatures alone do not encode all good UX |
| **L1: declarative contribution** | Namespaced data fields/kinds, defaults, ranges, references, visibility conditions, validation diagnostics and optional authoring descriptors | Integrated Database sections using the editor's normal controls, search, reference review and undo | Start with a small validated schema vocabulary; executable validation is plugin code, not “safe data” |
| **L2: specialist panel** | A custom editor for tasks forms do not express well: battle layout, formation, targeting pattern or tactical arena | Opens in the normal workspace and uses the shared document/command/preview services | Purpose-built UI, with a contract for activation, persistence and host compatibility |

**Dogfood the contract.** The stock battle/menu tooling should use the same documented contribution hooks. That does not require converting every carefully designed stock form into a schema-generated form. First implement only what the stock editing flow and one deliberately different example need; avoid a speculative universal UI framework.

### 2. A fixed widget set keeps schema forms from feeling generic

L1 forms are built from a finite set of `editor-ui` widgets the schema names, so plugin authors get beginner-friendly controls without writing UI:

number with units and range slider; choice in plain words; yes/no with a one-line consequence; asset picker with thumbnail and "create new..."; list of rows; **sentence list** ("Takes [50]% less [fire] damage"); **curve** (growth over level); **compass** (eight directions); **colour**; **key press capture**; **script/blocks slot** (a trigger-style When/Then, reusing `flows/02`); **preview panel** bound to a subsystem fixture.

[INFERENCE] This set covers the stock battle plugin's forms and most third-party data; anything beyond it is an L2 panel.

### 3. Choosing a battle or menu system

1. **Project settings > Plugins** lists installed packs with name, one-line description, screenshots and the asset kinds each adds (generated from the manifest). A **Battle system** chooser and a **Menu** chooser sit at the top (Classic is the default, per `flows/08`).
2. Choosing a system **changes the Database immediately**: that system's kinds appear; kinds it does not use are marked "unused by this battle system" and stay in the project, untouched.
3. Before switching, show the effective subsystem and contribution order, affected assets and any declared conversion. Only explicit confirmation changes the selected configuration. Switching alone never rewrites data; a conversion is a separate reviewed transaction with backup and failure rollback.

### 4. Menus and battle screens as layouts

- Reuse a **Layout designer** interaction vocabulary for menu, battle and custom screens where useful; do not assume every battle subsystem is editable as a generic rectangle layout.
- The stock designer can offer text, image, bar, list, button and portrait pieces bound to named **read-only preview data**. Layout is distinct from combat rules: moving a bar does not change damage, AI or turn scheduling.
- **Preview through the real subsystem**, supplied with a saved or explicitly temporary fixture through a future preview adapter. G4 supplies draw-list replay, but **does not itself provide** fixture construction, tick advancement, audio, pause or cleanup. These belong in the contribution proposal.
- The four stock menu screens (main, inventory, equipment, abilities; E-80) are candidate layout documents. Their editability is proposed capability, not a fact about the current implementation.

### 5. Preview, test and balance contract

A contribution's **Test** command resolves the required assets, prepares a named test scenario (party, enemies, seed), requests the real runner through platform-services, and owns start/stop/error cleanup. A static layout preview and an executing fight are separate controls. Test-specific parameters, outcomes and trace capabilities need an adapter per system; `run.startGame` alone does not prove these interfaces already exist. An optional analysis can report measured seeded outcomes. Never apply stock formulas to a different ruleset or promise a win-rate simulator without an input/AI policy.

### 6. Data ownership, versions and unknown plugins

- Plugin-owned data needs a namespaced owner, version and migration policy. This is proposed extension of the project's schema discipline, not an existing plugin-asset API.
- When a plugin is missing, preserve its data. Plugin-owned fields/panels become inspectable or read-only with **Add plugin / Keep data** actions. Shared fields can remain editable only where doing so demonstrably preserves the unknown extension data; avoid making every enemy unusable because one optional field provider is missing.
- Missing legacy replacements are visible compatibility issues in all hosts. A native DLL cannot be loaded by choosing Desktop.

### 7. Trust and hosts

ADR 0004 accepts one ungated plugin contract for now. **Do not introduce first-party/third-party trust tiers by implication.** Custom UI must still obey G2 and the host CSP. Worker isolation can host computation, not a DOM editor; a frame/component strategy and its document-service bridge need a real host spike. Isolation may improve fault containment but is not a security guarantee or an accepted permission system. Any changed trust policy needs its own architectural decision.

### 8. Shared document-service contract (proposed, no new public API yet)

| Concern | Required behaviour |
|---|---|
| Opening | Select a provider by document kind/schema and effective plugin composition; ambiguous ownership produces a diagnostic, not an arbitrary editor |
| Reading | Provide a versioned document snapshot plus read-only project/asset context; no private host filesystem access |
| Editing | Submit labelled serialisable commands through editor-model; no direct model mutation, file writes or hidden history |
| Validation | Located diagnostics point to the exact field/object; structural schema checks are data, custom validators are explicit executable contributions |
| Multi-document edits | Use a reviewed transaction/checkpoint contract before claiming one undo for a generated script plus board change |
| Saving | Host DocumentController remains responsible for save, backup, revert and external changes; custom panels cannot bypass it |
| Preview | Fixture preparation, real subsystem execution, draw/audio replay and cancellation are declared capabilities, not copied battle logic |
| Removal/failure | Preserve records and drafts, stop preview execution, close/recover failed views without deleting their data |
| Migration | Preview version changes and affected assets; retain recoverable originals and fail atomically rather than half-upgrade |
| Both hosts | Same contribution works in the standalone UI and VS Code webview, or an honest capability diagnostic explains the limit |

## Scenarios walked

### A. A beginner switches from Classic battles to an installed "Tactical grid" pack

| Step | Flow | Covered? |
|---|---|---|
| 1 | Project settings > Plugins > Battle system > Tactical grid | Yes |
| 2 | Database gains **Maps** and **Unit classes**; Enemies show a new "Grid movement" box | Yes (L1 extension fields + new kinds) |
| 3 | Existing enemies have no grid stats | **HOLE:** defaults must be valid or flagged. Fix: plugin schema defaults; Problems lists enemies "missing grid movement" with Fix |
| 4 | Board random encounters still point at enemy lists | **HOLE:** a grid battle needs a map, not a background. Fix: the plugin's schema replaces the encounter's "background" with a map picker; the editor shows "this system needs a map for each encounter" |
| 5 | Press Test in battle | Covered by fixtures (needs a fixture per plugin) |
| 6 | Switch back to Classic | Covered: no rewrite; grid data kept as unused |

### B. A plugin adds "elements" to enemies and moves

| Step | Flow | Covered? |
|---|---|---|
| 1 | Add plugin; it declares an **extension field** "element" on enemy and move kinds | Yes |
| 2 | Enemy form shows an Element picker below the stock fields | Yes |
| 3 | Two plugins extend the same kind with the same field name | **HOLE:** ADR 0004 defines last-wins for commands, not for fields. Fix: namespaced fields (`pluginId.field`), shown grouped by plugin |
| 4 | A stock "weakness" row should now use elements | **HOLE:** stock schema must expose extension points, not only be extended. Fix: the stock battle schema declares slots ("resistance sources") that other plugins can fill |
| 5 | Uninstall the plugin later | Covered: data read-only and kept |

### C. Redesign the battle screen

| Step | Flow | Covered? |
|---|---|---|
| 1 | Open the battle layout from the Battle system page | Yes |
| 2 | Move the party list to the right, add a portrait | Yes (Layout designer) |
| 3 | Preview with a three-enemy fixture | Yes (draw list) |
| 4 | Layout text overflows at a long enemy name | **HOLE:** layouts need a **worst-case data preview** (longest names, max party). Fix: fixture variants "Worst case" |
| 5 | Play a real fight | Covered by Play (save first) |

### D. Legacy project with a native menu plugin that has no equivalent

| Step | Flow | Covered? |
|---|---|---|
| 1 | Import; plugin name unmatched | Yes |
| 2 | Menu key does nothing in the new runner (spec: without a menu plugin it does nothing) | **HOLE:** silent. Fix: Problems error "No menu system: the menu key will do nothing. Choose Classic menu"; offered at import with Classic as a one-click default |
| 3 | The plugin's command calls in scripts | Covered: unknown command Problems with the plugin name if recoverable |

## Holes found and fixes

1. ADR 0004's `PluginDefinition` needs **asset kinds, extension fields, editor panels, fixtures, analyses and migrations** (or a sibling "editor contributions" document in the manifest); until then the enemy/move/status editors risk being built hard-coded.
2. Field-level conflict rules for extensions between plugins (namespacing and grouping).
3. Stock schemas must publish **extension slots**.
4. A missing battle or menu system must be an **edit-time error**, not a silent runtime no-op.
5. Layout designer needs worst-case previews and data bindings named in plain words.
6. Trust and isolation for L2 panels.

## Data and native-format implications

- **Plugin-owned assets may need additional versioned storage**, but that does not select a new format. Use existing records when adequate, namespaced extension data when sufficient, and a new document kind only when the model requires it. ADR 0005 still governs a native-format decision.
- **Schema as data:** an L1 schema is plain data, so it can be validated in CI, rendered in documentation, and diffed (G5-friendly).
- **Determinism (G3):** a fixture run must be reproducible from data plus seed; analyses use the injected RNG only.
- **Epic effect:** this belongs **before** the enemy/special-move/status editors are built (editor-p1) and before the battle epic freezes the data model. Epics epic-battle and epic-menu-party-save own the subsystems; editor-foundation owns the panel host and platform-services; the contributions contract needs an owner (likely an ADR amending ADR 0004).

## Challenges to earlier decisions

- The enemy/move/status flows in [Database](04-characters-items-database.md) and [Battles](06-battle-and-effects.md) remain the coherent stock experience. Add **contribution hooks and specialist panels** around that shared foundation rather than making all Database data owned exclusively by the selected battle plugin.
- `flows/08-project-file-by-convention.md` describes the Plugins list as "plugin added shows description and what it adds". Under this design "what it adds" is generated from the plugin's declared asset kinds and commands.
- The decision "complete editing capability" now includes **editing whatever the chosen plugins define**.

## Open questions for the owner

1. **Contract ownership.** Should an ADR amend ADR 0004 to add editor contributions to `PluginDefinition`, or should editor contributions live in a separate manifest section? Recommended default: a separate, versioned `editor` contributions section of the same plugin manifest, so runtime and editor concerns stay separable.
2. **Panel hosting:** component, isolated frame or a combination? Recommended default: keep the existing one-contract trust policy; spike the same contribution under standalone and VS Code CSP before selecting a host strategy. No special stock-only API or invented trust tier.
3. **Is L1 (declarative schema) the beginner default for third-party plugin authors?** Recommended default: yes; promote it in plugin documentation and starter templates.
4. **How to prove extensibility?** Recommended default: exercise stock tooling and a small authored contrast fixture (for example formation editing plus a field extension) before freezing the contract. This does not add a second full battle system to product scope.
5. **Menus and battle layouts: one Layout designer or two?** Recommended default: one panel, many layout documents.
6. **Where does the "Classic" label live?** Recommended default: Classic is the stock pack's display name; the product never calls it "default plugin" to a beginner.

## Sources

- `docs/spec/engine/plugins-and-battle.md` (plugin roles, menu requests, battle protocol and model, E-70 to E-82, E-99), `docs/spec/formats/enemy.md`, `battle-data.md`.
- ADR 0004 (PluginDefinition, subsystems, manifest, order and overrides), ADR 0005, `docs/guardrails.md` (G2, G3, G4, G5, G6), architecture spine AD-18, AD-19, AD-20, AD-23 and the review notes on webview CSP.
- `flows/02`, `04`, `06`, `08` and `evidence/command-census.md` in this folder.
