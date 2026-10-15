# Display, input and audio

What the player sees and hears and how input reaches the game. These are the behaviours a replacement needs to match; how the original did it (DirectDraw 7, DirectInput 8, Audiere) is not prescribed.

## Window and display

| Setting (main file) | Behaviour |
|---|---|
| `mainResolution` | 0 = 640×480, 1 = 800×600, 2 = 1024×768, other = `resX` × `resY` |
| `extendToFullScreen` | 1 = exclusive full screen; 0 = a fixed-size window centred on the desktop |
| `colorDepth` | 16, 24 or 32 bits; lower depths are tried if the mode fails, and full screen falls back to windowed |
| `bFpsInTitleBar` | shows "title  N vectors, F FPS" in the window title |

The window title is the game title. Tiles are 32×32 pixels and are drawn at 1:1 scale (no zoom).

**Transparency:** images and canvases use magenta `(255, 0, 255)` as the transparent colour; tiles use the tileset's own transparent value ([../formats/tiles.md](../formats/tiles.md)); animation frames and layer images carry their own transparent colour.

**Layer images** of type parallax scroll at a different rate from the board; stretch images are scaled to the board size (only boards from tools other than the 3.1 editor use these).

**Ambient light** tints the whole screen (board ambient colour plus script changes).

**Mouse cursor:** `TK DEFAULT` = the built-in arrow; otherwise an image from `Bitmap\` with the given hot spot and transparent colour.

**Debug drawing** (main file `drawVectors`): outlines of board vectors, sprite polygons, paths and destinations, drawn over the game.

## Input

| Input | Effect |
|---|---|
| Movement keys (main file, scan codes for 8 directions; default arrow keys) | queue a step in that direction when the player is idle; two keys 90° apart give a diagonal if allowed |
| Activation key (main file `key`, the demo uses space) | test programs and items in front of / under the player |
| Menu key (main file `menuKey`, Enter in new projects) | open the menu plugin |
| Run-time keys (main file) | run their programs |
| Mouse (if enabled in `movementControls`) | holding the left button path-finds the player towards the pointer |
| Any key while a script waits | delivered to `Wait()` / `Get()` through a key queue |

Input is read only while the player is idle; during blocking scripts keys go to the script's key queue. Losing window focus pauses the game; regaining it resumes.

## Audio

| Sound | Source |
|---|---|
| Board music | board `bkgMusic`, looped, started on entering the board (kept if the next board names the same file) |
| Battle music | fight background `music`, during battles |
| Menu and battle sounds | main file cursor sounds and fight background sounds, played by the plugins |
| Animation frame sounds | each `.anm` frame's sound, played when that frame is shown |
| Script sounds | `Wav()` for sound effects (one channel), `MediaPlay()` / `MidiPlay()` to change the background music |

Formats: anything the platform can play (the samples use MIDI and WAV; MP3 and OGG were supported). **Compatibility note:** the original engine's music code routed every file through its MIDI path because of a string-comparison bug; animation frame sounds bypassed PAK extraction, so they probably did not play from PAK games (inferred).

## Video

Scripts play video with `PlayAvi()` (full screen) and `PlayAviSmall()` (actual size, centred); `.avi`, `.mpg` and `.mov` were supported. Playback blocks the game and cannot be skipped.

## Fonts

All `*.ttf` files in the project's `Font\` folder are made available to the game while it runs. Scripts select fonts by name (`Font()`), size, bold, italic and underline. Toolkit 2 bitmap fonts are not supported by the 3.x engine.
