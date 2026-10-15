# Start-up, main loop and timing

The original engine is a single-threaded Windows program. It loads the main file, starts its subsystems, runs the start-up program, shows the first board and then loops forever: handle one window message, run one frame of game logic. This page describes that observable behaviour.

## Command line

The engine runs with the Toolkit folder as its working directory (`Main\` and `Saved\` are relative to it). Arguments are split on single spaces, so file names with spaces cannot be passed.

| Invocation | Behaviour |
|---|---|
| (an executable with an appended PAK) | run the embedded game ([../formats/packaging-and-paths.md](../formats/packaging-and-paths.md#standalone-exe)) |
| `engine <file.gam>` | run `Main\<file.gam>` |
| `engine <file.gam> <program.prg>` | **program test mode**: load the main file, replace the start-up program with `<program.prg>`, start with no board, run, then exit. Used by the editor's "Run program". |
| `engine` with `main.gam` in the working directory | run it |
| `engine` otherwise | show an Open dialog for `*.gam` / `*.tpk`. A `.tpk` is run as a PAK. |

The editor's "Test game" runs `engine <file.gam>` without saving open editors first.

## Start-up sequence

1. Create `Saved\`. Decide which main file to run (table above) and load it.
2. Install every `*.ttf` font in the project's `Font\` folder for the duration of the run.
3. Load plugins ([plugins-and-battle.md](plugins-and-battle.md)): RPGCode command plugins, the menu plugin and the battle plugin, all from `Plugin\`.
4. Create the window and graphics device: resolution from the main file (640×480, 800×600, 1024×768 or custom), full screen or windowed, colour depth 16/24/32 bits. If the requested mode fails, lower depths are tried and full screen falls back to windowed.
5. Set tile or pixel movement and the game speed from the main file. Seed the frame-rate estimate (see Timing).
6. Create the first player from `initChar` and make the player variables available to scripts.
7. Run the start-up program **to completion** (it may show messages, ask questions, change variables, add players or even load a board).
8. If no player exists at this point the game stops with "an initial character must be defined".
9. Load `initBoard` (skipped if the start-up program loaded a saved game with `Load()`, which is how title screens offer "continue"), place the player at the board's start position, start the board's background music and run the board's `enterPrg`.
10. Enter the main loop.

## Main loop

Each pass of the loop:

1. Handle **one** pending Windows message, if any (keyboard, mouse, focus changes, repaint, quit).
2. Run **one frame of game logic**, depending on the game state:

| State | Frame |
|---|---|
| **Idle** (the player is not moving) | read input: activation key, menu key, run-time keys, movement keys, mouse; then do everything in *Moving* |
| **Moving** | (a) advance every background script thread by a budget of instructions; (b) move every sprite one step; (c) if the player crossed a board edge, handle the board link, otherwise test programs, items and random battles at the player's position; (d) draw the frame |
| **Paused** (window inactive) | sleep 100 ms |

The world keeps animating while waiting for input: the idle state falls through into the moving state.

There is **no frame-rate cap** in the original engine: the loop runs as fast as the machine allows. A 120 fps cap was defined but disabled.

### Blocking programs

Programs started by triggers (board programs, item activation, the start-up program, menu choices) run **to completion inside the frame that started them**. While one runs the rest of the world is frozen, but the window stays responsive because the program loop handles a window message after every instruction. Background threads ([rpgcode-language.md](rpgcode-language.md#threads)) are different: they get a slice of instructions per frame and do not freeze the world.

## Timing

Movement speed is **tied to the measured frame rate**, not to wall-clock time:

- The engine measures the average frame time over recent frames (only frames shorter than 256 ms count).
- Sprite speeds are given in seconds per step in the data files and converted to "frames per step" using the measured rate (see [movement-and-collision.md](movement-and-collision.md#speed)).
- The frame-rate estimate is saved on exit and used to seed the next run, separately for 640, 800 and 1024 resolutions and for windowed / full-screen (stored in the per-user registry under the RPG Toolkit settings). Program test mode does not save it.
- Script threads get `(fps − 60) × 10` instructions per frame, at least 10. **Compatibility note:** in the original engine this subtraction is unsigned, so below 60 fps it wraps to a huge number and threads effectively run without limit each frame.

A modern engine should use a fixed time step and convert the stored speeds to time directly; the result is equivalent at the frame rates the original ran at.

## Drawing a frame

1. Clear to the board's background colour; draw the board background image.
2. Draw the tile layers from a pre-flattened cache covering twice the screen size, so scrolling within it is cheap.
3. For each layer, bottom to top: redraw that layer's tiles over sprites from lower layers, then draw the sprites on this layer in z-order, then draw "under" vectors' tiles over sprites that stand inside them.
4. Draw running script animations, then the script overlay canvas, then present.

Ambient light (board ambient colour plus script changes) is applied as a gamma ramp in full-screen mode and by re-tinting tiles in windowed mode.

## Shutdown and reset

- **Exit** (window closed, or script `windows()` / its alias `dos()`): plugins are shut down first, then threads, graphics, audio and fonts; the frame-rate estimate is saved and any PAK temporary folder is deleted.
- **Reset** (script `Reset`, or losing a battle with no game-over program): all variables, redirects and threads are cleared, plugins are restarted, and start-up runs again from step 3.
- Closing the window while a blocking program or plugin is running exits immediately from inside it.
