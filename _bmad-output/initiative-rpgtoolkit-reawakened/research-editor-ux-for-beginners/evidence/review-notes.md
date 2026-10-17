# Review notes: the seven flow documents as a set

**Scope.** `flows/01` to `flows/07`, checked against `decisions.md`, `reawakened-fit.md`, `evidence/command-census.md`, `docs/spec/**`, `docs/editor-features.md`, `docs/guardrails.md` and the architecture spine (AD-19). References are `file:line` (line numbers as of 2026-10-17) or `file §section`. Severity: **HIGH** = two docs would ship different behaviour or a decided item is broken; **MED** = wrong fact, missing owner or capability gap; **LOW** = wording or local inconsistency.

**Note.** A `flows/08-project-file-by-convention.md` (172 lines) appeared at 00:09, after the seven. It is not in this review's scope, but it changes some ownership questions, so the Addendum at the end lists where it conflicts with 06 and 07.

---

## 1. Cross-doc contradictions

| # | Sev | Topic | Doc A says | Doc B says | Suggested resolution |
|--:|---|---|---|---|---|
| C1 | HIGH | What a **Chest** (and a **Pickup**) is | 01:140 and 01:246: a Chest is a "trigger-bearing object" in the `Things that happen` gallery. 02 scenario (c) row 3: "Chest B gets a trigger". | 04:105: Chest is one of the item kinds in the **New Item** picker. 04:203 (hole 2): Chest is "a board component" that owns contents and an opened flag. 04 Q4: it may be a native component *or* a trigger template. Pickup is in both 01's gallery and 04's item kinds. | Make Chest and Pickup **board Things** (trigger templates in 01's gallery) whose contents point to item definitions. Remove Chest from 04's item picker. One-time state already exists in the format: conditional activation, with "run once" built from a variable (`movement-and-collision.md` E-44; `board.md` "Drawing order and effects", run once). So it needs no native component. |
| C2 | HIGH | Who owns a **Person** definition | decisions §4.3 lists Person as one of the four UI kinds of the item type. 05:70 "creates a Person definition". 01:142 places a Person in one gesture. 07 §2's tree has a `People` group. | 04:105 item kinds leave Person out (Equipment, Pickup, Chest, Advanced). 04:56 Database tabs have no People. No doc says which file a Person is (a legacy board NPC is an item, E-20) or which editor shows its detail page. | 04 adds a **Person** kind, or a People tab, backed by the item model, and 05's Graphics card (Screen D) is that page's Images box. State that it is stored as an item. |
| C3 | HIGH | **Play** semantics | decisions §1 and §4.1: Play saves first and "starts from the board being edited (at the player-start marker or the last clicked spot)". 01:14 "Save where the player starts so Play actually starts here". 01:207 Play from here starts "on this board and marker". 01:192 has `F5` Play and `Shift+F5` Play from here, but the toolbar (01:54) shows only Play from here. | 07:190: **Play** starts "at the configured start board and hero". 07:192: **Play from here** starts at the *clicked tile* through a temporary override and "does not mutate the game's configured start". 04:162 "Play from start". 06 §8: test starts "from the selected board or a saved fixture". | Write one contract, in 07 §6, that the other docs cite. Name the two actions **Play from start** and **Play from here**. Play from here resolves its start in this order: clicked spot, then the board's start marker, then the board default. It is passed as a `run` override (reawakened-fit #3) and is never written to the board or the game settings. Get the owner to confirm, because 07 contradicts the decision's wording. |
| C4 | HIGH | Who owns the **player, the starting party and the start board** | 04:136-145: Party setup holds player character, starting party, start board and start position. It is reachable from "Database > Party setup and project settings". | 07:145-147: Game settings › Start holds Start board, Starting hero and Start program. 01:59 quick panel `[Start]` and 01:148 `Set here`. Three editors write the same fields. | One owner per field: Party setup owns hero and party; the board owns "start here" and the marker. The settings page shows the resolved value read-only, with a jump link. Note that the legacy `.gam` stores only one `initChar` (`main-file.md` row 16), so a multi-member starting party is native-only data. |
| C5 | HIGH | **Stamp / component / prefab** | 01:143: a Stamp holds tiles, walls, walk-behind, objects, triggers and atmosphere, with "Place as linked prefab" or "Place as independent copy". 01:202: the house stamp brings a door instance. | 03:137: a Stamp "paints tiles and shading but has no game identity, trigger or door". 03:138: **Component** is a promoted stamp that carries walls, doors and triggers ("Edit source" / "Detach"). | Adopt 03's two nouns. In 01, rename "linked prefab" to Component and "independent copy" to Detach. Define both once and link to that definition. |
| C6 | MED | **Starter library** contents | 03:248-252: Starter Top-down, Starter Isometric, Starter People (hero, two villagers, merchant, enemy look), Starter Audio (9 cues listed) and Starter project. 03:264 says "eight short sound cues". 03:162: new project offers "Top-down starter / Isometric starter" cards. | 07:63-75: style choice plus three templates (Blank, Starter village, **Battle demo**), and each bundles "tilesets, UI, sound, **fonts**". Battle demo needs a battle background and enemy battle stances, which 03 does not list. 05 Q3: "ship no art until … G6", then "a tiny four-direction set and one effect". 06:277: starter art is "optional". | One manifest: 03 owns the asset list and 07 owns the template matrix. Fix 03's count (9 vs 8). Add fonts, battle background and battle stances, or drop the Battle demo. |
| C7 | MED | **Native-only vs writing legacy formats** | 01:272: "Legacy-write is not promised". decisions §1: writing back to legacy is not a goal. | 03:130 "Export legacy tileset"; 03:136 `.tan` export. 05:278 and Q2: legacy `.anm` export. 07:220: a "Legacy `.tpk`" export profile. 04 item table "preserve native order on write" and 04:196 "saving without upgrade preserves residue" both assume writing `.itm`/`.tem`. | Owner rule for all docs: TKR saves native. If legacy export is ever wanted, it becomes one deferred "Export for legacy runtime" item, not a per-editor feature. |
| C8 | MED | **Where native data lives** before the ADR | 03 Q3: tile metadata makes the native tileset the "first writable format". 02 §"Recommended storage": a native block document in `Prg/_generated/`. | 07 §"Data": a "project-owned manifest" until a native format exists. 04 §"Runtime and format boundaries": "sidecar/editor metadata only where the architecture permits". 06 §"Data": "ADR 0005 does not require one yet". | One native-format ADR that lists, in order, what goes native first: IDs/manifest, tile metadata, block scripts, components. Each doc then cites it. |
| C9 | MED | Rules for **per-tile solid** | 01:97 and 01:118: when an auto-solid tile and a shape disagree, "choose the board override", described as a per-board override. 01 Q1: auto-solid default "yes". | 03:149-150: blocked area = union of tile masks and shapes, with a per-**cell** Walkable or Force-solid override. 03 Q2: imported tiles default to Walkable and only starter metadata pre-marks Solid. | Adopt 03's union plus per-cell override rule, and have 01 cite it. Make clear that "per-board" in 01 means per-cell on a board. |
| C10 | MED | Where **board battle settings** live | 01:150-155: Board Settings › Battles owns allowed, skill and background, "with no duplicate controls". | 06:147: "Board 'Dungeon room' › Inspector › Battle" edits the same three fields. | Keep them in Board Settings › Battles. 06's inspector shows a summary line and a link. |
| C11 | MED | One **Database** or two | decisions §4.5: one master-detail screen. 04:56 tabs: Characters, Items, Enemies, Moves, Effects. | 06:45: a separate "Battle database" with Enemy, Move, Effect and **Background**. | One Database with a Backgrounds tab. Drop the "Battle database" title. |
| C12 | MED | **Stat names** in the same Database | 04:75 and 04 step 4: Health, Maximum health, Attack, Defence, Special-move power. | 06:52, 06 §2 and the trace: HP, SMP, FP, DP. | Use plain words everywhere, with the abbreviation in a tooltip. Add them to the glossary (reawakened-fit #8). |
| C13 | MED | **Workspace columns and panels** | 07 §2: the left column is the PROJECT tree and the right is the INSPECTOR. | 01:56: the left is OUTLINE, and the placement palette is a bottom bar (01:70), although 01:95 calls it "the left palette". 03:50: the left is PALETTE plus ASSET BROWSER. | 07 defines the shell docks. Decide whether the project tree, the outline and the palette share the left dock as tabs. Fix 01:95 to match 01's own sketch. |
| C14 | MED | Two "one sheet-import flow" designs | 03 Screen 3: cell size, offset, spacing, Standard / 16-pixel / Iso, skip-empty, alpha or colour key. | 05 Screen B: columns × rows, margin, gap, row order, direction labels, anchor. The controls overlap but are named differently. | One shared grid-detection step (the same field names and the same guesser), followed by a step that depends on the job: "add to tileset" or "assign directions". |
| C15 | LOW | Third door for the **character generator** | 05:56-69 shows a disabled "Make one — Later" door. 05 §Challenges then says to omit it unless clearly labelled. | 01:142 and 04 step 3 (Images: "from a sheet, pick individual animations, or import") show only two doors. decisions §4.4: a third door, later. | Owner decides whether to show or hide it. 01 and 04 reuse 05 Screen A rather than describing their own look picker. |
| C16 | LOW | **Names for the same concept** | "Talk range" (05:177, decisions). "Things that happen" (01:95). "World view" (01:188). "Test scenario" (02 §Code editor, 07:194). Empty shown as *not set* (04:88, 04:131). "Floor" (01). | "Activation shape" (04:243, 04 Board card). "Trigger gallery" (06 §7). "Graph view"/"Show graph" (07:178, 07:186). "Saved fixture" (06 §8). "(none)" (06:65, 07:163). "Layer" in UI copy (03:48, 03:148, 07:192 "clicked layer"). decisions' "Above player" layer role is absent from 01, which uses a Roof floor plus a canopy hole instead. | Add a UX glossary section that every doc uses (reawakened-fit #8). |
| C17 | LOW | **Home for generated programs** whose owner is not a board | decisions §4.4: `Prg/_generated/<Board>/`. 02:328 adds `Prg/shared/` "as already decided", but decisions only says "a shared folder". | 04:100 "Create generated program" for a level-up program, and 06 §2 and §7 victory, run and defeat programs, have no board owner. | Decide a layout such as `_generated/<owner kind>/<owner>`. Remove "as already decided" from 02:328. |

---

## 2. Spec fidelity (42 claims checked)

| # | Sev | Claim (where) | Spec | Verdict |
|--:|---|---|---|---|
| S1 | — | Rotated boards use an effective square `(sizeX + sizeY) × (sizeX + sizeY)` (01:271) | `board.md` "Coordinates", effective grid | VERIFIED |
| S2 | LOW | "Invalid corners are a consequence of that representation (`board.md`, Coordinates)" (01:271) | `board.md` says nothing about invalid or off-diamond cells | UNSUPPORTED: this is an inference; mark it as one |
| S3 | — | Each layer's tiles are redrawn over sprites from lower layers before that layer's sprites (01:275) | `main-loop-and-startup.md` "Drawing a frame" step 3 | VERIFIED |
| S4 | — | Draw order: background, then per layer tiles, images, sprites; sprites by y (01:276) | `board.md` "Drawing order and effects" | VERIFIED |
| S5 | — | Under promotes layer L, optionally lower layers and the background; collision base or frame intersection; not solid (01:277) | `movement-and-collision.md` E-30; `board.md` Vectors attributes 1, 2, 4 | VERIFIED |
| S6 | LOW | Legacy start: "A zero position means 'not set'" (01:35) | `board.md` rows 73-75: "startX … ≤ 0 → 64", "startL ≤ 0 → 1" | WRONG: ≤ 0 means a default position, not "unset" |
| S7 | — | Board battle fields: allowed, skill, background (01:155; 06 §Data) | `board.md` rows 68-70 `battleBackground`, `battleSkill`, `bAllowBattles` | VERIFIED |
| S8 | — | Lights are editable objects and the engine bakes them at load (01 §Data) | `board.md` "Lights" | VERIFIED |
| S9 | MED | "The census shows 62.4% of programs use at least one command outside the top 30" (02:168) | `command-census.md` coverage table: 62.4% use **only** the top 30 | WRONG: it is 37.6% that use one outside |
| S10 | LOW | Coverage figures are "among 2,550 unique programs" (02:39, 02:69, 02:116) | Census: coverage is "of 2,521 programs with at least one call" | UNSUPPORTED denominator for the coverage rows (the share column is correct) |
| S11 | — | The 40-row census table, counts and shares (02:71-111) | `command-census.md` top 40 | VERIFIED (all rows match) |
| S12 | MED | Start a battle: "optional skill … under Advanced", lowered to `fightenemy` (02:130) | `rpgcode-functions.md`: `fightenemy(string enemy, …, string background)` has no skill; skill is `fight(int skill, string background)` | WRONG |
| S13 | LOW | Fade: "colour and speed are Advanced fields" (02:131) | `fade(int type)`: "Perform a fade using the current colour" | UNSUPPORTED: there is no speed and the colour is not a parameter |
| S14 | — | `send(file, x, y, z)`, `mwin`, `wait([&ret])`, `mwincls`, `givegp`, `giveitem`, `wav`, `midiplay` (02:124-131) | `rpgcode-functions.md` | VERIFIED |
| S15 | LOW | Show-as-code sample (02:176-179): blocks Say + Wait + Go to give `mwin; wait; mwincls; send` | 02:125 lowers Say to `mwin`, wait, `mwincls`, so an extra Wait block adds a second `wait()` | WRONG within the doc: the code shown does not match the stated lowering |
| S16 | — | `put` = board edit, `kill` = variables, `push` = movement, `clear` = screen (02 table) | `rpgcode-functions.md` (`put` "Puts a tile…", `kill` "Delete variables", `push`, `clear`) | VERIFIED (and it corrects the census, which files `put` under screen drawing) |
| S17 | LOW | `bordercolor` is obsolete (02:104), yet it is listed among the screen-designer commands (02:154) | `rpgcode-functions.md`: obsolete, "raises an error" | VERIFIED as obsolete; 02:154 contradicts it |
| S18 | LOW | A sound "is normally an effect call", with blocking only "if the runtime contract supports it" (02:270) | `display-input-audio.md` E-101: one-shot effects, "optionally blocking until finished"; open conflict R-59 | UNSUPPORTED: the spec already describes optional blocking; cite it and R-59 |
| S19 | — | `.tst`/`.iso` = numeric header plus pixel blocks; `.tan` = frame references plus one speed; `.tbm` = references plus tint with an extra row and column (03 §Data) | `tiles.md` | VERIFIED |
| S20 | — | An iso tile is the same 32×32 pixels poured into a 64×32 diamond (03 legacy step 5) | `tiles.md` "Isometric tiles" | VERIFIED |
| S21 | — | Auto-tiler: 8 neighbours, corners count only when both edges are filled, fixed variant order (03:140) | `editor-features.md` T-25 (no `docs/spec` page exists) | VERIFIED against editor-features |
| S22 | — | FluidR3_GM is permitted as the MIT default SoundFont (03:254) | `guardrails.md` G6 rule 3 | VERIFIED |
| S23 | — | 201 special-move records; 11 accessory names; 6 standard armour slots; item has 8 equip flags and 51 allowed characters (04 field tables, 04 steps 6-7) | `character.md` rows 15, 18, 19; `item.md` rows 7, 10 | VERIFIED (the editor uses slots 1..n) |
| S24 | — | The character stores idle before speed; the item stores speed before idle; deprecated rest becomes south idle (04 tables; 05:321) | `character.md` rows 32-33; `item.md` rows 23, 26-27 | VERIFIED |
| S25 | — | Key items cannot be dropped in the default menu (04:117, 04:120) | `plugins-and-battle.md` E-80, E-81 | VERIFIED |
| S26 | — | Startup: create the initial character, run the startup program, load the initial board (04:283) | `main-loop-and-startup.md` E-02 steps 6-9 | VERIFIED |
| S27 | MED | "STARTING PARTY [Hero] [Healer]" as project setup (04:140) | `main-file.md` row 16: one `initChar`; no party list | UNSUPPORTED in legacy data: this needs native data or a generated start program (`addplayer`), and 04 does not flag it |
| S28 | — | Default bases: collision (−15,−15)–(15,0); activation (−24,−24)–(24,8); diamonds on iso (05:196-198) | `character.md` "Defaults and fall-backs" | VERIFIED |
| S29 | — | Defaults: speed 0.05 s, idle 3.0 s (05:178, 05:240) | `character.md` rows 32-33 | VERIFIED |
| S30 | — | A missing diagonal falls back to the nearest horizontal; a missing idle falls back to walk (05 Screen F, §Data) | `character.md` "Defaults and fall-backs" | VERIFIED |
| S31 | — | 0.05 s per step means a 32-pixel tile takes about 0.4 s (05 Screen F) | `movement-and-collision.md` "Speed" (8 × speed); the game-speed offset is open conflict R-50 | VERIFIED |
| S32 | MED | A linked GIF takes its transparency "from its background colour, magenta if absent" (05:227) | `images.md` "An animated GIF adopted as an animation" (R-10): **first page's transparent index**, then the background index, then magenta; the reader yields every page's delay | WRONG (out of date; cite `images.md`) |
| S33 | — | `.anm` keeps 51 slots (UB 50); the engine drops empty frames and a middle gap shortens the sequence (05 §Data) | `animation.md` "Empty frames" | VERIFIED |
| S34 | MED | Status effect "Lasts [3] rounds (0 = until the fight ends)" (06:115) | `battle-data.md` `.ste` row 4: "decremented each round, removed at 0" | WRONG |
| S35 | MED | Trigger sentence "Then on defeat: [continue]" (06:168) | `plugins-and-battle.md` E-77 and the outcome table: a loss runs the game-over program or resets; `main-file.md` row 34 | WRONG for the engine as specified; a continuation after defeat would be new behaviour and needs a ruling |
| S36 | MED | Rule cards: ±10% damage, DP unless critical, minimum 1, charge 3 ±2, players at 75 and enemies at 123, random start (06:195-198) | `plugins-and-battle.md` E-72 and E-74 match the text, **but** "Open conflict R-57 … this page rules nothing" | VERIFIED text; 06 must say the numbers are pending R-57 |
| S37 | — | AI table for Low, Medium, High, Very high, and affordable-only specials (06:82-85) | `plugins-and-battle.md` "Enemy AI", E-76 | VERIFIED |
| S38 | — | Encounters: at most one test per tile; Random 1/N; Planned every N tiles; 1-4 enemies from rows with the exact skill (06 §6) | `plugins-and-battle.md` "Random encounters", E-70; `main-file.md` rows 26-30 | VERIFIED |
| S39 | — | Slime example: HP 12, SMP 4, FP 3, DP 1, crit 20/30, XP 5, GP 3 (06 §8) | `examples/listings/slime.ene.txt` | VERIFIED |
| S40 | — | `.bkg` sound roles: cursor moved, item chosen, fighter ready, can't do (06 §5) | `battle-data.md` `.bkg` rows 5-8 | VERIFIED |
| S41 | — | The distribution package writes `/` and has a manifest `{schema, main, index}`; unsafe or duplicate paths are rejected (07:231) | `packaging-and-paths.md` R-08, "Distribution package", L9-L10 | VERIFIED |
| S42 | MED | "Open folder; editor detects a legacy layout" (07:266) | `main-file.md` intro: the `.gam` lives in the Toolkit's `Main\` folder, **outside** the project folder | UNSUPPORTED: a project folder alone has no main file; the import must also accept the Toolkit root, a Setup ZIP or a `.tpk` |

---

## 3. Decided items

| Decided item | Status across 01-07 | Findings |
|---|---|---|
| Beginner and hobbyist audience | Respected in all seven | None |
| Complete editing capability | **Silently broken in places** (MED) | (a) Board **layer images** (place, top-left position, layer, transparent colour, parallax/stretch type; `board.md` rows 51-56; T-23/T-26) have no placement flow: 01's palette (01:95) and outline (01:56-68) have no Images entry. (b) Trigger options **repeat while inside**, **trigger every N px** and **stop the player's movement** (`board.md` rows 33-34; T-26) appear in no trigger sentence (01 §Things, 02, 06 §7). (c) Imported **pixel-coordinate** boards (flag 4, `board.md` Coordinates) and **pre-vector** boards (`board.md`, minor 2-3) get no import or edit path. See also §6. |
| Import is enough; no legacy write | **Contradicted** (MED) | C7: 03:130 and 03:136, 05:278, 07:220, and 04's "write" wording. Only 01 and 05 Q2 flag the question. |
| Embedded in-editor Play rejected; Play saves first | **Partly contradicted** (HIGH and LOW) | HIGH: C3, because 07:190 starts Play at the game start, not the edited board. LOW: 07:127 Desktop "Embedded runner" and 02's "Preview dialogue" (02 §Tier 2) do not say they run saved data. |
| Walls and walk-behind, both tile and shape, per layer | Respected (01 §Walls; 03:148 "on its board layer") | 03's union rule (03:149) means erasing a wall cell over an auto-solid tile does nothing until a Walkable override is added. 01's "erasing carves" must point to the override (C9). |
| Generated scripts in one folder | Respected with a flagged change (02:371, a stable ID plus slug) | LOW: 02:328 invents `Prg/shared/` "as already decided". Owners that are not boards have no folder (C17). |
| Character generator later | Respected in 05 | LOW: 01 and 04 are silent about the third door (C15). |
| Common things one click; code available | Respected (02 Tier 1-3, Show as code; 06 §7 "Show as code") | None. 02's added Logic blocks are flagged openly (02:374). |

---

## 4. Clean-room (G7) and guardrails

| # | Sev | Finding |
|--:|---|---|
| G1 | — | Scan of 01-07 for legacy file or module identifiers (`.frm`, `.bas`, `.cls`, `trans3`, `tkCommon`, `CB*`), line citations into legacy source, and the product named "RPG Toolkit": **no hits**. 07 names the product "TKR". The spec field names used (`takeCrit`, `fightGameYn`, `prgOnBoard`) come from `docs/spec`. |
| G2 | MED | **Indirect provenance.** All seven list the "Legacy guide" (`rpgtoolkit/docs/architecture/editor/guide/*.md`) as a source. That guide cites GPL source by file and line (e.g., guide `01-environment-and-main-file.md:36` → `toolkitMain.bas:32-52`; `04-program-editor.md` → `RPGCODEE.frm` ranges). Some legacy-behaviour statements in the flows exist only there: 01:43 (F5 does not save), 02 legacy rows 11-12 (scratch test file, disabled Debug), 05 legacy row 2 (frame sounds not moved with images), 06 legacy rows 2 and 9 (design-time values, dirty flag). This is acceptable as UX motivation. Before any story cites them, they must be moved into `docs/spec` or `docs/editor-features.md` (G7 rule 2, ADR 0006) or dropped. Add a provenance line to each doc's Sources. |
| G3 | LOW | G2 boundary: 05:229 "If a host cannot decode a GIF". GIF decoding is a core reader (`images.md` R-10), and hosts supply bytes only. Reword to "if the GIF reader refuses the file". |
| G4 | LOW | 07:129 Desktop "Draft journal and local-history snapshots in project metadata" and 07 §7 Local History. reawakened-fit #6 says not to invent a drafts store (use host `backup`) and that local history is not in the spine. Mark these as proposals that need an AD-19 amendment. |
| G5 | LOW | G6: every doc states the licence gate correctly. 07:75 promises bundled **fonts** and UI art in every template, and no doc lists a source for them. Add them to the starter manifest or remove them (C6). |
| G6 | LOW | G5: block lowering and generated scripts need golden tests (reawakened-fit §5, G5). 02 §"Model and lowering rules" does not mention them. |
| G7 | — | G1 and G3 are respected: 01 hole 6 (tick-seeded flicker), 02 §G1 paragraph (no hidden promises), 06 §8 (seeded tests). |

---

## 5. Scenario honesty (two HOLE and two Covered rows per doc)

| Doc | Row | Marked | Judgement |
|---|---|---|---|
| 01 | (a)10 starter art (01:209) | HOLE | Justified: it is pending an owner decision and G6. |
| 01 | (d)9 torch flicker (01:251) | HOLE | Justified, and a stopgap is offered. |
| 01 | (a)3 house stamp brings door, walls and walk-behind (01:202) | Covered | **Not justified.** It depends on starter art (row 10's HOLE), and 03:137 says a stamp has no door (C5). Mark it conditional. |
| 01 | (a)6 "Covered, pending auto-solid owner decision" (01:205) | Covered | **Not justified.** Auto-solid is Open (decisions §4.2), so this is a HOLE. |
| 02 | (a) sound must finish before the move (02:270) | HOLE | Partly answerable: E-101 already allows blocking effects, and 02:127 already offers "do not wait". Resolve it inside the doc. |
| 02 | (c) set/compare variable blocks (02:295) | HOLE | Justified, and fixed in the doc (Logic blocks). |
| 02 | (a)4 Play from here "starts at the door; the sound and send run in order" (02:267) | Covered | **Not justified.** A step-on region fires when the collision base *enters* it (E-40), so starting inside the door does not fire it. The start-spot rule is also contested (C3). |
| 02 | (c)6 rename updates "all blocks, code references, and scenarios with one undo" (02:293) | Covered | **Not justified.** AD-19 keeps one edit stack per document, and a multi-document transaction is undefined (reawakened-fit #5). 02 itself sends raw strings to manual review (02 §Variables). |
| 03 | (a)9 starter catalogue (03:170) | HOLE | Justified. |
| 03 | (c)6 shared-tile blast radius (03:193) | HOLE | Justified, with a concrete fix. |
| 03 | (a)1 board, hero, palette and start exist immediately (03:162) | Covered | **Not justified.** It depends on (a)9's HOLE. Mark it "conditional on the starter pack". |
| 03 | (d)5 reorder tiles and the board is unchanged (03:203) | Covered | **Conditional.** It holds only with native board data. A legacy board refers to `set.tstN` by index (`tiles.md` "Editing model"), and the native board format is undecided (C8). |
| 04 | (a)9 starting inventory (04:161) | HOLE | Justified: `main-file.md` has no inventory. A fix could also be a generated start program that uses `giveitem`. |
| 04 | (b)5 one-time chest state (04:172) | HOLE | **Overstated.** Conditional activation and run once (E-44; `board.md` run-once rule) already give a saved one-time state. What is left is the ownership question (C1). Related: (b)2 "no shop" overlooks `callshop(item1, …)` (`rpgcode-functions.md` Items), which covers a beginner shop as a Tier-2 block. |
| 04 | (a)7 potion made via "Pickup or Advanced" (04:159) | Covered | **Not justified.** Pickup's first-run fields are about board placement, so the most common item (a menu/battle consumable) has no kind and falls into Advanced. Add a **Consumable** kind. |
| 04 | (a)1 new project creates Hero and asks for player and party (04:153) | Covered | **Conditional.** 07's New project (07:59-64) asks no such question, and a multi-member party is not storable in `.gam` (S27). |
| 05 | (a)7 "exact unsaved preview boundary" (05:243) | HOLE | **Not a hole.** Save-first Play is decided (decisions §1). Mark it Covered with that citation. |
| 05 | (b)8 diagonals disabled in the project (05:256) | HOLE | Justified (`main-file.md` row 60 bit 4). |
| 05 | (a)4 definition created with four walks and default timings (05:240) | Covered | **Conditional.** The defaults are verified (S28, S29), but what file and editor the "Person definition" is remains undecided (C2). |
| 05 | (c)3 sound marker follows the frame (05:264) | Covered | Justified: the native frame object holds the sound, and `.anm` stores a sound per frame. |
| 06 | (b)7 after-win ordering (06:229) | HOLE | Justified: E-77 orders the enemy defeat program but not the trigger's continuation. |
| 06 | (d)6 diff of two traces (06:251) | HOLE | Justified. |
| 06 | (a)6 walking into the room uses "the selected seed" (06:215) | Covered | **Not justified.** That row is ordinary Play. Neither 07 §6 nor AD-20 `run` defines a seed for Play, only for 06's test panel. |
| 06 | (a)7 rewards awarded and board music resumes (06:216) | Covered | Justified (E-77). |
| 07 | (a)6 share upload (07:259) | HOLE | Justified. |
| 07 | (c)3 partial recovery across documents (07:278) | HOLE | Justified. |
| 07 | (b)1 Open folder detects a legacy project (07:266) | Covered | **Not justified.** The `.gam` is outside the project folder (S42). |
| 07 | (d)3 rename is "one command … undoes once" (07:288) | Covered | **Not justified.** There is no multi-document transaction in AD-19 (reawakened-fit #5). |

**Pattern:** 9 of the 14 sampled Covered rows depend on an open owner decision (starter pack, auto-solid, native format, Play semantics, multi-document undo) but are marked Covered. Add a **Conditional** coverage value to every scenario table.

---

## 6. Missing coverage (T-ids from `docs/editor-features.md` addressed by none of 01-07)

| T-id | Not addressed | Sev |
|---|---|---|
| T-08 | Preferences: syntax colours, UI language, splash and tip toggles, board-editor colours (07 mentions light/dark themes only) | LOW |
| T-10, T-11, T-13 (in part) | Joystick, cursor sounds, mouse cursor image and hot spot, game speed, tile/pixel movement and pixel push, path-finding mode, colour depth, FPS in title bar, debug drawing. 07 §4 covers only start, keys, resolution, battles and plugins. **08 covers them all.** | MED (resolved if 08 is adopted) |
| T-23 and T-26 Images | Placing board layer images (file, position, layer, transparent colour, parallax/stretch) | MED |
| T-26 Programs (in part) | Repeat while inside, trigger every N px, stop movement | MED |
| T-30 | Tile → pixel coordinate upgrade, and what happens to imported pixel-coordinate (flag 4) boards | LOW |
| T-31 | Pre-vector (minor 2-3) board import and upgrade | MED |
| T-35 | Placeholder drawing for objects with no graphic | LOW |
| T-36 (in part) | Replace colour, cut corner, skew, layer tile (translucent overlay), greyscale, wrap-scroll, save into a specific slot | LOW |
| T-38 (in part) | `.gph` single-tile add, convert and export | LOW |
| T-40 (in part), T-46 | New-program header template; capitalisation helper | LOW |
| T-44 (in part) | Auto-command cleanup (wrap loose dialogue lines). 02 keeps bare dialogue as code and does not say whether this is intended. | LOW |
| T-64 | Skin editor | LOW (say it is dropped or deferred) |
| T-70 (in part), T-72 | Make EXE appears only as "optional executable wrapper" (07:128); Setup ZIP is not an export profile | LOW |
| T-73 | 2.x flat project layout upgrade | LOW |
| T-81 | Built-in browser: obsolete; no doc records that it is dropped | LOW |
| T-82 | File association (AD-20 has a `fileAssociation` capability) | LOW |

---

## 7. Ten fixes that most improve the set (ranked)

1. **Write the Play contract once** (07 §6) and point 01, 02, 04, 05 and 06 at it: Play from start and Play from here, the order in which the start point is resolved, a non-persistent `run` override, and what happens when the start spot is inside a step-on trigger. Fixes C3, C4 (part), 02 (a)4 and 06 (a)6.
2. **Decide what Person, Chest and Pickup are.** Chest and Pickup become board Things that refer to items. Person becomes an item kind or a People tab in the one Database. Add a Consumable kind. Fixes C1, C2 and 04 (a)7 and (b)5.
3. **Give each start field one owner**: hero and party in Party setup, the start board and marker on the board, and the settings page shows the resolved values. Record that the starting party needs native data. Fixes C4 and S27.
4. **Correct the wrong spec claims**: S9 (62.4% inverted), S12 (`fightenemy` has no skill), S13 (fade), S15 (code sample), S32 (GIF transparency), S34 (status rounds 0), S35 (defeat continuation), S6 (start ≤ 0), and add the R-57 caveat (S36), plus S42 (`.gam` outside the project folder).
5. **Add a "Conditional" coverage value** and re-mark the rows that depend on open decisions. Mark cross-document rename with one undo as a HOLE pending an AD-19 multi-document transaction (02 (c)6, 07 (d)3, 04's safe rename).
6. **Adopt 03's Stamp/Component definition** in 01 and in every scenario row. Fixes C5.
7. **State the persistence policy in every doc**: TKR saves native, legacy write is out (or one deferred export), and one native-format ADR lists what goes native first. Fixes C7 and C8.
8. **Merge 04 and 06 into one Database** with a Backgrounds tab, plain stat words, one empty placeholder and one glossary. Keep board battle fields only in Board Settings. Fixes C10, C11, C12 and C16.
9. **Close the capability gaps in §6**, or record each as an intentional drop: layer images, the remaining trigger options, pre-vector and pixel-coordinate import, tile-editor operations, `.gph`, skins, setup/EXE and file association.
10. **Write one starter-library manifest and one shared grid-detection import step**: reconcile 03 and 07 (templates, fonts, battle demo assets, cue count) and give 03 and 05 the same import controls. Fixes C6 and C14. Also add the G7 provenance line (G2).

---

## Addendum: `flows/08` (added after the seven; not reviewed in full)

| Sev | Conflict |
|---|---|
| MED | 08 §2, "Encounters" row: "the pool lives with the board that uses it (see `flows/06`)". 06 §6 says the opposite: global settings own the pool and the board owns only allowed, skill and background. Fix 08's citation, or reopen the question in 06. |
| MED | 08 §2: Start character = "first member of the starting party", and the start board = a "Start here" flag on a board. 07:145-147 keeps separate Start board and Starting hero fields. 08 resolves C4 in a direction that 07 does not reflect. |
| LOW | 08 §2: the custom battle program becomes a "battle plugin/rules choice". 06 §6 keeps it as "Custom battle program" in Settings › Battles. |
| — | 08 §5 and Q6 recommend import-only `.gam` with no interim write. This agrees with decisions and goes against the legacy writers in C7. |
