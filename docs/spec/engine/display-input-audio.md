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

<a id="e-05"></a>
**E-05 FPS display and debug overlays.** An optional frames-per-second readout in the title bar, and debug overlays for board vectors, sprite vectors, the player's queued path and the destination marker, in colours from the main file.

<a id="e-13"></a>
**E-13 Tiles.** 32×32 tiles on normal boards and 64×32 diamonds on isometric boards, from tilesets, single-tile files, or **animated tiles** that cycle at their own fps; animated tiles can be switched off globally (`AnimatedTiles()`). 2D tiles on iso boards are projected ([../formats/tiles.md](../formats/tiles.md)).

<a id="e-50"></a>
**E-50 Screen.** Windowed or full screen at 640×480, 800×600, 1024×768 or a custom resolution; the colour depth applies only to full screen.

<a id="e-53"></a>
**E-53 Isometric drawing.** Diamond tiles are composited with masks, and the draw order is correct for both the staggered and the rotated layouts ([../formats/tiles.md](../formats/tiles.md#isometric-tiles)).

<a id="reawakened-iso2d-projection"></a>
**Reawakened rule (OWNER; non-parity 2D-on-iso projection).** An ordinary 32×32 source tile is projected to a 64×32 diamond by a fixed nearest-neighbour affine map. Source coordinates use integer floor/round rules defined by the compositor, and pixels outside the exact diamond mask are transparent; the resulting `blit` sets `iso2d: true`. This is a Reawakened rule, not a legacy-parity claim.

**Reawakened rule (OWNER; projected sprite y).** For isometric sprite ordering, use the projected screen-space y of the sprite reference point, never raw board y.

**Reawakened rule (OWNER; integer projection convention).** For destination diamond coordinates `(X,Y)` in the inclusive 64×32 raster, reject cells outside the exact mask described by [tiles.md](../formats/tiles.md#isometric-tiles), map accepted cells to source-square coordinates with the fixed affine map, and choose the nearest source pixel with integer half-up rounding. No floating-point edge test is permitted.

**Transparency:** images and canvases use magenta `(255, 0, 255)` as the transparent colour; tiles use the tileset's own transparent value ([../formats/tiles.md](../formats/tiles.md)); animation frames and layer images carry their own transparent colour.

**Layer images** of type parallax scroll at a different rate from the board; stretch images are scaled to the board size (only boards from tools other than the 3.1 editor use these).

**Ambient light** tints the whole screen (board ambient colour plus script changes).

<a id="e-17"></a>
**E-17 Lighting.** Three parts. A **tile shading layer**: an additive per-tile RGB shade cast onto all tiles at or below a chosen layer. **Lights**: elliptical spotlight, linear gradient and clipped gradient, rasterised into the shading once at load and static. **Board ambient RGB**, added to a **global ambient level** scripts can change (`SetAmbientLevel()`), which affects tiles, images, the background and sprite frames and triggers a full redraw when it changes.

<a id="reawakened-light-and-raster-arithmetic"></a>
**Reawakened rule (OWNER; raster arithmetic).** Raster primitives use integer arithmetic. The ellipse light uses a midpoint ellipse over its inclusive integer bounding box: plot four-way symmetric points, update the integer decision term in the two standard regions, treat zero width or height as a point or line, and fill each produced scanline between paired extrema. Tie decisions are fixed integer decisions; no trigonometry or floating-point edge test is used.

**Reawakened rule (OWNER; unverified light falloff).** Lights are baked into shading layer 0 at load, and the stored light layer is ignored. Ellipse falloff uses normalized elliptical radius with linear endpoint falloff (`1` at centre, `0` at the radius). A gradient uses clamped projection along its two nodes; a clipped gradient uses that projection only inside its polygon/clip shape. The two stored colours are interpolated in fixed-point integer steps and the resulting shade is clamped. This is a Reawakened default, not a legacy-parity claim, pending extraction answers.

**Mouse cursor:** `TK DEFAULT` = the built-in arrow; otherwise an image from `Bitmap\` with the given hot spot and transparent colour.

<a id="e-61"></a>
**E-61 Mouse cursor.** Default, none, or a custom image with a hot spot and a transparent colour. `MouseCursor("TK DEFAULT")` restores the default.

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

<a id="e-49"></a>
**E-49 Global keys.** The menu key opens the menu ([plugins-and-battle.md](plugins-and-battle.md#menu-plugin)); the run-time keys (up to 51 of them) run the programs they name, with a short debounce after the menu closes.

<a id="e-110"></a>
**E-110 Keyboard.** Named keys are returned to scripts (`Wait()` returns e.g. `"ENTER"`, `"LEFT"`, `"A"`); movement uses the configured scan codes; the menu, activation and run-time keys are character-coded. The buffered key queue can be cleared.

<a id="e-111"></a>
**E-111 Mouse.** Click (blocking or polling) and move coordinates for scripts, click-to-move, cursor maps and on-screen buttons.

<a id="e-112"></a>
**E-112 Joystick/gamepad.** An optional joystick, mapped to movement and confirm/cancel. **Open point (owner: movement-triggers).** This spec records no other joystick behaviour, and the rebuild's ports already declare a `GamepadInput` (`packages/core/src/ports/input.ts`), so gamepad support counts as a **Reawakened addition** until that epic rules on it; the E-112 anchor is kept so citations to the id still resolve.

<a id="e-113"></a>
**E-113 Focus handling.** The game pauses when the window loses focus.

## Audio

| Sound | Source |
|---|---|
| Board music | board `bkgMusic`, looped, started on entering the board (kept if the next board names the same file) |
| Battle music | fight background `music`, during battles |
| Menu and battle sounds | main file cursor sounds and fight background sounds, played by the plugins |
| Animation frame sounds | each `.anm` frame's sound, played when that frame is shown |
| Script sounds | `Wav()` for sound effects (one channel), `MediaPlay()` / `MidiPlay()` to change the background music |

Formats: anything the platform can play (the samples use MIDI and WAV; MP3 and OGG were supported). **Compatibility note:** the original engine's music code routed every file through its MIDI path because of a string-comparison bug; animation frame sounds bypassed PAK extraction, so they probably did not play from PAK games (inferred).

<a id="e-16"></a>
**E-16 Background music per board.** Board music starts on entry and changes when the player is sent to another board or crosses an edge; the file is kept playing when the next board names the same one. **Reawakened rule (OWNER; effect handoff).** Board music and per-frame `.anm` sounds post `audio` effect records through `postEffect`; audio-synth registers the applier and later creates `AudioCue`s. Board rendering owns neither `GameState.audio` nor `cueId`.
<a id="reawakened-audio-effect-records"></a>
**Reawakened rule (OWNER; unverified default).** Board-rendering emits plain `audio` effect records through `postEffect`: board `bkgMusic` on board entry or change uses `{ kind: "music.play", asset, loop: true, volume, source, tick }`, and each `.anm` frame sound when that frame becomes visible uses `{ kind: "sfx.play", asset, loop: false, volume, source, tick }`. Records have no `cueId`; the board and animation phases order them by phase order and frame index. Repeating board entry with the same music asset emits no replacement record; a different asset emits one replacement. Audio-synth registers the applier, assigns monotonic cue IDs in `GameState.audio`, creates `AudioCue`s and handles `audio.ended`. Until it registers, records remain in the bounded per-section pending queue.

<a id="e-100"></a>
**E-100 Background music.** One looping track at a time. MIDI is by far the most common (the bundled music pack is MIDI); MP3, OGG, WAV and tracker modules are also used. It changes per board, on battle start and end, and through `MediaPlay()` / `MediaStop()`. MP3 can be paused.

<a id="e-101"></a>
**E-101 Sound effects.** One-shot effects (`Wav()`; the older `Sound()` is obsolete), optionally blocking until finished. They also come from animation frames, menu cursor sounds and battle background menu sounds.

<a id="e-103"></a>
**E-103 MIDI playback.** Needs a General MIDI synthesiser with a SoundFont in any runner that lacks OS MIDI — browsers, mobile — and is a real parity requirement, because legacy games depend on it heavily.

> **Open conflict R-59 — audio routing and frame audio.** the legacy feature inventory (E-100, E-101) describes looping music plus one-shot effects; this page, `docs/spec/engine/display-input-audio.md:84`, says the original engine's music code "routed every file through its MIDI path because of a string-comparison bug", and that "animation frame sounds bypassed PAK extraction, so they probably did not play from PAK games (inferred)". Owner epic: **audio-synth**. Landed code: none. The owner settles it at inception; this page rules nothing.

## Video

Scripts play video with `PlayAvi()` (full screen) and `PlayAviSmall()` (actual size, centred); `.avi`, `.mpg` and `.mov` were supported. Playback blocks the game and cannot be skipped.

<a id="e-62"></a>
**E-62 Video.** Plays an AVI full screen or in a small window, blocking.

<a id="e-104"></a>
**E-104 Video formats.** `.avi` is the native form; `.mpg` and `.mov` were also accepted. A rebuild can transcode on import to a portable format.

**Reawakened rule.** Video is **transcoded on import** to a portable container a runner can decode without a legacy codec; the imported copy is what the game plays from then on.

## Fonts

All `*.ttf` files in the project's `Font\` folder are made available to the game while it runs. Scripts select fonts by name (`Font()`), size, bold, italic and underline. Toolkit 2 bitmap fonts are not supported by the 3.x engine.

<a id="reawakened-fontref-and-metrics"></a>
**Reawakened rule (OWNER; FontRef).** A text draw command carries `FontRef = { asset, size, bold, italic }`; underline remains a separate `line` command and is not a FontRef field. Size and style are therefore visible in draw-list hashes and runner inputs.

**Reawakened rule (OWNER; TrueType metrics).** For a font with `unitsPerEm`, scale each advance, kerning adjustment, ascent, descent and line gap by `size / unitsPerEm`. Round each non-negative scaled advance and kerning adjustment with `floor(value + 0.5)`. Read ascent, descent and line gap from `hhea` only, never `OS/2` or Windows metrics. Compute `ascentPx = floor(ascent * size / unitsPerEm + 0.5)`, `descentPx = floor(-descent * size / unitsPerEm + 0.5)` and `lineGapPx = floor(lineGap * size / unitsPerEm + 0.5)` (the hhea descent is negative), then `lineHeight = ascentPx + descentPx + lineGapPx`.

**Reawakened rule (OWNER; family substitution).** Resolve a project font asset by case-insensitive family name. Otherwise substitute `Arial`/sans-serif with Liberation Sans, `Times New Roman`/serif with Liberation Serif, and `Courier New`/monospace with Liberation Mono, then use the documented fallback family. A `.fnt` is selected when the name resolves to one or when the project is TK2; other names use family substitution. Entry 4.3 owns the library, bundled assets and bitmap fallback.
