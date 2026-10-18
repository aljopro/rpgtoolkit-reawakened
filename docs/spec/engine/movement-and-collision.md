# Movement, collision, activation and board changes

Players and board items are both "sprites". This page describes how they move, what stops them, how programs and items are triggered, how the player moves between boards, and path-finding.

## Positions

<a id="e-20"></a>
**E-20 Sprite kinds.** **Players** (party members; only the *selected* one is shown and controlled) and **items** (NPCs, props, pickups placed on the board or created by script). Both have directional walk and idle animations, battle stances, custom stances, a **collision base** polygon and an **activation base** polygon, a speed (seconds per step) and an idle delay.

<a id="e-11"></a>
**E-11 Coordinate systems.** 2D top-down, isometric-stacked and isometric-rotated, each optionally "pixel absolute". All run-time positions are **pixels**; the tile↔pixel conversion is in [../formats/board.md](../formats/board.md#coordinates). Script coordinates are interpreted through the board's pixel-absolute setting; vector and program points are always pixels.

- Sprite positions are **board pixels** (fractional values allowed). The reference point is the **bottom-centre** of the sprite's tile: pixel (16, 31) within a 32×32 tile on normal boards, the tile centre on isometric boards.
- Each sprite has a **collision polygon** and an **activation polygon**, relative to its reference point ([../formats/character.md](../formats/character.md#defaults-and-fall-backs)).
- Each sprite is on one layer.

**Reawakened rule (OWNER; presentation alpha).** `alpha` is presentation-only interpolation of the camera and optional prior sprite positions. It is never stored in simulation state and is excluded from state and draw-list hashes.

## Movement modes

| Main-file `pixelMovement` | Behaviour |
|---|---|
| 0 — tile movement | each move is a full 32-pixel step to the next tile |
| 1, 2 — pixel movement | each key press moves a smaller step, so sprites slide smoothly and can stop between tiles |

Movement is queued: the keyboard, the mouse, scripts (`Push`, `PlayerPath`, `ItemPath`…) and waypoint vectors add steps or targets to a sprite's queue. Diagonal moves need the main file's "allow diagonals" flag; with the keyboard, two keys 90° apart give a diagonal.

<a id="e-22"></a>
**E-22 Movement queue.** Each sprite has a FIFO of target points, and a movement command either **appends** to it or **clears it first** (`tkMV_CLEAR_QUEUE`). The sources are: direction strings (`"N,N,E"`, each step one move size); explicit pixel points (`ItemPath`/`PlayerPath`), walked in straight lines that **ignore board vectors** but still stop for sprites; path-finding; and a **waypoint vector** copied into the queue (`tkMV_WAYPOINT_PATH`) or **linked** (`tkMV_WAYPOINT_LINK`), where the sprite follows the vector one segment at a time, repeats for N cycles (0 = forever), sees live edits to the vector and resumes the path after a temporary detour.

<a id="e-23"></a>
**E-23 Move size.** *Tile movement:* each step is 32 px. *Pixel movement:* each step is a small, frame-rate-derived number of pixels, down to 1 px. Optional "pixel push" makes direction-string commands move a quarter tile (8 px) instead of a full tile.

<a id="e-24"></a>
**E-24 Keyboard movement.** Eight configurable direction bindings. Holding two orthogonal keys gives a diagonal where diagonals are allowed. Movement is relative to the board's axes, so on isometric boards "north" runs along the iso axis.

<a id="e-25"></a>
**E-25 Mouse movement.** Clicking the board path-finds the selected player to the clicked point; if the point is blocked by a sprite the player walks up to it. The path and the destination can be drawn.

## Speed

- A sprite's `speed` (seconds, from its character or item file) is converted to milliseconds. While moving, it advances **4 pixels per `speed`**, so one 32-pixel tile takes `8 × speed` (0.4 s at the default 0.05 s).
- The main file's **game speed** (−4..+4) makes every sprite faster or slower: the time per 4-pixel advance becomes `speed − 100 ms × gameSpeed`, never less than one frame.
- The original engine implements this by counting frames at the measured frame rate ([main-loop-and-startup.md](main-loop-and-startup.md#timing)); the formula above is the time-based equivalent.
- Idle and custom stance animations play at their own `delay`.

> **Open conflict R-50 — sprite speed and the game speed offset.** the legacy feature inventory (E-04) says the game speed offset is "−4…+4, ±10 % per step"; this page, `docs/spec/engine/movement-and-collision.md:41`, says the time per 4-pixel advance "becomes `speed − 100 ms × gameSpeed`, never less than one frame". Owner epic: **movement-triggers**. Landed code: none. The owner settles it at inception; this page rules nothing.

## Sprite states

| State | Meaning | Leaves when |
|---|---|---|
| waiting | just stopped | a move is queued → moving; `idleTime` passes and an idle animation exists → idling; a script plays a stance → stance |
| idling | playing the idle animation | a move is queued |
| moving | walking towards the current step target | the target is reached or passed → done; blocked by something solid → done; teleported → done |
| done | step finished | next queued step → moving; otherwise → waiting |
| stance | playing a named custom animation once | the animation ends |
| frozen | lost a sprite-sprite collision | **2 seconds** pass → waiting |

<a id="e-21"></a>
**E-21 Facing & animation state.** 8-way facing. While moving, the walk animation for the current facing advances by elapsed time; after `idleTime` seconds without moving the idle animation for that facing loops. A **custom stance** plays once (or is held at its last frame until movement resumes) and can pause the calling thread until it finishes. A sprite can be **frozen** for a time.

## Collision with the board

Before each step the sprite's collision polygon, placed at the target, is tested against every vector on the sprite's layer:

| Vector type | Effect |
|---|---|
| solid | blocks the step. In pixel movement, a glancing hit (angle ≥ 45°, or ≥ 27° on isometric boards) turns the step one direction left or right so the sprite slides along walls. |
| stairs | the sprite moves to the layer given by the vector's attributes |
| under | no collision; the sprite is drawn beneath that layer's tiles while inside it |
| waypoint | no collision; only used as a path |

Moving off a board edge is blocked unless that edge has a link.

<a id="e-26"></a>
**E-26 Collision — board.** The results of the test above are combined as flags: **solid** blocks the step; **sliding** applies in pixel movement (the table above); **stairs** changes the sprite's layer to the vector's destination layer when the base touches a stair vector; **open polylines** block crossing, and **closed polygons** block both entry and containment.

<a id="e-30"></a>
**E-30 Occlusion ("under").** For a sprite on layer L, board content on higher layers that overlaps the sprite's frame is drawn **over** it. **Under vectors** promote the board graphics they enclose — on layer L, optionally all layers below, optionally the background image — so those draw over the sprite. The trigger is the sprite's collision base intersecting the vector, or, with the frame-intersect option, its image frame doing so. Overlapping under vectors do not stack translucency.

> **Open conflict R-54 — wall-sliding threshold.** the legacy feature inventory (E-26) says the engine slides when a solid edge is hit at "less than about 45° to the movement direction"; this page, `docs/spec/engine/movement-and-collision.md:67`, slides on an "angle ≥ 45°, or ≥ 27° on isometric boards". Owner epic: **movement-triggers**. Landed code: none. The owner settles it at inception; this page rules nothing.

## Collision between sprites

Sprites' collision polygons are compared. When two collide, one freezes for 2 seconds. Who loses: a stationary sprite loses to a moving one; otherwise the user-controlled player wins; otherwise the faster sprite wins; otherwise the one later in drawing order wins.

**Drawing order (z-order):** a sprite is drawn behind another when it is higher on the screen. **Compatibility note:** after any move the original engine re-inserts the moving sprite at the end of the drawing list (a bug), so the most recently moved sprite tends to be drawn on top until the order is recomputed.

<a id="e-27"></a>
**E-27 Collision — sprites.** All sprites are solid to each other through their collision bases. While following a path, a blocked sprite tries a **diversion** — a local path-find around the blocker and back onto its path — and can also **wait** for the blocker to move; if neither works it stops.

<a id="e-29"></a>
**E-29 Z-ordering.** **Reawakened rule (OWNER; R-55).** Render sprites by the total key `(layer, screen-space y of the sprite reference point after projection, drawId)`. `drawId` is one stable integer: players precede items, and each category is ordered by its index. On isometric boards the y component is projected screen-space reference-point y, not raw board y. Re-inserting a moving sprite never changes this key.

> **Open conflict R-51 — sprite-sprite collision outcome.** The legacy feature inventory (E-27) says a sprite blocked while following a path tries a "diversion … wait … stops"; this page, `docs/spec/engine/movement-and-collision.md:84`, says that of two colliding sprites one freezes for 2 seconds and names which one loses. Owner epic: **movement-triggers**. Landed code: none. The owner settles it at inception; this page rules nothing.

## Activation: programs and items

After the player finishes a step (and when the activation key is pressed):

1. **Items** are checked first. Among the items whose activation polygon overlaps the player, the one most directly in front of the player wins, then the nearest.
2. **Board programs** are checked next; if several match, the last one in board order wins.

A trigger fires according to its activation type ([../formats/board.md](../formats/board.md#programs-triggers)):

| Type | Fires |
|---|---|
| step | once when the player enters the area |
| key press | when the activation key is pressed while the player is inside |
| repeat | again every `distanceRepeat` pixels of movement inside the area |
| + stop movement | additionally clears the player's queued movement |

Conditional triggers fire only when their variable condition holds. The program to run may be a file or inline code. It runs to completion before the game continues.

<a id="e-40"></a>
**E-40 Board program region, step-on.** Fires once when the player's collision base enters the region on the same layer; it re-arms on leaving.

<a id="e-41"></a>
**E-41 Board program region, key-press.** The player is inside the region and presses the activation key.
<a id="reawakened-gone-trigger-suppression"></a>
**Reawakened rule (OWNER; `gone`).** `gone()` suppresses only the currently running board trigger instance by writing the `triggers` section. The source program remains on the board, sprites and unrelated threads are unchanged, and the suppression lasts until the active board is left. Normal trigger reload on board leave clears the marker.

<a id="e-42"></a>
**E-42 Board program region, repeat.** Fires again every `distanceRepeat` px walked inside the region; the counter resets on leaving.

<a id="e-43"></a>
**E-43 Item activation.** The player's collision base intersects the item's *activation base* while the player is moving (step-on) or the key is pressed (key-press). The item turns to face the player and the player's queue is cleared; `source` = item and `target` = player during the program. When several items qualify, the one most directly in front and then nearest wins, and items take precedence over regions.

<a id="e-44"></a>
**E-44 Conditional activation.** Both regions and items can require `variable == value` before firing and set `variable = value` after the program ends; "run once" is built from this.

<a id="e-45"></a>
**E-45 Item loading condition.** When the board loads, an item is hidden unless `variable == value`; it can still be shown later by script.

The other fixed hooks are the random battle, the custom battle program, the game-over program, the character level-up program, the item equip / remove / use programs, the special-move program, the status-effect per-round program, the enemy custom-AI program, the enemy defeat and run-away programs, and the start-up program. A region whose flag says "stops movement" clears the player's queue before running (needed for mouse movement), and movement that happens *inside* a program never fires other triggers.

**Random battles** are tested after activation, at most once per tile moved, on boards that allow battles ([plugins-and-battle.md](plugins-and-battle.md#random-encounters)).

**Reawakened rule.** The trigger points above may be implemented on an internal event bus, but the observable firing rules must hold exactly: once-per-entry, distance re-arm, precedence, layer matching, and the condition-before / set-after pair of conditional activation.

> **Open conflict R-52 — activation precedence.** the legacy feature inventory (E-43) says that among qualifying items the "one most directly in front and then nearest" wins, and that "Items take precedence over regions"; this page, `docs/spec/engine/movement-and-collision.md:103`, checks the items first and then the board programs, and says that if several programs match "the last one in board order wins". Owner epic: **movement-triggers**. Landed code: none. The owner settles it at inception; this page rules nothing.

## Moving between boards

When the player steps off an edge that has a link:

- A link ending in `.prg` runs that program instead.
- Otherwise the linked board is loaded, the player is placed against the opposite edge (keeping its position along the edge, inferred), and the spot is checked; if it is blocked the move fails.
- On success the new board replaces the current one: non-persistent threads of the old board stop, the new board's threads start, its items are placed, the view scrolls to the player, the board music changes if different, and the board's `enterPrg` runs.

Scripts can also move the player with `Send(board, x, y, layer)`.

<a id="e-19"></a>
**E-19 Board transitions.** `Send(board, x, y, layer)` loads a board, positions the player, re-aligns the camera, rebuilds the z-order, clears the path-finding caches, **deactivates any program the player arrives on top of** (so the destination does not fire immediately), switches the music and runs the enter program. Board threads of the old board are stopped; persistent threads survive.
<a id="reawakened-send-board"></a>
**Reawakened rule (OWNER; `send` timing, unverified default).** `send(board, x, y, [layer])` takes tile coordinates (one-based, as `put` does) and a one-based layer, where a layer below 1 means layer 1. The script cannot wait on a file, so the call records the request and parks the calling thread until the next tick; the engine then swaps the boards between ticks, freezing time while the board and its tiles load, and runs the board-entry rule of [main-loop-and-startup.md](main-loop-and-startup.md#reawakened-board-entry). The caller resumes at the start of the next tick on the new board, unless it was a `board` thread of the old board (it dies with the board). A second `send` posted in the same tick replaces the first. A board name that resolves to no asset is a located diagnostic and the request is dropped.

<a id="e-28"></a>
**E-28 Board edges.** If the selected player's base would leave the board: with **no link** the edge is solid; a **board link** test-loads that board and computes the arrival point on the opposite edge, refusing when the arrival point is off that board or solid; a **program link** runs the program. NPCs are not limited by edges unless they are path-finding.

<a id="e-47"></a>
**E-47 Board entry.** The board's threads start, then the enter program runs, on every arrival.

<a id="e-48"></a>
**E-48 Edge link to a program.** The player walks off an edge whose link is a `.prg`.

> **Open conflict R-53 — board-edge arrival alignment.** the legacy feature inventory (E-28) says the arrival point is "aligned to an 8 px or 32 px grid"; this page, `docs/spec/engine/movement-and-collision.md:147`, says the player is placed against the opposite edge "keeping its position along the edge, inferred". Owner epic: **movement-triggers**. Landed code: none. The owner settles it at inception; this page rules nothing.

## Path-finding

Used for mouse movement and the script commands `PlayerPath` / `ItemPath`. Modes (main file `pfHeuristic`):

| Mode | Search |
|---|---|
| 1 axial | A\* over a 32-pixel grid, 4 directions, Manhattan cost |
| 2 diagonal | A\* over a 32-pixel grid, 8 directions, octile cost |
| 3 vector | A\* over a visibility graph: the corners of obstacles grown by the sprite's collision size, straight-line cost |

The search gives up after 1000 node expansions. A grid cell is blocked if the sprite's collision polygon swept between cell centres would hit a solid vector. If the goal itself is blocked, the goal moves to the nearest free point.

<a id="e-34"></a>
**E-34 Path-finding.** The shortest path on the current layer around board vectors and sprite bases, with three heuristics — the main file's default, and selectable per call:

* **axial:** N/S/E/W only, tile-centre nodes;
* **diagonal:** 8-way, tile-centre nodes;
* **vector:** any angle, through the vertices of inflated obstacles (visibility-graph style).

If the target is unreachable, get as close as possible. Results are cached per board and invalidated on a board change or a vector edit.

## Scrolling

The view scrolls to keep the player near the centre. It does not scroll past the board edges; boards smaller than the screen are not scrolled.

<a id="e-51"></a>
**E-51 Camera.** **Reawakened rule (OWNER).** Follow the selected player by default. Deadzone and smoothing default to zero. Use `center-if-small` for scenes smaller than the viewport; otherwise clamp to scene bounds. `positionAt(alpha)` interpolates only for presentation.

**Reawakened rule (OWNER; camera built-ins and shared shake).** `cameraPanTo(x, y, duration, easing)`, `cameraFollow(entityId)`, `cameraReset()` and `cameraShake(duration, amplitude)` are Reawakened additions. Durations are seconds converted with `durationTicks = ceil(seconds × 60)`, with a minimum of one tick for positive values. `cameraShake` is non-blocking; `duration` is seconds and `amplitude` is logical-viewport pixels. The shared `shake(amplitude, ticks)` primitive cycles `(−a,−a)`, `(a,−a)`, `(−a,a)`, `(a,a)` per tick, never draws randomness and never stacks: a new shake replaces the active one. `earthquake` uses this same primitive and its blocking sequence is defined at [rpgcode-functions.md#reawakened-earthquake](rpgcode-functions.md#reawakened-earthquake). Non-finite arguments are errors, negatives clamp to zero, and zero is a no-op for cameraShake. Easing is one of `linear`, `smoothstep`, `easeIn`, `easeOut` and `easeInOut`, represented as plain JSON names and evaluated with deterministic fixed-point/injected-tick arithmetic.

## Player statistics and levels

A character's stats are script variables named in its file ([../formats/character.md](../formats/character.md)). Experience gained in battle can trigger a level-up, which raises the level-up stats by percentages or fixed points and runs the level-up program. The original engine's level formula is inconsistent between its three code paths; a new implementation should choose one documented rule.

<a id="e-78"></a>
**E-78 Levelling.** Experience thresholds are **exponential** (each gap grows by a percentage) or **linear** (each gap grows by a fixed amount), up to a maximum level. On level-up: the level-up program runs; max HP, DP, FP and max SMP rise by percent (exponential, ignoring equipment bonuses) or by points (linear); current HP and SMP are **not** refilled; and "*name* gained a level" is shown. Special moves unlock by minimum experience, minimum level, or `variable == value`.

<a id="e-85"></a>
**E-85 Party management.** Up to 5 members. Add or remove; choose the selected (visible, controlled) member; swap graphics; restore a player from a file. Stats live in script globals named in each character file, so scripts may read or write them directly.
