# Task walkthroughs: a house kit, a forest maze, and an NPC battle

**Status:** proposed UX research, not an approved architecture, implemented editor, runtime test or observed beginner usability test. Jensen requested all three tasks. Alex is an invented beginner used to make the hand-offs concrete. Exact labels and defaults below are proposals.

These extend the [reusable tileset lifecycle](flows/03-tiles-and-art-sources.md#workflow-create-a-reusable-tileset-then-build-many-boards), [board workspace](flows/01-board-editor.md), [program authoring](flows/02-scripts-and-blocks.md), [Database](flows/04-characters-items-database.md), [battle authoring](flows/06-battle-and-effects.md) and [plugin editor study](flows/09-plugin-editors.md). They do not amend those contracts or the normative specifications.

## 1. Make a house kit, then build three different houses

**Finish line:** Alex can create a cottage, a wider shop and a second cottage with a unique roof, using the same kit. Each entrance can lead somewhere different.

### A. Make the pieces without a board

1. **Assets > New tileset**, name it **Village Houses**. Use the project's cell size/projection; expose changes without forcing a repeat decision. Choose **Draw** or **Import artwork**. An available, appropriately licensed example can be a starting point, never a prerequisite disguised as blank creation.
2. Draw one example facade and roof on a sheet. Keep the whole drawing visible at board scale while editing pixels across cell boundaries. Add a door and window. This requires actual artwork; no automatic completion of an arbitrary sketch is promised.
3. Select the completed building and choose **Make reusable building…**. First offer **Fixed stamp** or **Resizable parts** with miniature previews. Fixed stamp needs no part assignment and remains useful immediately.
4. For **Resizable parts**, point to left wall end, repeating wall middle and right wall end; then the roof's left/middle/right pieces for each required row. The drawing stays visible while selecting. Door and window are separately placeable decorations, not stretched pixels. A resizable facade is a kit brush, not a claim that every arbitrary top-down roof supports a generic nine-slice resize.
5. Drag the example wider in a test area. The assigned middle repeats and the ends stay intact. Show the supported size range and highlight missing roles. If the art has no tall-house variant, do not imply vertical resizing is available. Let Alex draw the missing pieces or keep a fixed stamp; never fabricate a roof.
6. Save the brush and the source artwork in the kit. Useful names might be **Cottage**, **Wide facade**, **Roof**, **Window** and **Door artwork**. Technical tile identities remain available, not the primary palette labels.

### B. Use it on a board

7. Open Village, select Cottage, inspect the ghost and click to place. Select Wide facade and drag to a supported width. Repeat pieces at native pixel scale; do not blur/stretch the whole picture.
8. Place windows and door artwork on the snap grid. Alex can also save a complete visual house as a Stamp. A Stamp paints tile references and carries no invisible entrance script.
9. Set up walls/walk-behind in their respective tile or vertex tools, with overlays. An author-defined kit can propose these regions, but Alex must see and accept the effective shapes. Door openings stay walkable. Do not infer collision from roof pixels or assume a roof's drawing order settles multi-floor canopy semantics.
10. **Add entrance** on the visible doorway creates/selects a board Door Thing and opens destination Properties. Choose **+ New interior…** or an existing board and landing spot. A second house gets its own destination. Moving just the painted door is not equivalent to moving its trigger: offer selection of the whole doorway group.
11. To reuse art plus shapes and entrance together, propose **Save as Component**, showing everything included. Expose each placed entrance destination as an instance property. Linked Components, parameterised resizing and shape adjustment require native support; fixed Stamps remain the simpler distinct tool, not a silent fallback pretending to preserve behaviour.
12. Recolour just the second cottage: inspect **Shared source — used by…**, choose **Make unique for this house**, then edit the source copy. A shared change previews every affected use instead. An instance tint, if supported, is an explicit alternative to copying artwork.

**What this exposes:** the tedious part is not drawing one house; it is teaching the kit how to repeat *without* requiring a novice to classify every tile. Fixed stamps must be useful before the resizable-part setup. The entry also exposes the difference between reusable appearance and a reusable functioning building.

**Paper checks:** resize to narrow/wide/minimum; move the entrance with its art; give two identical houses different interiors; recolour one and inspect the others; edit a shared roof and inspect all references. No runtime proof has been performed.

## 2. Make a terrain kit, then build a forest maze

**Finish line:** Alex can paint coherent paths, build forest walls, walk behind foliage where intended, and traverse a maze from entrance to exit.

### A. Author the reusable vocabulary

1. **New tileset > Forest**. Draw/import forest floor, path, tree/hedge pieces and decorations. The editor must support making this kit independently of a board, not only consuming a prebuilt pack.
2. Draw a patch of path over forest floor. Select **Make terrain brush**, name the two materials **Path** and **Forest floor**. Show a small labelled preview of centre, boundary and corner roles. Alex assigns source regions by clicking them; the tool does not invent pixels.
3. Start with the roles needed for the chosen brush; expose additional shapes as the test patch needs them. Bend the test path and create a T junction and inside corner. A missing role is highlighted beside its source slot. Let Alex paint the piece manually or return to drawing. No demand to fill dozens of unexplained slots before seeing anything useful.
4. Select tree pieces as a fixed Stamp, or configure a connected **Forest wall** brush for art that supports it. Distinguish trunk/base footprint from canopy artwork. Set proposed blocking/walk-behind metadata explicitly and show it in the test patch; the metadata/model is still open. Collision is not inferred from a dark green colour.
5. Save the kit's source, terrain rules and assemblies together. Random decorative variants, if supported, are optional; re-opening a board must not reroll the art already placed.

### B. Build the maze, not just a green picture

6. Make a board and fill forest floor. Mark an entrance and an exit. **Paint Path** to sketch routes, junctions and dead ends. Neighbouring art changes with the terrain rule; the brush does not decide whether the maze is solvable.
7. Paint forest walls/hedges along the routes or fill selected surrounding regions. Preview art and explicit blocked areas together. An optional corridor-protection aid warns where a proposed trunk/hedge footprint overlaps a reserved path; it must not silently move trees or invent an alternative route.
8. Switch **Walkability overlay** on. It distinguishes effective blocking, walk-behind canopy and the current actor's footprint. A path-looking tile is not automatically traversable; a tree canopy is not automatically solid. A trunk can block while leaves overhang a valid passage.
9. Narrow or bend a passage. Terrain edges repair visually, but existing explicit collision shapes stay visible. If a trunk or Wall shape still blocks it, remove/reshape that blocker; a per-cell Walkable override must not silently subtract an explicit Wall from the blocked-area union. Both tile-painted and vertex shapes remain available.
10. Place a player test spot and walk entrance to exit. Inspect choke points, hidden paths and where the player disappears behind canopies. A proposed **Check route** could diagnose reachability using actual effective collision, layer and actor footprint, but no such checker is established here. A colour flood-fill of path tiles is not proof.
11. Reuse Forest on a second board. Change a shared path corner once; inspect the affected boards. Per-board layout remains separate. Exporting the editable kit uses the pack proposal in flow 03, not a flattened board image.

**What this exposes:** terrain brushes solve visual joins; they do not solve level topology, collision or readability. A beautiful maze may still be impassable or confusing. The editor needs a fast switch from painting to seeing the world as the player traverses it.

**Paper checks:** straight, bend, inside corner, T junction; a passage narrower than the player; canopy over a clear route; a visually clear path blocked by a vector; entrance isolated from exit; repeat use on another board. These are proposed verification scenarios, not executed tests.

## 3. Place an NPC, talk to them, then start a battle

**Finish line:** the player interacts with a forest bandit, sees dialogue, enters the selected battle, and gets an intentional post-battle state. This is a scripted encounter, not an exercise in configuring random encounters.

### A. Begin in the board editor

1. **Things > Person**, choose/import a walking look, name the placement **Forest Bandit**, and click beside the forest exit. A context card opens in right-side Properties. The underlying reusable Person record belongs in Database > People, with local placement overrides clearly labelled.
2. Properties offers **When the player interacts** using the project's configured interaction action and visible activation area. Add **Say:** “Nobody passes without facing me.” The basic path remains interaction then dialogue then battle; a yes/no challenge can be added later, not forced into this task.
3. Click **+ Then > Start battle**. The enemy picker has search, preview, Open and **+ Create enemy…**. Do not ask Alex to find a filename, add a global encounter-pool row or change random-encounter frequency.
4. Choose an existing enemy, or create **Bandit** in an in-workspace detail view with a breadcrumb back to **Forest / Forest Bandit / Interaction**. The selected battle system supplies appropriate fields and previews. Use a suitable stock template if available; otherwise show the required missing fields. A battle-capable look can be reused where compatible, but a walking sprite does not magically become a complete set of battle animations.
5. Confirm the enemy and return to the still-intact interaction, with Bandit selected. The Person on the board and Enemy used in combat are distinct definitions connected by this action. A convenience **Create battle version** may seed compatible art/name; it must not silently turn every use of that Person into this enemy.
6. Choose a battle background with a thumbnail, or an explicit supported default. Show the selected battle system; its formation/arena editor appears only if that system requires it. Missing system/content becomes a nearby actionable diagnostic, not a battle that immediately ends and appears successful.

### B. Make the return from battle visible

The interaction reads as actions in order, not source-code setup:

> When the player interacts with Forest Bandit
>
> Say “Nobody passes without facing me.”
>
> Start battle against Bandit
>
> After victory: choose what happens next
>
> After escape, when allowed: choose what happens next
>
> On defeat: project's game-over policy

7. Do not silently choose whether the NPC fights forever, disappears or becomes friendly. Offer **Fight again**, **Talk only after victory**, or **Custom…** as understandable behaviour choices. For this example, propose Talk only after victory. Alex supplies the later line: “You earned your passage.” Whether the NPC also moves aside is a separate visible action.
8. The convenience creates a named, placement-owned persistent state such as **Forest Bandit defeated**, inspectable through the normal variable tools. It is set only on a confirmed victory, not on first interaction or battle launch. Duplicating the NPC normally creates independent encounter state; explicit shared quest state remains possible.
9. Escaping must not mark the bandit defeated or grant victory rewards. Loss follows the selected game-over/reset policy. Do not promise a free loss continuation for a training fight without an explicit supporting battle-system contract. Explain where rewards are configured and already awarded; do not add the same reward again in a default post-victory action.
10. While dialogue/battle owns this interaction, repeated interaction input must not enqueue duplicate battles. After returning, resuming from a held interaction button must not immediately launch it again. These are proposed lifecycle requirements, not assumed current trigger semantics.
11. **Test interaction** uses a fixture with party, placement and encounter state visible. Test the whole sequence from beside the NPC, not merely an enemy preview. Restart with fresh state, defeated state and a save/reload after victory. Test escape if available and the actual defeat policy. A simulated outcome is useful for authoring branches but must be labelled and cannot count as running the battle.
12. The authored behaviour has **Show as RPGCode** and an Open link. Generated programs remain grouped under Programs by board/placement, with stable references when names change. Exact folder spelling and block/source ownership mechanics are still proposals; this flow must not silently overwrite hand edits.

### The contract this task exposes

[E-70/E-71/E-77](../../../docs/spec/engine/plugins-and-battle.md#e-70) describe scripted battle entry, setup and outcome effects. They do **not** settle the trigger-level continuation ordering needed for the proposed branch editor; [flow 06](flows/06-battle-and-effects.md#7-start-a-battle-trigger) already records that gap. In particular, a plugin-handled outcome can own effects that the automatic path would otherwise apply. The modern result/continuation contract must state who owns rewards, defeat handling, persistent-state updates and resumption, and which capabilities each battle system supports.

Until that is settled, the sentences above are a UX target, not evidence that `fightenemy` returns a Boolean, a new RPGCode signature, or that block branches can already be lowered correctly. The missing contract is not something to hide from the implementation team or expose as accidental complexity to beginners.

**What this exposes:** the important hand-off is not just Person → Enemy. It is **board interaction → dialogue → battle → returned board state**, with scope and ownership visible at every step.

### Extension: encounter areas, one-time challengers and sight

**Owner input:** defeating an NPC may make the NPC disappear; Pokémon-like examples include random-encounter areas, NPCs who battle only once, and NPCs who can see the player. These are requested design scenarios; the following controls and semantics remain proposals, not established runtime capabilities.

- **Random encounter area:** paint a tile region or draw a vertex shape, then Properties > Encounters > choose enemies/pool and the frequency model with explicit units. Show inherited board policy and local overrides; leaving the region ends its eligibility. Regional pools, overlap precedence and random/planned counter behaviour on entry/exit need a contract beyond the existing board-wide exact-skill pool. Do not silently enable random encounters everywhere.
- **One-time challenger:** choose activation independently from recurrence: Interact, Touch, or See player; then **Battle until defeated / Repeat battles / Custom**. “Until defeated” is not “run the trigger once”: declining or escaping must not consume the victory opportunity.
- **After victory:** offer Stay and talk, Disappear, Move aside, or Custom. Separate victory state from appearance and collision. Disappear means the actor, collision and activation are absent on return and reload, not just transparent art. Other NPC placements retain independent state unless deliberately linked.
- **See player:** show a facing-direction lane/cone on the board with editable distance in tiles; use a narrow forward lane as one illustrative trainer preset, not a universal default. Preview occlusion using explicitly sight-blocking geometry; movement walls and canopy pixels do not automatically define sight blockers. Line shape, target point, layers and geometry are unresolved runtime contracts.
- **Detection sequence:** proposed visible actions are Notice player > optional Approach > Say > Start battle. Approach needs a blocked-route policy; preview the route and let the author choose Stop and wait or a custom action rather than teleporting or starting an unreachable conversation silently.
- **Ownership:** multiple sight triggers or a random roll must not launch competing battles while one encounter owns the player interaction. Detection eligibility, approach, dialogue, battle and return require explicit sequencing; arbitration, cancellation and persistence remain open.

**Additional paper checks:** approach from front/behind; stand behind a sight-blocking wall; cross overlapping sight areas; enter grass while a challenger notices the player; obstruct the approach route; escape then return; win then reload; confirm a disappeared NPC no longer blocks or triggers. None has been exercised in an implemented runtime.

### Junction exercise: trainer beside encounter grass

**Paper walkthrough only.** Jensen requested this exercise; results below are desired responses and exposed design gaps, not observed runtime output or owner-approved defaults.

**Setup:** a north/south forest path meets an eastern clearing. Scout stands on the eastern side facing west. Encounter grass borders the western path. A sight-blocking boulder interrupts part of the lane. Configure Scout's sight to four tiles, approach to an adjacent reachable position, dialogue then battle, battle until defeated, and Stay and talk after victory. Also examine the Disappear variant. Distances and policies are illustrative author choices.

**Authoring surface:** select Scout to reveal the facing handle, sight lane, activation area, collision footprint and approach preview. Properties shows Activation, Battle, Repeat and After victory together. Select grass instead to see its encounter region and policy. Overlay labels/patterns accompany colours; overlays are editor-only. Explain an ineligible trainer with a reason such as Defeated, Busy or Sight blocked, not merely a grey icon.

| Player action / condition | Proposed response | What this exposes |
|---|---|---|
| Approach Scout from behind, outside grass | No sight activation; ordinary interaction may work only if enabled separately | Sees player is not a circular proximity trigger |
| Walk into the forward lane behind the boulder | No notice while explicitly sight-blocking geometry occludes the player | Show the blocked segment; art pixels and walking walls are not automatic sight policy |
| Step clear of the boulder into sight | Scout notices, reserves the encounter, approaches, says the line and launches one battle | Preview the actual sequence, including when movement control changes |
| A blocker prevents approach after notice | For this exercise choose Stop and wait; release player control and show why the approach stopped | Re-arm only after leaving/re-entering sight or explicit interaction, not a repeated notice loop; exact policy remains proposed |
| Escape from the battle | No victory rewards/state; Scout remains eligible | Suppress immediate sight retrigger until leaving/re-entering the lane; this cooldown is encounter-local, not defeat |
| Win | Set the placement's persistent defeated state on confirmed victory; Stay and talk uses the later line and disables automatic challenges | NPC presence and battle eligibility are separate; reward/continuation ordering still needs its contract |
| Leave the board and return; save/reload after victory | Defeated state still selects the later behaviour | State is game data, not an editor-session or board-load temporary flag |
| Switch the authored victory action to Disappear and replay from fresh state | Confirmed victory removes actor, collider and activation; the absence survives return/reload | Hiding only pixels is insufficient; duplicating Scout must not inherit this placement's runtime victory accidentally |
| Enter grass on the same step Scout sees the player | Candidate policy: explicit scripted challenger wins arbitration; no random fight is queued to fire immediately afterwards | Candidate precedence, not a settled runtime rule; determine counter advancement/reset separately |
| A random battle is already active when Scout would qualify | Finish the active encounter; do not interrupt it or queue a surprise trainer battle | After returning, require an explicitly specified fresh activation/re-arm policy |
| Two trainers see the player together | One visible encounter owner, never two concurrent approaches/dialogues | Arbitration tie-break remains open; editor can warn about overlapping sight areas without forbidding intentional overlap |
| Lose | Follow the actual project game-over/reset policy; do not mark Scout defeated | A training-loss continuation requires an explicit battle-system capability, not a generic branch invented by the editor |

**Test authoring proposal:** Test encounter offers a whole-route run with the real selected battle system and named fixtures **Fresh challenger** / **Already defeated**, without overwriting the author's normal save. An optional simulated outcome is separately labelled and proves only branch preview. Show which fixture/state is running and allow a repeat from the same starting position. Runtime fixture isolation and battle-result continuation are prerequisites, not implemented capabilities.

**Design collision:** Sally wants a concise ready-made Challenger preset; Winston wants the eligibility, ownership and outcome lifecycle specified before that preset can be trusted. Amelia proposes keeping the short preset while exposing its generated actions/state. John objects to forcing every beginner to configure arbitration. The unresolved choice is which defaults can be explained in one sentence, not whether these rules can remain unspecified.

## RPGCode templates: capture and extend common behaviours

**Owner direction:** the convenient controls likely generate RPGCode files containing ordinary conditions and actions; those snippets should be templated somewhere easy to extend. This is an authoring direction, not selection of a template schema, storage format or new runtime subsystem.

**Proposed template package:** display name/description, explicitly declared author inputs, RPGCode generation pattern and any supporting state/dependencies. For example, Challenge player once asks for dialogue, enemy and victory behaviour, and allocates independent placement-owned defeated state. Sight detection, movement and battle outcomes still need callable runtime capabilities; generation does not establish those contracts.

**Proposed discovery:** Add behaviour searches Built-in, This project and My library templates. A creator can save a configured behaviour as a template, replacing selected literal values with named inputs. Form controls come from those declared inputs, not guesses about arbitrary code. Sharing/export must include required dependencies and identify plugin requirements without requiring every template author to build an editor plugin.

Generated RPGCode remains visible and reachable through Open RPGCode, organised under Programs and optionally by board/NPC as previously discussed. Exact folder spelling is open. Template insertion creates project-owned output by default; later library edits do not silently rewrite customised instances. Linked updates, if supported, require an explicit diff. Existing block/code ownership rules still apply: never regenerate over hand edits silently or promise arbitrary code-to-form round-tripping.

### Final paper scenario: make one locked chest, turn it into a template, reuse it

**Why this last exercise:** it tests common-action authoring, persistent state, template creation, independent reuse and the hand-off to code without adding another editor. It is a proposed walkthrough, not an executed runtime test.

1. Place a Chest Thing and choose contents. Add the condition **Player has [Old Key]**. State explicitly whether opening consumes the key; this example keeps it.
2. If the chest is already opened, show the empty response. Otherwise, if the key is absent, show “Locked.” If the key is present, grant the contents, mark this placement opened and select its open appearance. Giving contents and persisting opened state needs a defined interruption/save policy to avoid duplicate or lost rewards; do not imply that ordering a few statements alone guarantees atomicity.
3. Test locked, unlocked, opened, board-return and reload states. These are required future scenarios, not proof already obtained.
4. Choose **Save as behaviour template**. Name it Locked chest; expose Required key, Contents, Locked message and Empty message. Keep Opened state as a fresh placement-owned value, not a shared literal copied into every instance. Include or explicitly request compatible closed/open artwork.
5. Place a second chest and apply Locked chest. Choose a different key/reward. Opening the first must not open the second. Show both generated programs/state references in Programs and Where used.
6. Open the second program as RPGCode and add a custom effect. Respect the existing explicit hand-off to code-only or supported mixed editing; the inspector must not pretend stale controls still describe the entire program.
7. Edit the library template's default wording. Existing project-owned programs remain unchanged unless an explicit reviewed update is requested. Remove the template from the library: already generated behaviour must remain usable, with its actual dependencies retained.

**Open before implementation:** template schema and input validation; state-name allocation and duplication; source ownership/regeneration; dependency packaging and plugin capabilities; reward/persistence interruption semantics. The owner endorsed extensible snippets, not every specific mechanism proposed here.

**Session record:** the latest discussion is captured here alongside reusable house/forest kits, interaction-triggered battles, sight-triggered challengers, random-encounter regions and post-victory disappearance. The reusable tileset lifecycle remains in flow 03, tile-making in flow 10, and the research README links this document. No production editor or runtime behaviour was implemented by these paper exercises.




## Questions to explore next, not decisions already taken

- House kit: is a fixed house Stamp plus separate roof/wall brushes sufficient as the beginner path, or is configuring a resizable building worth introducing immediately? Bring Sally and Amelia deeper into the setup cost.
- Forest kit: should the first lesson lead with drawing corridors then adding blockers, or filling a blocked forest then explicitly carving clearings? Both need honest art/collision semantics; neither should pretend to generate a good maze automatically.
- NPC battle: should the quick action ask explicitly about repeat behaviour, or propose Talk only after victory with a conspicuous editable summary? Bring Winston deeper into result and persistence ownership before promoting the design to implementation requirements.
