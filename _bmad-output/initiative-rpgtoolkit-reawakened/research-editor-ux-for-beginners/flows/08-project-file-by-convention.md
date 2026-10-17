# The project file by convention: hiding the main game file

**Origin.** Jensen, 2026-10-17: "we can do our best to just hide away the main.gam file altogether... you may ever see it once and the defaults should be able to handle most of it. It's like the csproj file... You add your plugins... by convention you start with a particular file though you can change it if you really want." Treated as **Decided in direction**; the specifics below are **Proposed**.

**Principle.** *Convention first, configuration on exception.* The editor never asks a question whose default is right. A setting is surfaced only if a beginner would plausibly change it, and even then it sits behind the thing it affects (a board's "Start here", a character's "Add to party"), not in a settings dialog.

## Jobs

- "Make a game" without ever opening a settings screen.
- "Make the game start here" / "make this the hero".
- "Add a plugin" (a menu, a battle system, extra commands) and see what it does.
- "Change the keys" or "change the screen size", rarely, and find it.
- (Expert) read or edit the project file as text, in VS Code or any editor.

## Legacy flow and where it hurts

The legacy main-game specification numbers 61 logical layout rows, including version-dependent and repeated records (`docs/spec/formats/main-file.md`); this is not a count of 61 always-present scalar fields. Facts relevant to hiding it:

| Fact (from the spec) | Problem |
|---|---|
| It lives in a `Main\` folder **outside** the project folder and stores a project path | Moving or sharing a project breaks it (D, S). Inside a distribution package it is `main.gam` at the root and the path is ignored |
| Several stored settings have no runtime effect: screen API choice, registration fields, language file, two skin fields and three day/night fields | Avoid reproducing these as working controls; preserve compatibility data separately |
| Fixed-size tables are always written full: 51 run-time key slots, 501 enemy slots | Looks like limits; ~1.9 KB of mostly empty file |
| `fightGameYn` means **0 = battles on, 1 = off** | An inverted flag; the legacy editor labelled it correctly but the file is a trap for anyone reading it (S) |
| The editor writes the newest main-file minor version when saving | Re-saving can change format version; opening alone is not evidence that the file was rewritten |
| No value is range-checked on load | Bad values surface at runtime as a broken game (S) |
| Settings are distributed across several editor tabs | [INFERENCE] Finding the relevant setting may require exploring several tabs; the spec does not prove every new author must visit them all |
| New-project setup may copy a starter kit (T-04) | Whether additional startup configuration is necessary depends on the chosen kit; the redesign should make first Play work without manual main-file setup |

## Redesigned flow

### 1. What the author sees

1. **New project** asks for a name, with a ready starter selected and **Change template/style** available. Proposed Top-down/Isometric and Blank/Starter village/Battle demo choices need not all block creation. Setup writes the necessary project data.
2. After that, the main game file is **hidden from normal authoring views**, not absent or inaccessible. Settings are reached from the things they affect; **Project settings** displays effective values and their source: *default*, *convention*, *imported*, or *override*. “Show project files” and “Open as text” remain available where the format supports text editing.
3. Experts can inspect project data. A future human-readable manifest is an option, not a prerequisite for hiding binary `.gam` behind this UI. A native format/name/schema requires the ADR 0005 decision, not a UX assumption.

### 2. Where each legacy setting goes

| Legacy field group | Becomes | Default and convention | Where an author meets it |
|---|---|---|---|
| Game title | Project name | The name typed at New project | Project settings; window title in Web export |
| Project folder path | **Gone** | The project is a folder; every path is relative | Nowhere |
| Start board (`initBoard`) | A board flagged **Start here** | New project's first board; exactly one board has the flag | Right-click a board: **Start here**; world view shows a flag; Play-from-here ignores it |
| Start character (`initChar`) | The **first member of the starting party** | Default hero created by the template | Party setup in the Database ("Add to starting party") |
| Start program | `Prg/start.prg` **if it exists** | None (nothing to run) | Scripts view: "On game start" template; renaming warns in Problems |
| Game-over program | `Prg/game-over.prg` **if it exists** | Built-in game-over screen | Same |
| Run-time program and key; 50 extra key-to-program slots | A **Shortcuts** list ("press F2 to run this script") | Empty; no fixed 50 | Project settings > Controls; also offered when authoring a script ("Run this on a key") |
| Menu key, activation key, run key | Controls defaults | Enter opens the menu, Space activates, arrows move | Project settings > Controls with press-a-key capture and conflict detection across **all** bindings |
| Movement keys (8 directions), diagonals, mouse/keyboard, joystick | Controls defaults | Arrows; diagonals on; keyboard on | Same |
| Movement style (tile / pixel / pixel-push), game speed, path-finding mode | **Movement** group | Per-style default; speed 0 | Project settings > Movement, in words ("Smooth movement", "Grid movement") |
| Resolution, windowed/full-screen, colour depth | **Screen** group | One of three presets, or custom; full-screen is a **player** choice, not a project setting [INFERENCE]; colour depth hidden and preserved as residue [INFERENCE: not meaningful for a browser renderer] | Project settings > Screen; the Display preview in the board editor (essay §4.2) |
| Battles on/off, encounter pool, encounter type, chance | **Encounters** | Preserve the stock system's **global** enemy/skill pool and per-board allowed/skill/background selection. Independent per-board pools would be a separate plugin/native feature | Project settings > Battles owns the global pool; Board Settings > Battles owns board-specific fields; Properties links to that owner |
| Custom battle program | **Advanced battle replacement** | Stock charge-based battle rules unless explicitly replaced; a script replacement remains distinct from selecting a plugin | Battles / Plugins with a link to the selected script |
| Menu, battle and command plugins | **Plugins list** (see 3) | Starter chooses useful packs; inspect or change explicitly | Project settings > Plugins, or Add plugin from Assets |
| Cursor image, hot spot, transparent colour, three cursor sounds | **Look and feel** | Built-in cursor and sounds | Project settings > Look and feel (Advanced) |
| Show FPS in title bar, debug drawing masks and colour | **Developer overlays** | Off | Play toolbar toggles; **not** stored in the project [INFERENCE: they are test aids] but preserved on import |
| Day/night fields | Hidden | n/a | **Stored-but-unused**: kept as residue (AD-18), never shown |
| Registration, language file, skins, screen API choice | Hidden | n/a | Same; skins return only if the skin editor does |

### 3. Plugins like package references

ADR 0004 already defines the shape: a manifest, "an ordered list of plugin entries, plain data", where the built-in core pack is pinned at the bottom, order is layer order, and anything else can be removed, disabled, reordered or added. That is the beginner-facing analogue of a `.csproj` package list.

- **One effective ordered plugin list**, whether persisted in the current project data or a future manifest. Do not create two competing lists.
- **Adding:** **Add plugin...** or dropping a pack opens a review of its origin, commands, editors, subsystem roles and order. Discovering a file is not consent to execute it. Confirm before enabling or replacing a role; cancel leaves project data unchanged.
- **Safety:** ADR 0004 currently accepts ungated extension code; the editor cannot claim otherwise. Explain that trust requirement and show host compatibility. Legacy native binaries are unsupported in **every** new host; Desktop export is not a fallback for loading them.
- Legacy menu/battle names may map to verified native equivalents. Unmatched entries stay preserved and visibly unsupported; never silently substitute a different ruleset.

### 4. Convention list (names the editor looks for)

| Convention | Meaning |
|---|---|
| One board has **Start here** | The game starts there at the player-start marker |
| First starting-party member | The player character |
| `Prg/start.prg`, `Prg/game-over.prg` | Optional programs, run if present |
| `Prg/_generated/<Board>/` (proposed spelling) | Editor-owned snippets grouped under Programs, optionally per board as Jensen suggested |
| Plugin pack location (not selected) | Discovery prompts Add/review; directory presence never auto-enables code |
| Project-relative paths everywhere | Move the folder anywhere |

Rules that stop conventions becoming magic: (a) every convention is **listed in Project settings** with its current resolution ("Start board: Village, by convention: first board"); (b) renaming a conventional file never silently disconnects it, it raises a Problem with **Fix**; (c) overriding a convention is explicit and visible ("Start program: `intro.prg`, set by you").

### 5. The file itself

- **If a new manifest is justified:** consider a readable root document with a schema integer/migrations (AD-23). Name, encoding and extension remain undecided. Existing binary storage can still support the proposed hidden-file UX.
- **Not the distribution manifest:** a published package already has `manifest.json { schema, main, index }` at its root naming the main file (editor-features T-70, T-74). Keep them separate: the project manifest is for authors, the distribution manifest is generated by export. Decide whether the distribution manifest's `main` points at the project manifest or at a compiled form.
- **Legacy project opening:** resolve the main file plus its project assets; a bare assets folder may not contain `.gam` because the original layout placed it outside. Accept a Toolkit root, an explicit main-file/assets pair, or a supported package. Preserve imported effective defaults and explicit startup references. Whether saving converts to a native authoring project is still an ADR/format decision.

## Scenarios walked

### A. First Play with zero settings visited

| Step | Proposed flow (paper walkthrough, not runtime verification) | Status |
|---|---|---|
| 1 | New project: name, style, template | Yes |
| 2 | Template creates a start board, a default hero, party of one | Yes |
| 3 | Press Play | Yes: start board + hero by convention |
| 4 | Open Project settings out of curiosity | Yes: everything shows "default" |
| 5 | Delete the only board | **HOLE:** the project now has no start board. Fix: deleting the flagged board prompts "Choose a new start board" or blocks if it is the last one |

### B. Add a plugin

| Step | Flow | Covered? |
|---|---|---|
| 1 | Project settings > Plugins > Add plugin... | Yes |
| 2 | Pick a plugin file; see its description and what it adds | Yes |
| 3 | Plugin adds new commands | **HOLE:** blocks and the script editor must learn the new commands (block catalog and completion come from the active plugin set). Fix: block palette and language service read the effective plugin list |
| 4 | Two plugins define the same command | Covered by ADR 0004 (later entry wins; one overridden warning). **HOLE:** the warning must surface in Problems with both plugin names and the order control |
| 5 | Export to the Web | **HOLE:** plugin has no Web equivalent; preflight must block with the plugin named |

### C. Change the start board

| Step | Flow | Covered? |
|---|---|---|
| 1 | In the world view, right-click the Inn > Start here | Yes |
| 2 | The flag moves; the old board loses it | Yes (exactly one flag) |
| 3 | The player-start marker on the Inn is missing | **HOLE:** the new start board may have no marker. Fix: setting Start here places or asks for the marker; Problems flags a start board without one |

### D. Import a legacy game

| Step | Flow | Covered? |
|---|---|---|
| 1 | Open Toolkit root, supported package, or explicitly paired main file and asset folder | Designed; bare assets-only import asks for the missing main file |
| 2 | Read available `.gam` settings; preserve semantics and compatibility residue | Conditional on format/residue implementation |
| 3 | The old project has a 3-line start program in a differently named file | **HOLE:** conventional `Prg/start.prg` does not exist. Fix: the importer records an explicit override "Start program: `intro.prg`, imported", visible in Project settings |
| 4 | Old key bindings use ASCII codes for menu/activation keys | Covered: shown as key names; conflicts checked |
| 5 | A plugin name has no native equivalent | Covered (disabled entry + Problem) |

### E. A beginner wants Enter to do something else

| Step | Flow | Covered? |
|---|---|---|
| 1 | Looks in Project settings > Controls | Yes |
| 2 | Presses the key to bind; the editor checks all bindings | Yes |
| 3 | The menu key was set to a key already used by a run-time shortcut | Covered by conflict detection |

## Holes found and fixes

1. Deleting or renaming the conventional thing (start board, start program) must never silently disconnect it: Problems entry with Fix, or a block on delete.
2. A start board needs a player-start marker; setting one should place or request the other.
3. Block palette and language service must follow the effective plugin set.
4. Web preflight must block plugins with no Web equivalent and name them.
5. Importing a legacy project must freeze its effective defaults as explicit values.
6. "Hidden" does not mean "unreachable": **Open as text** and the source column in Project settings must exist from the first release.

## Data and native-format implications

- **Hiding the file is a UX decision, not a format decision.** Defaults and overrides can initially be stored in `.gam`, in project metadata, or in a later native manifest. Stable IDs, block metadata and plugin-owned records may justify new storage independently; choose that through ADR 0005 rather than claiming a Blank project already requires it.
- **Residue (AD-18):** retain original effective settings and unmodelled data without loss. “Byte-exact” preservation of every discarded field is a stronger promise than generic semantic residue and needs verification against the actual reader/writer design.
- **Epic effect:** foundation currently requires `.gam` reading/writing. This research hides the main-file editor behind defaults and contextual settings; that can satisfy the same storage criterion. A separate owner decision is required if conversion/native persistence would replace the writer.
- **Determinism (G3):** all defaults are data; no time or locale dependence in resolving conventions.

## Challenges to earlier decisions

- `flows/07-project-shell-and-sharing.md` designs a full searchable settings page (General, Start, Controls, Display, Battles, Plugins, Advanced) as the main-file replacement. Under this note that page shrinks to an **exceptions and inspection** page whose first job is to show how each value was resolved; the groups remain but most sections are reached from the thing they affect. Keep the search; drop the expectation that a beginner visits it.
- `reawakened-fit.md` conflict 4 (native data) gains a concrete first artifact: the project manifest.
- `decisions.md` 4.3 says a person's look, line and placement are one gesture. "Add to starting party" is the same pattern for the hero.

## Open questions for the owner

1. **Manifest format and name.** No selection yet. Recommended default: first reuse existing project storage behind the UI; compare a native text manifest only when an authoring feature requires extra data. Do not select JSON, TOML or an extension merely to hide `.gam`.
2. **Does the start program convention stay at all?** Recommended default: yes, `Prg/start.prg` if present, because forum/tutorial scripts expect an "on start" hook and it costs no UI.
3. **Should the starting party be stored in the manifest or a database record?** Recommended default: the manifest (it is project setup, not a character property), as recommended in `flows/04-characters-items-database.md`.
4. **Are developer overlays (FPS, vector debug draw) project data or per-user editor settings?** Recommended default: per-user; preserve legacy values as residue on import.
5. **Full-screen:** project default or player choice? Recommended default: the Web player offers it; the project stores only logical resolution.
6. **`.gam` write during foundation delivery.** The accepted epic currently requires reads and writes. Import-first is a research recommendation, not authority to change that criterion; request an explicit scope decision before removing any writer.

## Sources

- `docs/spec/formats/main-file.md` (all 61 fields, compatibility notes), `docs/editor-features.md` T-04, T-10 to T-14, T-70, T-74.
- ADR 0004 (plugin manifest; decisions 2 and 6), ADR 0005 (native format open questions), architecture spine AD-18 (residue), AD-23 (schema versions).
- `decisions.md` and `flows/06`, `07` in this folder.
