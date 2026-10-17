# Animation and looks: flows for beginners

This area covers the visible identity of a Person, hero, item, or enemy: frame animations, sprite stance assignment, collision and activation (talk-range) bases, timing, and image import. The goal is not a reduced beginner editor. It is a complete editor with a safe first path.

## Jobs

Authors describe these jobs as:

- “Give my person a look and put him in the village.”
- “Bring in this walking sheet I found and make the hero walk north, south, east and west.”
- “Make a torch or water loop, and play a sound on its third frame.”
- “Make a battle character attack, defend, use a special move, die and rest.”
- “Make an item look right when it is placed on a board.”
- “Make the character’s feet collide with walls, and let the player talk from a sensible distance.”
- “Make the sprite move at a readable speed and wait before it starts its idle animation.”
- “Open an old animation, change its timing, and know exactly what changed.”
- “Use a multi-tile picture in an animation without learning a separate wizard.”
- “Use a GIF when that is what I have, without losing frames or silently using the wrong transparency.”

The beginner minimum is four cardinal walk animations. Diagonal, idle, battle and custom stances are available but never required before the first playable person.

## Legacy flow and where it hurts

The legacy editor spreads one visual job across an animation editor, a separate animation wizard, a character/item graphics window, and the main character or item editor. An author chooses references rather than seeing the resulting person in context.

| Step | What happens | Problem: D=discoverability / S=safety |
|---|---|---|
| 1 | Create or open an animation from a global New/Open menu. A blank animation starts with a canvas and a frame position. | **D:** “Animation” is a file-type word, not “make a walk” or “make an effect.” **S:** the editor has no general undo stack. |
| 2 | Move through frames with Previous/Next, Insert and Delete. Selecting the empty next slot is the normal way to append a frame. | **D:** the empty slot looks like navigation, not “add frame.” **S:** gaps can make later frames unreachable; structural edits historically did not keep frame sounds with moved images. |
| 3 | Choose a frame image, tile reference or tile bitmap through a chooser or by clicking the canvas. | **D:** the canvas click has two meanings (choose an image or pick transparency). **S:** a wrong source can resize the shared animation unexpectedly. |
| 4 | Use a separate wizard for either a list of image files or a tile-grid composition. | **D:** two overlapping creation paths make authors decide about file type and grid before seeing a result. **S:** file ordering, output names and generated tile bitmaps are hidden until commit. |
| 5 | Set one global delay for every frame with a text field or narrow slider. | **D:** “speed” does not explain seconds per frame. **S:** malformed or implausible values are accepted; there is no per-frame timing even when one pose needs more time. |
| 6 | Arm transparency selection, then click the canvas. The chosen colour belongs to the current frame, with inconsistent propagation to empty next frames. | **D:** the active picking mode is easy to miss. **S:** a bad colour can make a character disappear or leave a halo; there is no robust preview of all frames. |
| 7 | Type or browse a frame sound in a media folder. Sounds are attached to numeric frame slots. | **D:** no marker shows when the sound fires. **S:** inserting/deleting frames can leave a sound associated with the old slot rather than the visible image. |
| 8 | Save the animation under the miscellaneous asset folder. Missing frame or sound references can still save. | **D:** a successful save looks like a valid asset. **S:** file replacement and silent error handling can discard or hide broken links. |
| 9 | Open a character or item graphics dialog. Select one of eight direction rows, then separately assign walking and optional idle files. | **D:** the row list, two columns and click/right-click distinction are not a clear model. **S:** it is easy to fill an idle column but leave the required walk column blank. |
| 10 | Use an assignment wizard with a filename pattern such as a wildcard and direction suffixes. | **D:** the pattern language is not explained. **S:** generated names are not checked before applying; missing directions appear only later at runtime. |
| 11 | Add battle stances and custom stances in the same list. Character and item lists differ; enemy graphics have a different smaller list. | **D:** available rows vary by asset type and “custom” has no shared mental model. **S:** a stance can be referenced by script but have no animation. |
| 12 | Edit collision and activation polygons in a modal graphics window, with standard/isometric modes and point tables. | **D:** the author cannot see the base while placing the sprite on a board. **S:** the one collision/activation pair applies to every stance; a bad base makes walls or interaction fail. |
| 13 | Set “seconds between each step” and “seconds before player becomes idle” as free numeric values. | **D:** movement speed, frame delay and idle delay look like the same kind of timing. **S:** no bounds or plain-language preview makes very slow, instant or negative-looking values easy to create. |
| 14 | Assign an animated GIF in a graphics row. The ordinary preview shows only its first picture; the animated preview cannot play it. | **D:** “accepted” does not mean “previewed.” **S:** the author can ship a GIF without knowing which frame timing/transparency the engine will use. |
| 15 | Test from the game, which reads saved files rather than the open in-memory editor state. | **D:** the visible editor and running game can disagree. **S:** unsaved look changes appear lost; bad fallbacks are discovered far from their cause. |

The redesign keeps the useful legacy concepts—linked image/tile references, per-frame transparency and sound, custom stances, polygon editing—but puts them in one visible document model.

## Redesigned flow

### Screen A: “Pick a look” in Add Person

This is the first step when adding a Person. It is also available from the Person detail page.

```text
┌──────────────────────────── Pick a look ────────────────────────────┐
│ Your person needs a walking look. You can change this later.        │
│                                                                     │
│  [ Built-in set ]     [ Import my sheet ]                            │
│  ready-to-use art     PNG/GIF sprite sheet                            │
│  [Browse sets]        [Choose image]                                  │
│                                                                     │
│  Minimum: four walks (south, north, east, west).                    │
│  Diagonals and idle poses are optional; TKR will show its fallback.  │
│                                                                     │
│  [Back]                                      [Continue]              │
└─────────────────────────────────────────────────────────────────────┘
```

- **Built-in set** opens licensed starter art with animated thumbnails and a four-direction preview. Any bundled art MUST meet G6 and be listed in `THIRD_PARTY_NOTICES`; the starter set is not assumed to be available until that licence gate is satisfied.
The character generator remains hidden from this flow until a real generator is available. Its future status belongs in roadmap documentation, not as a disabled first-release control.
### Screen B: one sheet-import flow

The import flow replaces both old image-list and tile-grid wizard paths. It accepts a dropped image, a project image, a GIF, or an advanced “compose from tiles” source. It starts with a guess, then makes every guess visible and editable.

```text
┌──────────────────────────── Import walking sheet ───────────────────┐
│ Source: hero.png   [Replace]                                        │
│ Shared grid: Cell width/height [32×48]  Margin X/Y [0,0]  Gap X/Y [0,0] │
│ Detected: 4 columns × 4 rows   Layout: [4 frames × 4 directions ▼]   │
│                                                                     │
│        S                N                E                W          │
│   [frame][frame][frame][frame]  ...                                  │
│                                                                     │
│ [ ] Trim transparent border   Anchor: [bottom-centre ▼]             │
│ Transparency: [Auto key ▼] [eyedropper] [ ] Use alpha only          │
│                                                                     │
│ Preview  [S][N][E][W]  ▶ loop  speed [1× ▼]  [<] [>]                │
│ Warnings: 4 cells are blank; diagonals will use fallback.            │
│                                                                     │
│ [Cancel]                       [Back] [Import and open timeline]     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Layout guesser and manual override

The guesser MUST recognise these common uniform-grid cases **[INFERENCE: these are the practical community layouts the importer should target; the repository does not yet contain a corpus proving their frequency]**:

| Candidate | Initial interpretation | Required user control |
|---|---|---|
| 3 columns × 4 rows | Three-frame walk, one direction per row; direction row order is guessed from labels or defaults to S, W, E, N | Frame count 3/4, row order, direction labels |
| 4 columns × 4 rows | Four-frame walk, one direction per row; default S, W, E, N | Frame count 3/4, row order, direction labels |
| 3 columns × 8 rows | Three-frame walk for eight directions | Direction order and whether rows are walk or idle |
| 4 columns × 8 rows | Four-frame walk for eight directions | Direction order and whether rows are walk or idle |
| 3 or 4 columns × 2/4/8 rows with a second band | Walk band plus idle band, or walk plus an alternate expression/action band | Select each band’s purpose; do not silently assign it |
| 1 row × 3/4/8 columns | One-direction strip or a horizontal effect | Direction assignment and “effect, not walk” choice |
| 2/4/8 columns × 1 row | One-row effect or a sheet whose rows/columns were transposed | Rotate/transpose grid and choose frame sequence |
| Any uniform grid with transparent gutters | Same cases after detecting cell size from repeated separators | Manual cell width/height, margin, spacing, crop |

The guesser SHOULD use image dimensions, repeated empty gutters, alpha/color-key borders, and candidate cell aspect ratios. It MUST show the candidate grid, direction labels and frame count before import. It MUST never infer a diagonal or idle assignment solely from a filename and then hide the result. Shared grid detection uses Cell width/height, Margin X/Y, and Gap X/Y, with columns and rows derived and adjustable; after confirming the grid, the job-specific step assigns directions/stances or extracts tiles. Never guess a layout silently.

Manual override controls:

- columns and rows (derived and adjustable), Cell width/height, Margin X/Y and Gap X/Y;
- crop or pad cells to one common animation size;
- transpose, rotate 90°, and reverse row/column order;
- mark each row or column as South, North, East, West, NW, NE, SW, SE, Idle, or Ignore;
- choose a walk band and an optional idle band;
- set the anchor (default bottom-centre) and whether to trim transparent borders;
- choose alpha transparency or a colour key, with an eyedropper and “apply to all”; and
- name the imported assets without overwriting an existing asset.

“Preview before commit” means the author can scrub each cell, play every assigned direction, see the anchor and checkerboard, and inspect warnings before any `.anm` or native asset is written. The source image is copied into the project only after confirmation, following the project’s folder-aware import rule.

### Screen C: animation timeline

```text
┌──────────────────────────── Animation ──────────────────────────────┐
│ Hero walk south   [source: imported sheet]   [Save] [Undo] [Redo]   │
│ ▶ Loop  [0.15 s default]  [½×] [1×] [2×]  [Onion skin ▣]            │
│                                                                     │
│  1       2       3       4       +                                  │
│ [thumb] [thumb] [thumb] [thumb] [Add frame]                         │
│  0.12s   0.12s   0.20s   0.12s     drag to reorder                  │
│   🔊      —       —       —        sound markers                    │
│                                                                     │
│                 [large preview with anchor and onion skin]          │
│                                                                     │
│ Frame 3:  image [hero_03.png]  timing [0.20 s]  sound [step.wav]    │
│ Transparency [eyedropper] [apply to all] [reset to source]          │
│ Size [32×48]  Source [image ▾] [tile ▾] [tile bitmap ▾] [GIF ▾]      │
│                                                                     │
│ Warnings / links: missing file, colour-key halo, empty frame        │
└─────────────────────────────────────────────────────────────────────┘
```

Interaction rules:

1. The timeline is the primary object. Dragging reorders frames and carries image, timing, transparency and sound together. Duplicate, multi-select, delete and insert are commands with undo.
2. The animation has a default timing plus optional per-frame overrides. A beginner changes the default once; a precise author edits a frame’s timing inline. Preview runs at actual timing, with explicit half-speed and double-speed inspection.
3. Onion skin shows previous and next frames faintly, with separate toggles. It is view state, not document data.
4. The preview always shows the reference anchor, common canvas bounds, transparency checkerboard, and an optional safe-area outline. “Trim” never moves the anchor without showing the before/after.
5. A sound is a marker on the frame that emits it. Clicking the marker plays it; removing a frame removes its marker as one undoable command. A missing sound is an inline diagnostic, not a silent save.
6. The source picker offers image, single tile, `.tbm` tile bitmap, and GIF without requiring the author to choose a file type first. A multi-tile frame can be composed in a small tile canvas from the shared tileset browser.
7. The old “two wizard paths” become Import sheet and Compose from tiles inside the same timeline. Compose from tiles is an advanced source mode, not a separate modal workflow.
8. Transparency has three explicit modes: source alpha, colour key, or opaque. Colour-key selection is per frame, with “apply to all frames” and a warning when the selected colour is common inside the art.
9. An empty frame, missing source, zero/negative timing, oversized frame or missing sound creates a visible warning and cannot be accidentally mistaken for a complete animation. The author may keep an intentional empty frame only with an explicit “Keep empty” action.
10. Save, autosave recovery, undo and redo follow AD-19. Play saves first, then runs the saved project; **[INFERENCE]** the look editor should offer “Preview look” locally without claiming to run the game.

### Screen D: sprite graphics and stance compass

The Person, item and enemy detail pages share a Graphics card. A compass grid makes direction and stance visible instead of hiding them in a list.

```text
┌──────────────────────────── Graphics ───────────────────────────────┐
│                         N [walk ▶] [idle ▶]                         │
│                 NW [walk]             NE [walk]                     │
│          W [walk]       ● facing/origin       E [walk]              │
│                 SW [walk]             SE [walk]                     │
│                         S [walk ▶] [idle ▶]                         │
│                                                                     │
│ [Auto-fill from name pattern] [Import sheet] [Choose asset]         │
│ Battle: [Rest] [Attack] [Defend] [Special] [Die]                   │
│ Custom: [+ New stance]  [Open timeline]                            │
│                                                                     │
│ Collision base   [Small box] [Large box] [Iso diamond] [Edit]       │
│ Talk range       [Small box] [Large box] [Iso diamond] [Edit]       │
│ Speed  [0.05 s per movement frame]   Idle after [3.0 s]             │
│ [Preview all directions] [Show on sample board]                     │
└─────────────────────────────────────────────────────────────────────┘
```

- Walk cells are the cardinal minimum; diagonal cells are visibly optional. Each cell plays its assigned animation live. Missing cells are labelled with the exact fallback that will be used.
- The eight-direction order in the model follows the format convention S, N, E, W, NW, NE, SW, SE. The compass is a view, not a positional file contract.
- Idle cells sit beside their walk cells, so “idle” cannot be mistaken for another direction. Empty idle cells say “uses walk animation after idle delay.”
- Battle stances are shown only for asset types that support them. Custom stances are named assets and can be previewed once, looped, or held according to the runtime stance contract.
- “Auto-fill from name pattern” opens a preview table. `hero_{direction}_{kind}` is a readable pattern with direction tokens, not an unexplained wildcard. Missing files are listed before Apply; Apply is undoable.
- The same editor is used from Add Person, the character database, item graphics and enemy graphics. Context changes which stance groups are available, not the basic controls.

### Screen E: collision and talk range

Selecting **Collision base** or **Talk range** overlays a polygon on the animated preview and a small board sample. The polygon is relative to the sprite’s bottom-centre reference point and applies to the whole sprite, not one stance.

Defaults and presets:

- standard collision: rectangle from (−15, −15) to (15, 0);
- standard talk range: rectangle from (−24, −24) to (24, 8);
- isometric boards: diamond equivalents, selected automatically from the board coordinate system;
- one click: Small feet box, Large feet box, Talk range, Iso diamond, or Copy from another Person/item;
- advanced: draw polygon, drag vertices, numeric point table, close polygon, and reset to default.

“Talk range” is the beginner label. The model and diagnostics call it the activation base so that it remains correct for pickups and items. The overlay shows the player’s collision base and the target’s talk range together, with a sentence: “The player can activate this when these two shapes overlap.”

### Screen F: timing and missing-look diagnostics

Timing is grouped by meaning:

- **Movement speed:** seconds per movement frame; affects the sprite’s movement, not the animation timeline’s frame delay.
- **Idle delay:** seconds without movement before idle starts.
- **Animation timing:** default and per-frame seconds between frames.

The panel previews one tile step, a full walk cycle, and the idle transition. It gives plain-language checks such as “At 0.05 s, a 32-pixel tile takes about 0.4 s under the engine movement rule.” The user can still enter an advanced value, but implausible values get a warning and a one-click reset.

Missing-look diagnostics appear beside the compass cell and in Problems:

- missing diagonal: “No NE walk is assigned. Runtime fallback: nearest horizontal direction.”
- missing idle: “No S idle is assigned. Runtime fallback: S walk.”
- missing all required cardinal walk: blocking error for a new Person; imported legacy assets may open with a repair banner.
- missing battle stance: warning only until that stance is used by a battle or script.

The exact fallback rules are normative in `docs/spec/formats/character.md` and apply to item defaults through `docs/spec/formats/item.md`: a missing diagonal falls back to the nearest horizontal direction, and a missing idle falls back to the walk animation. The editor must show the result rather than invent another fallback.

### GIF and transparency rules

- Opening a GIF as an animation keeps it linked when the author chooses **Keep GIF**. Core decoding uses the first page's transparent index, then the GIF background index, then magenta if neither is present; page delays are read per page. See `docs/spec/formats/images.md` R-10. The editor displays compatibility semantics and does not equate GIF page delays with native `.anm` delays.
- **Import GIF as frames** converts it to editable frames so timing, sounds and keys can be edited; show a conversion preview before commit.
- GIF decoding belongs to the core reader, not the host. If that reader refuses the file, show a located diagnostic and offer **Import GIF as frames**.

## Scenarios walked

### (a) Add a Person from the built-in set and place him

| Step | User action and expected result | Covered? |
|---|---|---|
| 1 | Click **Add Person**, then **Pick a look**. | Yes: one gesture begins with the user’s job. |
| 2 | Choose **Built-in set** and see animated thumbnails with licence status. | Yes: starter art is visible; G6/`THIRD_PARTY_NOTICES` gate is explicit. |
| 3 | Select “Villager”; preview S/N/E/W and the collision/talk overlays. | Yes: cardinal minimum and bases are visible. |
| 4 | Continue; editor creates a definition with four walks, default bases, 0.05 s speed and 3 s idle delay. | Yes: defaults work without form archaeology. |
| 5 | Return to board, drag the Person onto a tile. | Yes: placement is a board action; the sprite anchor and bases remain visible. |
| 6 | Give him a line and choose “face the player.” | Yes in the broader Person flow; this document supplies the look and activation shape. |
| 7 | Press Preview/Play from here and talk to him. | Yes if Play saves first; Play starts from the resolved test spot, which must be adjacent to the step-on region rather than inside it. Local Preview is non-game animation preview. |

### (b) Import a 4×4 walking sheet and walk correctly in four directions

| Step | User action and expected result | Covered? |
|---|---|---|
| 1 | Drop a web-downloaded PNG onto **Import my sheet**. | Yes: one import path, source copied only after confirmation. |
| 2 | Guesser reports 4 columns × 4 rows and shows cell boundaries. | Yes: required 4×4 candidate. |
| 3 | Choose row order S/W/E/N or relabel rows in the preview. | Yes: manual override; no hidden convention. |
| 4 | Select a frame, inspect anchor and transparency checkerboard. | Yes: pre-commit preview. |
| 5 | Preview S/N/E/W looping, then Import. | Yes: all four cardinal walks are visible. |
| 6 | Open the compass; diagonal cells say nearest horizontal fallback. | Yes: exact fallback is surfaced. |
| 7 | Place the hero and press four movement directions. | Yes at the asset/editor contract level; engine movement still obeys diagonal setting. |
| 8 | Walk while holding two orthogonal keys. | Yes when the main file allows diagonals; **HOLE:** the import screen should link to the project movement setting so the author knows this is not an animation failure. |

### (c) Loop a torch or water animation with sound on frame 3

| Step | User action and expected result | Covered? |
|---|---|---|
| 1 | New animation, choose **Import sheet** or **Compose from tiles**. | Yes: both source modes share the timeline. |
| 2 | Set loop and inspect four frames at 1×. | Yes: loop is preview state; frame strip is editable. |
| 3 | Select frame 3 and drag a sound onto its marker. | Yes: marker is attached to frame identity, not an index after reorder. |
| 4 | Click marker to audition the sound. | Yes: play button and missing-file diagnostic. |
| 5 | Adjust frame 3 timing without changing the other frames. | Yes in native model; per-frame timing is explicit. |
| 6 | Use the animation as a board effect or item stance. | Yes: linked asset picker and common preview. |
| 7 | Save and run. | Yes: save first; **HOLE:** “loop” must be represented distinctly from one-shot custom stances in the model and runtime. |

### (d) Open and re-time a legacy animation

| Step | User action and expected result | Covered? |
|---|---|---|
| 1 | Open an old `.anm` from the asset browser. | Yes: legacy reader imports it into the document model. |
| 2 | Timeline shows all non-empty frames, one imported common delay, per-frame transparency and sounds. | Yes: `.anm` fields are mapped visibly. |
| 3 | Preview and identify a halo or missing source link. | Yes: inline diagnostics and checkerboard. |
| 4 | Change default delay, then override frame 3 if needed. | Yes in native model; per-frame timing is not represented by legacy `.anm`. |
| 5 | Save as a TKR/native document. | Native save is available when specified; legacy write is not promised under ADR 0005. |
| 6 | No legacy export action is offered in the main flow. | Import/playback is the compatibility baseline; legacy export remains undecided and is not promised. |
| 7 | Open the character graphics compass and verify every linked stance. | Yes: references are project-graph links; missing cells remain warnings. |

## Holes found and fixes

1. **The project has no guaranteed starter art.** Fix: ship a small licensed starter library only after G6 review, or make the empty state explain how to import a sheet. Never bundle unlicensed community art.
2. **A 4×4 sheet has no universal row order.** Fix: show S/W/E/N as a named default, expose row labels, and require confirmation when the source has no metadata.
3. **A sheet may contain idle or alternate rows.** Fix: show every row and require the author to classify it as walk, idle, action or ignore; never discard “extra” rows silently.
4. **Diagonal movement can be disabled even when diagonal art exists.** Fix: the compass warns separately about art fallback and project movement settings; the importer does not change the main file.
5. **Per-frame timing does not fit the legacy `.anm` layout.** Fix: native documents store timing overrides. Legacy write is undecided, so import/playback is the baseline.
6. **GIF timing and `.anm` timing differ.** Fix: keep linked GIF semantics explicit; offer conversion to editable frames and show first-page compatibility rules.
7. **Tile bitmaps can be larger than a beginner expects.** Fix: use the same timeline source menu, show a tile-cell canvas and the resulting pixel bounds, and preserve the `.tbm` link. `.tbm` dimensions are tile counts and the format writes an extra row and column; the editor hides that storage quirk.
8. **Frame reordering can break sound attachment.** Fix: frame is an object containing image, key, sound and timing; reorder moves the whole object in one command.
9. **Collision and talk range are hard to validate in isolation.** Fix: preview both against a sample wall and a sample Person, show overlap text, and offer “show on current board.”
10. **Speed, frame delay and idle delay are easy to conflate.** Fix: separate labels, units and previews; include a short movement explanation and reset-to-default controls.
11. **A missing animation may not fail until runtime.** Fix: Problems includes all stance references, required cardinal walks are blocking for a new Person, and every fallback is shown at the cell.
12. **The shared Person flow and database flow could diverge.** Fix: both call the same `editor-ui` Graphics and Timeline components over the same `editor-model` commands; host differences are limited to platform-services.
13. **Unsaved editor state versus Play remains ambiguous.** Fix: shared foundation MUST say Play saves first, while this area’s local Preview is explicitly a non-game animation preview.
14. **Character generator availability.** Keep the generator hidden from the authoring flow until it exists; do not advertise a disabled placeholder.

## Data and native-format implications

### Animation model

The editor model should represent an animation as an ordered list of frame objects:

- source: image, tile reference, tile bitmap, or linked GIF;
- common canvas width and height;
- per-frame transparency mode/key;
- optional sound reference;
- default timing and optional per-frame timing override;
- anchor and import provenance; and
- loop/preview metadata only where the consumer needs it.

The legacy `.anm` layout has image, transparency colour and sound per frame, but only one animation-wide delay, and the current editor historically writes 51 slots with upper bound 50. Empty frames are not a safe way to create pauses: the engine drops empty image frames and a middle gap shortens the sequence (`docs/spec/formats/animation.md`). The native model MUST use a real ordered list and MUST NOT expose the legacy fixed slot count to beginners.

A `.anm` import maps its common delay to the model default. A native per-frame override is an extension of the editor model, not a claim that the legacy writer can encode it. On legacy export, the editor MUST either refuse unsupported per-frame timing or require an explicit flattening choice and warning.

AD-18 requires readers to return a model plus warnings, preserve unmodelled residue, and avoid silently dropping data. This is important for old animations and for old character/item records whose fields may be older than the current bases and stance fields. Import should preserve original format/version metadata while the UI works with named IDs.

### Character and item model

Character `.tem` stores walk directions in S, N, E, W, NW, NE, SW, SE order, battle stances, idle directions, idle delay, speed, custom stances and two polygons. Character fields store idle delay before speed. Item `.itm` stores the same general graphics concepts but stores speed before idle delay and has a deprecated rest field in older minors. The importer/writer MUST map by field meaning, never by visual order; cite `docs/spec/formats/character.md` and `docs/spec/formats/item.md`.

The fallback contract is exact:

- missing diagonal walk → nearest horizontal direction;
- missing idle → corresponding walk animation;
- pre-base files use the standard collision and activation defaults; isometric boards use diamond bases.

These are format rules, not suggestions. The editor may offer a repair button, but it MUST show the same fallback the engine will use. The editor MUST NOT silently copy a diagonal into a file merely to make the cell look full.

### Collision and activation bases

The model stores one collision polygon and one activation polygon relative to the bottom-centre reference point. Defaults are the rectangles documented in `docs/spec/formats/character.md`; item files inherit those defaults through `docs/spec/formats/item.md`. Activation is the runtime term; “talk range” is the beginner-facing label. The same bases apply to every stance and every frame, so the editor should warn if a tall or wide animation visibly extends beyond the collision preview.

Runtime consequences belong to `docs/spec/engine/movement-and-collision.md`: collision is tested at the target position against solids on the sprite’s layer, and item activation occurs when the player’s collision base overlaps the item’s activation base. The look editor must link to those behaviours without duplicating their rules.

### Tiles and tile bitmaps inside animations

A tile reference is a 32×32 tile or an isometric tile reference. A `.tbm` is a rectangular tile picture with per-tile tint; its visible dimensions are tile counts even though the file includes an extra row and column. The timeline can display the composed pixel result, edit the tile cells in advanced mode, and keep the `.tbm` as a linked source. A single-tile animation frame should remain a tile reference rather than being unnecessarily rasterized.

Animated tiles (`.tan`) are a separate board-tile asset with an exact frame count and speed value. They may be selected as a board tile, but the look timeline should not mislabel a `.tan` as a character frame sequence. If the user wants a torch effect as an animation, import its frames into the timeline; if they want animated water painted across a board, use the animated-tile editor.

### Audio and platform boundary

Animation frame sounds are frame cues. The core emits the cue when the frame is shown; the host realizes audio through the platform-services boundary. The spec lists frame sounds as one-shot effects (`docs/spec/engine/display-input-audio.md`). The editor must validate project-relative media references and show a missing-file warning. No editor preview should require host-specific APIs; `editor-ui` asks platform-services to audition a file.

### Undo, IDs and references

Every timeline edit, stance assignment, polygon edit, timing change and importer apply is a serialisable command. Stable asset and object IDs mean renaming an animation or moving it into a folder does not invalidate a Person’s stance links. The reference graph can report “used by 3 people and 1 item.” A source image, generated `.tbm`, sound and resulting animation should have explicit links so deletion can offer replace/remove choices.

## Challenges to earlier decisions

- The earlier direction says a Person is one gesture: pick a look, give a line, place. That is correct for the beginner path, but the look step must not hide the complete editor. The proposed three doors and the later detail screens preserve full capability without forcing advanced choices up front.
- The earlier direction proposes a compass grid and live animation previews. This document strengthens it: each missing cell must show the normative fallback and each cell must expose the actual source, timing and anchor. A visually full compass that hides fallback would recreate the old safety problem.
- The essay suggests in-memory Play; this research recommends save-first game testing. Jensen's “no” answered whether the runtime currently consumes a live model, not a ban on embedded previews. Local animation preview remains distinct from executing a saved game/test scenario; final Play semantics need confirmation.
- Per-frame timing is deliberately richer than the legacy `.anm` format. This is not a contradiction of import compatibility: it is a native-model capability permitted by ADR 0005. The UI must be honest that legacy `.anm` cannot retain it.

## Open questions for the owner

1. **Native animation storage:** Should the first native format store per-frame timing overrides directly, or should the editor initially flatten them to one delay? **Recommended default:** store a default plus optional per-frame overrides; this is the smallest model that supports the requested torch/water timing without pretending legacy `.anm` can do it.
2. **Legacy export:** Should TKR offer a legacy `.anm` writer at all? **Recommended default:** import and play legacy files first; if export exists, require an explicit flattening preview and warning.
3. **Starter art:** Which CC0/Bronze-or-better set is approved for the built-in door? **Recommended default:** ship no art until a named licence and `THIRD_PARTY_NOTICES` entry pass G6; then include a tiny four-direction set and one effect.
4. **Sheet convention evidence:** Which layouts should receive first-class labels in the guesser? **Recommended default:** ship 3×4, 4×4, 3×8, 4×8, one-row strips, transparent-gutter grids, and walk+idle bands; add corpus-derived guesses later without removing manual override.
5. **GIF policy:** Should linked GIFs remain linked, or always convert on import? **Recommended default:** offer both; Keep GIF preserves compatibility semantics, Import as frames enables editing and native timing.
6. **Per-frame timing in linked GIFs:** Should the editor expose GIF page delays while keeping the GIF linked? **Recommended default:** preview the real page delays but explain that linked GIF compatibility follows the first-page `.anm` rule when consumed as an animation reference.
7. **Sprite base presets:** Should users be able to save project-specific collision/talk presets? **Recommended default:** first release has the three standard presets plus copy-from-asset; project presets can follow once stable IDs and native format are settled.
8. **Enemy custom stances:** Should enemy graphics use the same compass and custom-stance model as People, despite legacy format disagreements? **Recommended default:** yes in the UI model; import warnings and round-trip tests must protect the enemy reader/writer boundary.
9. **Local animation Preview versus game Play:** What host capability should provide the preview renderer and audio audition? **Recommended default:** a shared host-agnostic preview model in `editor-ui`, with platform-services for file reads and audio only.
This flow is research-only UX motivation, not normative implementation authority. Its proposed behavior must be promoted to the relevant spec or `docs/editor-features.md` before implementation.

## Sources

- `docs/editor-features.md`, T-52 Sprite graphics editor and T-60–T-62 graphics composition editors.
- Legacy functional guide, `docs/architecture/editor/guide/06-animation-and-battle-assets.md`, sections “Animation editor,” “Animation wizard,” “Animation preview host,” and “Cross-editor gotchas and author checklist.”
- Legacy functional guide, `docs/architecture/editor/guide/05-character-item-enemy.md`, sections “Graphics and animation dialog,” “Vector base,” “Character workflow,” and “Item graphics and animation.”
- `docs/spec/formats/animation.md`, especially Layout, Empty frames, Animated GIF, and the single-delay rule.
- `docs/spec/formats/character.md`, especially walk/idle/battle fields and Defaults and fall-backs.
- `docs/spec/formats/item.md`, especially graphics fields, timing order, bases and older versions.
- `docs/spec/formats/tiles.md`, especially Animated tile and Tile bitmap.
- `docs/spec/engine/movement-and-collision.md`, E-20, E-21, speed, collision and activation.
- `docs/spec/engine/display-input-audio.md`, transparency and animation frame sounds.
- `docs/spec/engine/main-loop-and-startup.md`, fixed-tick timing and draw/audio responsibilities.
- `docs/adr/0004-script-ast-step-ir-and-plugins.md`, deterministic event and audio boundary context.
- `docs/adr/0005-independent-product-v1-and-native-format.md`, independent product, import compatibility and native-format permission.
- `docs/guardrails.md`, G2, G5, G6 and G7.
- `_bmad-output/initiative-rpgtoolkit-reawakened/research-editor-ux-for-beginners/decisions.md`, §§1, 4.3–4.5 and 5.
