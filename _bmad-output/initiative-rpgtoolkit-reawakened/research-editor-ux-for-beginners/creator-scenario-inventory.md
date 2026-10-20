# Creator scenario inventory: the range of authoring work

**Status:** discovery draft, 2026-10-20. This is a broad, revisable scenario map—not a persona segmentation study, golden path, UI specification, priority list, acceptance suite, or feature commitment. Scenarios are lenses on jobs and working conditions; one creator may switch lenses many times in one project. The inventory is intentionally exhaustive in its exploration, not a claim to have found every creator or measured demand.

## 1. Why this lives here

**Proposed home:** this file on the `research/editor-experience-bank` branch (worktree `.worktrees/editor-research`), in the existing editor research folder, linked to the [experience bank](../../../docs/editor-experience-bank.md), the [research pilot](../../../docs/editor-research-pilot.md) that supersedes parts of it, and the ten UX flow studies. It stays on this research branch for now, off the development line, and promotes nothing into specs, architecture, priorities, or tickets.

**Suggested durable structure:** (1) scope and evidence key; (2) scenario records grouped by creator intent; (3) intent/workflow synthesis, tensions and evidence gaps; (4) a reconciliation map back to the existing bank, research flows, feature IDs, and normative specs. Scenario IDs are stable references for later discussion, not priorities. New claims are tagged by evidence status and should be retired, split, or promoted only after corroboration.

## 2. Evidence discipline

### Evidence types and confidence

- **Historical corpus** — selected anonymous historical posts or lexical scans. A source ID supports that a topic was discussed, not that a population commonly has the need. Confidence applies only to the narrow paraphrased observation.
- **Owner-reported** — a direction or first-person experience explicitly recorded in the decisions/research material. It supports that owner's view, not prevalence.
- **Product documentation** — `docs/editor-features.md`, `docs/spec/`, ADRs, or project brief. It establishes documented capability/compatibility context, not creator preference or usability.
- **Existing UX research** — a paper flow, walkthrough, review resolution, or experience-bank entry. It establishes that a scenario was designed or discussed, not that users completed it.
- **Strategic addition** — a deliberate design-space scenario added to explore product intent beyond observed evidence.
- **Open hypothesis** — a plausible scenario or preference without direct corroboration; test rather than assume.

Confidence: **High** = direct evidence for the narrow stated fact, not broad demand; **Medium** = several aligned artifacts or a well-supported inference; **Low** = plausible but materially unverified. Status values are **Observed**, **Owner-reported**, **Inferred**, **Strategic**, and **Hypothesis**. A record can combine statuses; details are stated per record. “Observed” refers to source material, never observed usability of the proposed editor.

### Reusable source register

| Key | Source and what it can establish |
|---|---|
| H1 | Two separate secondary sources. First, the [research pilot](../../../docs/editor-research-pilot.md#a-pilot-evidence), whose evidence cards **supersede** the initial bank's reading of five forum records and add two game-profile records: `CORPUS-FORUM-8178` (requester excludes Toolkit; respondent reports a writing-to-game gap), `CORPUS-FORUM-7751` (website presentation — **adjacent domain, not game-scene evidence**, excluded here from SC-06/08 support), `CORPUS-FORUM-7190` (acquired custom systems not yet usable), `CORPUS-FORUM-7118` (minigame construction request; a different participant reports success), `CORPUS-FORUM-7148` (selective redirection plan; single source), `CORPUS-GAME-735` (compact finished work shared) and `CORPUS-GAME-764` (full release with manual install steps). Second, [community pain points](evidence/community-pain-points.md#evidence-excerpts), with its own N/G/B/A/K row IDs. Namespaces are retained exactly; no equivalence is assumed. Advice or a posted claim is not adoption or verified success. This pass reviewed recorded cards, not underlying corpus rows. |
| H2 | `evidence/command-census.md`: lexical scan of 2,550 distinct archived script texts (2,521 with detected calls). Supports that code, transitions, dialogue and a command long tail appear in the sample; it does **not** show block-convertible coverage, prevalence among all creators, or author preference for visual tools. |
| H3 | `evidence/community-pain-points.md` quantitative table and caveats: lexical hits for project setup, board, tiles, scripts, character/items, animation, distribution, loss and crashes. Counts are not user-level prevalence; sources overlap and context is incomplete. |
| H4 | [`evidence/extension-adoption-corpus-recheck.md`](evidence/extension-adoption-corpus-recheck.md): bounded 2026-10-20 re-check of consuming acquired systems (I-13) and extending from code (I-14). Supports that acquired battle systems failed to run for two independent 2004 creators and that a handful of would-be extenders reported SDK, command or engine-boundary barriers; most records are advice with unknown outcomes. No I-14 pattern clears the pilot's two-situation threshold. |
| O1 | `decisions.md` §§1, 4, 5; README authority/evidence section: owner-selected beginner/hobbyist audience, complete capability, one-click common actions with code kept available, board wall and walk-behind tile-or-vertex direction, Properties placement, grouped generated snippets direction, and documented tile-making / plugin-editor problem statements. Each is a bounded owner direction, not approval of every proposed interaction. |
| O2 | Owner-reported code-centered usage style: the Riley persona and intent I-14 in the [experience bank](../../../docs/editor-experience-bank.md) and the [pilot's intent table](../../../docs/editor-research-pilot.md#c-candidate-intent-inventory). Owner-reported only; RPGCode contests remain an unexamined lead, not corroboration. |
| R1 | `flows/01`–`flows/10`, `walkthroughs-house-forest-and-npc.md`, `morning-brief.md`, and `decisions.md`: authored paper scenarios and proposals. These are design exploration, not implementation or usability evidence. |
| R2 | `evidence/review-resolution.md`, `reawakened-fit.md`, `evidence/review-notes.md`: corrected authority, scenario honesty, coverage and unresolved dependencies. The resolution supersedes uncorrected statements in the original review notes. |
| P1 | `docs/editor-features.md` T-01–T-82: inventory of legacy editor capabilities and scope anchors, not evidence that modern creators want every legacy interaction. |
| P2 | `docs/spec/README.md` plus linked `docs/spec/formats/` and `docs/spec/engine/`: compatibility behavior and file-format constraints. Normative for legacy compatibility, not proposed UX or proof of demand. Relevant pages are called out per scenario. |
| S1 | Project brief/README as cited in `reawakened-fit.md`: stated product ambition to help a beginner finish a small game and share it. Strategic product intent, not validated outcome. |
| S2 | Scenarios intentionally added here to expose plausible alternatives or gaps. No direct creator evidence is claimed unless separately cited. |
| P3 | Current planning context: [capability spec](../spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md), [architecture spine](../architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md), [editor foundation](../epic-editor-foundation/epic-editor-foundation.md), [P0 assets](../epic-editor-assets-p0/epic-editor-assets-p0.md), [P1 tools](../epic-editor-p1/epic-editor-p1.md), [P2 tools](../epic-editor-p2/epic-editor-p2.md), and [battle epic](../epic-battle/epic-battle.md). Establishes recorded scope, constraints and decisions—not delivered functionality, demand, or completion status. Reconciled below without editing those artifacts. |

No legacy GPL source was inspected for this inventory. Historical evidence is used through repository research artifacts; this draft reproduces only anonymous paraphrases and existing opaque IDs. The older community evidence file contains contributor handles: they are **not** copied here, and that file needs a separate privacy review before inclusion in a public evidence bundle. RPGCode contest material has not been examined and is not treated as evidence.

### What each scenario records

Each record gives: label; starting state and creator-voiced goal; working preference/control need; observable success; likely friction and recovery; evidence type/source, confidence, and status. A preferred approach is a scenario condition, not a persona trait that must persist across tasks.

**Calibration applies to every record:** all situation labels and creator-voiced goals are invented composites, not quotations. “Observed” means the cited secondary artifact records a historical report; it does not validate the whole scenario. Unless explicitly owner-reported, preferred methods, control needs, success criteria and recovery responses are **new inferences or hypotheses**, even when the source fact has high confidence. Success describes what could be observed in a future study, not a test already passed. Imperative recovery wording is a candidate response to investigate, not a product requirement. All records have **test status: discovery scenario, not human-evaluated**.

#### Source navigation

Research flow abbreviations resolve to [01 Board](flows/01-board-editor.md), [02 Scripts](flows/02-scripts-and-blocks.md), [03 Art sources](flows/03-tiles-and-art-sources.md), [04 Characters/items](flows/04-characters-items-database.md), [05 Animation](flows/05-animation-and-looks.md), [06 Battle](flows/06-battle-and-effects.md), [07 Shell/sharing](flows/07-project-shell-and-sharing.md), [08 Conventions](flows/08-project-file-by-convention.md), [09 Plugin editors](flows/09-plugin-editors.md), and [10 Tile-making](flows/10-tile-making-without-the-grind.md). See also the [walkthroughs](walkthroughs-house-forest-and-npc.md), [decisions](decisions.md), [morning brief](morning-brief.md), [review resolution](evidence/review-resolution.md), [historical review](evidence/review-notes.md), [architecture fit](reawakened-fit.md), and [command census](evidence/command-census.md).

Product anchors resolve to the [feature inventory](../../../docs/editor-features.md), [normative index](../../../docs/spec/README.md), [format index](../../../docs/spec/formats/README.md), [board](../../../docs/spec/formats/board.md), [main file](../../../docs/spec/formats/main-file.md), [character](../../../docs/spec/formats/character.md), [item](../../../docs/spec/formats/item.md), [enemy](../../../docs/spec/formats/enemy.md), [battle data](../../../docs/spec/formats/battle-data.md), [tiles](../../../docs/spec/formats/tiles.md), [animation](../../../docs/spec/formats/animation.md), [images](../../../docs/spec/formats/images.md), [packaging](../../../docs/spec/formats/packaging-and-paths.md), [movement](../../../docs/spec/engine/movement-and-collision.md), [language](../../../docs/spec/engine/rpgcode-language.md), [legacy plugin/battle compatibility](../../../docs/spec/engine/plugins-and-battle.md), [display/input/audio](../../../docs/spec/engine/display-input-audio.md), [ADR 0004](../../../docs/adr/0004-script-ast-step-ir-and-plugins.md), [ADR 0005](../../../docs/adr/0005-independent-product-v1-and-native-format.md), and [guardrails](../../../docs/guardrails.md).

## 3. Scenario inventory

### A. Starting, framing and returning to an idea

#### SC-01 — The premise with no first step

- **Starting state / goal:** A creator has a mood, image, or premise but no project yet: “Help me turn this into a beginning I can see and play.”
- **Working preference / control:** May want a short conversation or may prefer to start by making something directly. Needs the editor to distinguish their stated premise from assumptions and leave the scale of the first step in their hands.
- **Observable success:** A project contains one recognisable, editable scene or small playable starting point, and the creator can point to what is theirs versus suggested.
- **Friction / recovery:** A large inferred plot or asset bundle can drown out the idea. Show interpretation before committing; let the creator correct it without restarting or losing accepted details.
- **Evidence:** H1 `CORPUS-FORUM-8178` is **adjacent only**: the requester excludes Toolkit and seeks a plot/title, and the story-to-playable gap is a respondent's self-report (pilot §E8178, I-02 "hypothesized"); modern product brief S1/S2 supplies the conversation-to-scene path; flows 07 and 02. **Confidence: Low (adjacent evidence; the premise-first beginner is not observed). Status: Strategic + Open hypothesis.**

#### SC-02 — The story shaper who does not want implementation yet

- **Starting state / goal:** A cast, conflict, scene, or choice is taking shape: “Help me see whether this story beat works before I build all the mechanics.”
- **Working preference / control:** Conversation, outline, or a structured story map; may want to stay out of code. Keeps authorship over tone, character intent, branching meaning, and what remains undecided.
- **Observable success:** A story beat can be reviewed as a scene/choice outline and selectively connected to a playable event when the creator chooses.
- **Friction / recovery:** Treating an outline as a complete game design can force premature decisions; generated dialogue can overwrite voice. Keep outline and implementation distinct and preserve alternatives.
- **Evidence:** H1 `CORPUS-FORUM-8178` supports only a respondent's report of writing plots but struggling to make games from them (pilot I-04, "inferred"); R1 flow 02. A dedicated outline workflow is untested. **Confidence: Low for the scenario; Medium that story-to-playable difficulty was self-reported once. Status: Observed adjacent self-report + Strategic + Open hypothesis.**

#### SC-03 — The first-time maker who wants a playable start without setup archaeology

- **Starting state / goal:** New project, little or no engine knowledge: “Let me make something and try it without learning the file format first.”
- **Working preference / control:** Guided steps or an explained template, but able to skip guidance and inspect what was created. Needs defaults and consequences visible, not a locked-down beginner mode.
- **Observable success:** A project opens with an understandable start point and can be played; the creator can make and test at least one intentional change.
- **Friction / recovery:** An empty project, unlicensed or absent starter content, inaccessible settings, or guidance that only describes rather than verifies. Show contents and capability limits; allow a blank/no-art route and recoverable edits.
- **Evidence:** O1 beginner/hobbyist and complete-capability directions; S1 product ambition; P1 T-04/T-07/T-09; R1 flows 07/08 and village walkthrough. The research README also summarizes one SourceForge review and one Publish0x review; these are secondary review reports, **not H1 corpus rows or controlled usability evidence**, and were not independently re-examined here. **Confidence: Medium for recorded direction/friction; Low for the proposed first-use workflow. Status: Owner-reported + Strategic + Inferred.**

#### SC-04 — The returning creator with a half-remembered project

- **Starting state / goal:** An old, unfinished, or imported project with assets and habits they no longer fully remember: “Show me where I left off and what still works.”
- **Working preference / control:** Browse, search, preview and inspect effective settings; may value familiar file access. Needs original material preserved, import assumptions called out, and changes to be reversible.
- **Observable success:** The creator can identify a viable next task, find linked content, and distinguish imported facts, defaults and unsupported pieces before changing them.
- **Friction / recovery:** Missing main file, plugin, asset, or uncertain references; old project conventions may be opaque. Ask for the required project root/main/package, report unresolved references, preserve sources, and support a safe stop.
- **Evidence:** H1 `N0734`/`N0735` record file-location confusion, not longitudinal return behavior; the pilot treats resumption (I-11) as a hypothesis. P1 T-03; P2 packaging layout; R1 flows 07/08. **Confidence: Medium for recorded file-location friction; Low for the resume experience. Status: Observed reports + Inferred scenario.**

#### SC-05 — The creator who changes direction after investing in a slice

- **Starting state / goal:** A few boards/assets exist, but style, scope, or genre no longer fits: “Keep the parts I like; help me change course safely.”
- **Working preference / control:** Visual comparison and direct editing, with optional guided review. Needs explicit change scope and to choose what is kept, transformed, duplicated, or abandoned.
- **Observable success:** The new direction is visible in a testable slice while preserved material remains intact or intentionally retired.
- **Friction / recovery:** Destructive conversion, shared-source edits affecting unrelated boards, or sunk-cost pressure. Preview impact, keep a recoverable original, and make one-use uniqueness and cancellation visible.
- **Evidence:** H1 `CORPUS-FORUM-7148` (one source; a plan to change visual direction while retaining useful work, pilot I-08/I-10, no completed migration observed); R1 flows 01/03/10. **Confidence: Medium for the selective-redirection intent; Low for the preferred conversion/revision tools. Status: Observed plan (single source) + Inferred.**

### B. Composing places, artwork and visual motion

#### SC-06 — The scene-first board composer

- **Starting state / goal:** Rough map, desired village/room, or starter palette: “Make this place feel like the scene in my head.”
- **Working preference / control:** Canvas and palette, direct painting, stamps, visual previews; may use prose to describe mood but wants to place and adjust the result themselves.
- **Observable success:** A recognisable space can be navigated, with visible separation between art, collision, interaction and player start.
- **Friction / recovery:** Tool modes, asset/file boundaries, hidden layer mismatch, and a scene that looks traversable but is not. Keep placement immediate; provide source-labelled overlays and reversible edits.
- **Evidence:** H1 `CORPUS-FORUM-7148` supports only a visual-direction redirection intent; `CORPUS-FORUM-7751` is website design and is **not** used as support; H3 board/tile confusion lexical signals; P1 T-20–T-35; R1 flow 01, README synthesis and forest/village walkthrough. **Confidence: Low/Medium (no direct game-composition corroboration). Status: Observed single-source intent + Inferred.**

#### SC-07 — The floor-and-route planner

- **Starting state / goal:** A house, dungeon, or isometric town needs floors, stairs, walls, occlusion, routes, or deliberate pixel placement: “Let me make this multi-level space behave the way it looks.”
- **Working preference / control:** Direct geometry and tile painting interchangeably; numeric/coordinate detail remains available. Needs drawing order, traversability, activation, and floor links to remain distinct and inspectable.
- **Observable success:** The player can traverse intended connections; blocked and walk-behind regions match authored intent; invalid cells/coordinate conversions are visible before commit.
- **Friction / recovery:** Confusing visible floor with movement layer, losing off-grid fidelity, assuming decorative canopy blocks movement, or destructive coordinate conversion. Keep source coordinates and preview transforms; offer undo and per-object inspection.
- **Evidence:** O1 wall/walk-behind tile-or-vertex direction; P1 T-22–T-31; P2 `formats/board.md`, `engine/movement-and-collision.md`; R1 flow 01 and house/forest walkthrough. **Confidence: High for relevant compatibility model; Medium for creator need and proposed interaction. Status: Owner-reported + Product documentation + Inferred.**

#### SC-08 — The artist who wants to author a kit before a map

- **Starting state / goal:** Artwork ideas or an image sheet, no board yet: “Let me make a reusable vocabulary, then use it across places.”
- **Working preference / control:** Sheet-first pixel drawing, external art tool, import, or a combination. Keeps artistic decisions and tile/assembly boundaries under control; does not want authoring reduced to consuming starter art.
- **Observable success:** A named, editable tileset/kit can be previewed and reused on multiple boards without baking the map into an image.
- **Friction / recovery:** Fragmented per-tile editing, grid ambiguity, accidental identity/reference changes, or a source edit changing every use. Preview grid/selection, retain source, show use scope, support make-unique and recovery.
- **Evidence:** O1 owner-selected problem to reduce tile-making friction and preserve reusable tilesets (`decisions.md` §4.8); P1 T-36–T-39; R1 flows 03/10 and house-kit walkthrough. `CORPUS-FORUM-7751` (website) was removed as support per the research pilot. **Confidence: High for owner direction; Low/Medium for workflow preferences. Status: Owner-reported + Inferred.**

#### SC-09 — The importer with a sheet that does not fit the grid

- **Starting state / goal:** PNG/GIF or other supported art with margins, gaps, transparency, or uncertain frame order: “Use this art without making me guess what the importer guessed.”
- **Working preference / control:** Step-by-step review or direct numeric control; wants preview before import and may need to label frames/directions manually.
- **Observable success:** The selected cells/frames and transparency are correct in a preview; the source is copied only after confirmation and remains editable.
- **Friction / recovery:** Wrong grid, missing cells, unexpected key colour, rights assumptions, duplicate/overwrite, or silent classification of idle/diagonal rows. Preserve source, expose every guess, allow correction/cancel, and report license responsibility without pretending to verify rights.
- **Evidence:** H1 `B190398` (image import/transparency confusion), `N2412` (time-consuming animation import); P1 T-36/T-37/T-60/T-61; P2 `formats/images.md`, `formats/animation.md`; R1 flows 03/05. **Confidence: Medium for recorded import friction; Low for odd-spacing and preferred review workflow. Status: Observed friction + Inferred scenario.**

#### SC-10 — The pixel artist fixing one seam in context

- **Starting state / goal:** A tile looks wrong beside real neighbors: “Fix this join without repainting the whole set or surprising every board.”
- **Working preference / control:** Pixel-level direct manipulation with neighboring tiles visible, repeat preview and optional external editing. Needs to decide shared source versus a unique local copy before painting.
- **Observable success:** The seam is improved in the actual board and repeat contexts, with the effect on other uses known.
- **Friction / recovery:** Edit-in-isolation hides the seam; a shared edit has a large blast radius; external changes collide with unsaved work. Show both contexts, usage, before/after and an explicit retain/unique/cancel choice.
- **Evidence:** O1 tile-making problem; H1 `N1519` (tileset workflow complaint, not a specific seam-edit report); R1 flow 10 / morning brief; P1 T-36. **Confidence: Medium for general friction; Low for exact scope model. Status: Owner-reported problem + Inferred scenario.**

#### SC-11 — The motion-maker animating a tile or region

- **Starting state / goal:** Static water, fire, a waterfall, or existing frames: “Make it move, and let me change the motion without redrawing everything.”
- **Working preference / control:** Timeline, frame duplication, onion skin, scrub/play preview; may animate from selected regions or draw directly. Wants editable source and explicit timing/synchronization.
- **Observable success:** The animation loops or plays in the selected context; frame order, timing, source relation and multi-cell synchronization are inspectable.
- **Friction / recovery:** Separate animation/file workflows, sound/frame associations drifting, timing mismatch, or unsupported region phase semantics. Preserve source, preview order/timing, and clearly flag what is conditional rather than silently faking synchronized playback.
- **Evidence:** O1 tile/animation friction direction; H1 `A1002-2042` (whole-GIF request), `B189955` (import/animate sprites question), `K421187` (batch animation request); P1 T-39/T-60–T-62; P2 `formats/tiles.md`, `formats/animation.md`; R1 flows 03/05/10. **Confidence: Medium for recorded animation friction; Low for region phase requirements. Status: Owner-reported + Observed reports + Inferred scenario.**

#### SC-12 — The visual assembler using stamps, terrain and reusable buildings

- **Starting state / goal:** A kit and board, repeated houses/path edges/forest pieces: “Build this pattern faster, but keep its parts editable.”
- **Working preference / control:** Visual brush/stamp, terrain-role setup, and optional precise tile-by-tile edits. Needs to distinguish visual reuse from behavior-bearing reusable objects and inspect what shared edits affect.
- **Observable success:** Repeated compositions look coherent and can be revised without changing unrelated uses; game behavior is separately and explicitly attached.
- **Friction / recovery:** A stamp that secretly embeds scripts, resizing unsupported art, wrong autotile roles, or accidental gameplay changes from visual edits. Keep stamp/component meaning distinct, preview missing roles/resize limits, and provide source/use review.
- **Evidence:** P1 T-25/T-38/T-62; H1 request samples `A1002-2028`, `A1002-3170` in community-pain-points.md; R1 flow 03, flow 10, house/forest walkthrough. **Confidence: Medium for historical request existence; Low for desired brush abstractions. Status: Observed + Inferred + Hypothesis.**

#### SC-13 — The atmosphere composer

- **Starting state / goal:** A completed room that needs light, shade, images or sound: “Help me see the scene the way the player will, without baking away the source.”
- **Working preference / control:** Visual handles, canvas preview and contextual audio audition; precise colour/value controls when needed. Keeps image placement, effects and export overlays distinct.
- **Observable success:** The intended lighting/presentation is visible in game-like composition and exported imagery without editor-only guides accidentally appearing.
- **Friction / recovery:** Confusing static shading with editable lights, destructive baking, image anchor/transparency mismatch, missing media, or overlays exported as content. Preview, distinguish source and baked result, and undo/cancel conversion.
- **Evidence:** P1 T-23/T-26/T-32/T-36/T-80; P2 `formats/board.md`, `engine/display-input-audio.md`; R1 flows 01/03/07. **Confidence: High for capability context; Low for user preference. Status: Product documentation + Strategic + Hypothesis.**

### C. Creating characters, objects and interactions

#### SC-14 — The person-maker who begins with a look

- **Starting state / goal:** A character concept or sprite sheet: “Put this person in the world, give them a line and a way to respond.”
- **Working preference / control:** Choose/import look, preview direction and collision/activation, place directly on board; may switch to a reusable definition or code. Needs to distinguish shared character defaults from this placed person's overrides.
- **Observable success:** The person appears, can be approached and performs the intended interaction in a test scene.
- **Friction / recovery:** Missing directions, unclear sprite anchor, item/character terminology, or editing the reusable definition instead of the placed instance. Show the exact fallback and scope; retain the prior assignment on failed import.
- **Evidence:** H1 `K228604` (NPC creation/shop questions), `A1000-15982` (character/item distinction); P1 T-50/T-52; P2 `formats/character.md`, `engine/movement-and-collision.md`; R1 flows 01/04/05. **Confidence: Medium for recorded terminology/creation friction; Low for preferred look-first workflow. Status: Observed + Inferred.**

#### SC-15 — The party and progression designer

- **Starting state / goal:** A hero, party, equipment, abilities, and growth idea: “Make the player I have in mind and understand how they change.”
- **Working preference / control:** Structured forms, previews/curves, comparisons, and targeted code for exceptions. Needs ownership of party setup separated from character definition and imported values separated from inferred defaults.
- **Observable success:** Starting members and their visible capabilities/growth are correct in a test scenario; linked looks and programs are findable.
- **Friction / recovery:** Legacy abbreviations, incompatible equipment slots, opaque growth arithmetic, or assuming the legacy main-file stores a multi-member party. Show units/results, preserve imported values and make unsupported party data explicit.
- **Evidence:** P1 T-50–T-55/T-10–T-14; P2 `formats/character.md`, `formats/item.md`, `formats/main-file.md`; R1 flow 04 and review resolution. **Confidence: High for format constraints; Low/Medium for proposed Database interaction. Status: Product documentation + Inferred.**

#### SC-16 — The item and reward designer

- **Starting state / goal:** A potion, key, piece of equipment, shop stock, or reward: “Make an item that works in the context I intend and tell me where it can be used.”
- **Working preference / control:** Structured item records and direct preview; optionally use script for unusual effects. Wants the reusable item, board pickup/chest, inventory, and shop stock to remain distinct.
- **Observable success:** The intended item can be acquired and used in the selected context, with price, access, consumption, and linked behavior visible.
- **Friction / recovery:** Hidden usage flags, mismatch between item definition and placement, assumptions that price equals stock, or one-time state duplicated/lost. Show references and context, preserve data on unsupported plugins, and test actual acquisition/use paths.
- **Evidence:** H1 `A1000-15982` supports terminology confusion, not the whole reward scenario; P1 T-55/T-26; R1 flow 04 and locked-chest walkthrough. **Confidence: Medium for documented capability context; Low for proposed workflow. Status: Product documentation + Inferred.**

#### SC-17 — The interaction author connecting dialogue, state and world change

- **Starting state / goal:** Door, sign, person, chest, quest, or choice: “When this happens, do these things in this order, and remember what changed.”
- **Working preference / control:** Sentence-like structured actions, dialogue/choice preview, or hand code; the creator chooses when to transition between modes. Keeps ordering, conditions, persistence and branch consequences visible.
- **Observable success:** The right branch occurs in a named state, gives the intended effect once, and still behaves after returning/reloading when persistence is intended.
- **Friction / recovery:** Branch fall-through, invisible run-once variables, ambiguous cancellation, duplicate rewards, generated code diverging from edits. Preserve source, preview state and diff, keep unsupported behavior code-visible, and do not claim cross-document atomicity without a contract.
- **Evidence:** H2 command census (limited); P1 T-26/T-45; P2 `engine/rpgcode-language.md`, `formats/board.md`; R1 flow 02, walkthrough locked chest/NPC battle. `CORPUS-FORUM-8178` is not cited: it does not establish Toolkit interaction authoring. **Confidence: Low/Medium. Status: Product documentation + Inferred scenario.**

#### SC-18 — The combat designer iterating on an enemy or battle

- **Starting state / goal:** Enemy, moves, arena, or encounter idea: “Make this fight fair, readable and worth playing.”
- **Working preference / control:** Structured data with a real battle test, trace and compare; may need code/plugin-specific rules. Needs the selected battle system, seed/fixture, and unresolved formula assumptions made explicit.
- **Observable success:** A reproducible test shows what happened and which authored values/rules contributed, without attributing custom rules to the stock system.
- **Friction / recovery:** Missing battle assets/plugins, balancing based on an unrepeatable run, stale formula assumptions or result continuation ambiguity. Keep test fixture separate from ordinary Play; preserve edits and label unknown/conditional calculations.
- **Evidence:** P1 T-12/T-56–T-58/T-63; P2 `engine/plugins-and-battle.md`, `formats/enemy.md`, `formats/battle-data.md`; P3 battle epic's 2026-10-19 boundary; R1 flow 06 and walkthrough. **Confidence: High for recorded constraints and their documented amendments; Low for proposed analysis tools. Status: Product documentation + Inferred scenario.** Older flow blockers are time-qualified in §7, not automatically current.

### D. Writing, learning and pushing behavior

#### SC-19 — The creator who wants common behavior without starting in code

- **Starting state / goal:** A simple door, conversation, item grant, sound, or battle action: “Make the usual thing happen without a syntax lesson.”
- **Working preference / control:** Guided, sentence-like blocks or a form; code must remain discoverable and usable later. Needs to understand the generated behavior and retain ownership of it.
- **Observable success:** The action runs as intended, the generated code or underlying behavior is inspectable, and the creator can revise it without losing work.
- **Friction / recovery:** An overlarge block palette, a false promise that arbitrary scripts convert perfectly, hidden generated source or blocks overwritten by hand edits. Preview lowering/diffs and keep unsupported spans intact as code.
- **Evidence:** O1 common actions one-click with code available; H1 `B214779`, `N1682` (coding/syntax difficulty, not proof of preferring blocks); H2 census with parser caveats; P1 T-45; R1 flow 02. **Confidence: High for owner direction; Medium for recorded friction; Low for method preference. Status: Owner-reported + Observed reports + Inferred scenario.**

#### SC-20 — The learner who wants to understand code rather than avoid it

- **Starting state / goal:** New to scripting, has an example or copied snippet: “Explain why this works and help me change it safely.”
- **Working preference / control:** Examples, contextual command help, code-first experimentation, optional blocks as explanation—not necessarily blocks as the main editor. Needs exact source preserved and explanations tied to execution.
- **Observable success:** Can identify a syntax or behavior issue, make a change, run it in a known setup, and explain the observed result in their own terms.
- **Friction / recovery:** Parser errors detached from game effects, wrong dialect assumptions, unsafe automatic conversion, or tests that disappear. Preserve source, offer line-level fixes/diffs, and use named test state.
- **Evidence:** H1 `B214779` explicitly reports a preference for examples in [Scripting difficulty as a separate pain](evidence/community-pain-points.md#scripting-difficulty-as-a-separate-pain), not a measured learning benefit; `N1682` and `N2124` report command difficulties. P1 T-40–T-46; R1 flow 02. **Confidence: Medium for reported learning preference/friction; Low for exact sequence. Status: Observed reports + Inferred scenario.**

#### SC-21 — The code-centered boundary pusher (Riley Forge lens)

- **Starting state / goal:** Familiar with code or engine concepts, wants to configure a game and test an unusual mechanic/genre: “Let me push this system somewhere unexpected and show me quickly what works.”
- **Working preference / control:** Code editor, command discovery, direct configuration and fast inspect/run loop; may avoid the guided editor until useful. Needs access to actual supported capabilities and no claims that unsupported extensions/behaviors exist.
- **Observable success:** A custom behavior or prototype runs, its boundary and failure are diagnosable, and ordinary code remains under the creator's control.
- **Friction / recovery:** A rigid block-only path, slow testing, hidden command limits, plugin incompatibility, or generated tooling overwriting hand code. Keep code first-class and provide clear capability/errors; test whether “fast” is actually achieved.
- **Evidence:** O2 owner-reported Riley lens (bank persona, pilot/bank intent I-14). H4 finds four distinct extender or would-be extender situations (`CORPUS-FORUM-19357`, `-1435`, `-4746`, `-4812`) plus one game profile (`CORPUS-GAME-1966`), each with a different blocker, so none corroborates the fast-loop, code-first workflow as a pattern; only `-4812` mentions loop speed. RPGCode contests are **unexamined** and provide no evidence here. **Confidence: High that this is an owner-reported lens; Low for the preferred workflow and wider applicability. Status: Owner-reported lens + Observed fragments + Inferred scenario.**

#### SC-22 — The custom-screen and interface maker

- **Starting state / goal:** A title screen, menu, dialogue presentation, or custom interface assembled from text, images, fonts, shapes and buttons: “Make this screen look and behave like my game.”
- **Working preference / control:** Visual layout with direct positioning and exact fields, or code for custom effects; wants preview with meaningful data and code access for unsupported cases.
- **Observable success:** The layout displays and responds as intended for representative data, with no claim that a visual preview proves runtime behavior.
- **Friction / recovery:** Layout and game logic conflated, text overflow missed, plugin ownership or font/media missing. Preview real/worst-case data where supported, preserve source and identify the subsystem/host capability required.
- **Evidence:** H2 repeated screen-related commands are a lexical signal only; P1 T-45/T-64; P2 `engine/plugins-and-battle.md`; R1 flows 02/09. **Confidence: Low/Medium. Status: Product documentation + Strategic + Hypothesis; census does not establish preference.**

#### SC-23 — The systems tinkerer trying an unusual genre or mechanic

- **Starting state / goal:** A minigame, puzzle, alternate battle loop, or mechanic beyond familiar RPG patterns: “Let me model a small version and try it before committing to a whole game.”
- **Working preference / control:** Open-ended code, small prototype, visual sandbox, conversation, or a mixture; creator decides whether the experiment becomes a larger project.
- **Observable success:** A bounded prototype demonstrates or disproves the mechanic with an explicit list of runtime/extension assumptions.
- **Friction / recovery:** Tool imposes RPG-only assumptions, integration guidance is opaque, or a paper mock is mistaken for a running system. Keep prototype state isolated, show genuine capabilities, and label simulations versus execution.
- **Evidence:** H1 `CORPUS-FORUM-7118` (minigame construction request; separate participant claims success; advice is not adoption) and `CORPUS-FORUM-7190` (acquired systems unusable to the creator); pilot Avery composite and I-05/I-13 — a provisional two-situation composite, not a validated persona; P1 T-41/T-45; R1 flow 09. **Confidence: Medium for a historical "path from capability to working interaction" gap; Low for breadth of genres and preferred mode. Status: Observed (two situations) + Inferred + Strategic.**

### E. Extending the system and specialist workflows

#### SC-24 — The project author configuring an extension

- **Starting state / goal:** An extension or custom battle/menu system is present but unfamiliar: “What does this add, and how do I use it in this project?”
- **Working preference / control:** Guided capability review, then shared structured forms or specialist panel; may inspect extension docs/code. Needs explicit consent before enable/order/replacement and a clear view of project data affected.
- **Observable success:** The intended capability appears in authoring/test surfaces, plugin-owned fields are editable or clearly unavailable, and switching system does not silently rewrite assets.
- **Friction / recovery:** Installing without integrating, unsupported host, missing editor contribution, data becomes opaque after uninstall. Preserve data, report compatibility/ownership, and allow disabling or returning to prior selection.
- **Evidence:** H1 `CORPUS-FORUM-7190` and, from H4, `CORPUS-FORUM-12372` (a second 2004 creator unable to run an acquired battle system; different thread starter); H3 plugin/editor request `A1002-10213`; P2 `engine/plugins-and-battle.md`, ADR 0004; R1 flow 09 and decision §4.7; pilot I-13. Resolutions are unknown in both and the cause (install, dependency, version gap, documentation) is unresolved. **Confidence: Medium for integration confusion for acquired battle systems in one 2004 period; Low for other system types and the proposed authoring contract. Status: Observed (two situations) + Owner-reported problem direction + Inferred.**

#### SC-25 — The extension author who must make their data authorable

- **Starting state / goal:** A plugin adds fields, records, commands, previews, or a specialist editor: “Let creators configure my extension without forcing me to build a second application.”
- **Working preference / control:** A bounded shared contribution model for straightforward data; purpose-built UI where forms do not fit. Needs ownership, validation, migrations, persistence, host compatibility and preview boundaries explicit.
- **Observable success:** An extension's data can be created, validated, saved, reopened, tested and retained when extension availability changes.
- **Friction / recovery:** Over-general schema, private filesystem access, custom UI bypassing undo/save, collision with other plugin fields, or unsafe trust assumptions. Keep unknown data, surface ambiguity and do not pretend existing runtime interfaces already provide editor APIs.
- **Evidence:** O1 robust plugin editing is an owner-selected problem direction; H1 `A1002-10213`; H4 author-side fragments (`CORPUS-FORUM-19357` SDK entry barrier, `-4746` plugin cannot reach the editor, `-1435` and `-4812` missing or undocumented commands) are a research lead, not a pattern, and are not evidence about plugin editing; P2 ADR 0004; R1 flow 09 and `reawakened-fit.md` §6–7. **Confidence: High for problem direction; Low for solution mechanics and for creator demand. Status: Owner-reported + Observed request + Strategic/Hypothesis.**

### F. Testing, diagnosing and recovering

#### SC-26 — The author checking a local change in play

- **Starting state / goal:** Has changed a board/object/script and wants to inspect the result now: “Test this part of the game, not just the configured start.”
- **Working preference / control:** Fast play loop with an explicit test position or named scenario; may prefer a test action from the selected object or program. Needs to know which saved revision and starting state are running.
- **Observable success:** The intended changed scene/action runs from an understandable start state; failure does not discard authoring changes or launch stale files as if current.
- **Friction / recovery:** Ordinary Play and test fixtures conflated, click position accidentally triggers an event, save failure hidden, or unseeded run treated as reproducible. Separate these outcomes and permit restart/repeat where supported.
- **Evidence:** P1 T-07/T-41; H1 crash/run reports `N0235`, `N0814`, `B324936`, `B294347` in community-pain-points.md; R1 flows 01/02/05/06/07 and resolution. **Confidence: Medium for historical failure signal; Low for proposed Play policy, explicitly not owner-selected. Status: Observed + Product documentation + Inferred.**

#### SC-27 — The debugger tracing a behavior that did not happen

- **Starting state / goal:** A trigger, script, route, variable or battle behaves unexpectedly: “Show me where the game diverged from what I expected.”
- **Working preference / control:** Step/continue, breakpoints, watch values, route/walkability overlays, plain-language trace; advanced code debugging may be essential. Needs diagnostics that distinguish missing configuration from runtime failure.
- **Observable success:** The creator can identify a concrete cause and verify a correction in a repeatable scenario without changing state merely by inspecting it.
- **Friction / recovery:** Silent no-op, misleading preview, racey state, inaccessible debugger, or fabricated explanation for custom code. Show observable state and uncertainty; retain scenario and logs for retry.
- **Evidence:** P1 T-07/T-41/T-26; P2 `engine/rpgcode-language.md`, `engine/plugins-and-battle.md`; R1 flow 02 and board/battle walkthroughs. Historical source includes script difficulty IDs in H1, but not a direct debugging preference. **Confidence: Low/Medium. Status: Product documentation + Strategic + Hypothesis.**

#### SC-28 — The combat balancer comparing runs

- **Starting state / goal:** A fight seems too hard/easy or a formula change is being explored: “Use the same setup twice and show me why the outcome changed.”
- **Working preference / control:** Named party/enemy fixture, seed, trace and comparison; direct controls for changing inputs. Needs explicit separation of stock battle rules, plugin rules and assumptions not settled by the spec.
- **Observable success:** Two comparable results show inputs and trace differences; analysis labels measured behavior versus inference.
- **Friction / recovery:** Ordinary Play has no selected-seed guarantee, formula conflicts, custom plugin behaviors, or hidden test state. Keep fixtures explicit, show seed/rules, and do not apply stock formulas to a different system.
- **Evidence:** P2 `engine/plugins-and-battle.md`; P3 current battle epic boundary; R1 flow 06 and review resolution. No corpus source establishes demand for comparative battle analysis. **Confidence: Low for creator demand and workflow; the cited documents establish only context. Status: Strategic + Open hypothesis.**

#### SC-29 — The creator protecting work after an interrupted session

- **Starting state / goal:** Browser/editor crash, failed save, accidental destructive edit, or a lost machine: “Recover the version I was working on and know what was actually saved.”
- **Working preference / control:** Automatic recoverable drafts plus explicit save/backup/history may differ by host; wants choice among versions and a clear durable-save signal. Keeps control over which recovery is accepted.
- **Observable success:** The last confirmed project is intact; recoverable edits can be reviewed/applied; failure names the affected asset and preserves the prior version where host guarantees permit.
- **Friction / recovery:** Drafts mistaken for durable backups; multi-document partial recovery; quota/permission loss; conflicting external edits. Show host limits and last durable save, preserve alternate copies, and never promise cross-host recovery unsupported by contract.
- **Evidence:** H1 `N0453`, `G251002-141947`, `B117012`, `B296124`, `B326326`, `B327387`; H3 loss/save/crash/corruption caveats; R1 decisions §2, flows 07/10, review resolution; AD-19 as summarized in `reawakened-fit.md`. **Confidence: High for consequential loss reports; Medium for recovery needs; preferences not measured. Status: Observed + Product documentation + Inferred.**

#### SC-30 — The careful reviser changing shared data

- **Starting state / goal:** A rename, tile edit, component change, bulk balance edit, or deletion touches multiple references: “Tell me what will change before applying it.”
- **Working preference / control:** Reference/use graph and a diff, then direct choice to apply/replace/duplicate/cancel. Needs uncertain/dynamic references clearly separated from proven links.
- **Observable success:** The selected changes occur and other uses remain intact; unresolved references are not silently rewritten or declared safe.
- **Friction / recovery:** Stale references, computed strings, multi-document updates without atomic transactions, or one undo promise exceeding AD-19. Preview scope, retain source and avoid claiming project-wide undo until supported.
- **Evidence:** P1 T-03/T-28/T-38; R1 flows 03/04/07/10 and `reawakened-fit.md` §5; H1 save/edit friction. **Confidence: High for documented cross-document gaps; Low/Medium for preferred interface. Status: Product documentation + Inferred.**

### G. Working with others, importing and finishing

#### SC-31 — The collaborator handing off a project

- **Starting state / goal:** Another person needs to review, continue, or contribute to a project: “Give them the real editable project and make it clear what they need.”
- **Working preference / control:** Could use version control/code review, shared files, or a packaged handoff; the creator chooses what is shared. Needs source ownership, dependencies, licensing and conflicts visible.
- **Observable success:** A recipient can open the intended revision, understand required plugins/assets and contribute without hidden machine-local paths or accidental data loss.
- **Friction / recovery:** Path/format/plugin mismatch, omitted dependencies and conflicting edits are plausible failures. Needs explicit handoff contents and recoverable originals; no live co-editing or cloud-sync solution is implied.
- **Evidence:** P1 T-01/T-03/T-05/T-06/T-70–T-74; P2 `formats/packaging-and-paths.md`; R1 flow 07/reawakened-fit. Direct collaboration evidence absent. **Confidence: Low. Status: Strategic + Hypothesis.**

#### SC-32 — The creator preparing a game for someone else to play

- **Starting state / goal:** A working project, a friend or audience: “Make a playable copy they can open, and tell me if anything is missing.”
- **Working preference / control:** Guided build profile and preflight, with output file list and direct access to advanced packaging options. Needs to choose package form, destination and what dependencies are included.
- **Observable success:** A produced package opens in the intended supported host and includes an intelligible report; a web build is not misrepresented as a hosted link.
- **Friction / recovery:** Missing assets, plugins, licenses, unclear output location/format, or upload privacy/expiry not settled. Preflight, preserve source project, report failures, and separate downloadable export from actual hosting.
- **Evidence:** H1 `CORPUS-GAME-735` (compact finished project shared) and `CORPUS-GAME-764` (full release with manual installation steps), the pilot's Ellis composite and I-12 — claims and instructions, with recipient success unobserved; pain-point IDs `A1001-14258`, `B253278`, `N3451`; H3 packaging how-to lexical hits; P1 T-70–T-74; P2 `formats/packaging-and-paths.md`; R1 flow 07, review resolution. **Confidence: Medium for historical sharing intent and distribution friction; High for output-contract constraints; sharing-link demand unvalidated. Status: Observed + Product documentation + Inferred.**

#### SC-33 — The creator exploring configuration without wanting to touch it daily

- **Starting state / goal:** A project mostly works; wants to change input, movement, display, plugin or startup behavior: “Let me find the setting that affects this, but keep defaults out of my way.”
- **Working preference / control:** Contextual settings and effective-value explanation; experts may directly inspect project text. Needs one identifiable owner for each setting and a way to override conventions intentionally.
- **Observable success:** The intended behavior changes, source of the effective value is understandable, and the creator can restore the prior/default state.
- **Friction / recovery:** Settings split across historical categories, hidden file semantics, or defaults treated as locked rules. Search and owner links help; edits remain explicit and reversible.
- **Evidence:** Owner O1 hidden main-file direction in `decisions.md` §4.6; P1 T-10–T-14; P2 `formats/main-file.md`; R1 flow 08 and shell flow 07. **Confidence: High for owner direction and setting inventory; Low/Medium for proposed interaction. Status: Owner-reported + Product documentation + Inferred.**

#### SC-34 — The creator who needs an accessible or personally fitted way to work

- **Starting state / goal:** A creator uses keyboard navigation, assistive technology, different input, display, language or cognitive supports: “Let me make the same game without depending on a mouse-only or color-only workflow.”
- **Working preference / control:** Multiple equivalent input/representation paths; may need reduced motion, labels, focus order, scalable views or plain-language help. Needs accommodation to be configurable without removing advanced capability.
- **Observable success:** The selected task can be completed and diagnosed through their usable input/output mode, with equivalent authored state.
- **Friction / recovery:** Canvas-only controls, hover-only information, color-only overlays, tiny controls, or inaccessible error dialogs. Provide focusable alternatives, textual summaries, retry and preserved context.
- **Evidence:** R1 flow 07 §8 contains proposed accessibility directions; no usability/audit evidence for this inventory. **Confidence: Low. Status: Strategic + Hypothesis.**

### H. Contrasting methods and contexts not fully exercised by the ten flows

These additions deliberately separate needs that a first-board walkthrough can hide. Evidence remains attached individually; their inclusion is not a claim that every creator wants them.

#### SC-35 — The conversational collaborator who retains final authorship

- **Starting state / goal:** A working quest needs a change: “Help me make the guard recognize the stolen badge, but leave my dialogue alone.”
- **Working preference / control:** Conversation to clarify intent, followed by inspecting proposed changes in whatever representation they understand. Controls scope, private material shared with a service, accepted changes, and whether anything runs.
- **Observable success:** The creator can explain the proposal, accept only the intended behavior, and demonstrate both badge-present and badge-absent outcomes; unrelated dialogue is unchanged.
- **Friction / recovery:** A fluent answer invents commands, alters unrelated scenes, or loses context after a long exchange. Needs explicit uncertainty, inspectable changes, rejection and restoration without undoing unrelated human edits.
- **Evidence:** R1 flow 02's assisted authoring direction; pilot I-06/I-07 (strategic; historical peer assistance is not validation of AI demand); S2 introduces constrained conversational revision and privacy needs. **Confidence: Low for this workflow; no observed conversational session. Status: Strategic + Open hypothesis.**

#### SC-36 — The independent maker who declines conversational assistance

- **Starting state / goal:** Has a clear design and perhaps no network: “Let me make this myself; don't make explaining it to an assistant the price of entry.”
- **Working preference / control:** Direct manipulation, forms, local reference or code; chooses when help appears. Controls privacy, reproducibility and pace, without being labelled an expert solely for declining assistance.
- **Observable success:** Completes and saves a chosen authoring task without a conversational service or unsolicited generated edits.
- **Friction / recovery:** Guidance becomes a gate, network loss blocks local work, or defaults re-enable assistance. Needs a usable independent route and preservation of locally completed work.
- **Evidence:** S2 counterexample to SC-35; O1 keeps code first-class but does not establish anti-AI or offline preferences. **Confidence: Low. Status: Open hypothesis.**

#### SC-37 — The hybrid author switching representations mid-task

- **Starting state / goal:** A visual interaction now needs a custom exception: “Keep the ordinary bits easy to edit, and let me write this one part.”
- **Working preference / control:** Structured actions plus code, moving in either direction when representable. Controls which artifact is authoritative and whether a hand edit becomes detached or remains linked.
- **Observable success:** The exception executes, surrounding behavior remains intact, and a later visual edit does not erase the hand-written portion; unsupported conversion is explicitly declined.
- **Friction / recovery:** Regeneration overwrites work or two representations disagree. Needs preservation, comparison, an explicit choice about authority, and recovery of the previous behavior.
- **Evidence:** R1 flow 02 §§Data and native-format implications/Open questions; ADR 0004 non-destructive dialect handling is context, not a visual round-trip promise. **Confidence: Medium for documented design tension; Low for preferred resolution. Status: Inferred + Open hypothesis.**

#### SC-38 — The world connector testing travel rather than decoration

- **Starting state / goal:** Two finished spaces do not yet form a journey: “Make this doorway lead into the inn and bring me back to the right place.”
- **Working preference / control:** Spatial linking, destination forms or explicit script. Controls arrival position, direction, conditions, return route and what carries between spaces.
- **Observable success:** The player traverses both ways from intended approaches and arrives somewhere traversable with the intended quest state.
- **Friction / recovery:** Wrong destination, one-way traps, coordinates interpreted differently or entry scripts immediately sending the player away. Needs a trace of the transition, correction without rebuilding boards, and a way to get out of a bad arrival.
- **Evidence:** H1 `B250200` asks about board linking; `B303403` reports links not working. P1 T-20–T-35; R1 flow 01. **Confidence: Medium for recorded need; Low for preferred method. Status: Observed reports + Inferred scenario.**

#### SC-39 — The scene director coordinating action, dialogue and interruption

- **Starting state / goal:** Characters and dialogue exist separately: “Stage the reunion, then give control back even if the player skips it.”
- **Working preference / control:** Rehearsal with direct positioning, structured sequences or code. Controls order, concurrent motion, waiting, camera/audio emphasis and interruption behavior.
- **Observable success:** Both full playback and the chosen interruption path leave the intended characters, controls and story state ready for subsequent play.
- **Friction / recovery:** Characters block one another, waits never finish, repeated entry replays rewards or skipping leaves input locked. Needs a known rehearsal start, visibility into waits, and restoration of pre-rehearsal authored state.
- **Evidence:** H2 records movement/dialogue commands but cannot establish cutscene preferences; R1 flows 01/02/05 offer pieces, not a complete interruption walkthrough. **Confidence: Low for integrated scenario. Status: Inferred + Open hypothesis.**

#### SC-40 — The sound designer judging the scene by ear

- **Starting state / goal:** A place or event is visually complete but sounds wrong: “Keep the music flowing between these rooms and put the impact on the right moment.”
- **Working preference / control:** Audition in context, structured assignments and/or script. Controls source assets, levels, timing, looping, replacement and the project's intended MIDI sound.
- **Observable success:** The selected scene and transition produce the intended audible sequence; the creator can distinguish missing playback from an event that did not happen.
- **Friction / recovery:** A preview uses different sound settings from play, music restarts unexpectedly, frame sounds drift, or a bank is absent. Needs a reproducible audition, clear failure cause and retained prior assignments.
- **Evidence:** P1 T-80; P2 `display-input-audio.md` §§Audio/R-59 and foundation epic's audio handoff; R1 flows 01/05/06/08. R-59 is now recorded as settled, not a new blocker. **Confidence: High for documented audio context; Low for preferred sound-design workflow. Status: Product documentation + Inferred.**

#### SC-41 — The noncombat creator resisting RPG defaults

- **Starting state / goal:** A walking story, investigation or social puzzle needs characters but no fighting: “Let these people remember what I said; I don't want enemies or levels.”
- **Working preference / control:** Dialogue, spaces and state in visual, form or code workflows. Controls which systems exist, not just which controls are hidden.
- **Observable success:** The slice is playable without accidental encounters or mandatory combat setup, and its stateful interactions work independently.
- **Friction / recovery:** Every person requires battle fields, templates quietly enable combat, or removing an unused package breaks unrelated behavior. Needs dependencies explained and a recoverable way to omit or replace a system.
- **Evidence:** S2 genre counterexample; ADR 0005 independent product and battle epic's current actor/package distinction provide context, not audience evidence. **Confidence: Low for creator demand. Status: Strategic + Open hypothesis.**

#### SC-42 — The systems tuner making a deliberate bulk change

- **Starting state / goal:** Many related items, enemies or skills already exist: “Make early-game healing less dominant without destroying the exceptions.”
- **Working preference / control:** Structured comparisons, batch forms or code-generated data. Controls selection, units, formulas, outliers and which changes are committed.
- **Observable success:** Intended records change, excluded exceptions stay unchanged, and representative play situations show the chosen effect.
- **Friction / recovery:** A mass operation affects unrelated records or a numerical improvement harms actual play. Needs a scoped comparison, a record of what changed, and reversible application.
- **Evidence:** P1 T-50–T-58 establishes editable data; R1 flow 06 proposes battle testing. Neither proves demand for batch tuning. **Confidence: Low. Status: Inferred + Open hypothesis.**

#### SC-43 — The behavior reuser adapting an example without accidental coupling

- **Starting state / goal:** A working chest or shop example is close to the desired result: “Use this pattern, but make this chest need a different key.”
- **Working preference / control:** Copy, parameters, guided adaptation or code reading. Controls what stays shared, what becomes independent and which state is per instance.
- **Observable success:** Two adapted instances behave differently where intended and do not share opened flags or rewards by accident.
- **Friction / recovery:** A copied reference still points at the original program or variable; modifying a template changes existing uses. Needs inspectable relationships and recovery of either the shared or independent version.
- **Evidence:** H1 `B214779` reports a preference for examples in [Scripting difficulty](evidence/community-pain-points.md#scripting-difficulty-as-a-separate-pain); that does not validate reusable templates. R1 locked-chest walkthrough and flow 02 reveal run-once/state questions. **Confidence: Medium for the reported preference; Low for the adaptation workflow. Status: Observed report + Inferred scenario.**

#### SC-44 — The external-tool specialist reconciling two edits

- **Starting state / goal:** An image or program is open here and changed in another tool: “Bring in my new artwork without losing the unsaved change I made here.”
- **Working preference / control:** Existing external art/code tools plus contextual editing here. Controls which version wins, identity, scope and whether external changes are automatic.
- **Observable success:** The intended combined or selected version is visible in context and survives reopen; the rejected version remains recoverable until the choice is confirmed.
- **Friction / recovery:** Silent reload discards work, stale cached content misleads, or an export overwrites the source. Needs clear conflict detection and a deliberate retain/reload/reconcile choice.
- **Evidence:** Architecture AD-19 names external change and document lifecycle; R1 flows 03/07/10. **Confidence: High for documented lifecycle concern; Low for creator preference and reconciliation method. Status: Product documentation + Inferred.**

#### SC-45 — The group resolving overlapping contributions

- **Starting state / goal:** Two contributors changed the same area from a shared baseline: “Keep both improvements and help us find what disagrees.”
- **Working preference / control:** File exchange, version-control review or asynchronous handoff; live co-editing is not assumed. Controls authorship, accepted changes and ownership of shared resources.
- **Observable success:** The group can identify and resolve the collision, open the reconciled project and demonstrate both retained contributions.
- **Friction / recovery:** Silent last-writer wins, mergeable text with broken references, or unclear ownership. Needs preserved originals and an understandable conflict even when no automatic merge is safe.
- **Evidence:** S2 extends SC-31; AD-19 is per-document lifecycle context, not a multiplayer editing or semantic merge contract. No team study reviewed. **Confidence: Low. Status: Open hypothesis.**

#### SC-46 — The translator preserving meaning and layout

- **Starting state / goal:** A playable scene needs another language: “Translate the conversation without changing its branches or breaking the message box.”
- **Working preference / control:** Text-oriented structured work, contextual preview and specialist handoff; not necessarily code. Controls wording, speaker context, untranslated content, fonts and language-specific presentation.
- **Observable success:** Both languages follow the same intended branches, show the right speaker/text, and remain readable in play.
- **Friction / recovery:** Text embedded in scripts, mistranslated variable substitutions, clipped choices or unsupported glyphs. Needs context, validation of non-translatable parts and restoration of previous wording.
- **Evidence:** S2 research addition; P1 script/font facilities are context only. No localization workflow or audience evidence examined. **Confidence: Low. Status: Open hypothesis.**

#### SC-47 — The teacher or mentor using a bounded exercise

- **Starting state / goal:** A group or individual is learning from a prepared project: “Let them change one thing, see why it happened, then try their own variation.”
- **Working preference / control:** Guided steps with room for experimentation; learners may choose code or visual editing. Controls starting materials, pace, private work and when help reveals an answer.
- **Observable success:** The learner makes a meaningful variation and explains its effect, rather than merely reproducing clicks; resetting the exercise does not erase their separate project.
- **Friction / recovery:** Instructions drift from the tool, copying masks misunderstanding, or setup consumes the lesson. Needs a known starting state, local reference and safe reset.
- **Evidence:** P1 T-45 and P2 tutorial planning are product intent, not classroom research; S2 adds the teaching context. **Confidence: Low. Status: Strategic + Open hypothesis.**

#### SC-48 — The interrupted maker returning for a short session

- **Starting state / goal:** Has limited time, intermittent connectivity, or must change machines: “Show me what I was doing and let me make one small change safely.”
- **Working preference / control:** Familiar mode with little repeated setup. Controls local versus transferred work, what was actually saved and which machine's version is current.
- **Observable success:** Resumes the intended task, completes one bounded change and later recovers that exact state without a mistaken overwrite.
- **Friction / recovery:** Missing permissions, missing dependencies, unsaved browser state, stale copies or expensive reloading. Needs a truthful persistence boundary and a safe handoff; automatic sync and universal offline support are not assumed.
- **Evidence:** H1 loss reports `N0453`, `G251002-141947` motivate preservation only; AD-20 host capabilities and R1 flow 07 provide context. Short-session/cross-device preference is S2. **Confidence: Medium for recorded loss concerns; Low for this workflow. Status: Inferred + Open hypothesis.**

#### SC-49 — The legacy project steward preserving before modernizing

- **Starting state / goal:** Receives an old folder, package or partial backup: “First tell me what can be recovered; don't rewrite the only copy.”
- **Working preference / control:** Inventory and diagnostic review before guided or manual repair. Controls originals, unknown dependencies, compatibility choices and whether to adopt newer features.
- **Observable success:** A recoverable copy opens or produces specific unresolved-dependency/format reports; original artifacts remain intact and any conversion is explicitly chosen.
- **Friction / recovery:** Main file outside the apparent project, missing DLLs/assets, ambiguous dialect or unsupported EXE. Needs partial inspection, missing-resource reporting and a safe stop—not a promise that every old game is editable or runnable.
- **Evidence:** H1 `N0734`/`N0735` record file-location confusion; P2 packaging §§Project layout/Standalone EXE, ADR 0004 non-destructive source handling and ADR 0005 import/playback distinction; R1 flows 07/08. **Confidence: High for documented boundaries; Low/Medium for the composed stewardship task. Status: Observed reports + Inferred.**

#### SC-50 — The pack maker sharing editable ingredients rather than a game

- **Starting state / goal:** Has a reusable house kit, animation set or behavior example: “Give another creator something they can use and change without my whole project.”
- **Working preference / control:** Curated asset/source selection, examples and attribution. Controls dependencies, editable sources, versions and redistribution permission.
- **Observable success:** A recipient imports the intended material into a different project, understands its allowed use and can alter it without private or unrelated material being included.
- **Friction / recovery:** Hidden dependencies, naming collisions, unclear rights or updates breaking consumers. Needs inclusion review, provenance and a reversible import; no marketplace is presumed.
- **Evidence:** O1 reusable tileset direction; R1 flows 03/09/10; S2 adds creator-to-creator distribution and asset-only authors. **Confidence: Medium for reuse direction; Low for distribution workflow. Status: Owner-reported direction + Inferred + Open hypothesis.**

#### SC-51 — The release maintainer responding to player feedback

- **Starting state / goal:** A demo is already with players: “Fix this report, prove which build fixes it, and don't casually destroy their progress.”
- **Working preference / control:** Reproduce reported state, revise, compare and package; could be entirely manual. Controls release identity, included files, audience and communicated save compatibility.
- **Observable success:** The reported failure is reproduced in the old build and resolved in the candidate; a recipient can identify the build and its stated compatibility limits.
- **Friction / recovery:** Report lacks version/context, local assets mask omissions, or save compatibility is assumed. Needs a minimal reproduction, clean-package check, retained previous release and explicit migration limits.
- **Evidence:** R1 flow 07 covers sharing, not a release-maintenance study; architecture AD-23 addresses schema evolution, not a blanket player-save promise. S2 introduces report/build lifecycle. **Confidence: Low. Status: Inferred + Open hypothesis.**

#### SC-52 — The player-accessibility author testing alternatives

- **Starting state / goal:** A game relies on color, timing, sound or fine pointer movement: “Let people understand and play this without that one channel being mandatory.”
- **Working preference / control:** Adjust game content/settings and test with contrasting player needs. Controls artistic intent, timing, alternatives and which accommodations are game-specific.
- **Observable success:** A chosen encounter or interaction remains understandable and completable through the intended alternative, with its consequence unchanged.
- **Friction / recovery:** Editor accessibility is mistaken for accessible game output; alternative inputs reveal hidden timing assumptions. Needs realistic play checks and revision without forking the whole game.
- **Evidence:** S2; distinct from creator accessibility SC-34. No player accessibility testing or universal support claim in reviewed evidence. **Confidence: Low. Status: Strategic + Open hypothesis.**

#### SC-53 — The organizer finding and changing content at project scale

- **Starting state / goal:** Many similarly named assets and scripts have accumulated: “Find the version actually used in this scene, and clean up without breaking anything.”
- **Working preference / control:** Search, categorized inspection, direct navigation or code references. Controls renames, deletions, uncertain references and archival copies.
- **Observable success:** Finds the actual referenced material, completes a deliberate rename or removal and verifies affected scenes; uncertain dynamic references remain explicitly uncertain.
- **Friction / recovery:** Display names hide identity, runtime-built paths evade reference discovery or apparently unused assets are needed later. Needs impact review and recoverable changes rather than an authoritative-looking but incomplete “unused” verdict.
- **Evidence:** P1 project/file tools; R1 flow 02 path/identity caveat and flow 07 project shell; S2 adds scale and cleanup. **Confidence: Low for creator workflow; Medium for documented reference concerns. Status: Inferred + Open hypothesis.**

#### SC-54 — The extension user isolating an update or ordering conflict

- **Starting state / goal:** A previously working project behaves differently after changing extensions: “Tell me what changed and let me get back to the working combination.”
- **Working preference / control:** Configuration comparison, controlled disabling/reordering and a known test; code inspection is optional. Controls versions, active contributions and whether extension-owned data is retained.
- **Observable success:** Identifies a reproducible combination causing the difference and restores a known working selection without silently discarding authored data.
- **Friction / recovery:** Overridden behavior is invisible, disabling one extension invalidates another, or perceived editor safety is mistaken for a sandbox. Needs provenance and an explicit recovery path, not an invented trust-tier guarantee.
- **Evidence:** S2 research addition, with no observed update/conflict/recovery session. ADR 0004 §One Contract, Composition, No Trust Tiers supplies **composition context only**; R1 flow 09 explores editor contributions, not version rollback. **Confidence: Low for both creator demand and the diagnostic/recovery workflow. Status: Open hypothesis.**

## 4. Intent clusters and workflow synthesis

**New analytical synthesis, not a design ruling.** These clusters describe overlapping needs, not mutually exclusive creator types, architecture, or navigation. “Could share” means a candidate underlying capability to investigate, not approval of a common data model, service, screen or API.

| Intent cluster | Scenarios | Shared workflow needs / possible common capability | Meaningful differences |
|---|---|---|---|
| Find a next step and retain authorship | SC-01–05, 35–37, 47–49 | Clarify intent, surface assumptions, preserve alternatives and resume context. Different methods could support the same understandable, editable next step. | An outline is not a playable scene; guided creation differs from preservation-first import; declining conversation is not an expert-only preference. |
| Make a place and visual language | SC-06–13, 38–40, 44, 50 | Preview in context; understand source versus use; compose, revise and audition without losing originals. | Kit creation can precede a board; travel differs from decoration; sound needs audible verification; external tools may remain the preferred source editor. |
| Define entities and behavior | SC-14–18, 39, 41–43 | Connect reusable definitions, placed instances and persistent consequences; inspect effects in meaningful starting states. | Party growth, item acquisition and enemy tuning are distinct; noncombat stories may need none of the stock battle setup; current battle boundaries differ from older flow language. |
| Learn or express logic | SC-19–23, 35–37, 43, 47 | Understand and revise behavior through code, structured actions, examples or dialogue without losing unsupported work. | Code learning differs from avoiding syntax; code-first Riley is one owner lens; explaining a result differs from generating it. |
| Extend authoring | SC-24–25, 41, 54 | Discover effective contributions, understand compatibility and retain data through changes. | Configuring an extension differs from authoring one; runtime composition does not establish editor contributions, sandboxing or version rollback. |
| Verify and protect work | SC-26–30, 39, 42, 44–45, 48–49, 51, 53–54 | Reproduce conditions, locate causes, understand change impact and restore a known state. | Local Play differs from a repeatable fixture; one-file undo differs from project recovery; autosave differs from independent backup; contributor conflict differs from crash recovery. |
| Hand off, configure and include others | SC-31–34, 40, 45–52 | Communicate dependencies, intended settings, scope and usable alternatives to another person or future self. | Project handoff, translation, editable packs and game releases are different deliverables; creator accessibility differs from player accessibility; downloadable export differs from hosted sharing. |

### Overlap worth testing

- **Source and use awareness:** SC-08–13/44/50 could share the ability to inspect an original, its derived material and where each is used. This does not require one editor or one asset format.
- **Change impact:** SC-04/05/10/14–18/30/33/42/45/53/54 could benefit from answering “what will this affect?” Known references and dynamically constructed references have different certainty; no complete dependency graph is promised.
- **Repeatable starting conditions:** SC-17/18/26–28/39/47/51 share a need to revisit a situation, but rehearsal, teaching, ordinary play and bug reproduction differ in what must be controlled.
- **Explanation without forced assistance:** SC-01/03/19/20/24/35–37/47 may share understandable explanations and inspectable outcomes while retaining different authorship preferences.
- **Recoverable change:** SC-05/09/10/29/30/31/44/45/48/49/54 all involve preserving work. Local undo, backup, import preservation and conflict resolution are distinct capabilities, not interchangeable solutions.

### Coverage matrix: how the space was explored

This is a **sampling frame for further discovery**, not demographic segmentation, a priority score or proof of completeness. Each axis was crossed with task stage, preferred method and failure/recovery; not every Cartesian combination warrants its own duplicate card.

| Axis | Contrasts represented | Remaining uncertainty |
|---|---|---|
| Experience | First project SC-03; learning SC-20/47; domain-skilled artist SC-08/10; engineer SC-21; returner SC-04/49 | Experience in art, code and game design can vary independently. No validated segments or frequencies. |
| Starting material | Idea SC-01/02; blank scene SC-06; purchased/shared sheet SC-09; old project SC-49; existing release SC-51 | Rights, format versions and completeness of real materials vary; no representative import sample here. |
| Stage of work | Explore SC-01/23; compose SC-06–18; refine SC-05/42; diagnose SC-27; recover SC-29; transfer SC-31/50; release/maintain SC-32/51 | Longitudinal journeys and abandonment are not observed. |
| Working method | Direct manipulation SC-06/10; forms SC-15/16/33; code SC-20/21; guided SC-03/47; conversation SC-35; hybrid SC-37; external tool SC-44; assistance declined SC-36 | These are task conditions, not permanent personality traits. Preference and actual performance may disagree. |
| Creative ambition | Story SC-02/17/39; places/art SC-06–13; sound SC-40; stock/custom systems SC-18/21/24; unusual genre SC-23/41; assets only SC-50 | No demonstrated demand for each genre. Procedural generation and multiplayer authoring remain unexplored, not promised. |
| People and handoffs | Solo SC-05; mentor SC-47; specialist SC-44/46/50; collaborator SC-31/45; player report SC-51 | No team observations; role permissions, live co-editing, safeguarding and moderation are not established. |
| Constraints and access | Limited session/network SC-36/48; host differences SC-31/33; creator access SC-34; multilingual content SC-46; player access SC-52 | Small devices, low-end hardware, assistive technology and non-English editor use need direct research, not assumed parity. |
| Failure and recovery | Wrong creative choice SC-05; bad reference SC-27/53; unsupported input SC-49; save loss SC-29; concurrent edits SC-44/45; extension conflict SC-54 | Actual guarantees belong to product contracts; recovery needs here do not prove mechanisms exist. |

## 5. Tensions and counterexamples to preserve

**New interpretation from the cited scenarios:** these tensions are research questions, not measured preference distributions. The owner explicitly keeps both common-action simplicity and full capability; historical reports include both scripting difficulty (`N1682`, `B214779`) and affection for scripting (`N0814`, `K487670`). Those reports support retaining the contradiction, not assigning proportions to either side.

1. **Guidance versus autonomy:** some scenarios invite the editor to propose a project shape; others require explicit control of every interpretation. Do not average this to a universal “AI-assisted” persona. A useful research question is where review/confirmation is necessary and where direct manipulation is faster.
2. **Visual-first versus code-first:** common one-click behavior is an owner direction, not a requirement that all creators begin with blocks. SC-20 and SC-21 are counterexamples to blocks-only; SC-06/14 are counterexamples to code-only.
3. **Starter content versus authored-from-scratch:** starter assets can shorten a first task but are not evidence that artists want to consume a fixed pack. Licensing and missing assets can make the starter route unavailable; no-art/import/draw paths must remain visible in the design space.
4. **Local speed versus global safety:** a fast shared edit may affect many boards; a cautious diff may slow a one-off edit. Test both shared and unique workflows rather than mandate one default from these documents.
5. **Legacy familiarity versus creator-language concepts:** returning users may seek original paths and data; new creators may not know file names/layers. Preserve inspection access without forcing file-first authoring.
6. **Reproducibility versus natural experimentation:** named seeds and fixtures aid debugging/balance; ordinary play should not be portrayed as deterministic test unless the contract says so.
7. **Flexible extensions versus predictable authoring:** current runtime composition is deliberately ungated (ADR 0004); a proposed editor contract must not be mistaken for a security boundary. Editor contribution lifecycle and migration experience remain research questions. “Can load a plugin” does not imply “can edit/test all its data.”
8. **Project completion versus tool mastery:** finishing and sharing is a strategic product goal; some creators may prefer experimentation or learning without shipping. Do not treat completion as the only successful creator outcome.
9. **Conversation versus trust:** conversational assistance may reduce translation burden, yet silently generated content can reduce agency or misstate unsupported capability. There is no direct usability evidence here for autonomous generation.
10. **Solo revision versus collaboration:** safe local recovery is evidenced more than concurrent collaboration. Do not infer cloud/team collaboration demand from packaging or project handoff.

## 6. Evidence gaps and research leads

- The corpus is selected, historically skewed and not a controlled or representative user study. It contains message counts rather than creator-level rates, task completion, time-on-task, or the full help-thread context. Do not use its counts to rank scenarios.
- Modern first-time creator evidence is sparse; the existing UX studies are paper walkthroughs and a small interaction sketch, not usability sessions with creators.
- RPGCode contests remain an **unexamined lead**. No claim about their genres, participation, popularity, or code-centered user prevalence is made.
- Visual/conversational assistance, story outlining, accessible workflows, screen design preference, live collaboration, and broad non-RPG genres are strategically useful hypotheses but have little direct creator evidence in the reviewed sources.
- The branch's experience bank is an explicitly superseded hypothesis draft; the [research pilot](../../../docs/editor-research-pilot.md) retains only two narrow provisional composites (Avery, Ellis) and reclassifies the rest as hypotheses. Neither spans configuration, import, asset-only authorship, testing/debugging, collaboration, accessibility or publishing distinctly.
- Evidence about “lost work” includes machine/archive loss as well as editor-operation loss. It supports protecting recoverable work, not a particular autosave cadence or belief that editor recovery substitutes for external backup.
- Historical script command census does not prove that a percentage of programs can be represented by blocks. A parser-based conversion study and creator preference tests would be necessary for that claim.
- Older paper flows mark starter rights, cross-document recovery, block ownership/storage, editor contributions, animation-region timing, battle continuation and hosting unresolved. Some underlying runtime questions have moved since those flows; see §7's current-planning reconciliation before treating a recorded hole as an active blocker.

## 7. Reconciliation with the existing editor research

### Experience bank: retained, expanded, merged, unresolved

| Existing material | Reconciliation in this draft |
|---|---|
| Jordan / I-01–I-02, idea-first | Pilot downgrades to hypothesis (8178 adjacent only). Retained as SC-01 and SC-03 at **Low** confidence. |
| Morgan / I-04, story author | Pilot: respondent's adjacent report only. Retained as SC-02, hypothesis. |
| Casey / I-03, visual composer | Pilot withdrew 7751 support. SC-06–13 rest on owner direction, specs and flows, plus 7148 for redirection; hypotheses, not corroborated. |
| Avery / I-05, I-13 | Pilot's provisional composite (7118, 7190). Retained in SC-23/24/25. |
| Rowan / I-08, I-10, I-11 | Pilot: selective redirection observed once (7148); resumption is hypothesis. SC-04/05 reflect this. |
| Ellis / I-12, finish and share | Pilot composite (735, 764). Maps to SC-32 and SC-50/51; actual player success unobserved. |
| All / I-06–I-07, AI implementation and transparency | Strategic, not historical. Appear as SC-35–37 and in SC-01/02/17/19/30. Optional and unvalidated. |
| All / I-09, play and diagnose | Expanded into SC-26–28 and SC-17; separates behavioral diagnostics from creative judgment. |
| Riley / I-14, code-centered boundary-pushing | Owner-reported lens merged into the bank and pilot as I-14 (I-13 stays acquired-system integration). Retained as SC-21, one lens, not a primary path; contests unexamined. |
| Existing contradictions | Preserved and made explicit in §5; not reconciled into one persona or one editor entry path. |

The bank's named personas remain usable shorthand but are not a complete segmentation. This draft uses situation labels to avoid implying each person has one stable preference.

### Existing ten-flow research: coverage mapping

| Existing research | Scenarios retained/expanded | Additional distinction or unresolved point kept visible |
|---|---|---|
| Flow 01 Board editor | SC-06/07/12/13/26/27 | Composition vs path/floor geometry vs atmosphere; all interactions are proposals; board/image/trigger feature coverage was corrected in `review-resolution.md`. |
| Flow 02 Scripts and blocks | SC-17/19/20/22/26/27 | Blocks, code learning and code-first work are separate preferences; census is lexical, not conversion evidence; multi-document edits remain conditional. |
| Flow 03 Tiles and art sources | SC-08/09/10/12/13 | Making a kit without a board is explicit; import rights and auto-solid are not silently solved; asset pack/update mechanics remain proposals. |
| Flow 04 Characters/items/Database | SC-14/15/16/17/18 | Person/Chest/Pickup and party ownership use the corrected resolution; reusable record versus placed instance remains meaningful. |
| Flow 05 Animation and looks | SC-09/11/14 | Importing a look differs from authoring animation; exact fallbacks are spec facts, while region timing and per-frame authoring are proposals. |
| Flow 06 Battle and effects | SC-16/18/24/26/28/42 | Separate encounter setup, scripted battles, comparative tuning and continuation. Preserve the old gaps as historical research findings; current battle epic decisions govern runtime context. Editor authoring/continuation UX still needs verification. |
| Flow 07 Project shell/sharing | SC-03/04/26/29/30/31/32/33/34 | First project, returning/importing, crash recovery, collaboration, local package export, hosted link and accessibility are separate situations. Share backend and cross-document recovery remain open. |
| Flow 08 Project file by convention | SC-04/15/24/33 | Hiding main-file complexity is a direction, not a storage decision; project setup and contextual settings are differentiated. |
| Flow 09 Plugin editors | SC-18/22/24/25 | Plugin consumer and plugin author are distinct; proposed editor contributions/trust/host contract are not existing APIs. |
| Flow 10 Tile-making without the grind | SC-08/10/11/12 | Creation, source repair, single-tile animation and synchronized region animation are separate; the last remains conditional. |
| House/forest/NPC walkthrough | SC-06/07/12/14/17/18/26/38/43 | Retained as a cross-editor paper exercise, not beginner completion evidence. House-kit identity, forest traversability and locked-chest state remain useful probes. Its battle-result hole needs rechecking against newer planning, not automatic repetition as an unsolved runtime question. |
| Morning brief, decisions, review resolution and reawakened fit | Cross-cutting | Owner decisions, proposals and gaps are retained as such; corrections in review resolution supersede older review notes. |

### Feature inventory and normative specification boundary

`docs/editor-features.md` T-01–T-82 informed candidate task breadth: project/start/settings (T-01–14), board (T-20–35), art (T-36–39, T-60–64, T-80), code (T-40–46), actors/items/battles (T-50–58), packaging/import (T-70–74), and host utilities (T-81–82). Those IDs describe legacy editor functions and remain scope references, not creator evidence or modern UI requirements. Coverage is mapped more fully in `evidence/review-resolution.md` §Capability coverage map and gaps are in `evidence/review-notes.md` §6.

`docs/spec/` remains the normative source for compatibility behavior and file constraints (see `docs/spec/README.md`); this inventory does not change any spec. Where a scenario depends on non-legacy behavior or a proposed interaction, its supporting flow is a research proposal, not a normative contract. No specs, architecture decisions, tickets, implementation plans, product feature inventory or production code were changed for this draft.

### Current planning and dated contradictions

These are **reconciliation findings from documents**, not a delivery audit. No runtime or implementation was inspected to determine whether planned capabilities have shipped.

| Existing artifact / exact context | Treatment in this inventory | What remains unresolved or deliberately unchanged |
|---|---|---|
| Capability spec CAP-15–18; editor foundation §§Outcome/Done when | Retain coverage of projects, settings, programs, testing and multiple hosts in SC-03/04/20/26/29/31/33/48/49. | Capability intent is not evidence of current implementation or demand. Same editor capability need not imply identical persistence guarantees in every host. |
| P0 asset epic §§Done when/Boundaries | Retain board, character, item, animation and packaging breadth; expand into distinct creator goals, rather than one scenario per editor. | Its P0 boundary inside T-20–T-35 is explicitly open. This inventory neither settles it nor inherits P0 as scenario priority. |
| P1 epic §§Description/Notes | Retain specialist tile, enemy/effect, lighting, image export and upgrade tasks. | Auto-tiler sample/order work is a recorded planning question. Scenarios do not authorize new compatibility claims. |
| P2 epic §§Description/Done when | Retain visual authoring, audio preview, tutorials and setup/distribution; expand with code learning, mentorship and assistance refusal. | “Beginner” does not imply exclusively visual editing. Scenario ordering does not reorder P0/P1/P2 work. |
| ADR 0005 §Decision versus foundation/P0/P1 legacy-write criteria and spine AD-18 | Preserve original data and intentional conversion as needs; separate them from a promise to save every new feature back into TK3. | ADR 0005 permits a native format without choosing one and does not promise legacy writing; older criteria use stronger round-trip wording. This pass records the mismatch for the owning planning process, not a new ruling or removal of those criteria. |
| Spine AD-19/20 | Retain documented save/undo/backup/external-change and host capability context. Expand into SC-29/44/45/48. | Cross-document atomicity, semantic merges, cloud sync and cross-device recovery are not established by those clauses. |
| ADR 0004 §Composition and current amendment to event model; flow 09 | Retain extension flexibility, ordering and provenance as context for SC-24/25/54. | Runtime extension contracts are not a complete plugin-editor API. No new sandbox, trust tiers or extension distribution service is selected. Older synchronous-event prose is expressly superseded by the ADR's amendment. |
| Battle epic §§Notes, 2026-10-19 decisions; `plugins-and-battle.md` E-79 | Current planning places battle systems—turn order, damage, AI and UI—in RPGCode packages; core retains actor data and general interpretation rules. SC-18/23/28/41 use that distinction without designing it. | The compatibility page still carries R-57's old open-conflict wording and the epic refers to a `battle.md` page not present in the inspected engine directory. Do not turn either old prose or a missing link into a fresh architecture decision. Verify the editor-facing result/continuation contract against the owning artifacts before a later design pass. |
| `display-input-audio.md` §Audio/R-59 versus flow 02 §Sources and flow 03 §Open questions | R-59 is now labelled settled by 6.1/6.3; current format text says MIDI/WAV direct and MP3/Ogg/Opus/FLAC converted at import. SC-40 does not repeat the old unresolved-routing or generic “OGG everywhere” recommendation. | A documented playback/import policy is not an approved editor audition workflow or a statement that all proposed audio work is delivered. |
| Capability spec §§Non-goals/Assumptions; flow 07 | Import/playback and packaging are retained as creator goals, not permission to load legacy native DLLs or bundle old games/art. | T-71/T-73 exclusions are explicitly described as inferences in the capability spec; this draft neither hardens nor reverses them. Sharing a downloadable game does not establish hosting, account, privacy or moderation policy. |

### Expansion and consolidation ledger

**Retained:** the pilot's thirteen candidate intents (I-01–I-13), all ten flow subject areas and the three focused house/forest/NPC tasks. **Merged at the need level, not deleted:** repeated source/import/reuse concerns are considered together under source-and-use awareness; repeated save/diff/recovery concerns under recoverable change; repeated run/fixture/debug ideas under repeatable starting conditions. Individual scenarios remain separate where outcomes or control needs differ.

**Expanded:** SC-35–37 split conversation, independent work and hybrid representations from the broad “assistance” idea; SC-38–40 separate travel, staged scenes and sound from generic board/animation work; SC-41–43 add a noncombat counterexample, batch tuning and behavior reuse; SC-44–48 distinguish external tools, concurrent contributors, translation, mentoring and interrupted work; SC-49–54 separate preservation, editable packs, release maintenance, player access, project-scale organization and extension change diagnosis.

**New low-evidence additions:** translation, teaching context, interrupted/cross-device work, player accessibility, team conflicts and release maintenance have no direct creator study in this pass. Conversational revision and assistance refusal are contrasting hypotheses, not a recommended assistant-first product.

**Left unresolved:** native editable representation, legacy-write scope, generated/code authority, cross-document recovery, editor extension contributions, region-animation semantics, hosting/privacy, and the current editor-facing battle continuation contract. Where documents conflict, their provenance is retained above; no product artifact has been silently reconciled by this draft.

### Suggested evidence collection, not a feature roadmap

1. **Contrast methods on the same intent:** let creators approach one interaction through direct editing, forms, code or optional conversation. Record chosen method, corrections and recoverability, not just time or apparent fluency. This could contradict SC-19/20/35–37 without declaring one universal winner.
2. **Observe specialist and returning work:** use creator-supplied, permission-cleared art or old projects; distinguish successful import from successful continued editing. Include no-board kit creation and external-tool changes.
3. **Exercise failure deliberately in a research setting:** interrupted saves, missing dependencies and overlapping edits reveal control/recovery needs that happy-path walkthroughs do not. Do not expose the only copy of a participant's work.
4. **Investigate weakly evidenced contexts separately:** collaborate with translators, accessibility users, mentors and small teams before treating those scenario conditions as validated requirements.
5. **Follow historical leads with bounded claims:** inspect full anonymous thread context and contest artifacts with era/version/provenance recorded. Count neither threads nor contest existence as creator prevalence. Seek counterexamples, including creators who stopped or preferred other tools.

Each study should record source permission, task/start state, prior experience, chosen method, observed result, wrong turns, recovery and contradictory evidence. Simulated AI personas may help critique a scenario, but are not human-study observations.

## 8. Recommended maintenance practice

1. Keep evidence source, evidence type, confidence and epistemic status attached when a scenario is copied elsewhere.
2. Do not convert a scenario into a roadmap item because it is vivid or detailed. Promote it only through the repository's normal planning/decision process and after its dependencies are resolved.
3. Add new scenarios when they expose a materially different intent, control preference, failure/recovery need or evidence gap—not merely to increase the count.
4. When usability or corpus work contradicts a scenario, preserve the contradiction and revise the scenario record with provenance; do not silently overwrite the older evidence.
5. Prioritize follow-up research questions, not scenario labels: test a story-first entry, direct board creation, code-first work, odd-sheet import, safe shared edits, test/recovery, plugin authoring, and export with contrasting creators. Record task success and recovery as well as preference.
