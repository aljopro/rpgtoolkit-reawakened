# Creator journeys and the legacy asset workflow

**Date:** 2026-10-20
**Status:** Discussion notes for a future team perspective round. Not decisions, requirements, validated user research, or implementation evidence.

Owner request: “awesome lets keep these notes. I want to run it by the team for some perspectives later.”

No workspace modes, epic changes, architecture changes, storage choices or delivery commitments were selected. The team perspective round has not happened yet.

### What to ask the team

1. Does the focused → **promote to full view** → focused pattern hold, and should promotion be reversible?
2. Which facts belong in an **editor visit context**, and which are shared asset state?
3. Should a contextual visit default to **this usage** or **the shared definition**, and how does the creator tell?
4. Where does the boundary sit between a cohesive task and a broad management task?
5. Does the same-module-different-context model survive hosts and plugin editors without becoming an architecture decision?

### Owner answer on question 3

Owner: the contextual visit defaults to **this usage**, unless the user has configured it otherwise — “no reason not to make it a configurable experience.”

**Recorded as a direction, not a settled interaction.** Three qualifications to explore with the team, because they separate preference from data model:

- **Preference, not semantics.** A remembered choice should change which scope a visit opens at, not what a field *means*. The effective scope stays visible on the surface; a hidden preference must never make an edit silently shared or silently local.
- **Only where two homes exist.** Placement properties (position, layer, activation type, activation polygon) are inherently local. Shared asset fields (name, stats, behaviour definition) are inherently shared. The ambiguity exists only at boundaries that genuinely have both a placement-level and a definition-level home — for example a program override versus the item's default program. Elsewhere there is no toggle to configure.
- **Local editing needs somewhere to land.** Defaulting to *this usage* is only achievable where the format (or an added layer) can express a per-placement override. Under legacy data many fields have one shared home; the editor must then say so and offer the shared edit, rather than imply a local change that has nowhere to be stored. Adding native override data is a format decision requiring its own record.

The useful default is therefore **local where a local home exists, shared otherwise, with the effective scope always visible**; the preference adjusts the default at genuine boundaries.

## Owner clarification: continuity, not elimination of asset editors

The owner clarified the purpose: people succeeded with the legacy Toolkit, but many found its editors confusing and disjointed. The comparison should hold the creative goal constant and examine how the same journey could feel less file-type-centred—not question whether the old tool could produce the result.

Further framing: “I think the aim is to make the journey a cohesive one... maybe links to editors... if a file exists, go to it... if it doesn't create it... that kind of thing”.

**Direction to explore:** retain specialist editors and make transitions between them part of a cohesive task. From the current work, open a linked asset, select an existing asset to connect, or create a missing one in context. A proposed completion of that pattern is to attach the chosen/new asset and return to the originating task with context intact. This is not a requirement to hide files, replace specialist editors, merge everything into one screen, or select workspace modes.

Illustrative rehearsal: while configuring the guard's key condition, open the linked key to edit it; if no key is linked, select an existing item or create one, then return with that item selected in the condition. The exact navigation, creation, save/cancel and return behaviour remain to be designed. An unresolved reference to a missing file is a repair case, not permission to silently create a replacement.

The owner further articulated the direction: “the editors start needing context or state in which they were invoked from and can adjust to that state and context.”

**Interpretation to explore, not an interface decision:** distinguish shared project/asset state from the task context of an editor visit. Context might identify the originating task, target asset or placement, purpose (create/select/edit), relevant field or section, and where a result should return. It could guide focus, relevant choices and explicit suggested defaults without creating a second copy of the asset or silently changing shared data. Opening the same editor independently remains useful. Return/cancel behaviour, nested visits, shared-versus-local edit scope and stale origins need rehearsal before a contract is selected.

The owner illustrated contextual presentation with item editing: a focused visit from the board might show one item's detailed screen, while entering item management directly could expose a list for comparison and bulk-edit facilities that are less available in the contextual visit. This is a tentative example, not a selected feature set.

**Implication to explore:** context can affect the breadth of work and the available presentation, not just initial focus. Distinguish inspecting/editing one linked item, choosing among items, and managing/comparing many items. A contextual view could offer an explicit route to broader item management while preserving the originating task. Hiding bulk controls for focus does not make edits to a shared item local to the board; edit scope must remain clear. Whether bulk operations are omitted, secondary or reached through an expanded view remains open.

Owner suggestion: “I could see a way to say 'promote to full view'.”

**Interpretation to explore, not a selected interaction:** promotion is a deliberate widening of the same editor rather than navigation to a different editor. It would carry the current asset and pending edits, reveal the list, comparison and bulk facilities, and keep a clear route back to the originating task. Open questions: whether promotion is reversible, whether the originating context survives after the wider view is used, how pending unsaved changes behave across promotion, what "full view" means in each host (panel, tab, window), and whether the promoted view becomes an ordinary editor session that can be left independently. Promotion must not imply that the shared asset became board-local.

Owner framing: “I'm taking ideas from a module federated system and thinking about it here in the context of the editor. same module just a different context in which its being used. that of course is the technical part of me operating.”

**Analogy assessment, explicitly not an architecture choice.** Module federation addresses *composition and loading*: one exposed editor module, composed differently by different hosts, with shared modules resolved to a single instance. That maps well onto the presentation layer of this direction — the same item editor module rendered focused or promoted, and the same `editor-ui` module in VS Code and the browser (already a foundation-epic goal). It addresses *why* the module was invoked only if the invocation context is passed in as an explicit contract; a federated remote does not infer intent by itself.

**Where the analogy breaks and what it must not smuggle in:** federation's shared-singleton scope is what prevents the duplicate-editor danger (two item editors, two undo stacks, two copies of the document). That is a *composition* guarantee. It says nothing about task context, which must live in an explicit per-visit context object rather than module-level state. It also pulls toward plugin/extension hosting with versioning, contract ownership and CSP concerns — an area [flow 09](flows/09-plugin-editors.md) and its review already flag as unresolved ("no public API is selected by this research"). Adopting federation as a bundling or plugin-loading mechanism would be an architecture decision requiring its own record, not a conclusion of these notes. Recorded here only as a mental model for "same editor, different invocation context".


## Sources and evidence limits

- [Experience bank](../../../docs/editor-experience-bank.md): candidate creator lenses, not a taxonomy of actual users. Morgan includes strategic additions; Casey, Avery and Rowan are inferred from selected historical patterns. Riley reflects owner experience, with broader prevalence unverified.
- [UX research](README.md), [decisions](decisions.md), and [architecture fit](reawakened-fit.md): distinguish owner directions from proposals and unresolved contracts.
- [Editor foundation epic](../epic-editor-foundation/epic-editor-foundation.md): project opening, settings, scripts, test-run and document lifecycle across hosts; not the entire encounter-authoring journey.
- [Legacy editor inventory](../../../docs/editor-features.md), especially T-26, T-41, T-52 and T-55, and [format index](../../../docs/spec/formats/README.md): grounding for the legacy reconstruction.
- [Movement and activation](../../../docs/spec/engine/movement-and-collision.md#e-43), [command catalogue](../../../docs/spec/engine/rpgcode-functions.md), and [modern actors](../../../docs/spec/engine/actors.md): specification grounding, not claims of shipped editor functionality.

These are paper rehearsals. The legacy reconstruction uses approved repository documentation, not a live run of the old application. No creator usability test was performed. The newer editor interactions below are proposals.

## The encounter

At dusk, a guard blocks the old village entrance. Bring back a missing key, and the guard steps aside and reveals that the village is in danger.

For the rehearsal only:

- The player initiates conversation with the interaction action.
- Showing the key earns lasting admission; the player keeps it.
- Dusk describes visual direction, not a day/night system.
- Where the player acquires the key remains unresolved.

These choices are not product decisions. A successful test with an injected key is not proof of a complete playable quest.

## Starting intents and outcomes

| Lens | Starting intent | Desired outcome | Forced-flow risk |
|---|---|---|---|
| Morgan: story | Turn confrontation into revelation | Meaning, pacing and consequence survive implementation | Low-level setup before shaping the beat |
| Casey: world | Compose a tense entrance at dusk | Atmosphere, approach and passage work in play | Mandatory quest authoring before arranging space |
| Avery: interaction | Make access depend on a condition | Small, understandable, testable behaviour | Finished village and polished dialogue before experimentation |
| Rowan: return | Understand existing work and change it safely | Resume without collateral damage | Repeating a new-project or original creation sequence |
| Riley: code | Implement and extend directly | Fast code-to-result loop with preserved edits | Code treated only as generated output or an escape from the editor |

These can be different moments for one creator, not separate people or mandatory roles.

## Proposed new-editor rehearsals

### Morgan starts with the story

Write the beat and exchanges directly, or optionally use conversation. Connect the guard, location and key to existing project elements or leave them visibly unresolved. Do not require every connection before writing can continue.

Move into staging the encounter, position the guard and entrance, then return to the unfinished dialogue without losing context. “Steps aside” needs an explicit destination and behaviour; it must not silently mean disappear or disable collision.

Play the return encounter. If the revelation happens too early, adjust its sequence without reconstructing unrelated graphics, inventory and board setup.

**Inference:** story work benefits from connected details, but this does not establish a dedicated story-document format or screenplay tool.

### Casey starts with the place

Compose terrain, walls, entrance, guard, lighting and appearance without first creating a story beat. Selecting the guard could expose its placement, appearance and interaction, with links to shared definitions where relevant.

Check actual collision and activation rather than assuming the picture proves passage is blocked. Narrowing the entrance may make the guard's movement destination invalid. Cross into adjusting that movement and return to composition without taking over quest design.

**Inference:** place and behaviour need short transitions. Independent artwork or reusable-kit creation need not pass through story work.

### Avery starts with the interaction

Use a minimal test location and a readable behaviour sequence:

- Already admitted: later response.
- Not admitted, carrying key: acknowledge it, grant admission, move aside, reveal danger.
- Otherwise: refuse and explain the prerequisite.

Keep activation eligibility separate from conditions inside the conversation. Requiring the key before the whole interaction can activate risks silence instead of refusal.

Test explicit states: no key, key held, already admitted. Program fixtures are a legacy precedent; an encounter-state chooser is a proposed new interaction. Attach the experiment to the real guard and choose its movement destination in context. Test integration, not just the condition.

**Inference:** behaviour can start independently, but isolated success is not a working encounter.

### Rowan returns

Enter through an existing board, guard or program. Inspect known links: placement, effective interaction, key reference, admission state, movement and destination. Distinguish recorded intent from inferred explanation; code alone does not establish that the guard is secretly frightened.

Run and inspect the failure: did the key check fail, or did admission succeed while movement was blocked? Inspect known affected uses before changing shared content. Do not claim a complete dependency map when references are dynamic.

**Inference:** resuming and diagnosing must work without replaying the original creation sequence.

### Riley starts in code

Open the program or behaviour directly, with language help and contextual testing. Navigate to known placements and test contexts, while acknowledging incomplete static relationships for dynamic code.

Preserve code changes when returning to visual work. A later dialogue edit must not silently regenerate over handwritten logic. Arbitrary code need not round-trip into visual blocks; source ownership and persistence remain unresolved design contracts.

**Inference:** code should remain an ordinary authoring entry, not an exit from the connected experience.

## What the same encounter looked like in the legacy editor

Illustrative filenames only:

| Creative element | Legacy asset or representation | Editor surface |
|---|---|---|
| Entrance and surroundings | `village-gate.brd` | Board tiles, layers, vectors, sprites, programs, shading/lighting and properties |
| Terrain/building art | `.tst` / `.iso`; optional `.tbm` compositions | Tile, tileset and tile-bitmap editors |
| Guard appearance | `.anm` or animated GIFs assigned to stances | Animation and sprite graphics editors |
| Guard NPC definition | `guard.itm` | Item editor: board behaviour, graphics and sprite bases |
| This guard placement | Sprite entry in `.brd`, referencing `.itm` | Board inspector: position, layer, activation, conditions and program overrides |
| Missing key | `village-key.itm` | Item editor |
| Conversation, checks and consequences | `guard-talk.prg`, or supported inline code | Program editor / visual event builder |
| Admission memory | Script variables and condition logic; saved runtime state as applicable | Programs and conditional fields, not a dedicated quest asset |
| Passage to another location | Board link or scripted transition to `.brd` | Board properties or program region/script |
| Player | `.tem` plus graphics | Character editor and startup/test settings |
| Game startup | `.gam` plus board start location | Main-file and board editors |

A narrative character was not necessarily a Character-editor asset: a guard was ordinarily an item used as a board sprite, while `.tem` represented a player/party character. Painted doorway art was separate from its blocking geometry and transition behaviour. The modern actor model need not inherit these legacy categories as its user-facing organisation.

### Legacy journeys by lens

- **Morgan:** translate the beat into board, guard item, animations, sprite placement, key item and program; connect activation and passage; run and revise. Meaning lived in authored code, comments, the author's understanding and external notes rather than a documented encounter asset.
- **Casey:** paint with tiles; switch to vectors for walls; use shading/lighting; place a sprite; open linked item/graphics; attach programs; test. The scene was visible as a whole, but diagnosing problems required knowing which representation owned them.
- **Avery:** write a program, configure fixtures, test branching and effects, attach it to a real placement, then test actual activation and movement. The visual builder helped construct RPGCode, not a complete encounter-design environment.
- **Rowan:** open the board, locate the sprite, inspect its item and placement override, trace program variables and references, and run it. Opening only the item might miss the program override actually used by this placement.
- **Riley:** use the program editor, command reference, call tips and fixtures, then wire the program into a board or sprite. Direct code was a strong entry; contextual integration still required asset knowledge.

The legacy editor already offered contextual inspectors, folder-aware pickers, open-linked-file buttons and previews. It was not wholly disconnected. The proposed improvement is not merely adding links, but reducing the creator's need to mentally assemble and maintain the encounter across those links.

## Synthesis to challenge with the team

**Inference, not a selected design:** the useful continuity may be the current subject and question rather than one mandatory sequence of editors:

> I am working on the village guard. Right now I am deciding what they say, where they stand, why they react, or why they failed.

The journeys share finding/creating relevant elements, connecting them, trying them in context, revising safely and returning to the unfinished task. They do not necessarily share an order, starting surface or success criterion.

Shared assets do not imply shared jobs. Writing motives and positioning collision both touch the guard but are different work. The old editor grouped work principally by asset type; the proposed direction explores gathering relevant tools around the current task while preserving specialist editors and direct asset access.

**Design question:** Can a creator understand and change the encounter without memorising its asset wiring, while still inspecting that wiring when needed?

## Questions for the later perspective round

1. Compare starting empty with connecting existing guard, key and village assets. Which transitions genuinely stay useful?
2. What context must survive a transition: subject, unfinished question, selection, test state?
3. Is a story beat an authoring object, a note, or simply the creator's mental frame?
4. How should local placement changes versus shared definitions be understood?
5. How can testing distinguish isolated encounter success from a complete playable quest?
6. What survives when code cannot be represented by visual controls?
7. Does the direction hold for independent terrain-kit creation or an unrelated minigame?
8. What would real creator observation need to establish before selecting workspace organisation?

Save/current-board Play, cross-document transactions and undo, block/code ownership, stable authoring references and persistence remain contracts to resolve, not capabilities established by this discussion. No ticket or architecture amendment follows automatically from these notes.
