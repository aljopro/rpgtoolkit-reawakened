# Glossary

| Term | Meaning |
|---|---|
| **Activation key** | The main file's general key (`key`); pressing it tests programs and items at or in front of the player |
| **Activation polygon** | A sprite's polygon that must overlap a program or item area for it to trigger |
| **Ambient** | A whole-board colour tint (board ambient r, g, b, changeable from scripts) |
| **Animated tile** | A `.tan` file: tile frames cycled at a fixed rate, used in board cells |
| **Board** | One map (`.brd`): tile layers, shading, lights, vectors, programs, items, images, settings |
| **Board item / sprite** | An item placed on a board with its own position, programs and conditions |
| **Callback interface** | The 140 functions plugins call to read and change engine state |
| **Collision polygon** | A sprite's base polygon, tested against solid vectors and other sprites |
| **Conditional activation** | A program or item that only works while a global variable equals a given value |
| **coordType** | A board's coordinate system: normal, isometric stacked, isometric rotated, plus the "pixel coordinates" flag |
| **Custom stance** | A named animation in a character, item or enemy file that scripts can play |
| **Detail** | A tileset's size and colour-depth code (1 = 32×32 true colour, 150 = isometric …) |
| **DOS palette** | The fixed 256-colour palette used by 8-bit tiles |
| **Effective grid** | The tile grid a board's tile and shade data cover; square `(w+h)×(w+h)` for isometric-rotated boards |
| **Fight plugin / battle plugin** | The DLL that draws battles and runs the battle loop |
| **Game speed** | Main-file setting −4..+4 that speeds up or slows down all sprites |
| **Inline code** | RPGCode text stored where a program file name is expected; compiled when no such file exists |
| **Item** | An `.itm` file: an inventory object that can also appear on boards as a sprite |
| **Layer** | One of a board's stacked tile grids, numbered from 1 |
| **Link** | A board edge's target: another board, or a program to run |
| **LUT** | A board's look-up table of tile references; cells store indices into it, 0 = empty |
| **Main file** | The `.gam` file with a game's global settings, kept in `Main\` |
| **Menu plugin** | The DLL that draws the in-game menu |
| **Multitask program** | A program that runs continuously as a thread, e.g. an item's on-board behaviour |
| **PAK** | A `.tpk` ZIP archive containing a whole game |
| **Pixel movement** | Main-file mode in which sprites move in small steps instead of whole tiles |
| **Program** | An RPGCode file (`.prg`), or a board trigger that runs one |
| **Project path** | A game's folder relative to the Toolkit folder, e.g. `Game\demo\`, stored in the main file |
| **Redirect** | An RPGCode rule that sends calls to one command to another method |
| **RPGCode** | The Toolkit's scripting language |
| **Run-time key** | A key bound in the main file to run a program |
| **Shading** | Per-cell RGB tint on a board, cast onto a layer |
| **SMP** | Special-move power (mana) |
| **Special move** | A `.spc` file: a skill or spell |
| **Standalone EXE** | The engine with a PAK and a `CMP1` trailer appended, runnable on its own |
| **Status effect** | A `.ste` file: a timed battle effect (poison, haste …) |
| **Thread** | An RPGCode program running in the background, a slice per frame |
| **Tile bitmap** | A `.tbm` file: a grid of tiles with tints, used as an image |
| **Tile reference** | A string naming a tile: `set.tstN`, `set.isoN`, `name.gph`, `name.tan` |
| **Tileset** | A `.tst` (or isometric `.iso`) file holding many tiles of the same size |
| **Toolkit folder** | The folder the editor and engine run from; holds `Main\`, `Saved\` and `Game\` |
| **Upper bound (UB)** | A stored count meaning "last index", so the list has UB + 1 entries and −1 means empty |
| **Vector** | A polygon or polyline on a board layer: solid, under, stairs or waypoint |
| **Virtual variable** | A read-only script variable that mirrors engine state, e.g. `playerx[0]` |
| **Waypoint** | A vector that sprites can be told to follow as a path |
