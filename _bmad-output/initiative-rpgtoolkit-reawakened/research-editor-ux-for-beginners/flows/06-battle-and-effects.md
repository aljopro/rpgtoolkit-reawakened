# Battle and effects: flows for beginners

**Research provenance:** legacy-guide material is UX motivation only, not normative implementation authority. Promote missing behavioral requirements through `docs/spec` or `docs/editor-features.md` before implementation.

This area covers the enemy, special move, status effect and battle-background editors; global and per-board encounters; a `Start a battle` trigger; and the test/balance flow. The editor must make a first fight one short path while keeping every battle field available to an author who needs it. This is a proposal, not an approved implementation contract.

## Jobs

| Author says | Result they need |
|---|---|
| “Make a slime that is easy to beat and pays the player.” | An enemy with readable stats, graphics, tactics, rewards and optional run/defeat programs. |
| “Give this boss two moves, one of them burns you.” | Two reusable special moves, a status effect, a weakness/strength list, and a visible link graph. |
| “Show this battle in a forest.” | A background with image, music and four menu sounds, previewed before use. |
| “Put fights in this dungeon, but not in the village.” | Global fighting enabled, a matching encounter pool, and battle settings enabled only on the dungeon board. |
| “When the player steps on this altar, start the boss fight.” | A sentence-like trigger with enemy, background, run permission and after-battle behavior. |
| “My fight is too hard. Why?” | A repeatable saved test scenario with the same party, enemy, seed and rules, plus an explanation of damage, charge, AI, criticals, weaknesses, status ticks and rewards. |

The names above are jobs, not file types. A file picker remains available for importing and opening `.ene`, `.spc`, `.ste` and `.bkg` assets.

## Legacy flow and where it hurts

The following is a concise walk through of the legacy editor, based on the functional guides. `D` means discoverability; `S` means safety.

| Step | What happens | Problem: D / S |
|---|---|---|
| 1 | The author opens an enemy document, enters name, HP, SMP, FP and DP, then opens separate child windows for graphics, special moves, tactics and rewards. | D: the battle model is spread over modal windows and the author cannot see the resulting fight while editing. |
| 2 | “Player can run” is a checkbox; a run program and two `1 in` fields are nearby. New records can display design-time values that are not the cleared values. | D/S: “1 in N” is not explained in plain words; zero and malformed values are accepted. |
| 3 | The graphics child has Rest, Attack, Defend, Special Move and Die rows, then custom rows. | D: the stance names are useful, but a missing animation has no nearby explanation of fallback or required minimum. |
| 4 | Special Moves and Weaknesses are separate lists. The persisted Strengths list has no corresponding editor list. | D/S: an author cannot author all native data; “weakness” does not say what effect it has. |
| 5 | Tactics chooses Low, Medium, High or Very High, or checks a custom RPGCode route. | D: the labels do not tell a beginner who is targeted, when specials are used, or what happens when SMP runs out. |
| 6 | Rewards contains experience, gold and a defeat program. A run-away program lives elsewhere. | D: the difference between run and defeat behavior is easy to miss; extra rewards require scripting. |
| 7 | “Add enemy to game” jumps to the main fighting setup only after the enemy has been saved. | S: a saved-before-add trap; the author can do all the work and still be blocked by a hidden lifecycle rule. |
| 8 | A special move has power, target SMP drain, user SMP cost, program, status effect, animation, description, Battle-Driven and Board-Driven checkboxes. | S: the legacy editor writes the two availability flags inverted and loads them without the inverse, so reopening can change what is shown or saved. |
| 9 | A status effect has rounds, speed/slow/disable, HP/SMP changes and a program. | D/S: positive HP means damage while negative heals; speed and slow can both be checked; direct program typing does not reliably mark the document dirty. |
| 10 | A background has image, music and four menu sounds, mostly as text fields and Browse buttons. | D: there is no useful preview or link validation. S: direct typing into a clean document can miss dirty tracking. |
| 11 | Project Properties > Fighting contains a large enemy table, one skill value per row, Random or Planned encounter mode, chance/step count, and an optional custom battle program. | D: global settings and board settings are separated; “skill” is not explained as the exact match to a board’s skill. S: the child has no Cancel and values are accepted without range checks. |
| 12 | A board can enable fighting, choose a skill and background. A script can call a fight command or a fight-enemy command. | D: a trigger author must know scripting or discover a separate program-region workflow. |
| 13 | Test Game launches what is saved on disk; it does not save dirty editors first. | S: “why did my change not appear?” is a silent stale-run trap. |

## Redesigned flow

### 1. The unified Database

Use the single Database shared with Characters, People and Items; battle records are not a separate database. Tabs include Enemies, Moves, Effects and Backgrounds.

```text
┌ Database ────────────────────────────────────────────────────────────────────┐
│ Search… [Characters] [People] [Items] [Enemies] [Moves] [Effects] [Backgrounds]│
│ Enemy: Slime · Health [12] · Special energy [4] · Attack [3] · Defence [1]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

* The list is searchable and filterable; each row shows missing links and where used.
* All changes are commands in `editor-model`; undo/redo, autosave draft, atomic save and recovery apply uniformly. Dirty state is derived from the command history, never from a field-specific flag.
* The inspector uses sentences and positive labels. `1 in N` is displayed as both a value and a short explanation. `0` or a negative value is retained on import but is a blocking warning before a test, not silently reinterpreted.
* Empty file references are shown as *(none)*, not as the literal string `None`.
* A missing linked `.anm`, `.spc`, `.ste`, `.prg` or `.bkg` is marked next to the field and in Problems; Save is allowed for work-in-progress, Test is not.

### 2. Enemy page

**Basics** contains Health, maximum/starting Special energy, Attack and Defence, can-run, incoming critical chance and outgoing critical chance. Compatibility help/code may show legacy abbreviations.

* **Incoming critical (1 in N):** how often an incoming physical hit ignores this enemy's Defence.
* **Outgoing critical (1 in N):** how often this enemy's physical hit ignores the target's Defence.
* **Can the player run?** controls whether Run is offered/allowed; an optional run-away program is under the same card.

**Moves** shows three explicit lists: Moves this enemy can use, Weak against these moves, and Resistant to these moves. Dragging a move between lists never deletes the move asset. The inspector says that weakness/strength behavior is owned by the battle rules; it does not invent a damage multiplier that the format/spec does not define.

**Tactics** replaces cryptic AI levels with a choice card:

| Choice | Plain explanation shown in the editor |
|---|---|
| Low | “Pick a random target. Choose physical attack or an affordable special move at random.” |
| Medium | “Use affordable special moves until SMP runs out; otherwise use a physical attack.” |
| High | “Aim at the weakest player. Choose physical attack or an affordable special move at random.” |
| Very high | “Aim at the weakest player. Prefer affordable special moves; otherwise use a physical attack.” |
| Custom program | “Run this RPGCode tactics program instead.” Show source/target hints and a link to the program. |

These descriptions are the engine table, not a difficulty promise. The preview shows a few selected actions with the current party and seed.

**Graphics** is a stance grid: Rest, Attack, Defend, Special Move, Die, and custom named stances. Drop an animation onto a cell, play it in place, and show a visible fallback warning where a required stance is absent. The author can use a licensed project asset or import one; bundled starter art must meet G6 and be listed in `THIRD_PARTY_NOTICES`.

**Rewards** contains experience, gold, victory/defeat program, and run-away program links. The summary sentence is: “On victory: give N experience and N GP, then run [program]. On run: run [program].” A victory program can use ordinary blocks or code to give items, set a quest variable or open a door.

### 3. Special move page

```text
  Does: [Damage health ▾] [Attack 8]   Target special-energy drain [0]
  Costs user special energy: [3]
  Can be used: [✓ Battle] [ ] Menu/board
  Then: apply status [Burn ▾]   play animation [fireball.anm ▾]
  Also run program [optional ▾]
  Description: “A burst of fire.”
  [Preview on selected enemy] [Show as code] [Save]
```

Availability is stored and displayed with one natural meaning: checked means usable. Imported legacy files with inverted availability values get a one-time compatibility warning and an explicit conversion preview. Changing the checkbox is undoable and marks the document dirty immediately.

A move's Attack changes target Health (negative values heal), target special-energy drain removes special energy, and user special-energy cost is the cost. Labels use plain words; legacy abbreviations remain only in compatibility explanations and code.

### 4. Status effect page

```text
  Lasts: [3] rounds (0 is not specified as infinite; the effect is decremented each round and removed at zero)
  Charge: [ ] faster  [ ] slower  [ ] disable
  Each round: [✓] change Health by [2]  (positive damages, negative heals)
              [ ] change special energy by [0]
              [ ] run program [burn_tick.prg ▾]
  [Preview round ticks] [Save]
```

The UI prevents contradictory speed and slow choices by default and offers an Advanced override only when importing a file that contains both. It explains that disable freezes charging, and that speed/slow change charge rate by the spec's fixed amount. A round-by-round preview shows HP, SMP and remaining rounds; it never pretends a program's custom effects can be predicted without running it.

### 5. Battle-background page

Show a preview card with the image or tile-bitmap composition behind a mock battle menu. Place music and four sound roles in a labelled list: move cursor, choose menu item, fighter ready, action unavailable. Each link has Play, Open and Replace. Empty means no sound. A missing asset is visible beside its role. The page is a normal document, not a modal child, so Cancel is unnecessary: undo is the escape hatch.

### 6. Encounter setup: global pool and per-board policy

Global settings own whether fighting exists, the enemy pool, encounter mode and optional custom battle program. **Board Settings > Battles** owns whether random battles are allowed, the board's skill level and background. The board inspector shows a read-only summary and link to Board Settings > Battles; it does not duplicate editable fields. The pool is global and classic rows match the board's skill exactly.

```text
┌ Settings › Battles ──────────────────────────────────────────────────────────┐
│ Global random battles  [ON ▾]     Custom battle program [none ▾]             │
│ Encounter rule:  (●) Random: 1 in [20] steps   ( ) Planned: every [20] steps│
│                                                                              │
│ Encounter pool                         + Add enemy                          │
│ ┌ Enemy                         Skill │ Weight / notes                 ┐    │
│ │ Slime                         [1 ▾] │ Used by 2 boards · open            │    │
│ │ Cave Bat                      [2 ▾] │ No board currently matches         │    │
│ └─────────────────────────────────────┴───────────────────────────────────┘    │
│ A random fight checks only rows whose skill equals the current board's skill. │
│ [Open selected enemy] [Preview matching boards] [Save]                       │
└──────────────────────────────────────────────────────────────────────────────┘

Board “Dungeon room” inspector · Battle summary
  Battles allowed: yes · Skill: 1 · Background: Dungeon.bkg
  [Open Board Settings > Battles]
```

“Weight” is shown only if the native model supports it; for legacy-compatible data the row remains enemy plus skill, and the preview says “uniform among matching rows.” The editor warns when fighting is globally off, board fighting is off, no pool row matches, or the background is missing. It never silently treats a nonmatching pool row as eligible.

Encounter type is explained as: **Random** rolls a 1-in-N chance after at most one whole-tile test; **Planned** starts a fight every N walked tiles. The battle spec says random fights select 1–4 enemies from matching rows and use the board background. A custom battle program replaces the normal battle system when configured.

### 7. Start a battle trigger

The board editor's trigger gallery includes **Start a battle**. Dropping it creates a trigger shape and a readable sentence:

```text
When the player [steps on ▾] this area
  Start a battle with [Slime ▾] [add another enemy]
  Background: [Dungeon.bkg ▾]   Player can run: [Yes ▾]
  Then on victory: [continue ▾] / [run program ▾]
  Then on run: [continue ▾] / [run program ▾]
  On loss: game-over program or reset (not free continuation)
  [Preview battle]   [Show as code]
```

The simple path stores the same battle request that `fightenemy` expresses: named enemies and an optional background. Advanced mode exposes skill-based `fight`, a custom battle program, variable conditions, and generated RPGCode. Validation checks enemy/background links, placement, and trigger behavior. Trigger-level post-victory continuation ordering remains unresolved by E-77, so do not imply a settled ordering. A loss follows the specified game-over program or reset, not a free continuation. `flows/07-project-shell-and-sharing.md` defines Play and test-start behavior.

### 8. Test in battle and balance helper

`Test this enemy` and `Preview battle` save first and start a deterministic test from the selected board or a saved scenario. Ordinary Play follows `flows/07` and has no selected-seed guarantee. The test panel lets the author choose party members/levels, enemy count, background and seed; it records the seed for replay.

The battle trace is not just a win/loss result:

```text
Test: Hero vs Slime · seed 1842
  Slime Health 12 / Attack 3 / Defence 1 · Hero Attack 5 / Defence 2
  Physical hit: Attack ±10%, then target Defence subtracted unless critical; minimum 1
  Expected nominal hits: about 3 [INFERENCE: uses Hero Attack 5 nominally]
  Trace: hit 4 · hit 4 · hit 4 · victory
  Slime AI: Low — random target, random affordable ordinary/special choice
  Criticals: incoming 1 in 20 · outgoing 1 in 30
  Rewards: 5 XP, 3 GP · victory program: none
```

The sample Slime values above are from the repository example listing: Health 12, Special energy 4, Attack 3, Defence 1, incoming critical 1-in-20, outgoing 1-in-30, XP 5 and GP 3. The illustrative “about 3 hits” calculation uses Hero Attack 5 and Defence 1; the ±10% variance, critical rolls and unresolved integer conversion may change the observed sequence. Legacy abbreviations remain available in compatibility explanations and code.

The helper's rule cards use only the battle spec:

* Physical-damage rule is conditional pending R-57: proposed example is attacker Attack ±10%, subtract target Defence unless critical, minimum 1.
* Critical-bypass-Defence and the legacy `takeCrit`/`giveCrit` meanings are documented behavior; show legacy names only in compatibility help/code.
* A special move's Attack effect, target special-energy drain and user special-energy cost follow the battle data; use plain labels in UI and legacy abbreviations only in compatibility help/code.
* The reviewed example figures—physical damage ±10%, charge +3 per tick (±2 for faster/slower), player/enemy readiness at 75/123, and random initial charge—are conditional pending conflict R-57, not settled runtime rules. Show them only with that caveat and record observed behavior separately.
* Built-in AI choices and affordable-special behavior are shown using the exact AI table, not a vague “difficulty” score.

Where the spec does not state a weakness/strength multiplier, the helper says “weakness/resistance rule applied by battle core” and displays the before/after result from the run. It MUST NOT invent “2× damage”.

## Scenarios walked

### (a) First fight: a dungeon-room slime

| Step | Author action and design response | Covered / Conditional |
|---|---|---|
| 1 | Create Slime with documented sample values. | Conditional on Database implementation; abbreviations are compatibility details. |
| 2 | Assign stance animations and inspect preview. | Conditional on image/preview implementation. |
| 3 | Configure tactics and rewards. | Conditional on editor/runtime implementation. |
| 4 | Configure global encounter pool. | Conditional on settings editor; exact-skill matching is verified spec. |
| 5 | Configure dungeon battle settings. | Conditional on Board Settings implementation. |
| 6 | Walk into room in ordinary Play. | Conditional; ordinary Play has no selected-seed guarantee. Only saved test scenarios guarantee a chosen seed. |
| 7 | Win and inspect rewards/music. | Conditional on runtime implementation; reward facts follow battle outcome spec. |
| 8 | Change Slime and Play from here. | Conditional on `flows/07` current-board save-first Play contract. |

### (b) Boss with two moves, a status effect and a door

| Step | Author action and design response | Covered / Conditional |
|---|---|---|
| 1 | Configure Burn duration and per-round effect. | Conditional: zero rounds must not be treated as infinite; preview proposed. |
| 2 | Create moves and link Burn. | Conditional on Database implementation. |
| 3 | Configure Boss moves, weakness/resistance and AI. | Conditional; numeric weakness/strength behavior remains unresolved. |
| 4 | Assign animation/stance and victory program. | Conditional on assets/program editor. |
| 5 | Place Start a battle trigger. | Conditional on board trigger authoring. |
| 6 | Run saved test scenario and inspect trace. | Conditional on test implementation; seed guarantee applies only to saved test scenario. |
| 7 | Open door after victory. | HOLE: exact trigger continuation ordering/conditions remain unresolved by E-77. |

### (c) Random encounters on one board only

| Step | Author action and design response | Covered / Conditional |
|---|---|---|
| 1 | Configure global pool with enemy skill entries. | Conditional on editor; exact-skill matching is verified. |
| 2 | Set Dungeon board Battles settings. | Conditional on Board Settings implementation. |
| 3 | Leave Village battles disabled. | Conditional on runtime implementation. |
| 4 | Walk tile by tile under Random 1-in-20 rule. | Conditional on runtime; at-most-once-per-tile is a spec fact. |
| 5 | Walk into Village. | Conditional on runtime implementation. |
| 6 | Set skill to 3 when no pool rows match. | Conditional on validation; no silent fallback is proposed. |

### (d) “My fight is too hard” diagnosis

| Step | Author action and design response | Covered / Conditional |
|---|---|---|
| 1 | Open report from a saved test scenario. | Conditional on report implementation; only saved scenarios guarantee seed. |
| 2 | Inspect selected party/enemy values. | Conditional on trace implementation. |
| 3 | Inspect charge, status and AI choices. | Conditional on trace implementation; numerical tuning pending R-57. |
| 4 | Compare damage range. | Conditional: integer rounding remains unresolved. |
| 5 | Inspect matching enemy count. | Conditional on encounter preview implementation. |
| 6 | Change value and compare traces. | HOLE: trace diff is unspecified. |

## Holes found and fixes

1. **Trigger after-win ordering is underspecified.** Define one ordered outcome pipeline: battle outcome, automatic rewards/defeat programs, then trigger continuation. Show it in the trigger inspector and trace.
2. **Weakness/strength multipliers are not stated in the current battle spec.** The core owner must define the numeric rule before the helper displays projected damage. Until then, show only the applied result from a run and a warning.
3. **Critical `N = 0` and negative values have no specified runtime meaning.** Preserve imported values, block Test, and require an owner ruling; recommended default is “invalid, explain and fix”, not guaranteed criticals.
4. **The spec does not settle integer rounding for ±10% damage.** The helper should show a range and use the core's deterministic seeded result for exact numbers; add a formula example to the battle spec before shipping the calculator.
5. **Legacy custom enemy stances have a reader/writer mismatch.** The importer should retain raw residue and show a repair action that converts custom pairs into the native model; never silently discard them.
6. **The legacy editor omitted Strengths editing.** TKR should expose it because the native enemy format carries it; an imported empty list remains empty.
7. **The main-file table can contain an enemy skill with no matching board.** Provide “Preview matching boards” and a Problems entry with a one-click board or skill fix.
8. **Custom battle programs are hard to balance.** A test must identify that the normal battle rules were replaced and let the author run the program with a fixture; the helper must not claim built-in damage explanations for custom rules.
9. **Victory programs can do arbitrary work.** Show static references and a trace, but label effects from code as “program-defined” when the editor cannot prove them.
10. **The test fixture for a level is ambiguous.** Require a selected character and show its resulting FP/DP/HP/SMP; a level number alone is never accepted as a balance input.
11. **Background audio can mask a battle defect.** Add per-role audition buttons and a null-audio test mode; missing audio is a warning, not a failed battle simulation.
12. **Global fighting off versus board fighting off can confuse authors.** Put both switches in the Problems message: “Battles are disabled globally” versus “This board disallows random battles.”

## Data and native-format implications

* The legacy enemy model stores name, HP, SMP, FP, DP, can-run, two critical chances, lists of special moves/weaknesses/strengths, AI level or program, rewards, run/defeat programs, stock animations and custom stance pairs. The editor must preserve all fields on import, including Strengths and custom-stance residue.
* `.spc` stores name, move FP, user SMP cost, program, target SMP drain, battle/menu flags, status-effect reference, animation reference and description. `.ste` stores name, rounds, speed, slow, disable, HP/SMP flags and amounts, and a per-round program. `.bkg` stores image, music and four sound references. See `docs/spec/formats/enemy.md` and `docs/spec/formats/battle-data.md`.
* A board stores `battleBackground`, `battleSkill` and `bAllowBattles`; the game settings store fighting enabled, up to the legacy pool shape of enemy plus skill, encounter type/chances and custom fight program. See `docs/spec/formats/board.md` and `docs/spec/formats/main-file.md`.
* References are project-relative asset links. AD-18 requires a model to retain unmodelled fields as residue so import does not silently drop information. A native format is permitted only when the legacy shape blocks stable IDs, component links, trace metadata or other agreed TKR behavior; ADR 0005 does not require one yet.
* AD-19 means every property edit, list reorder, link replacement and generated trigger change is a serialisable command. AD-20 means `editor-ui` requests save, run and asset access through platform-services; it does not own file I/O.
* The battle core owns HP/SMP, charge, statuses, AI decisions and deterministic RNG. The default battle UI consumes draw/audio data; a custom battle program uses the same core operations. This follows `docs/spec/engine/plugins-and-battle.md` and ADR 0004.
* A balance test is an editor host request that starts a saved project or fixture, supplies a seed and inputs, and returns a trace. It must not create a hidden scratch asset in the project.
* Starter art, sound, music and fonts are optional. Any bundled content must be CC0 or Bronze-or-better under G6 and listed in `THIRD_PARTY_NOTICES`; imported author assets remain the author's responsibility.

## Challenges to earlier decisions

This follows the owner-selected beginner/full-capability direction, common one-click actions with code available, and robust plugin editing. Master-detail navigation, save-first testing and the specialist panel placement are **research recommendations**.

Recommend a first-class **Test battle** panel beside the selected data, backed by an explicitly prepared test scenario. Local previews and saved-game execution are distinct; neither an existing embedded runtime nor a ban on it follows from the conversation. The runner/preview adapter still needs its contract.

The proposed encounter “weight” control is intentionally conditional. Legacy-compatible encounter data is enemy plus skill; a weight field must not be shown as if it persists unless a native-format decision adds it.

## Open questions for the owner

1. **What is the numeric weakness/strength multiplier?** Recommended default: rule it in the battle spec before implementing projected balance numbers; until then show observed seeded results only.
2. **How are fractional ±10% physical damages converted to integers?** Recommended default: specify one deterministic integer rule in core and use it in every helper/report.
3. **What does critical chance `1 in 0` mean?** Recommended default: invalid with a blocking diagnostic; preserve the imported value for repair.
4. **Should a trigger's after-win continuation run before or after enemy victory/reward programs?** Recommended default: rewards and enemy defeat programs first, then trigger continuation, with the order visible in the trace.
5. **Do encounter rows gain weights in the TKR native model?** Recommended default: no weight until a real design need appears; legacy rows remain uniform among exact skill matches.
6. **How should a custom battle program appear in the balance helper?** Recommended default: run it in the same fixture and show only measured events plus “custom rules”; do not apply built-in formulas.
7. **Which legacy custom enemy stances are repairable automatically?** Recommended default: import all recoverable pairs into stable named stances and preserve irrecoverable bytes as residue with a Problems action.
8. **Should a test battle permit a player to run?** Recommended default: expose a test-only toggle, defaulting to the selected enemy's can-run rules, and report when the result depends on that toggle.

## Sources

* Legacy guide, `05-character-item-enemy.md`, sections “Enemy editor”, “Graphics”, “Special Moves”, “Tactics and AI”, “Rewards”, “Enemy workflow”, and “Enemy under the hood and gotchas”.
* Legacy guide, `06-animation-and-battle-assets.md`, sections “Special move editor”, “Status-effect editor”, “Fight-background editor”, and “Under the hood, validation and discrepancies”.
* Legacy guide, `01-environment-and-main-file.md`, sections “Fighting tab”, “Add an encounter and custom fight program”, and “Test Game”.
* Legacy guide, `02-board-editor.md`, sections “Battle settings”, “Program panel”, and “Create a board trigger”.
* `docs/spec/engine/plugins-and-battle.md`, sections “Battle protocol”, “Battle model”, “Enemy AI”, and “Random encounters”.
* `docs/spec/formats/enemy.md`, sections “Layout” and “The custom-stance mismatch”.
* `docs/spec/formats/battle-data.md`, sections “Fight background”, “Status effect”, and “Special move”.
* `docs/spec/formats/board.md`, “Battle settings” fields; `docs/spec/formats/main-file.md`, “Fighting” fields.
* `docs/editor-features.md`, T-12, T-27 and T-56–T-58/T-63; `docs/guardrails.md`, G6–G7.
* ADR 0004, “Typed Subsystems Emitting Draw Lists”; ADR 0005, “Legacy compatibility is an import/playback feature”; architecture spine AD-18, AD-19 and AD-20.
