# Movement, collision, activation and board changes

Players and board items are both "sprites". This page describes how they move, what stops them, how programs and items are triggered, how the player moves between boards, and path-finding.

## Positions

- Sprite positions are **board pixels** (fractional values allowed). The reference point is the **bottom-centre** of the sprite's tile: pixel (16, 31) within a 32×32 tile on normal boards, the tile centre on isometric boards.
- Each sprite has a **collision polygon** and an **activation polygon**, relative to its reference point ([../formats/character.md](../formats/character.md#defaults-and-fall-backs)).
- Each sprite is on one layer.

## Movement modes

| Main-file `pixelMovement` | Behaviour |
|---|---|
| 0 — tile movement | each move is a full 32-pixel step to the next tile |
| 1, 2 — pixel movement | each key press moves a smaller step, so sprites slide smoothly and can stop between tiles |

Movement is queued: the keyboard, the mouse, scripts (`Push`, `PlayerPath`, `ItemPath`…) and waypoint vectors add steps or targets to a sprite's queue. Diagonal moves need the main file's "allow diagonals" flag; with the keyboard, two keys 90° apart give a diagonal.

## Speed

- A sprite's `speed` (seconds, from its character or item file) is converted to milliseconds. While moving, it advances **4 pixels per `speed`**, so one 32-pixel tile takes `8 × speed` (0.4 s at the default 0.05 s).
- The main file's **game speed** (−4..+4) makes every sprite faster or slower: the time per 4-pixel advance becomes `speed − 100 ms × gameSpeed`, never less than one frame.
- The original engine implements this by counting frames at the measured frame rate ([main-loop-and-startup.md](main-loop-and-startup.md#timing)); the formula above is the time-based equivalent.
- Idle and custom stance animations play at their own `delay`.

## Sprite states

| State | Meaning | Leaves when |
|---|---|---|
| waiting | just stopped | a move is queued → moving; `idleTime` passes and an idle animation exists → idling; a script plays a stance → stance |
| idling | playing the idle animation | a move is queued |
| moving | walking towards the current step target | the target is reached or passed → done; blocked by something solid → done; teleported → done |
| done | step finished | next queued step → moving; otherwise → waiting |
| stance | playing a named custom animation once | the animation ends |
| frozen | lost a sprite-sprite collision | **2 seconds** pass → waiting |

## Collision with the board

Before each step the sprite's collision polygon, placed at the target, is tested against every vector on the sprite's layer:

| Vector type | Effect |
|---|---|
| solid | blocks the step. In pixel movement, a glancing hit (angle ≥ 45°, or ≥ 27° on isometric boards) turns the step one direction left or right so the sprite slides along walls. |
| stairs | the sprite moves to the layer given by the vector's attributes |
| under | no collision; the sprite is drawn beneath that layer's tiles while inside it |
| waypoint | no collision; only used as a path |

Moving off a board edge is blocked unless that edge has a link.

## Collision between sprites

Sprites' collision polygons are compared. When two collide, one freezes for 2 seconds. Who loses: a stationary sprite loses to a moving one; otherwise the user-controlled player wins; otherwise the faster sprite wins; otherwise the one later in drawing order wins.

**Drawing order (z-order):** a sprite is drawn behind another when it is higher on the screen. **Compatibility note:** after any move the original engine re-inserts the moving sprite at the end of the drawing list (a bug), so the most recently moved sprite tends to be drawn on top until the order is recomputed.

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

**Random battles** are tested after activation, at most once per tile moved, on boards that allow battles ([plugins-and-battle.md](plugins-and-battle.md#random-encounters)).

## Moving between boards

When the player steps off an edge that has a link:

- A link ending in `.prg` runs that program instead.
- Otherwise the linked board is loaded, the player is placed against the opposite edge (keeping its position along the edge, inferred), and the spot is checked; if it is blocked the move fails.
- On success the new board replaces the current one: non-persistent threads of the old board stop, the new board's threads start, its items are placed, the view scrolls to the player, the board music changes if different, and the board's `enterPrg` runs.

Scripts can also move the player with `Send(board, x, y, layer)`.

## Path-finding

Used for mouse movement and the script commands `PlayerPath` / `ItemPath`. Modes (main file `pfHeuristic`):

| Mode | Search |
|---|---|
| 1 axial | A\* over a 32-pixel grid, 4 directions, Manhattan cost |
| 2 diagonal | A\* over a 32-pixel grid, 8 directions, octile cost |
| 3 vector | A\* over a visibility graph: the corners of obstacles grown by the sprite's collision size, straight-line cost |

The search gives up after 1000 node expansions. A grid cell is blocked if the sprite's collision polygon swept between cell centres would hit a solid vector. If the goal itself is blocked, the goal moves to the nearest free point.

## Scrolling

The view scrolls to keep the player near the centre. It does not scroll past the board edges; boards smaller than the screen are not scrolled.

## Player statistics and levels

A character's stats are script variables named in its file ([../formats/character.md](../formats/character.md)). Experience gained in battle can trigger a level-up, which raises the level-up stats by percentages or fixed points and runs the level-up program. The original engine's level formula is inconsistent between its three code paths; a new implementation should choose one documented rule.
