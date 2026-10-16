# Plugins and battles

The engine has **no built-in menu and no built-in battle screen**. Both are plugins: DLLs in the project's `Plugin\` folder, named in the main file. A third kind of plugin adds new RPGCode commands. Plugins call back into the engine through a 140-method callback interface. This page specifies that contract and the battle model the engine provides to the battle plugin. Plugin compatibility only matters if Reawakened wants to run existing plugin DLLs (Windows-only by nature); otherwise it describes what the built-in menu and battle replacements must do.

## Plugin roles

| Role | Type flag | Named by | Called when |
|---|---|---|---|
| RPGCode commands | 1 | main file plugin list | a script calls a command that is neither built-in nor a method of the script |
| Menu | 2 | main file `menuPlugin` (default `tk3menu.dll`) | the menu key is pressed while the player is idle, or a script calls `InternalMenu(n)` |
| Battle | 4 | main file `fightPlugin` (default `tk3fight.dll`) | a random encounter or `Fight` / `FightEnemy` in a script |

Without a menu plugin the menu key does nothing; without a battle plugin battles end immediately.

<a id="e-99"></a>
**E-99 Plugins (extension point).** Legacy native plugins could add script functions, replace the menu, or replace the battle UI, and they were offered every unknown function call. The two stock plugins (menu and battle) have no other home and must be re-implemented natively.

**Reawakened rule.** The rebuild provides **one plugin contract**, used by the engine's own packs and by third parties alike, selected by an **editable manifest**, with every external effect going out through **host requests**. It is not trust-gated for now, and legacy native plugin binaries are not supported.

> **Open conflict R-61 — plugin contract and API shape.** the legacy feature inventory (E-99) records only the unknown-call back-off and native plugins; this page, `docs/spec/engine/plugins-and-battle.md:167`, specifies the 140-method callback interface, the native and COM export shapes, the menu and battle protocols and the loader rules. Owner epics: **rpgcode-vm** (entries 3.23 and 3.24 hold the evidence) and **battle**. Landed code: the port contracts already carry the plugin and request shapes (`packages/core/src/ports/input.ts:79`, `packages/core/src/ports/requests.ts:52`). The owners settle the boundary at inception; this page rules nothing.

## Two plugin kinds

**Native ("old") plugins** export plain functions (`__stdcall`, ANSI strings):

| Export | Signature | Use |
|---|---|---|
| `TKPlugInit` | `int (int *callbacks, int count)` | **required**; receives the callback table (see below) |
| `TKPlugVersion` | `long ()` | optional; its *presence* means "give me 133 callbacks" instead of 45 |
| `TKPlugBegin`, `TKPlugEnd` | `void ()` | called after init and before unload (the original engine calls them without checking they exist) |
| `TKPlugType` | `int (int type)` | return non-zero if the plugin supports role *type*; absent = RPGCode commands only |
| `TKPlugQuery` | `int (char *name)` | non-zero if this plugin implements command *name* |
| `TKPlugExecute` | `int (char *commandLine)` | run a command (cannot return a value) |
| `TKPlugMenu` | `int (int request)` | open menu *request* |
| `TKPlugFight` | `int (int enemyCount, int skillLevel, char *background, int canRun)` | run a battle; returns an outcome |
| `TKPlugFightInform` | `int (int srcParty, int srcFighter, int tgtParty, int tgtFighter, int srcHpLost, int srcSmpLost, int tgtHpLost, int tgtSmpLost, char *message, int code)` | battle event notification |
| `TKPlugInputRequested` | `int (int type)` | optional; non-zero = send this plugin keyboard (0) / mouse-down (1) events |
| `TKPlugEventInform` | `int (int keyCode, int x, int y, int button, int shift, char *key, int type)` | optional; receives those events |

**COM plugins** (ActiveX DLLs, e.g. written in VB6) are recognised by exporting `DllRegisterServer`. The engine registers the DLL, creates the first creatable class in its type library and calls these members by name:

| Member | Shape |
|---|---|
| `SetCallbacks` | property, set to the engine's callback object (required) |
| `Plugin_Initialize`, `Plugin_Terminate` | methods |
| `PlugType(type) → bool` | as `TKPlugType` |
| `RPGCode_Query(name) → bool` | as `TKPlugQuery` |
| `RPGCode_Execute(line, &dataType, &text, &number, usingReturn) → bool` | runs a command and may return a value (`dataType` selects text or number) |
| `Menu(request) → int` | |
| `Fight(enemyCount, skill, background, canRun) → int` | |
| `FightInform(…10 args…) → int` | |
| `GetFighterLocation(party, index, &x, &y) → bool` | screen position of a fighter, for scripts that draw battle effects |

COM plugins cannot receive keyboard and mouse events.

**Load order:** load the DLL, initialise it, then ask `PlugType` for the role. A plugin that answers "no" is unloaded (the original engine skips its terminate call).

## RPGCode command plugins

At compile time each unknown command name is offered to every RPGCode plugin's *query*. At run time the engine rebuilds the call as **source text** — numbers formatted, strings in quotes (no escaping), variables by name — and passes it to *execute*. The plugin reads and writes script variables through the callbacks; during the call those resolve to the calling program's locals first.

<a id="e-95"></a>
**E-95 Source/target context.** Each running program has a *source* and a *target* entity (player, item or enemy), set by whatever triggered it, and functions resolve the `"source"` and `"target"` handles against that pair ([rpgcode-language.md](rpgcode-language.md#threads), [rpgcode-functions.md](rpgcode-functions.md)). The engine sets the same pair for a plugin call, which is what callbacks 79 and 80 below are for.

## Menu plugin

`menu(request)`: 1 main menu, 2 inventory, 4 equipment, 8 abilities. The plugin draws its own UI and returns when closed.

<a id="e-80"></a>
**E-80 Default menu.** Opened with the menu key or `InternalMenu(n)`; in legacy the presentation came from a plugin and the rules from the engine:
* main screen: party members with portraits and stats, gold and play time;
* **Items:** use (on a chosen member; consumes), info, drop (not key items);
* **Equip:** choose member, slot, then item; remove;
* **Abilities:** use board-usable special moves, info;
* **Save** (disabled when the board forbids it), **Load**, **Quit**.

A custom menu image can be set (`MenuGraphic`), cursor sounds come from the main file, and the main menu, inventory, equip and abilities screens can each be opened directly.

<a id="e-81"></a>
**E-81 Inventory.** A list of (item file, handle, quantity). `GiveItem` and `TakeItem` add and remove; key items cannot be dropped. Using an item from the menu or in battle applies +HP/+SMP and/or runs the use program, then consumes it ([../formats/item.md](../formats/item.md#board-items-vs-inventory-items)).

<a id="e-82"></a>
**E-82 Equipment.** Body slots: head, neck, left hand, right hand, body, legs and named accessories. An item lists the slots it fits and which characters may use it. Equipping adds HP/DP/FP/SMP bonuses and runs the equip program; removing subtracts them, runs the remove program, caps HP and SMP, and returns the item to the inventory ([../formats/item.md](../formats/item.md)).

<a id="e-18"></a>
**E-18 Saving permission per board.** The board carries a disable-saving flag, and the default menu's Save option is disabled on such a board ([../formats/board.md](../formats/board.md#threads-constants-and-settings)).

<a id="e-123"></a>
**E-123 Save gating.** The default menu respects that flag, so the Save option and `Save()` behave as the board allows; the file itself is [../formats/save-game.md](../formats/save-game.md).

## Battle protocol

The engine keeps the battle **model**; the plugin owns the **loop and the UI**.

<a id="e-70"></a>
**E-70 Battle start.** *Random:* after each whole-tile step on a board that allows battles, and with fighting enabled globally, roll 1-in-`chances` (type 0) or check every `chances` tiles (type 1); if the main file names a custom battle program it runs instead; otherwise 1-4 enemies are drawn at random from the main file's pool among those whose skill level equals the board's, and the board's battle background is used. *Scripted:* `Fight(skill, bkg)` or `FightEnemy(e1, e2, …, bkg)`.

<a id="e-71"></a>
**E-71 Battle setup.** Two parties (enemies and the player's), the battle background's music replacing the board music, the background image and menu sounds loaded, and running away allowed unless an enemy forbids it.

1. The engine sets up two parties: party 0 = enemies, party 1 = the player's party. It switches to the battle music.
2. It calls `fight(enemyCount, skill, background, canRun)` and waits. **`skill` is always −1** in the original engine.
3. The plugin loops: it calls `CBFightTick` regularly. On each tick the engine charges every fighter, applies status effects and lets enemies whose charge is full act (AI), reporting each event back through `fightInform`. The plugin performs the players' actions with `CBFightDoAttack`, `CBFightUseItem`, `CBFightUseSpecialMove` and releases charge with `CBReleaseFighterCharge`, and draws everything itself (canvas callbacks), calling `CBDoEvents` to keep the window alive.
4. The plugin returns an outcome:

| Value | Outcome | Engine then |
|---|---|---|
| 0 | ran away (automatic) | runs the enemy's run program |
| 1 | ran away (plugin handled it) | nothing |
| 2 | won (automatic) | gives the enemies' gold and experience and runs their defeat programs |
| 3 | won (plugin handled it) | nothing |
| 4 | lost | runs the main file's game-over program, or shows "Game over." and resets the game |

5. The engine restores the board music and redraws.

<a id="e-79"></a>
**E-79 Battle-facing script API.** The fight plugin interface exposes fighter queries (HP, SMP, FP, DP, name, animation, charge %), actions (attack, use item, use special, release charge, add or remove a status effect) and a `fightTick` — callbacks 114 to 132 below.

**Reawakened rule.** The rebuild ships a **default battle UI** that reproduces the stock look and feel, and keeps the battle **rules in the core** rather than in the UI.

**Reawakened rule.** **RPGCode-written battle systems** must be able to drive the same core operations as that default UI (they replace it through the main file's custom fight program), so a script can build its own battle screen without a second rules engine.

`fightInform` codes: 0 HP removed, 1 SMP removed, 2 source attacked, 3 source used a special move, 4 source used an item, 5 source fully charged, 6 source died, 7 party defeated. **The original engine never sends 6 or 7**: the plugin must detect deaths and the end of the battle itself.

### Battle model

- **Charge:** every fighter has a charge counter; each tick adds the fighter's speed (3, ±2 per speed/slow status effect). Players act at 75, enemies at 123. A "disable" status effect freezes charge.
- **Attacks and special moves:** HP and SMP changes are clamped at 0; critical-hit chances come from the enemy's `takeCrit`/`giveCrit` ("1 in N"). Special-move effects are described in [../formats/battle-data.md](../formats/battle-data.md#special-move-spc).
- **Status effects** apply each round until their `rounds` run out ([../formats/battle-data.md](../formats/battle-data.md#status-effect-ste)).

<a id="e-72"></a>
**E-72 Charge-bar turns ("active time").** Each fighter's charge fills by *speed* per tick — players' maximum 75, enemies' maximum 123, both starting at a random value. A charged **player** stops charging and waits for a menu choice; a charged **enemy** acts immediately and resets. Disabled fighters do not charge.

<a id="e-73"></a>
**E-73 Player actions.** Fight (physical attack), Special Move (named per character, e.g. "Magic"), Item (a battle-usable item; consumes one), Run.

<a id="e-74"></a>
**E-74 Damage rules.** A physical attack uses the attacker's FP ±10 % random variance; the target's DP is subtracted **unless a critical hit happens** (enemies define 1-in-N crit chances for being hit and for hitting); minimum 1 damage; damage can be applied to SMP instead of HP. A special move removes its *FP* from the target's HP and its *target SMP drain* from the target's SMP, costs the user SMP, and may apply a status effect and play an animation. HP and SMP are clamped at 0.

<a id="e-75"></a>
**E-75 Status effects.** Applied by moves or by script and keyed by file (re-applying restarts it). Each round while the fighter is charged: apply ±HP and ±SMP and optionally run a program (with `source`/`target` = the fighter); it lasts a number of rounds. **Speed up / slow down** change the charge rate; **disable** freezes charging and is reference-counted when several disables are active.

<a id="e-77"></a>
**E-77 Outcome.** **Win:** the total gold and experience of all enemies, a "Gained N experience / GP" message, the experience given to every party member (which may level them up), and the enemy defeat program. **Run:** the run-away program and no rewards. **Lose:** the game-over program, or `reset()` when there is none. The board music resumes afterwards.

> **Open conflict R-57 — battle model and notification quirks.** the legacy feature inventory (E-74, E-72) says players act at a maximum charge of 75, enemies at 123, damage has a ±10 % variance and a critical hit bypasses DP; this page, `docs/spec/engine/plugins-and-battle.md:102`, says "`skill` is always −1" in the original engine and gives the charge, damage and notification codes above, including that the engine "never sends 6 or 7". Owner epic: **battle**. Landed code: none. The owner settles it at inception; this page rules nothing.

### Enemy AI

| AI level | Behaviour |
|---|---|
| 0 | random target; 50/50 physical attack or special move |
| 1 | special moves until SMP runs out |
| 2 | the weakest target; 50/50 |
| 3 | the weakest target; special moves first |
| any, with `useCode` | runs the enemy's AI program instead |

<a id="e-76"></a>
**E-76 Enemy AI.** The four built-in levels are the table above. An enemy can instead use a **custom AI program** (with `source` = enemy and `target` = a random player). Enemies use only specials they can afford, and curative specials target allies.

### Random encounters

Tested at most once per tile the player moves, on boards that allow battles, when the main file enables fighting (`fightGameYn = 0`). Type 0: a fight starts with probability 1 / `chances`. Type 1: a fight starts every `chances` tiles walked. If the main file's custom-fight flag is set, its fight program runs instead. Otherwise 1-4 enemies (random count) are drawn from the main file's encounter table among those whose skill level matches the board's battle skill, and the board's battle background is used. If no enemy has that skill level the message "No enemies of skill level N found." is shown.

## Callback interface

Plugins reach the engine through the 140 methods below. Native plugins receive the first 45 or 133 as an array of function pointers (in this order; methods 133-139 are COM only). COM plugins get an automation object (`Trans3.Callbacks`). All methods return success; failures show only in their results. Canvas, animation and other "handles" are numbers issued by the engine. `→T` marks the return value. Info codes for the `Get…`/`Set…` families are listed in [plugin-constants.md](plugin-constants.md).

Notable conventions: `CBCanvasDrawText` positions text in **character cells**, `CBDrawTextAbsolute` in pixels; `CBGetBracketElement` is **1-based**; the element-value callbacks only work during an RPGCode plugin call.

<a id="e-54"></a>
**E-54 Animations.** `.anm` files and animated GIFs: a per-frame image (a picture, a tile or a tile bitmap), a per-frame transparent colour, a per-frame sound and a frame delay in seconds. They are used for sprites, battle effects and stand-alone screen animations (`Animation`, `SizedAnimation`, and persistent ones that keep running until `EndAnimation`), and frames are shared and cached between sprites that use the same file ([../formats/animation.md](../formats/animation.md)). Callbacks 105 to 113 below create, draw and query them.

| # | Method | Purpose |
|---|---|---|
| 0 | `CBRpgCode(BSTR cmd)` | Compile and run an RPGCode string in a fresh program |
| 1 | `CBGetString(BSTR var) →BSTR` | Read a string variable (strips trailing `$`; uses the current program's locals during a plugin command call, else globals) |
| 2 | `CBGetNumerical(BSTR var) →double` | Read a numeric variable (strips `!`) |
| 3 | `CBSetString(BSTR var, BSTR val)` | Set a string variable |
| 4 | `CBSetNumerical(BSTR var, double val)` | Set a numeric variable |
| 5 | `CBGetScreenDC() →int` | `GetDC(host window)`; stores it for CBReleaseScreenDC |
| 6 | `CBGetScratch1DC() →int` | Obsolete, returns 0 |
| 7 | `CBGetScratch2DC() →int` | Obsolete, returns 0 |
| 8 | `CBGetMwinDC() →int` | Obsolete, returns 0 |
| 9 | `CBPopupMwin() →int` | Show the message window |
| 10 | `CBHideMwin() →int` | Hide the message window |
| 11 | `CBLoadEnemy(BSTR file, int slot)` | Load `Enemy\file` into the plugin enemy slot `the battle enemy list[slot]` |
| 12 | `CBGetEnemyNum(int code, int slot) →int` | Read a numeric enemy field (`ENE_*`) |
| 13 | `CBGetEnemyString(int code, int slot) →BSTR` | Read a string enemy field (sound codes 5-8 return "") |
| 14 | `CBSetEnemyNum(int code, int val, int slot)` | Write a numeric enemy field |
| 15 | `CBSetEnemyString(int code, BSTR val, int slot)` | Write a string enemy field |
| 16 | `CBGetPlayerNum(int code, int arrayPos, int slot) →int` | Read a numeric player field (`PLAYER_*`) |
| 17 | `CBGetPlayerString(int code, int arrayPos, int slot) →BSTR` | Read a string player field (sound fields obsolete) |
| 18 | `CBSetPlayerNum(int code, int arrayPos, int val, int slot)` | Write a numeric player field |
| 19 | `CBSetPlayerString(int code, int arrayPos, BSTR val, int slot)` | Write a string player field |
| 20 | `CBGetGeneralString(int code, int arrayPos, int slot) →BSTR` | Read global string state (`GEN_*`: party, inventory, equipment, music, board...). Codes 2-3 are "TBD" |
| 21 | `CBGetGeneralNum(int code, int arrayPos, int slot) →int` | Read global numeric state (GP, position, resolution, time, steps, `GEN_ENE_RUN`...). Several codes obsolete |
| 22 | `CBSetGeneralString(int code, int arrayPos, int slot, BSTR val)` | Write global string state |
| 23 | `CBSetGeneralNum(int code, int arrayPos, int slot, int val)` | Write global numeric state (including whether the player can run from the current fight) |
| 24 | `CBGetCommandName(BSTR cmd) →BSTR` | Lower-cased text before `(` |
| 25 | `CBGetBrackets(BSTR cmd) →BSTR` | Text between the first `(` and the last `)` |
| 26 | `CBCountBracketElements(BSTR cmd) →int` | Count comma-separated arguments (quote-aware) |
| 27 | `CBGetBracketElement(BSTR cmd, int n) →BSTR` | Get argument `n` (**1-based**) |
| 28 | `CBGetStringElementValue(BSTR elem) →BSTR` | Evaluate `"literal"` or `var$` (derefs `the calling program` without a NULL check) |
| 29 | `CBGetNumElementValue(BSTR elem) →double` | Evaluate a number or `var!` (derefs `the calling program` without a NULL check) |
| 30 | `CBGetElementType(BSTR elem) →int` | `PLUG_DT_LIT` or `PLUG_DT_NUM` by syntax |
| 31 | `CBDebugMessage(BSTR msg)` | Send to the RPGCode debugger window |
| 32 | `CBGetPathString(int code) →BSTR` | Game sub-folder name (`PATH_*`), save path or project path |
| 33 | `CBLoadSpecialMove(BSTR file)` | Load the global scratch special move `the plugin special-move slot` |
| 34 | `CBGetSpecialMoveString(int code) →BSTR` | Read a `SPC_*` string from `the plugin special-move slot` |
| 35 | `CBGetSpecialMoveNum(int code) →int` | Read a `SPC_*` number from `the plugin special-move slot` |
| 36 | `CBLoadItem(BSTR file, int slot)` | Load an item. A negative slot means the plugin scratch list `the plugin item slots[-slot]`; a positive slot replaces board item `slot` |
| 37 | `CBGetItemString(int code, int arrayPos, int slot) →BSTR` | Read an `ITM_*` string |
| 38 | `CBGetItemNum(int code, int arrayPos, int slot) →int` | Read an `ITM_*` number |
| 39 | `CBGetBoardNum(int code, int a1, int a2, int a3) →int` | Read a numeric board field (`BRD_*`) |
| 40 | `CBGetBoardString(int code, int a1, int a2, int a3) →BSTR` | Read a string board field |
| 41 | `CBSetBoardNum(int code, int a1, int a2, int a3, int val)` | Write a numeric board field (size/border/start position are ignored) |
| 42 | `CBSetBoardString(int code, int a1, int a2, int a3, BSTR val)` | Write a string board field |
| 43 | `CBGetHwnd() →int` | Host window HWND as int |
| 44 | `CBRefreshScreen() →int` | Flip the back buffer, or the RPGCode screen while a program runs (the return value is not set in that case) |
| 45 | `CBCreateCanvas(int w, int h) →int` | Allocate an offscreen canvas. **The handle is the raw `canvas*`** |
| 46 | `CBDestroyCanvas(int cnv) →int` | Free a canvas |
| 47 | `CBDrawCanvas(int cnv, int x, int y) →int` | Blit a canvas to the back buffer |
| 48 | `CBDrawCanvasPartial(cnv, xd, yd, xs, ys, w, h) →int` | Partial blit to the back buffer |
| 49 | `CBDrawCanvasTransparent(cnv, x, y, crTransp) →int` | Colour-keyed blit to the back buffer |
| 50 | `CBDrawCanvasTransparentPartial(cnv, xd, yd, xs, ys, w, h, crTransp) →int` | Partial colour-keyed blit |
| 51 | `CBDrawCanvasTranslucent(cnv, x, y, double intensity, crUnaffected, crTransp) →int` | Alpha-style blit to the back buffer |
| 52 | `CBCanvasLoadImage(int cnv, BSTR file) →int` | Draw `Bitmap\file` at its natural size |
| 53 | `CBCanvasLoadSizedImage(int cnv, BSTR file) →int` | Draw `Bitmap\file` stretched to the canvas |
| 54 | `CBCanvasFill(int cnv, int cr) →int` | Fill the canvas with a colour |
| 55 | `CBCanvasResize(int cnv, int w, int h) →int` | Resize a canvas |
| 56 | `CBCanvas2CanvasBlt(src, dst, xd, yd) →int` | Canvas-to-canvas blit |
| 57 | `CBCanvas2CanvasBltPartial(src, dst, xd, yd, xs, ys, w, h) →int` | Partial canvas-to-canvas blit |
| 58 | `CBCanvas2CanvasBltTransparent(src, dst, xd, yd, crTransp) →int` | Colour-keyed canvas-to-canvas blit |
| 59 | `CBCanvas2CanvasBltTransparentPartial(src, dst, xd, yd, xs, ys, w, h, crTransp) →int` | Partial colour-keyed canvas-to-canvas blit |
| 60 | `CBCanvas2CanvasBltTranslucent(src, dst, xd, yd, double intensity, crUnaff, crTransp) →int` | Translucent canvas-to-canvas blit |
| 61 | `CBCanvasGetScreen(int dst) →int` | Copy the screen into a canvas |
| 62 | `CBLoadString(int id, BSTR default) →BSTR` | Localisation stub: always returns `default` |
| 63 | `CBCanvasDrawText(cnv, BSTR text, BSTR font, int size, double x, double y, cr, bold, italic, underline, centred, [opt] outlined) →int` | Draw text. **x and y are in text-cell units** (`x*size-size`) |
| 64 | `CBCanvasPopup(int cnv, int x, int y, int step, int type) →int` | Animated reveal of a canvas on screen (`POPUP_*`). Blocking; pumps messages |
| 65 | `CBCanvasWidth(int cnv) →int` | Canvas width |
| 66 | `CBCanvasHeight(int cnv) →int` | Canvas height |
| 67 | `CBCanvasDrawLine(cnv, x1, y1, x2, y2, cr) →int` | Draw a line |
| 68 | `CBCanvasDrawRect(cnv, x1, y1, x2, y2, cr) →int` | Draw a rectangle outline |
| 69 | `CBCanvasFillRect(cnv, x1, y1, x2, y2, cr) →int` | Draw a filled rectangle |
| 70 | `CBCanvasDrawHand(cnv, px, py) →int` | Draw the pointer cursor onto a canvas (offset −42, −10) |
| 71 | `CBDrawHand(px, py) →int` | Draw the pointer cursor onto the back buffer |
| 72 | `CBCheckKey(BSTR key) →int` | Is this key held down right now? By name: LEFT, RIGHT, UP, DOWN, SPACE, ESC, ENTER, NUMPAD0-9, or a character |
| 73 | `CBPlaySound(BSTR file) →int` | Play a sound effect (the caller supplies the path, without `Media\`) |
| 74 | `CBMessageWindow(BSTR text, int textCr, int bgCr, BSTR bgPic, int type) →int` | Modal message box (`MW_*` in, `MWR_*` out) |
| 75 | `CBFileDialog(BSTR initPath, BSTR filter) →BSTR` | In-game file picker |
| 76 | `CBDetermineSpecialMoves(BSTR playerHandle) →int` | Build the learned-move list for a player and return its count |
| 77 | `CBGetSpecialMoveListEntry(int idx) →BSTR` | Entry from that list |
| 78 | `CBRunProgram(BSTR prg)` | Run `Prg\file` |
| 79 | `CBSetTarget(int idx, int type)` | Set the RPGCode `target` entity (`TYPE_*`) |
| 80 | `CBSetSource(int idx, int type)` | Set the RPGCode `source` entity |
| 81 | `CBGetPlayerHP(int idx) →double` | Party member HP |
| 82 | `CBGetPlayerMaxHP(int idx) →double` | Party member max HP |
| 83 | `CBGetPlayerSMP(int idx) →double` | Party member SMP |
| 84 | `CBGetPlayerMaxSMP(int idx) →double` | Party member max SMP |
| 85 | `CBGetPlayerFP(int idx) →double` | Party member FP (attack) |
| 86 | `CBGetPlayerDP(int idx) →double` | Party member DP (defence) |
| 87 | `CBGetPlayerName(int idx) →BSTR` | Party member name |
| 88 | `CBAddPlayerHP(int amt, int idx)` | Add HP (no clamp here) |
| 89 | `CBAddPlayerSMP(int amt, int idx)` | Add SMP |
| 90 | `CBSetPlayerHP(int amt, int idx)` | Set HP |
| 91 | `CBSetPlayerSMP(int amt, int idx)` | Set SMP |
| 92 | `CBSetPlayerFP(int amt, int idx)` | Set FP |
| 93 | `CBSetPlayerDP(int amt, int idx)` | Set DP |
| 94 | `CBGetEnemyHP(int idx) →int` | Plugin enemy slot HP (the return value is not set if the slot is empty) |
| 95 | `CBGetEnemyMaxHP(int idx) →int` | Max HP |
| 96 | `CBGetEnemySMP(int idx) →int` | SMP |
| 97 | `CBGetEnemyMaxSMP(int idx) →int` | Max SMP |
| 98 | `CBGetEnemyFP(int idx) →int` | FP |
| 99 | `CBGetEnemyDP(int idx) →int` | DP |
| 100 | `CBAddEnemyHP(int amt, int idx)` | Add HP, clamped to max |
| 101 | `CBAddEnemySMP(int amt, int idx)` | Add SMP, clamped to max |
| 102 | `CBSetEnemyHP(int amt, int idx)` | Set HP, clamped to 0..max |
| 103 | `CBSetEnemySMP(int amt, int idx)` | Set SMP. **Bug:** compares against current SMP, not max |
| 104 | `CBCanvasDrawBackground(int cnv, BSTR bkg, int x, int y, int w, int h)` | Draw a `.bkg` background's image onto a canvas |
| 105 | `CBCreateAnimation(BSTR file) →int` | Create a shared animation. **The handle is the raw pointer** |
| 106 | `CBDestroyAnimation(int idx)` | Free an animation |
| 107 | `CBCanvasDrawAnimation(cnv, idx, x, y, forceDraw, forceTransp)` | Tick and draw the current frame (timing is tick-count based, commented "a bit dubious") |
| 108 | `CBCanvasDrawAnimationFrame(cnv, idx, frame, x, y, forceTranspFill)` | Draw a specific frame (plays the frame sound on change) |
| 109 | `CBAnimationCurrentFrame(int idx) →int` | Current frame |
| 110 | `CBAnimationMaxFrames(int idx) →int` | `frameCount-1` (the pre-3.1 UBound convention) |
| 111 | `CBAnimationSizeX(int idx) →int` | Pixel width |
| 112 | `CBAnimationSizeY(int idx) →int` | Pixel height |
| 113 | `CBAnimationFrameImage(int idx, int frame) →BSTR` | Frame image filename |
| 114 | `CBGetPartySize(int party) →int` | Fighters in a battle party (`ENEMY_PARTY` = 0, `PLAYER_PARTY` = 1) |
| 115 | `CBGetFighterHP(int party, int idx) →int` | Fighter HP |
| 116 | `CBGetFighterMaxHP(int party, int idx) →int` | Fighter max HP |
| 117 | `CBGetFighterSMP(int party, int idx) →int` | Fighter SMP |
| 118 | `CBGetFighterMaxSMP(int party, int idx) →int` | Fighter max SMP |
| 119 | `CBGetFighterFP(int party, int idx) →int` | Fighter FP |
| 120 | `CBGetFighterDP(int party, int idx) →int` | Fighter DP |
| 121 | `CBGetFighterName(int party, int idx) →BSTR` | Fighter name |
| 122 | `CBGetFighterAnimation(int party, int idx, BSTR stance) →BSTR` | Animation file for a stance name |
| 123 | `CBGetFighterChargePercent(int party, int idx) →int` | Charge 0..100 |
| 124 | `CBFightTick()` | Advance battle time one tick: charge, status effects, enemy AI (see §4) |
| 125 | `CBDrawTextAbsolute(BSTR text, BSTR font, int size, int x, int y, cr, bold, italic, underline, centred, [opt] outlined) →int` | Draw text on the back buffer at pixel coordinates |
| 126 | `CBReleaseFighterCharge(int party, int idx)` | Reset charge to 0 and unfreeze (the player's turn is over) |
| 127 | `CBFightDoAttack(sP, sI, tP, tI, int amount, int toSMP) →int` | Engine-resolved physical attack. Returns the damage dealt |
| 128 | `CBFightUseItem(sP, sI, tP, tI, BSTR item)` | Apply an item's fight HP/SMP to the target, remove it from inventory, inform the plugin |
| 129 | `CBFightUseSpecialMove(sP, sI, tP, tI, BSTR move)` | Engine-resolved special move |
| 130 | `CBDoEvents()` | Handle one pending window message (keeps the window responsive during a plugin's own loop) |
| 131 | `CBFighterAddStatusEffect(int party, int idx, BSTR file)` | Apply a `.ste` status effect |
| 132 | `CBFighterRemoveStatusEffect(int party, int idx, BSTR file)` | Remove a status effect |
| 133 | `CBCheckMusic()` | Obsolete no-op. **COM only** |
| 134 | `CBReleaseScreenDC()` | Release the screen drawing context obtained with #5. **COM only** |
| 135 | `CBCanvasOpenHdc(int cnv) →int` | Open a GDI HDC on a canvas. **COM only** |
| 136 | `CBCanvasCloseHdc(int cnv, int hdc)` | Close that HDC. **COM only** |
| 137 | `CBFileExists(BSTR file) →short (VARIANT_BOOL)` | Does `projectPath + file` exist? **COM only** |
| 138 | `CBCanvasLock(int cnv)` | Lock a canvas surface. **COM only** |
| 139 | `CBCanvasUnlock(int cnv)` | Unlock a canvas surface. **COM only** |
