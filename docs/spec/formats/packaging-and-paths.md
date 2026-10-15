# Project layout, path resolution, PAK archives and standalone EXEs

How a game is laid out on disk, how names inside files are turned into paths, and the two single-file distribution forms.

## The Toolkit folder and a project

```
<Toolkit folder>\              the engine and editor run from here (it is the working directory)
    Main\<name>.gam            main files of every project (outside the projects)
    Saved\                     saved games, created by the engine at start-up
    Game\<Title>\              one project ("projectPath", stored inside the .gam)
        Tiles\  Boards\  Chrs\  SpcMove\  Bkrounds\  Media\  Prg\
        Font\   Item\    Enemy\ Bitmap\   StatusE\   Misc\   Plugin\
```

| Folder | Holds |
|---|---|
| `Tiles\` | `.tst`, `.iso`, `.gph`, `.tan` |
| `Boards\` | `.brd` |
| `Chrs\` | `.tem` |
| `SpcMove\` | `.spc` |
| `Bkrounds\` | `.bkg` |
| `Media\` | music and sound effects |
| `Prg\` | `.prg` |
| `Font\` | `.ttf` fonts; every `*.ttf` here is installed temporarily while the game runs |
| `Item\` | `.itm` |
| `Enemy\` | `.ene` |
| `Bitmap\` | images and `.tbm` |
| `StatusE\` | `.ste` |
| `Misc\` | `.anm` animations |
| `Plugin\` | plugin DLLs (menu, battle, script commands) |

The editor creates all 14 folders for a new project. The project folder name is the game title with `\`, `/`, `:`, space and `.` removed. A new project made from the template gets `startupPrg = start.prg`, `initBoard = start.brd`, `initChar = start.tem`, `menuPlugin = tk3menu.dll`, `fightPlugin = tk3fight.dll` and `menuKey = 13`.

## Resolving names

| Name stored in | Resolved as |
|---|---|
| any asset file (board, character, item, animation …) | `projectPath + <type folder> + name`, e.g. `Game\demo\` + `Boards\` + `town\inn.brd` |
| main file name (command line, save game) | `Main\<name>`, relative to the Toolkit folder, **not** the project |
| save game name | `Saved\<name>.sav`, relative to the Toolkit folder |
| tile reference | see [README.md](README.md#tile-references) |

Paths use `\`. Sub-folders below a type folder are preserved in stored names. File names are case-insensitive (Windows).

## PAK archive (`.tpk`)

A whole game in one file: a standard **ZIP** archive.

| Rule | Value |
|---|---|
| Main file | stored under the fixed name `main.gam` at the archive root |
| Everything else | every file under the project folder, stored under its **project-relative path with `\` separators**, e.g. `Boards\town.brd`, `Misc\start\start_s.anm` |
| Directories | no entries |
| Not included | `Saved\`, other projects' main files, anything outside the project folder |
| Compression | deflate (method 8), no encryption, no comments, DOS date and time fields 0 |
| Lookup | names are matched case-insensitively and must use `\` |

When a game runs from a PAK:
- the main file is `main.gam` at the root, and its stored `projectPath` is ignored (treated as empty);
- each file is extracted on first use into a temporary folder (`%TEMP%\TKTemp\…`) that mirrors the 14 project folders, and the folder is deleted when the game exits;
- saves go to the same temporary tree and were lost on exit in the original engine (inferred).

## Standalone EXE

The editor's "Make EXE" copies the engine executable and appends a PAK and a 12-byte trailer:

| Part | Size | Content |
|---|---|---|
| engine | *E* bytes | an unmodified copy of the engine executable (icons may then be patched in place) |
| PAK | *Z* bytes | the ZIP described above |
| trailer: magic | 4 | ASCII `CMP1` |
| trailer: engine length | int | *E* = byte offset where the ZIP starts |
| trailer: ZIP length | int | *Z* |

At start-up the engine reads the last 12 bytes of its own file. If they begin with `CMP1` it copies *Z* bytes from offset *E* to `%TEMP%\temp.tpk` and runs that PAK. The file size is always `E + Z + 12`. There is no checksum or version beyond the magic. If extraction fails the engine shows "This application is corrupt." and continues with normal start-up.

## Example

[../examples/files/example_game.tpk](../examples/files/example_game.tpk) is a PAK of the complete example game; [../examples/listings/standalone_trailer.txt](../examples/listings/standalone_trailer.txt) shows the trailer of [../examples/files/standalone_layout.exe.bin](../examples/files/standalone_layout.exe.bin), which uses placeholder bytes instead of a real engine.
