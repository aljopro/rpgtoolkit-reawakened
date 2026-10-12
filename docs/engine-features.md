# RPG Toolkit 3 — Runtime Engine: Feature Inventory & Architecture

> **Purpose.** This lists everything the legacy game engine (RPG Toolkit 3.1.0's player, called "trans3") does, organised by **capability**, so a clean rebuild can reach feature parity without porting code. It describes behaviour and architecture. It is implementation-neutral and says nothing about language or platform. File layouts are in [format-spec.md](format-spec.md). Authoring tools are in [editor-features.md](editor-features.md).
>
> Each capability has an ID (**E-xx**). [architecture-options.md](architecture-options.md) uses these IDs to judge candidate stacks.

---

## 1. Architecture overview

### 1.1 What the legacy engine was

A single Windows process that:

1. Finds a game (from the command line, a `main.gam` next to the executable, an appended package, or a file dialog).
2. Loads the main file, registers the game's fonts, loads plugins, starts graphics, audio, input and the script interpreter.
3. Runs the **start program** (title screen, intro).
4. Loads the **initial board**, places the player, starts background music, and runs the board's entry program.
5. Enters the **main loop** until quit.

Internally it had these subsystems (described here as responsibilities, not code):

| Subsystem | Responsibility |
|---|---|
| **Loader / asset resolver** | Folder and package lookup, case-insensitive paths, version-tolerant readers, legacy upgrades (pre-vector boards → vectors, old items → generated animations). |
| **World model** | Current board (tiles, vectors, programs, images, lights), the party, board items, global variables. |
| **Movement & collision** | Per-sprite movement queues, vector intersection, sliding, stairs, board edges, pathfinding, z-ordering. |
| **Trigger/event system** | Decides when programs run: step-on/key-press regions, item activation, board entry, edge links, run-time keys, random battles, level-up, equip, death. |
| **Script runtime (RPGCode)** | Parser, interpreter, cooperative threads, global/local variables, objects, error handlers, ~280 built-ins. |
| **Renderer** | Layered tile/image compositing with a scroll cache, sprites, under-vector occlusion, translucency, shading and ambient light, overlays, message window, transitions. |
| **Audio/video** | Looping background music, one-shot effects, volume, full-screen video. |
| **Input** | Keyboard (named keys, scan codes), mouse (click-to-move, cursor maps), joystick. |
| **Battle system** | Charge-bar ("active-time") battles, status effects, enemy AI, rewards. In legacy the UI lived in a plugin. |
| **Menu system** | Party / items / equip / abilities / save / load / quit. In legacy the UI lived in a plugin. |
| **Persistence** | Save and restore the entire game state, including running threads. |
| **Plugin host** | Native extensions for script functions, menu and battle. |

### 1.2 Concurrency model (important for parity)

* **One logical thread of game state.** Everything is single-threaded and cooperative.
* **Blocking programs vs. threads.** A program started by a trigger (talking to an NPC, stepping on a region, a key) **takes exclusive control**. The world is frozen except for what the program itself does (it may move sprites, draw, wait for keys) until it ends. **Threads** are programs that run *alongside* the main loop. Each frame they get a time-slice measured in "execution units" (statements), and they can sleep, wake, and pause until a sprite finishes moving.
* **Blocking primitives** inside a program (e.g. `wait()`, `delay()`, a blocking movement) keep the window responsive. They pump input and redraw while blocking. A rebuild needs a resumable interpreter (coroutines, continuation or step-machine) so that both blocking and threaded programs can run on runtimes with no OS threads, such as a browser.

### 1.3 Recommended decomposition for a rebuild (implementation-neutral)

```
┌─────────────────────────── Runner (platform layer) ───────────────────────────┐
│ window/canvas · input devices · audio out · file/package access · clock · save │
└───────────────▲───────────────────────────────▲───────────────────────────────┘
                │ thin, data-only interface     │
┌───────────────┴─────────────── Game Core ─────┴───────────────────────────────┐
│ format readers · world model · movement/collision · triggers · script VM ·    │
│ battle & menu rules · render *list* builder (not pixels) · save/load model    │
└───────────────────────────────────────────────────────────────────────────────┘
```

The core should be **deterministic given its inputs** (time step, input events, RNG seed) and produce **draw commands and audio commands**, not pixels or sound. That keeps runners swappable (browser, desktop, mobile, headless test). See architecture-options.md.

---

## 2. Boot, lifecycle and game loop (E-01 … E-06)

**E-01 Game discovery.** Load a game from: an explicit main file; a `main.gam` beside the executable; a package (`.tpk` ZIP or an EXE with an appended ZIP; format-spec §13); or a picker. A "test a single program" mode runs one `.prg` against a main file without loading a board (used by the editor's *Run program*).

**E-02 Startup sequence.** In order:
1. Load plugins listed in the main file.
2. Set the movement mode (tile or pixel) and the game-speed offset.
3. Create the initial character if `initChar` is set.
4. Initialise the engine-backed variables.
5. **Run the startup program to completion.** It may add players, `send` to a board, or `load` a save.
6. If there is no player by then, stop with an error.
7. If `initBoard` is set and the start program did not load a save: open the board, place the player at the board's start point, align the camera, z-order sprites, start the board music, start the board threads, run the board's enter program.

**E-03 Main loop (one frame).** The game state is one of **Idle** (accepting player input), **Movement** (sprites moving), **Pause** (window lost focus; sleep), or **Quit**.
1. *Idle only:* poll input. Handle the activation key, menu key, run-time keys and movement keys, and mouse click-to-move.
2. **Multitask:** give every live thread a slice of execution units. The legacy engine scaled this with the measured frame rate, with a minimum of 10.
3. **Move** every sprite in z-order by one frame (§4).
4. **Edge check** for the selected player (board links, §3.6). If none fires, **finish the player's move**: add the step count, run the trigger test (§5), then the random-battle test (§7.1).
5. **Render** (§6).

**E-04 Timing.** Frame rate is uncapped up to about 120 fps. The engine keeps a running **frames-per-millisecond** estimate and converts every sprite's "seconds per step" into a **frame count per move**, so movement speed is time-based. A global **game speed** offset (−4…+4, ±10 % per step) adjusts this. The legacy engine also saved the last measured average frame time per resolution so the first frames started with a sensible estimate. A rebuild should use a fixed simulation step with real elapsed time and drop the frame-rate-dependent quirks, while keeping the *perceived* speeds.

**E-05 Optional FPS display** in the title bar, and **debug overlays**: board vectors, sprite vectors, the player's queued path, the destination marker, in colours from the main file.

**E-06 Shutdown & reset.** `reset()` (also used after a lost battle with no game-over program) clears globals, redirects, plugins and threads, then reruns the startup sequence. Quit tears down plugins first, then everything else.

---

## 3. World model: boards, tiles, layers (E-10 … E-19)

**E-10 Board loading.** Read any supported board version and convert it to the vector model (format-spec §4). Create the active board's runtime objects: items (respecting their *loading condition*), image surfaces, under-vector occlusion surfaces, threads. Boards opened only for testing (e.g. checking whether a linked board can accept the player) are loaded without side effects.

**E-11 Coordinate systems.** 2D top-down, isometric-stacked, isometric-rotated, each optionally "pixel absolute". All runtime positions are **pixels**. Tile ↔ pixel conversion follows format-spec §5. Script coordinates are interpreted by the board's pixel-absolute setting. Vector and program points are always pixels.

**E-12 Layers.** Any number of tile layers (1-based). Each layer may also hold free-placed images. A background colour and an optional background image (normal, parallax or stretched) sit below layer 1. Sprites live on exactly one layer and interact only with vectors, programs and items on that layer.

**E-13 Tiles.** 32×32 tiles (2D) or 64×32 diamonds (iso), from tilesets, single-tile files, or **animated tiles** that cycle at their own fps. Animated tiles can be switched off globally (`animatedTiles()`). 2D tiles on iso boards are projected.

**E-14 Runtime board edits.** Scripts can place tiles (`put`, `layerPut`), change legacy tile types, read tiles, add, modify or delete **vectors** and **programs** point by point, and redraw. Pathfinding data is rebuilt when a vector edit is "applied".

**E-15 Board constants & titles** are exposed to scripts (`constant[i]`, `boardTitle[i]`) and also substituted as named constants.

**E-16 Background music** per board. It changes on `send` and on edge transitions.

**E-17 Lighting.**
* **Tile shading layer:** an additive per-tile RGB shade that is cast onto all tiles at or below a chosen layer.
* **Lights:** elliptical spotlight, linear gradient, clipped gradient. They are rasterised into the shading once at load and are static.
* **Board ambient RGB**, added to a **global ambient level** that scripts can change (`setAmbientLevel`). The ambient level affects tiles, images, the background and sprite frames. Changing it triggers a full redraw.

**E-18 Saving permission** per board (`disableSaving`). The menu's Save option is disabled on such boards.

**E-19 Board transitions.** `send(board, x, y, layer)` loads a board, positions the player, re-aligns the camera, rebuilds the z-order, clears pathfinding caches, **deactivates any program the player arrives on top of** (so the destination doesn't fire immediately), switches music, and runs the enter program. Board threads from the old board are stopped. Persistent threads survive.

---

## 4. Sprites, movement, collision (E-20 … E-34)

**E-20 Sprite kinds.** **Players** (party members; only the *selected* one is shown and controlled) and **items** (NPCs, props, pickups placed on the board or created by script). Both have directional walk and idle animations, battle stances, custom stances, a **collision base** polygon and an **activation base** polygon, a speed (seconds per step) and an idle delay.

**E-21 Facing & animation state.** 8-way facing. While moving, the walk animation for the current facing advances by elapsed time. After `idleTime` seconds without moving, the idle animation for that facing loops. A **custom stance** plays once (or is held at its last frame until movement resumes). It can pause the calling thread until it finishes. A sprite can be **frozen** for a time.

**E-22 Movement queue.** Each sprite has a FIFO of target points. Movement commands either **append** to it or **clear it first** (`tkMV_CLEAR_QUEUE`). Sources of queued points:
* direction strings (`"N,N,E"`; each step is one *move size*);
* explicit pixel points (`itemPath`/`playerPath`), walked in straight lines that **ignore board vectors** but still stop for sprites;
* **pathfinding** to a destination (§4.7);
* a **waypoint vector** copied into the queue (`WAYPOINT_PATH`), or **linked** (`WAYPOINT_LINK`): the sprite follows the vector one segment at a time, repeats for N cycles (0 = forever), sees live edits to the vector, and resumes the path after a temporary detour.

**E-23 Move size.** *Tile movement:* each step is 32 px. *Pixel movement:* each step is a small, frame-rate-derived number of pixels (down to 1 px). Optional "pixel push" makes direction-string commands move a quarter tile (8 px) instead of a full tile.

**E-24 Keyboard movement.** Eight configurable direction bindings. Holding two orthogonal keys gives a diagonal when diagonals are allowed. Movement is relative to the board's axes, so on isometric boards "north" runs along the iso axis.

**E-25 Mouse movement.** Clicking the board pathfinds the selected player to the clicked point. If the point is blocked by a sprite, the player walks up to it. Path and destination can be drawn.

**E-26 Collision — board.** Before each step, the sprite's collision base at the *target* position is tested against every board vector on its layer (bounding-box pre-check, then segment-intersection or containment). Results are combined as flags:
* **Solid** blocks movement.
* **Sliding:** when keyboard movement hits a solid edge at less than about 45° to the movement direction, the engine tries the rotated directions so the sprite slides along walls. Facing is kept. There is no sliding in tile-movement mode.
* **Stairs:** when the base touches a stair vector, the sprite's layer changes to the vector's destination layer.
* Open polylines block crossing. Closed polygons block entry and containment.

**E-27 Collision — sprites.** All sprites are solid to each other through their collision bases. While following a path, a blocked sprite tries a **diversion** (local pathfind around the blocker and back onto its path). It can also **wait** for the blocker to move. If neither works, it stops.

**E-28 Board edges.** If the selected player's base would leave the board:
* no link → treat as solid;
* link is a board → test-load that board and compute the arrival point (opposite edge, same other coordinate, aligned to an 8 px or 32 px grid). If the arrival point is off that board or solid, refuse. Otherwise transition (E-19);
* link is a program → run it.

NPCs are not limited by edges unless they are pathfinding.

**E-29 Z-ordering.** Sprites on a board are kept sorted by vertical position. Only the moving sprite is re-inserted each step. Rendering uses this order.

**E-30 Occlusion ("under").** For a sprite on layer L, board content on higher layers that overlaps the sprite's frame is drawn **over** it. **Under vectors** promote the board graphics they enclose (on layer L, optionally all layers below, optionally the background image) so they draw over the sprite. This triggers when the sprite's collision base intersects the vector, or (with the frame-intersect option) when its image frame does. Overlapping under vectors do not stack translucency.

**E-31 Sprite translucency.** Parts of a sprite that are covered by higher content are drawn **translucently** (the amount is set with `spriteTranslucency(%)`), so the player stays visible behind trees and roofs.

**E-32 Scripted sprite control.** Place, erase, create and destroy items. Get or set location and facing. Set speed. Play a stance. Swap a player's graphics (`newPlayer`). Wander randomly (optionally restricted). Query the queued path.

**E-33 Thread–movement coupling.** Movement started from a **thread** runs concurrently, or pauses that thread until the movement ends (`tkMV_PAUSE_THREAD`). Movement started from a **blocking program** runs to completion before the program continues, **unless** it is inside `multiRun { … }`, which collects several sprites' movements and runs them together.

**E-34 Pathfinding.** Shortest path on the current layer around board vectors and sprite bases. Three heuristics (main-file default; can be chosen per call):
* **Axial:** N/S/E/W only, tile-centre nodes;
* **Diagonal:** 8-way, tile-centre nodes;
* **Vector:** any angle, through the vertices of inflated obstacles (visibility-graph style).

If the target is unreachable, get as close as possible. Results are cached per board and invalidated on board change or vector edits.

---

## 5. Trigger / event system (E-40 … E-49)

The legacy engine has **no general event bus**. It uses a fixed set of trigger points, each of which runs an RPGCode program (or a single inline line of RPGCode when the referenced file doesn't exist):

| ID | Trigger | When it fires | Notes |
|---|---|---|---|
| E-40 | **Board program region**, step-on | Player's collision base enters the region on the same layer | Fires once per entry. Re-arms on leaving. |
| E-41 | Board program region, **key-press** | Player is inside the region and presses the activation key | |
| E-42 | Board program region, **repeat** | Every *repeatDistance* px walked inside the region | Counter resets on leaving. |
| E-43 | **Item activation** | Player's collision base intersects the item's *activation base* while the player is moving (step-on) or presses the key (key-press) | The item turns to face the player. The player's queue is cleared. `source` = item and `target` = player during the program. When several items qualify, the one most directly in front and then nearest wins. Items take precedence over regions. |
| E-44 | **Conditional activation** | Both regions and items can require `variable == value` before firing, and set `variable = value` after the program finishes | "Run once" is built from this. |
| E-45 | **Item loading condition** | When the board loads, an item is hidden unless `variable == value` | It can still be shown later by script. |
| E-46 | **Item multitask program** | Runs as a thread for as long as the item is on the board and active | `source`/`target` = the item. |
| E-47 | **Board entry** | Board threads start, then the enter program runs, on every arrival | |
| E-48 | **Edge link to a program** | Player walks off an edge whose link is a `.prg` | |
| E-49 | **Global keys** | Menu key opens the menu (§8). Run-time keys (up to 51) run their programs | Short debounce after the menu closes. |

Other fixed hooks: **random battle** (§7.1), **custom battle program**, **game-over program**, **character level-up program**, **item equip/remove/use programs**, **special-move program**, **status-effect per-round program**, **enemy custom AI program**, **enemy defeat / run-away programs**, **startup program**.

A region whose flag says "stops movement" clears the player's queue before running (needed for mouse movement). Movement that happens *inside* a program never fires other triggers.

> A rebuild may implement these on an internal event bus, but the observable firing rules above (once-per-entry, distance re-arm, precedence, layer matching, condition/after-set) must hold.

---

## 6. Rendering (E-50 … E-63)

**E-50 Screen.** Windowed or full-screen at 640×480, 800×600, 1024×768 or a custom resolution. Colour depth applies only to full-screen. A rebuild should render at the game's logical resolution and scale it.

**E-51 Camera.** Follows the selected player and stays clamped to the board. Boards smaller than the screen are allowed. Re-aligns on board change.

**E-52 Board compositing.** Background colour → background image (normal, stretched, or parallax with a computed scroll factor) → for each layer: tiles (shaded), then layer images (with colour-key transparency) → sprites for that layer in z-order → higher-layer content overlapping sprites → under-vector promotions → animations → overlay. The legacy engine kept a **scroll cache** (a pre-rendered region larger than the screen) and re-rendered it only when the camera left it or after a forced redraw. Animated tiles were patched into the cache each frame.

**E-53 Isometric drawing.** Diamond tiles are composited with masks. Draw order is correct for staggered and rotated layouts.

**E-54 Animations.** `.anm` and animated GIF. Per-frame image (picture, tile or tile bitmap), per-frame transparent colour, per-frame sound, a frame delay in seconds. Used for sprites, battle effects, and stand-alone screen animations (`animation`, `sizedAnimation`, and persistent ones that keep running until `endAnimation`). Frames are shared and cached between sprites using the same file.

**E-55 Message window ("mwin").** A dialogue box along the top of the screen. It has a background colour or image, a size (% of the screen), translucency, font, size, bold/italic/underline and colour. `mwin(text)` appends a line. `mwinCls` hides and clears it. Text supports variable splicing (`<var>`). Text speed is configurable.

**E-56 Text & primitives.** Text at tile-cell or pixel coordinates. Lines, rectangles and circles (filled or outlined). Pixel get and set. Images drawn normally, colour-keyed, translucent (50 %) or additive (%). All of these work on the screen or on an **off-screen canvas**. Canvases can be created, drawn (whole or part), colour-keyed, and captured from the screen.

**E-57 Render-now overlay.** A script-owned canvas that is composited over the game every frame while it is enabled (HUDs).

**E-58 Screen save/restore.** Save and restore the screen to numbered slots (whole or partial rectangles).

**E-59 Transitions & effects.** Fades of several types, wipes with an image (several effects and speeds), zoom, earthquake shake, border colour.

**E-60 Modal UI primitives.** A message box with OK or Yes/No buttons (keyboard or mouse). A text prompt. **Cursor maps**: a list of hotspots navigated with arrows or mouse, returning the chosen index, with a custom cursor image. On-screen clickable **buttons** (slots with images). A save-file picker (`dirSav`).

**E-61 Mouse cursor.** Default, none, or a custom image with a hot spot and transparent colour.

**E-62 Video.** Play an AVI full-screen or in a small window, blocking.

**E-63 Board preview.** `viewBrd` renders a board (or part of one) to the screen or a canvas without entering it.

---

## 7. Battle system (E-70 … E-79)

In the legacy engine, the **rules** live in the engine and the **presentation** comes from the battle plugin. A rebuild should ship a default battle UI that reproduces the stock look and feel, and keep the rules in the core.

**E-70 Battle start.**
* **Random:** after each whole-tile step on a board that allows battles (and with fighting enabled globally), roll *1-in-chances* (random mode) or check *every chances tiles* (planned mode). If the main file names a custom battle program, run it. Otherwise pick 1–4 enemies at random from the main file's pool whose **skill level equals the board's skill**, and use the board's battle background.
* **Scripted:** `fight(skill, bkg)` or `fightEnemy(e1, e2, …, bkg)`.

**E-71 Battle setup.** Two parties (enemies, players). The battle background's music replaces the board music. The background image and menu sounds are loaded. Running away is allowed unless any enemy forbids it.

**E-72 Charge-bar turns ("active time").** Each fighter has a charge that fills by *speed* per tick (players' maximum 75, enemies' maximum 123, both starting at a random value). A charged **player** stops charging and waits for a menu choice. A charged **enemy** acts immediately and resets. Disabled fighters don't charge.

**E-73 Player actions.** Fight (physical attack), Special Move (named per character, e.g. "Magic"), Item (battle-usable items; consumes one), Run.

**E-74 Damage rules.** A physical attack uses the attacker's FP ±10 % random variance. The target's DP is subtracted **unless a critical hit happens** (enemies define 1-in-N crit chances for being hit and for hitting). Minimum 1 damage. Damage can be applied to SMP instead of HP. A special move removes its *FP* from the target's HP and its *target SMP drain* from the target's SMP, costs the user SMP, and may apply a status effect and play an animation. HP and SMP are clamped at 0.

**E-75 Status effects.** Applied by moves or by script, keyed by file (re-applying restarts it). Each round, while the fighter is charged: apply ±HP and ±SMP and optionally run a program (with `source`/`target` = the fighter). It lasts a number of rounds. **Speed up / slow down** change the charge rate. **Disable** freezes charging (reference-counted when several disables are active).

**E-76 Enemy AI.** Four built-in levels:
* **low:** random target, random physical or special;
* **medium:** random target, specials until out of SMP;
* **high:** weakest target, random physical or special;
* **very high:** weakest target, specials until out of SMP.

An enemy can instead use a **custom AI program** (with `source` = enemy and `target` = a random player). Enemies only use specials they can afford, and curative specials target allies.

**E-77 Outcome.**
* **Win:** total gold and experience from all enemies. Show a "Gained N experience / GP" message. Give the experience to every party member (which may level them up). Run the enemy defeat program.
* **Run:** run the run-away program and give no rewards.
* **Lose:** run the game-over program, or `reset()` if there is none.

Board music resumes afterwards.

**E-78 Levelling.** Experience thresholds are **exponential** (each gap grows by a percentage) or **linear** (each gap grows by a fixed amount), up to a max level. On level-up: run the level-up program; max HP, DP, FP and max SMP rise by percent (exponential type, ignoring equipment bonuses) or by points (linear); current HP and SMP are **not** refilled; show "*name* gained a level". Special moves unlock by minimum experience, minimum level, or `variable == value`.

**E-79 Battle-facing script API.** The fight plugin interface exposed fighter queries (HP, SMP, FP, DP, name, animation, charge %), actions (attack, use item, use special, release charge, add/remove status), and a `fightTick`. A rebuild's battle UI uses the same core operations, and **RPGCode-written battle systems** must be able to drive them (they replace the default via the main file's custom fight program).

---

## 8. Menu, inventory, shop, party (E-80 … E-87)

**E-80 Default menu** (opened with the menu key or `internalMenu(n)`; legacy presentation came from a plugin, rules from the engine):
* main screen: party members with portraits and stats, gold, play time;
* **Items:** use (on a chosen member; consumes), info, drop (not key items);
* **Equip:** choose member, slot, then item; remove;
* **Abilities:** use board-usable special moves, info;
* **Save** (disabled if the board forbids it), **Load**, **Quit**.

A custom menu image can be set (`menuGraphic`). Cursor sounds come from the main file. The main menu, inventory, equip and abilities screens can each be opened directly.

**E-81 Inventory.** A list of (item file, handle, quantity). `giveItem` and `takeItem` add and remove. Key items cannot be dropped. Using from the menu or in battle applies +HP/+SMP and/or runs the use program, then consumes the item.

**E-82 Equipment.** Body slots (head, neck, left hand, right hand, body, legs, and named accessories). An item lists the slots it fits and which characters may use it. Equipping adds HP/DP/FP/SMP bonuses and runs the equip program. Removing subtracts them, runs the remove program, caps HP and SMP, and returns the item to the inventory.

**E-83 Shop.** `callShop(item, …)` opens a buy/sell screen using item buy and sell prices and the party's gold. Its colours are configurable.

**E-84 Inn.** `inn()` fully restores the party.

**E-85 Party management.** Up to 5 members. Add or remove. Choose the selected (visible, controlled) member. Swap graphics. Restore a player from file. Stats live in **script globals named in each character file**, so scripts may read or write them directly.

**E-86 Gold.** A global integer, changed by rewards, the shop and script.

**E-87 Game time & steps.** Total play time in seconds and total steps, exposed to scripts and saved.

---

## 9. Scripting runtime (E-90 … E-99)

**E-90 Language.** RPGCode 3.1. The full language is in format-spec §9: dynamic values, arrays and maps, functions with overloading and references, classes with multiple inheritance, operator overloading, destructors, includes, implicit includes, redirects, error handlers, plus legacy syntax compatibility.

**E-91 Program cache.** Parsed programs are cached by file name. Re-running is cheap.

**E-92 Variables.** One global namespace that persists across programs and boards and is included in saves. Locals are per call. Engine-backed "virtual" variables are read and written through the engine (party positions, board data, ambient light, game time…).

**E-93 Threads.** Board threads (die on board exit), persistent threads (`thread(file, true)`), and item threads (die with the item). Operations: sleep (timed or indefinite), wake, query remaining sleep, kill, get id, `tellThread(id, code)` (run code in the thread's context). A thread whose program reaches its end finishes. Loops must be explicit.

**E-94 Built-in library.** About 280 functions grouped by capability (format-spec §9.11). Parity means every name in that catalogue resolves, with the same argument conventions, including optional trailing by-reference outputs and handles that accept a name, an index, `"source"` or `"target"`.

**E-95 Source/target context.** Each running program has a *source* and *target* entity (player, item or enemy) set by whatever triggered it. Functions resolve the `"source"` and `"target"` handles against it.

**E-96 Script-driven UI loop.** Scripts can build entire custom screens (title menus, custom battle systems, HUDs) from canvases, cursor maps, key and mouse polling, and `renderNow`. The engine must allow a blocking script to own the frame for as long as it likes while still presenting frames and reading input.

**E-97 File I/O.** Scripts can open text or binary files *inside the game's folders* (input, output, append, binary) to read and write lines or bytes. A rebuild should sandbox this to the game's save area.

**E-98 Debugging.** A debug window with runtime error messages ("near line N"). Errors include the file and line. `debugger(msg)` writes to the window. A debug toggle exists.

**E-99 Plugins (extension point).** Legacy native plugins could add script functions, replace the menu, or replace the battle UI. They were offered every unknown function call. A rebuild should provide an equivalent extension mechanism: one plugin contract used by the engine's own packs and by third parties, selected by an editable manifest, with external effects going through host requests. It is not trust-gated for now. Legacy binary plugins cannot be supported. The two stock plugins (menu, battle) must be re-implemented natively.

---

## 10. Audio & video (E-100 … E-104)

**E-100 Background music.** One looping music track at a time. MIDI is by far the most common (the bundled music pack is MIDI). MP3, OGG, WAV and tracker modules are also used. It changes per board, on battle start and end, and via `mediaPlay`/`mediaStop`. MP3 can be paused.

**E-101 Sound effects.** One-shot effects (`wav`/`sound`), optionally blocking until finished. They also come from animation frames, menu cursor sounds and battle background menu sounds.

**E-102 Volume.** A master volume as a percentage.

**E-103 MIDI playback.** Needs a General MIDI synthesiser with a SoundFont in any runner that lacks OS MIDI (browsers, mobile). This is a real parity requirement because legacy games depend on it heavily.

**E-104 Video.** AVI playback (full-screen or small window). A rebuild can transcode on import to a portable format.

---

## 11. Input (E-110 … E-113)

**E-110 Keyboard.** Named keys are returned to scripts (`wait()` returns e.g. `"ENTER"`, `"LEFT"`, `"A"`). Configured movement scan codes. Character-coded menu, activation and run-time keys. A buffered key queue that can be cleared.

**E-111 Mouse.** Click (blocking or polling) and move coordinates for scripts, click-to-move, cursor maps, buttons.

**E-112 Joystick/gamepad.** Optional, mapped to movement and confirm/cancel.

**E-113 Focus handling.** The game pauses when the window loses focus.

---

## 12. Persistence (E-120 … E-123)

**E-120 Save.** Write the full state: globals, redirects, party and stats, inventory, equipment, gold, message-window and font settings, play time, steps, current board, every party member's position, layer and waypoint link, **all items on the current board** (position, active flag, activation data, waypoint link), threads (file, persistence, owner, sleep, and serialised interpreter state), movement mode, objects, game-speed offset. Save files go in the per-game saved-games folder.

**E-121 Load.** Restore exactly, including the board with its *live* item list (not the board file's original list) and running threads at their saved positions.

**E-122 Legacy save compatibility** (optional but desirable): read 3.1.0 `.sav` files (format-spec §11).

**E-123 Save gating.** Respect the board's disable-saving flag in the default menu.

---

## 13. Distribution features (E-130 … E-132)

**E-130 Folder play.** The main file plus the project folder.
**E-131 Single-file package.** The legacy `.tpk` ZIP and standalone EXE (engine + appended ZIP). A rebuild needs its own equivalents (e.g. a web bundle, a desktop binary with an embedded archive) and should **import** the legacy ones. The rebuild's own single-file package is the **distribution package** of format-spec §13: a `.tpk`-compatible ZIP carrying `manifest.json { schema, main, index }`, so a runner boots from `main` and builds its asset index from `index` without listing the archive, and a loose folder and a package load to the same files.
**E-132 Private fonts.** Game fonts are available to text rendering for the session only.

---

## 14. Parity checklist (summary)

| Area | Must-have for "plays legacy games" | Nice-to-have |
|---|---|---|
| Formats | all binary formats in format-spec §2–9 | text-era formats, compiled `.prg`, legacy `.sav` |
| World | 2D + both iso modes, layers, animated tiles, images, parallax | |
| Collision | vector solid/stairs/under, sprite bases, sliding, edges | |
| Movement | queues, direction strings, paths, waypoints (copy and link), 3 pathfinders | |
| Triggers | E-40…E-49 exactly | |
| Script | full RPGCode 3.1 language and built-ins, threads, blocking semantics | legacy-syntax auto-upgrade |
| Render | layer compositing, occlusion and translucency, shading and ambient, mwin, canvases, transitions | exact scroll-cache behaviour |
| Battle/Menu | default systems with identical rules, custom RPGCode replacements | identical visuals |
| Audio | looping music incl. **MIDI**, effects, volume | tracker modules |
| Save | full state incl. threads | legacy `.sav` import |
| Packaging | load a folder | import `.tpk` / appended-ZIP EXE |
