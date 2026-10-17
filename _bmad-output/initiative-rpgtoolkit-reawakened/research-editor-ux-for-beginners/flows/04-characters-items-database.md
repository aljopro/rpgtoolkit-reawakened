# Characters and items: flows for beginners

This document proposes a TKR Database for player characters, People, items, enemies, moves, effects, and backgrounds. A Person is stored using the item-compatible model and edited in Database > People; placed People may have local dialogue/route overrides. Items are reusable definitions. Chest and Pickup are placed board Things that refer to item definitions, not item kinds.

The Database is one master-detail editor with Characters, People, Items, Enemies, Moves, Effects, and Backgrounds. All specifics here are conservative research recommendations, not approved implementation decisions. The legacy guide is UX motivation only, not normative implementation authority; promote any missing behavioral requirement through `docs/spec` or `docs/editor-features.md` before implementation.

## Jobs

Authors say:

- “Make the hero who starts my game.”
- “Give the hero a face, a walking look, battle looks, sensible starting numbers, and a sword.”
- “Let the hero learn Fire at level five, or when a quest variable says so.”
- “Make the hero grow in a way I can see, not by guessing at a number field.”
- “Decide which body slots this character can use.”
- “Make a healing potion that works in the menu and battle.”
- “Make an item I can put on a board as a pickup.”
- “Make a chest that gives me a key item and cannot be dropped.”
- “Raise every potion price by ten percent without opening them one at a time.”
- “Open an old character and understand what it already does.”
- “Rename a character or item without breaking boards, scripts, menus, or equipment.”
- “Find everywhere this character, item, move, image, animation, or program is used.”

A first project needs one additional job: “Start with a default hero and party without learning what a main file is.” A project may begin with a default hero, a start board, and a starter library, subject to the licence gate: bundled art, sound, fonts, and samples MUST be CC0 or Bronze-or-better on the Blue Oak list and MUST appear in `THIRD_PARTY_NOTICES`.

## Legacy flow and where it hurts

The legacy guide describes three separate form families. A character starts in a small Stats/Advanced window, then opens modal dialogs for profile, graphics, special moves, equipment, and levels. An item starts with four usage checkboxes and opens a modal editor for each checked use. The author saves before project-wide setup; a saved character is then selected in the Main File editor as the initial character. The old enemy workflow explicitly required saving before its “add to game” jump to the Main File fighting table.

| Step | What happens | Problem: D=discoverability / S=safety |
|---|---|---|
| 1 | Choose New/Open Player or Item from a file-oriented menu and land in an MDI document. | D: the job is “party member” or “healing potion,” but the entry point is a file type. S: duplicate documents can represent one file. |
| 2 | Character Stats shows name, starting experience, health, max health, DP, FP, SMP, max SMP, and level. Empty name is displayed as a placeholder-like “Undefined.” | D: DP, FP, and SMP are unexplained abbreviations. S: health can exceed max health; no range validation. |
| 3 | Advanced/Variables exposes nine variable names and Default checkboxes. Defaults are derived from the character name. | D: beginners cannot tell why variable names matter. S: renaming can change runtime variable identity; loaded files can look unlike their default state. |
| 4 | Click a profile preview or Profile to browse an image or tile reference. | D: portrait is separate from the walking and battle looks. S: a missing portrait is not surfaced as a menu consequence. |
| 5 | Open Graphics. Select directional rows, browse each animation, optionally use a filename wizard, then edit idle files, timing, custom stances, and collision/activation polygons. | D: eight directions, two timing values, two polygons, and stance names appear at once. S: the wizard does not verify generated files; missing directions rely on runtime fallback. |
| 6 | Open Special Moves. Pick one of up to 200 visible numbered slots, select a move, then open Details for experience, level, or variable unlock conditions. | D: numbered empty slots and “None” make the task look like inventory administration. “Or” semantics are easy to miss. S: the file has slot zero but the UI hides it; numeric fields have no limits. |
| 7 | Open Equipment. Tick six standard slots and name up to ten accessory slots. | D: a character’s available slots are detached from the item’s allowed slots. S: mismatches are discovered only while trying to equip. |
| 8 | Open Levels. Enter first-level experience, growth amount, maximum level, exponential/linear mode, four stat increments, and an optional level-up program. | D: a number does not show the resulting curve. “Level type” is an ambiguous historical label. S: no bounds or preview; the documented legacy experience arithmetic is inconsistent. |
| 9 | Save the character, then visit project-wide settings to choose the initial character. | D: “who is the player?” is not owned by the character page. S: editing a character does not make it the project start character. |
| 10 | Item main window has handle, description, Equipable/Menu-Driven/Board-Driven/Battle-Driven checkboxes, prices, key item, and allowed-character controls. | D: “Board-Driven” is an implementation flag, not “Pickup” or “Chest.” S: leaving a flag off makes a board placement silently lack its linked program. |
| 11 | Open Equipable, Menu, Board, or Battle dialog only after ticking its checkbox. | D: useful fields are hidden behind four unrelated modal doors. S: child dialogs write directly; some child edits have no Cancel. The same animation field is shared by equip-hand and battle use. |
| 12 | Item graphics mirrors much of character graphics, but has no character battle rows. | D: duplicate concepts are presented differently. S: timing field order differs between character and item native layouts. |
| 13 | Choose an item as a board sprite separately, then set placement and overrides on the board. | D: the item definition and the placed pickup/chest are confused. S: board-level programs can override definition defaults; the author may edit the wrong place. |
| 14 | Use menu/battle systems that read portraits, usage flags, prices, key-item state, permitted characters, equipment slots, stat effects, and use programs. | D: the editor does not show what the default menu will actually offer. S: a key item is only a flag; it does not itself create a quest rule. |
| 15 | Rename a file in the project tree with a warning that references are not updated. | D: “safe rename” is unavailable. S: links in boards, scripts, party setup, and inventories can break. |

## Redesigned flow

The Database is one editor tab, not a collection of file editors. The left master list is filterable, sortable, grouped by type, and supports multi-select. The right detail page is a set of grouped boxes. The selected records remain visible while editing; no modal child window is needed.

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ DATABASE [Characters] [People] [Items] [Enemies] [Moves] [Effects] [Backgrounds]   │
├──────────────────────┬─────────────────────────────────────────────────────────────┤
│ + New ▾   Duplicate as…  Compare  Edit selected                         Problems  │
│ Filter: [all ▾] [used ▾] [missing links ▾]                                  │
│ Characters (3)       │  Hero                                      ● saved        │
│  ★ Hero              │  Party member · Used in 2 places · ID hero-…             │
│    Healer            │  [Template ▾] [Rename safely] [Where used (2)]            │
│ People (3)           │                                                               │
│    Old Man           │  ┌─ Summary ─────────────────────────────────────────────┐  │
│ Items (8)            │  │ Name [Hero]  Description [A brave…]  Kind [Equipment] │  │
│  Equipment (3)       │  │ Tags [starter]       Add to game ▾                   │  │
│    Iron sword        │  └────────────────────────────────────────────────────────┘  │
│  Consumable (4)      │  ┌─ Images ─────────────────────────────────────────────┐  │
│    Healing potion    │  │ Portrait [image]  Walking look [preview]              │  │
│ Enemies (2)          │  │ Battle looks [Attack] [Defend] [Special] [Die] [Rest]│  │
│ Moves (5)            │  │ Idle / direction / custom look links                 │  │
│ Effects (2)          │  └────────────────────────────────────────────────────────┘  │
│ Backgrounds (1)      │  ┌─ Stats ─────────────┐ ┌─ Growth ────────────────────┐  │
│                      │  │ Health 30           │ │ level 1 ────╮               │  │
│                      │  │ Maximum health 30   │ │ Health line  ╰── level 20  │  │
│                      │  │ Attack 7             │ │ resulting-value table      │  │
│                      │  │ Defence 4            │ └────────────────────────────┘  │
│                      │  │ Special energy 5    │                                  │
│                      │  └─────────────────────┘ [Save] [Play from here]          │
└──────────────────────┴─────────────────────────────────────────────────────────────┘
```

The exact boxes change by selection, but their order is stable: **Summary**, **Images**, **Stats or usage**, **Growth**, **Traits/effects**, **Equipment or board use**, **Programs**, **Related**. Empty boxes explain what they enable and offer one action. Empty fields show a grey placeholder such as *not set*; “None” is never stored or shown as a value.

### Character flow

1. Select **Characters > + New**. Offer **Warrior**, **Mage**, **Slime**, or Blank. The template preview states what it creates; **Duplicate as…** keeps the source unchanged and asks whether the copy is a new identity.
2. Start at Summary: name, display name, description, role tag, and “Used in” links. The name is a stable ID-backed handle; changing its display name does not change references. A handle change uses a preview of every affected board, script, party, and item link.
3. Images is one box for portrait, walking looks, idle looks, battle looks, custom stances, and the live preview. Assign a complete set from a sheet, pick individual animations, or import. Missing required looks are red beside the missing direction, not discovered in Play. The editor offers fallback explicitly, with a preview of the direction that will be reused.
4. Stats uses plain words: **Health**, **Maximum health**, **Attack**, **Defence**, **Special-move power**, **Maximum special-move power**, **Level**, and **Experience**. A help sentence explains each. Starting health cannot exceed maximum health without an explicit “allow temporary over-cap” action [INFERENCE].
5. The Variables subsection is advanced and collapsed. It shows the nine runtime variable bindings, explains that scripts use them, and offers “Regenerate defaults” only after a diff preview. A rename warning says that variable references in RPGCode may need review.
6. Special moves is a searchable list, not 200 numbered slots. **+ Add move** selects a `.spc` record and writes a sentence such as “Learn **Fire** when experience is at least 100 **or** level is at least 5 **or** `quest_fire` equals `1`.” The sentence has dropdown blanks and a clear “Always available” choice. Duplicate moves and missing links are flagged near the row.
7. Equipment shows the six standard slots and up to ten named accessory slots as capability chips. A row says “This character can wear: head, neck, left hand…” and links to items that fit. A comparison view shows character slots beside selected equipment slots before an author tries to equip it.
8. Growth has sliders or direct numeric controls for first level-up experience, per-level experience growth, maximum level, and linear/percentage mode. The chart and level table update immediately. Plain labels say “Increase maximum health by 10% each level” or “Increase maximum health by 3 points each level.” A warning appears when the imported legacy arithmetic cannot be represented exactly; the stored legacy values remain intact until the author chooses an upgrade.
9. Level-up program is a linked program row with **Open**, **Replace**, **Create generated program**, and a preview of its trigger (“runs when this character gains a level”). The link is not silently copied or rewritten.
10. **Add to game** is a context action in Summary and Related: “Set as player character,” “Add to starting party,” “Add to project party roster,” and “Place on board.” These actions edit the project setup through the same command stack. The page always shows whether the character is the player, in the starting party, or only available to scripts.

### Item flow: approachable kinds; board Things are separate

The New Item picker offers **Consumable**, **Equipment**, **Key item**, or **Advanced item**. All use the same detail model; a kind changes first-run fields without discarding underlying `.itm` data. **Chest** and **Pickup** are not item kinds: place them from the board Things gallery and link their contents/target to item definitions.

- **Consumable** starts with menu/battle use, stat effects, consumption rule, usable-by list, and price.
- **Equipment** starts with an equipment slot, stat effects, usable-by list, price, and equip/remove programs.
- **Key item** starts with protected-drop explanation, menu/battle use, and price.
- **Advanced item** exposes all four uses: equip, menu, board, and battle.

Chest one-time behavior can use the existing conditional activation/run-once trigger and a persistent variable (E-44); contents are item references. A generated trigger is an optional convenience, not a new runtime prerequisite. A beginner shop can call the existing `callshop` behavior using stock definitions; do not claim that no shop action exists.

The Summary sentence reports the result: “**Healing potion** costs 25 gold, is usable by **Hero** and **Healer**, restores **50 health** from the menu and battle, and is consumed after use.” Every enabled use has a visible card; disabled uses do not hide data silently and can be enabled with one click.

Usage cards:

- **Equipment:** allowed body slots, named accessory slot, **Health/Defence/Attack/Special-move power** modifiers, equip/remove programs, and the shared animation link. Effects use sentences: “While equipped, Attack is increased by 3.” Resistances and other traits use the same list pattern: “Takes 50% less fire damage.”
- **Menu:** health and special-move changes, use program, consumption rule, target rule, and menu preview. The default menu uses this card for use/info/drop; key items have drop disabled.
- **Board:** default continuous program, pickup/activation program, collision and activation shapes, loading condition, and a **Place on board** button. A board instance panel clearly marks overrides, so authors know whether they are changing the reusable item or this chest/pickup.
- **Battle:** target health and special-move changes, use program, animation, consumption rule, and battle preview. Explain that the default battle UI consumes a battle-usable item and applies these changes.
- **Economy and access:** buy price, sell price, key item switch, and a usable-by list with “All characters” as a choice rather than a special numeric state. A key-item explanation says it prevents dropping in the default menu; it does not create a quest condition by itself.
- **Images:** reuse the single Images box. For items, walking/idle/custom looks are available; the shared legacy animation link is shown once with a warning if equip-hand and battle contexts would use the same file.

### Interaction rules

- Every edit is an `editor-model` command with a human label, undoable in the common history. Hosts own save timing and backups under AD-19; `editor-ui` uses platform-services only under AD-20.
- Multi-select edits are explicit. The toolbar says “Editing 6 items” and shows a preview table before applying. For a ten-percent price increase, show old price, new rounded price, and sell-price policy separately; Apply is one undo step.
- Comparison tables show selected characters or items side by side, with differences highlighted. A comparison is read-only until the author chooses **Edit selected**.
- Stable IDs and a project reference graph power **Where used**, safe rename, safe delete, and missing-link diagnostics. Scripts are only rewritten when the reference analyser can identify the link; otherwise show a review list.
- Programs, animations, portraits, and special moves are links with Open/Replace/Create actions. Pickers are folder-aware and copy external files into the project with a licence warning when appropriate.
- Plain numbers always include units or words: “25 gold,” “50 health,” “3 points per level,” “10% per level,” and “0.05 seconds per movement frame.”
- Runtime-sensitive values that are genuinely empty use *not set* as presentation and an absent/empty representation appropriate to the model. “None” is not a value.
- Validation runs at the cause: unresolved image, missing move, impossible slot pairing, invalid growth range, or an item enabled for no use gets a nearby message and a Problems entry. Save remains atomic and recoverable.

### Party and project setup

A **Party setup** page owns the player character, starting party, inventory, and equipment. The board owns its start marker; Project settings displays the effective starting board/marker read-only with a jump to the owning board. Settings may show the resolved party read-only with a jump to Party setup. Multi-member party data requires the native model or generated startup code such as `addplayer`; legacy `.gam` stores only one `initChar`.

The onboarding path may create a default hero and start board where a licensed starter template provides them. Party setup is reachable from Database and project settings. “Set as player” and “Add to starting party” open the owning setup and show the destination; they do not write duplicate settings.

## Scenarios walked

### (a) Create the hero with a sword that raises attack and a healing potion

| Step | Flow | Covered or Conditional |
|---|---|---|
| 1 | New project creates Hero and provides party setup. | Conditional: starter templates follow catalog `flows/03-tiles-and-art-sources.md`; party list requires native data or startup code. |
| 2 | Open Hero, choose a catalog template, set name and plain-word stats. | Conditional on template assets; proposed UI. |
| 3 | Assign portrait, walking set, and battle looks. | Conditional on licensed assets and image-editor capability. |
| 4 | Confirm equipment capabilities; create Sword with Attack bonus. | Conditional on active runtime plugin. |
| 5 | Create Healing potion as Consumable and configure menu/battle effects. | Covered as proposed interaction. |
| 6 | Preview menu/battle behavior. | Conditional on active plugin capabilities. |
| 7 | Add Sword and potion quantity in Party setup. | Conditional: legacy `.gam` has no starting inventory; native data or generated startup code is required. |
| 8 | Save and Play. | Conditional on canonical Play contract in `flows/07`; runtime behavior requires implementation. |

### (b) Create a shop’s stock and a treasure chest with a key item

| Step | Flow | Covered or Conditional |
|---|---|---|
| 1 | Create item definitions, prices and access restrictions. | Covered as proposed Database interaction. |
| 2 | Configure shop stock using existing `callshop` action and stock list. | Conditional: stock authoring UI is not specified here; no missing-shop assertion. |
| 3 | Place a Chest Thing and link appearance and contents to item definitions. | Conditional on board Things and instance-link editing. |
| 4 | Add a Key item and mark it protected from dropping. | Covered by default-menu key-item rule. |
| 5 | Use conditional activation/run-once and a persistent variable to award contents. | Conditional on authoring/persistence of referenced trigger/program; no new runtime semantics asserted. |
| 6 | Review item references. | Conditional on reference-graph implementation. |

### (c) Rebalance: raise all potion prices 10% and change level growth for two heroes

| Step | Flow | Covered or Conditional |
|---|---|---|
| 1 | Filter Items by tag/name “potion,” select all, compare/edit. | Conditional on Database implementation. |
| 2 | Increase buy prices 10% with old/new values and rounding preview. | Conditional: rounding behavior needs an explicit rule. |
| 3 | Choose independent buy/sell price operations. | Conditional on owner policy for rounding/linking. |
| 4 | Apply and inspect Problems. | Conditional on command stack and validation. |
| 5 | Compare/edit growth for Hero and Healer. | Conditional on multi-edit implementation. |
| 6 | Inspect level tables and undo changes. | Conditional; one cross-document undo requires an AD-19 transaction contract. |
| 7 | Confirm level-up program links. | Conditional on reference graph. |

### (d) Open a legacy project’s character and see what the Database shows

| Step | Flow | Covered or Conditional |
|---|---|---|
| 1 | Import a legacy project and choose a character. | Conditional on importer; legacy import is not a native-model implementation guarantee. |
| 2 | Inspect values, bindings, moves, growth, images, timings and polygons. | Conditional on importer and detail-editor implementation. |
| 3 | Inspect missing-animation fallback. | Conditional on diagnostics implementation; runtime fallback remains a spec fact. |
| 4 | Inspect legacy move slots and metadata. | Conditional on import ledger. |
| 5 | Review legacy variable bindings before regeneration. | Conditional on editor implementation. |
| 6 | Review version and unmodeled bytes; preserve residue on read. | Conditional on AD-18 reader behavior; no legacy write-back is promised. |
| 7 | Choose character/player party relationship. | Conditional on proposed Party setup; multi-member party needs native data or generated startup code. |
| 8 | Resolve conflicting path/index references. | HOLE: define index-to-ID migration diagnostics. |

## Holes found and fixes

1. **Starting inventory and shop stock are distinct.** Party setup owns starting items; legacy `.gam` does not store them, so native data or generated startup code is required. Item prices do not define shop stock; the existing `callshop` action can call a stock list, but a dedicated stock editor remains unspecified.
2. **Chest and Pickup are board Things, not item kinds.** A Chest Thing refers to item definitions and can use the existing conditional activation/run-once trigger with persistent variable state (E-44). Contents, placement and program authoring remain conditional on board Things/link tooling; no new component runtime prerequisite is asserted.
3. **Sell-price policy is underspecified.** Recommended default: increase buy and sell prices independently, with an explicit operation chosen for each. Never silently derive one from the other.
4. **Legacy slots and stable IDs need an import ledger.** Keep original special-move slot, item index, and path as metadata. Show “Imported from slot 17” only in Advanced/Import details; all new references use stable IDs.
5. **Legacy level arithmetic is inconsistent.** Preserve source values and mark the curve as compatibility mode. Require an explicit “Adopt TKR curve” action before changing arithmetic; show before/after levels.
6. **Shared item animation is surprising.** Keep one native link on import, but let the new model offer context-specific overrides only if the native format cannot express them. Warn before an override changes legacy playback.
7. **Variable renames are not file renames.** A character name can be safely changed by stable ID, but runtime variable bindings are separate. Provide a distinct “Rename runtime bindings” action and a script-reference review.
8. **Default-menu preview needs a declared capability contract.** The engine spec says menu and battle are subsystems/plugins, while the default menu reads portraits, stats, inventory, equipment, key-item state, and usable moves. A preview should state which menu/battle pack is active and which fields it reads.
9. **“Add to game” could become a second hidden setup system.** Keep it as a context action that opens Party setup, inventory setup, or board placement. It must never write a project relationship without showing the destination and undo label.
10. **Graphics are a broad surface.** The character/item page should link to the shared Images editor, but its minimum validation must be local: required directional looks, battle rows for characters, and collision/activation shapes for board-capable items.

## Data and native-format implications

### Character field groups and new destinations

| Legacy field group | Native meaning | Database destination |
|---|---|---|
| Header, major/minor version | File identity and revision | Import details; AD-18 preserves read version and residue. |
| Display name | Character name/handle | Summary; stable ID is separate from display name. |
| Experience, defence, fight, health, max health, name, special power, max special power, level variable names | RPGCode global bindings | Advanced > Runtime variable bindings; never silently regenerated. |
| Starting experience, health, max health, defence, fight, special power, max special power, level | Initial party stats | Stats box with plain words and validation. |
| Profile picture | Portrait image or tile reference | Images > Portrait. |
| 201 special-move records: move file, minimum experience, minimum level, condition variable, required value | Character-specific availability and unlock rules | Special moves list; original slot metadata in Import details. |
| Special-move menu label and has-special-moves flag | Menu label and availability | Summary/Abilities presentation; “no special moves” is a capability choice, not a displayed value. |
| Eleven accessory names | Named accessory slots | Equipment capabilities > Accessories. |
| Six standard armour-slot flags | Head, neck, left hand, right hand, body, legs | Equipment capabilities chips. |
| First-level experience requirement and per-level experience increase | Progression input | Growth controls and chart. |
| Maximum level | Progression ceiling | Growth chart/table. |
| Health, defence, fight, special-power level increments | Linear or percentage stat growth | Growth traits; sentences specify points or percent. |
| Legacy sounds for swipe, defend, special, die | Obsolete character sound fields | Import details/residue; no editable modern box unless runtime support is proven. |
| Level-up program | Program run on level-up | Programs > Level-up; linked/openable, not copied silently. |
| Linear/percentage level-up type | Growth arithmetic mode | Growth mode control with compatibility warning. |
| Size type | Legacy sprite size hint | Import details; ignored by the current character model. |
| Eight directional walking animations | Walk looks | Images > Walking; direction grid in spec order S, N, E, W, NW, NE, SW, SE. |
| Five battle animations: fight, defend, special, die, rest | Battle looks | Images > Battle looks. |
| Reserved animation string | Reserved bytes/field | Import residue; not a visible value. |
| Eight idle animations | Idle looks | Images > Idle; fallback shown explicitly. |
| Idle delay and movement-frame speed | Sprite timing | Images > Timing, with seconds and preview. |
| Custom stance count and animation/name pairs | Named custom looks | Images > Custom looks; invalid incomplete pairs become diagnostics. |
| Vector count | Format bookkeeping | Import details; editor writes the supported vector structure. |
| Collision polygon | Movement collision base | Images > Collision shape; direct polygon handles and presets. |
| Activation polygon | Interaction/activation base | Images > Activation shape; direct polygon handles and presets. |

### Item field groups and new destinations

| Legacy field group | Native meaning | Database destination |
|---|---|---|
| Header, major/minor version | File identity and revision | Import details; AD-18 preserves read version and residue. |
| Item handle/name and one-line description | Inventory identity and menu text | Summary. |
| Equip, menu, board, battle use flags | Capability flags | Kind and usage cards; no hidden data when a card is disabled. |
| Used-by mode and up to 51 allowed-character names | Access policy | Economy and access > Usable by; “All characters” is a choice, not a value named None. |
| Buy and sell prices | Economy | Economy and access; plain gold units and multi-edit operations. |
| Key-item flag | Drop/menu protection hint | Economy and access; explanation links to default menu behavior. |
| Eight equipment-slot flags | Fitting body slots | Equipment card; standard slots plus named accessory. |
| Named accessory slot | Special fitting rule | Equipment card > accessory slot. |
| Equipment HP, DP, FP, SMP changes | While-equipped stat effects | Traits and effects as sentences. |
| Equip and remove programs | Equipment lifecycle hooks | Programs > Equip and Remove. |
| Shared animation field | Hand/battle animation link | Images > Context links, with shared-field warning. |
| Menu HP and SMP changes | Menu-use stat changes | Menu card, sentence summary, target/consumption controls [INFERENCE for new controls]. |
| Menu-use program | Menu lifecycle hook | Programs > Menu use. |
| Battle HP and SMP changes | Battle target changes | Battle card and preview. |
| Battle-use program | Battle lifecycle hook | Programs > Battle use. |
| Board continuous program | While-on-board thread | Board card > While on board. |
| Pickup/activation program | Board activation hook | Board card > On pickup/activate. |
| Legacy size type | Old sprite-size hint | Import details; not a modern setting. |
| Eight directional walking animations | Board sprite looks | Images > Walking. |
| Deprecated rest animation | Older idle/rest field | Import details or mapped south idle with warning, according to the format rule. |
| Eight directional idle animations | Board idle looks | Images > Idle. |
| Speed and idle delay | Item sprite timing | Images > Timing; preserve native order on write. |
| Custom stance count and animation/name pairs | Named item looks | Images > Custom looks. |
| Vector count | Format bookkeeping | Import details. |
| Collision polygon | Board collision base | Board card > Collision shape. |
| Activation polygon | Board activation base | Board card > Activation shape. |
| Pre-animation legacy tile names | Old item graphics | Import conversion details; generated animation/tile assets are linked and surfaced. |

### Runtime and format boundaries

- The `.tem` model stores stat variable names, so a character editor cannot treat stats as isolated display numbers. The UI must expose both starting values and bindings.
- The `.itm` model has four independent use flags and one animation field shared by hand and battle contexts. The UI may make the contexts clearer, but an import must not invent independent legacy fields without a native-model decision.
- A board item supplies placement and may override the reusable item’s board programs. The editor must distinguish **definition** from **placed instance**, with an “override” badge and a jump to the board.
- The default menu reads portraits and stats, item inventory/quantity, key-item state, allowed users, equipment slots and stat bonuses; it consumes menu/battle effects and runs linked programs according to `docs/spec/engine/plugins-and-battle.md`. A missing menu plugin means the menu key does nothing, so project setup must expose the active capability.
- The engine starts by creating the initial character from project startup data, then runs startup code, then loads the initial board. Party setup therefore belongs to project data, not only the character file.
- Legacy import may generate animation assets for old character/item graphics. Generated or bundled assets need provenance and licence handling; external assets copied into the project need a clear source/notice path.
- A native TKR model is permitted when stable IDs, components/instances, context-specific item views, or chest contents cannot fit without loss. Until an owner approves a native format, preserve legacy fields and use sidecar/editor metadata only where the architecture permits it.
- Reader/writer behavior follows AD-18: a reader returns a model plus warnings, keeps unmodelled residue, and does not silently upgrade. Editing a legacy file can be an explicit upgrade action with a preview.
- Document edits are serialisable commands in `editor-model`; hosts own undo/save/backup under AD-19. The Database’s multi-edit operation is one command with a reversible before/after set.

## Challenges to earlier decisions

1. **The one master-detail screen needs a type-first empty state.** Open on the likely job while keeping unified Database navigation visible.
2. **One Images box needs context tabs.** Use labelled subregions and role-specific previews.
3. **Chest is a placed board Thing, not an item or component kind.** It refers to item definitions and may use existing trigger/run-once behavior; authoring links/contents is Conditional on board tooling, not a new runtime contract.
4. **Traits as sentences include numeric stat growth and equipment effects.** “Attack increases by 5 while equipped” and “learn Fire at level 5” share beginner-friendly wording over typed fields.
5. **A default hero is a project setup relationship, not a special character singleton.** Whether a template creates one depends on the licensed starter catalog.

## Open questions for the owner

1. **Should starting inventory be part of Party setup in v1?** Recommended default: yes; allow item, quantity, and equipment assignments for the starting party, because the hero-and-sword scenario otherwise stops before Play.
2. **Should shops be a first-class Database record or a board/script template?** Recommended default: a first-class stock list in a later Shop editor, with an early generated “shop stock” script/template that reuses item prices until the record exists.
3. **What is the sell-price policy for multi-edit price operations?** Recommended default: buy and sell are independent; the operation must name each changed column and show rounding.
4. **Does Chest become a native component now, or remain a view over board triggers and items?** Recommended default: native component metadata if persistent opened state and contents are required; otherwise label the feature as a trigger template and do not imply full chest semantics.
5. **Can TKR add context-specific item animations while preserving the shared legacy field?** Recommended default: preserve one imported link and allow explicit native overrides only in a native model, with a compatibility warning.
6. **Which growth arithmetic is the compatibility mode for imported characters?** Recommended default: preserve legacy values and label the curve “legacy compatibility”; require explicit conversion to the documented TKR arithmetic.
7. **What does “all characters” mean when a project has more than the legacy list capacity?** Recommended default: stable-ID references in native data, with legacy import retaining the original fixed slots and warning when a limit is exceeded.
8. **Should the Database include enemies, moves, and effects in the first usable release?** Recommended default: include master-detail navigation and links for all four, even if enemy balancing is P1; a character’s moves and item programs otherwise have dead-end links.
9. **How should variable-binding rename review work for scripts?** Recommended default: offer exact reference updates where the language service proves the binding, and a review list for string-based or unresolved references; never silently rewrite arbitrary text.
10. **What default starter assets ship with a new project?** Recommended default: a small CC0/Bronze-or-better set listed in `THIRD_PARTY_NOTICES`, with import and no-asset paths equally usable.

## Sources

- `decisions.md`, especially §4.3 People, doors and things that happen, §4.5 Characters, enemies, items, and §5 walkthrough findings.
- Legacy guide, `05-character-item-enemy.md`, sections “Character editor,” “Graphics and animation dialog,” “Special moves,” “Equipment,” “Levels,” “Item editor,” “Item child dialogs,” “Item graphics and animation,” and “Cross-editor relationships.”
- Legacy guide, `01-environment-and-main-file.md`, sections “New Project,” “Startup Info,” “Fighting,” and “Main File / Project Properties editor.”
- `docs/editor-features.md`, T-50 through T-58 and cross-cutting editor behaviours.
- `docs/spec/formats/character.md` and `docs/spec/formats/item.md`.
- `docs/spec/formats/main-file.md`, `docs/spec/formats/board.md`, `docs/spec/formats/battle-data.md`, and `docs/spec/formats/save-game.md`.
- `docs/spec/engine/plugins-and-battle.md`, especially the default menu, inventory, equipment, and battle model sections.
- `docs/spec/engine/main-loop-and-startup.md` and `docs/spec/engine/movement-and-collision.md` for startup party creation and board-item behavior.
- `docs/adr/0004-script-ast-step-ir-and-plugins.md`, `docs/adr/0005-independent-product-v1-and-native-format.md`, `docs/guardrails.md`, and architecture spine AD-18–AD-20.
