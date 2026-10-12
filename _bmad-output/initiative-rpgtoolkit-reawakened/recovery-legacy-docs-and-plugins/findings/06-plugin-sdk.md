# The Toolkit 3 plugin interface — recovered SDK references

**This is the answer to "do the plugin docs exist?"** The RPG Toolkit 3 plugin
interface is documented after all, and **two** plugin SDKs survived:

| SDK | Version it targets | Model | Recovered as | Local reference |
| --- | --- | --- | --- | --- |
| **COM Plugin SDK (C++), version 2.0** — Colin James Fitzpatrick, 2004-11-13 | "TK 3.04+" | COM: one `IMain` `IDispatch` coclass; **98** `CB*` callback methods; `CCanvas`/`CAnimation`/`CString` classes | toolkitzone.com `fileman/files/861.zip` (49 728 B) | `fixtures/archaeology/toolkitzone/sdk-interface.md` + `sdk-constants.md` |
| **TK310 C++ SDK** — RPG Toolkit 3 plugin libraries, MSVC project, files dated 2011-05-27 | **TK 3.1.0** | native DLL: **13** required `TKPlug*` exports; **131** `CB*` callbacks (flat `CBCanvas*`/`CBAnimation*` instead of classes); one example source file per plugin kind | `rpgtoolkit.net/vault/object/4305.zip` (54 528 B) | `fixtures/archaeology/rpgtoolkit-net/sdk310-interface.md` + `.json` |

Together they bracket the plugin ABI: the 2004 kit shows the COM design ("any
language"), the 2011 kit the export-based design that matches the 3.1.0 manual
recovered alongside it. Both define the same three plugin kinds with the same
flag values, the same `MNU_*`/`INFORM_*` constants and the same fight structures.

They are **interface kits**, not engine source: the IDL, the headers and the
`.def` declare what the engine and the plugin exchange. That makes them the
clean-room input for a rebuilt, sandboxed extension point (E-99), and the only
documented source for what TK3's `tk3menu.dll` / `tk3fight.dll` were called with
(E-79/E-80).

Raw captures, extracted trees and the transcribed references live in the
git-ignored `fixtures/archaeology/`:

| Local path | What it is |
| --- | --- |
| `toolkitzone/downloads/fileman-861.zip` | the 2004 COM SDK (49 728 bytes) |
| `toolkitzone/extracted/fileman-861/SDK/` | its extracted tree (33 files) |
| `toolkitzone/sdk-interface.md` / `.json` | local transcription of its 98 callback declarations with the SDK's own one-line descriptions (`parse_sdk.py`) |
| `toolkitzone/sdk-constants.md` | local transcription of its 251 engine information codes in 22 groups |
| `rpgtoolkit-net/downloads/vault-object-4305.zip.20150429170536.redirect.html` | the 2011 TK310 SDK (54 528 bytes; a real zip despite the fetcher's filename suffix) |
| `rpgtoolkit-net/sdk310-interface.md` / `.json` | local transcription of its 131 callback declarations with the header's own Function/Callback-no/Action blocks (`parse_sdk310.py`) |

Report date: 2026-10-11.

## Provenance

| Item | Wayback snapshot | Captured | Confidence |
| --- | --- | --- | --- |
| `fileman/files/861.zip` seed (2004 COM SDK) | https://web.archive.org/web/20051018141409id_/http://www.toolkitzone.com:80/fileman/files/861.zip | 2026-10-11 | high |
| listing/description (`fileman.php`) | toolkitzone.com `fileman.php` entry 861, captured by the archive walk in `findings/03-toolkitzone.md` | 2026-10-11 | high |
| file headers (`*.h`, `*.idl`, readme) | members of the zip above | 2026-10-11 | high |
| `vault/object/4305.zip` seed (2011 TK310 SDK) | https://web.archive.org/web/20150429170536id_/http://rpgtoolkit.net/vault/object/4305.zip | 2026-10-11 | high |
| catalogue entry for 4305 | `rpgtoolkit.net` `extend/utilities/c-plugin-sdk` (2 235 views / 244 downloads at 2012-08), `findings/01-rpgtoolkit-net.md` §2 | 2026-10-11 | high |
| TK310 file set, `Tkplugin.h` constants, `.def` exports, `Readme.h`, licences | members of the zip above | 2026-10-11 | high |

Attribution: `pluginSDK.idl` and every header carry *"All contents copyright
2004, Colin James Fitzpatrick (KSNiloc). All rights reserved. YOU MAY NOT REMOVE
THIS NOTICE. YOU MUST GIVE CREDIT TO THE AUTHOR FOR USAGE OF THIS FILE."* The
SDK is **not** redistributed in this repository; only facts about the interface
are recorded here. Per `findings/05-toolkitzone-library.md`, the 3.0.4+ SDKs were
(GPL + exception) later — see *Decision required* below.

## What SDK 2.0 says about itself

The zip's own readme (`readme - SDK.txt`) — short, verbatim excerpts:

> ```
> COM Plugin SDK (C++), version 2.0
> ```
>
> "This is an updated plugin SDK for TK 3.04+ and an outlook into Trans3 & COM."
>
> "2.0: Mostly re-written … You no longer have to do silly things with regards to
> filenames … The functionality of canvases is now encapsulated in CCanvas, as
> are animations in CAnimation … And, due to popular demand, I wrote an example
> command :)"
>
> "Minimal steps required to make it work: 1. Flag what your plugin supports in
> misc.h; rpgcode is enabled by default. 2. Generate new GUIDs as detailed in
> GUIDs.h. Fin."
>
> "Unknown to just about everyone, I embedded COM technology in 3.04. …
> + Trans3 must be able to create an instance of a 'main' class containing
> several methods. + Trans3 must be able to pass in the addressof a callback
> object containing methods for all the callbacks … For so long has the TK only
> had support for VC++ plugs … With the COM in trans3, now *any* language can be
> used to create plugins."

Two facts fall out that no other recovered document states:

* **TK3 plugins are COM objects** (`IDispatch`-compatible), so the plugin
  contract is language-neutral in principle — matching the readme's "any
  language" claim and the Library's note that the FMod plugin was written in VB,
  not C++.
* The SDK is **versioned against the engine**: SDK 2.0 targets "TK 3.04+";
  `Callbacks.h` marks three DirectX HDC accessors `OBSOLETE` and comments that in
  3.05 the screen DC becomes the backbuffer — i.e. the interface moved with 3.05.

## The plugin contract (SDK 2.0)

### Entry point — `IMain` (`pluginSDK.idl`, `pluginSDK.h`)

One COM interface (dual, `IDispatch`), one coclass `Main`, type library
`PLUGINSDKLib`. Methods:

| Method | Purpose (interface-level) |
| --- | --- |
| `Plugin_Initialize` / `Plugin_Terminate` | plugin load/unload |
| `Plugin_Version`, `Plugin_Description` | strings shown to the engine/editor |
| `plugType(int)` | asks the plugin which kinds it implements |
| `RPGCode_Query(BSTR)` | "can you handle this RPGCode command?" |
| `RPGCode_Execute(BSTR, …)` | run the command, returning type + literal/numeric result |
| `Menu(int)` | menu-system entry point, returns the chosen menu result |
| `Fight(int, int, BSTR, int)` | battle entry point |
| `fightInform(…)` | battle events pushed at the battle plugin |
| `setCallbacks(IDispatch*)` (property, `id(1)`) | engine hands the plugin its callback object |

### Plugin kinds (`sdkBase.h`, SDK 2.0)

```
PT_RPGCODE = 1      // RPGCode plugin
PT_MENU     = 2     // Menu plugin
PT_FIGHT    = 4     // Fight plugin
```

The bits combine: one DLL can declare any subset, which is what `plugType`
reports and what the editor's Plugins tab (`docs/editor-features.md` T-14) and
the `.gam` plugin list (`docs/format-spec.md` row 29) record.

### Plugin-side settings (`misc.h`) and lifecycle entries

`misc.h` is the file the plugin author edits: a description string
(comment: *"Description of the plugin that will appear on the plugins Tab in the
main file editor"* — exactly T-14's "description shown on add"), a version
string, and the capability flags:

```
#define MENU_SYSTEM    false
#define BATTLE_SYSTEM  false
#define RPGCODE        true
```

Prototypes the plugin implements: `Initiate()` / `Terminate()`; a menu plugin
additionally exposes `showMenu(int)`, a battle plugin `runFight(FIGHT_STRUCT)`
and `fightEvent(FIGHT_EVENT)`.

### Replacing the menu and the battle system

```c
struct FIGHT_STRUCT { int enemyCount; int skillLevel; CString backgroundFile; bool canRun; };
struct FIGHT_EVENT  { int sourceParty, sourceFighter, targetParty, targetFighter,
                      sourceHpLost, sourceSmpLost, targetHpLost, targetSmpLost;
                      CString strMessage; int attackCode; };   // attackCode = INFORM_
```

`FIGHT_STRUCT` is the input the engine hands a battle plugin (enemy count 1–4,
the board's skill level, the fight background, whether running is allowed) — this
is the concrete shape behind `docs/engine-features.md` E-70/E-79. `FIGHT_EVENT`
is the event channel: source/target party + fighter, HP/SMP lost, a message
string, and an `INFORM_*` code (`INFORM_REMOVE_HP`, `…_SMP`, `SOURCE_ATTACK`,
`SOURCE_SMP`, `SOURCE_ITEM`, `SOURCE_CHARGED`, `SOURCE_DEAD`, `SOURCE_DEFEATED`).
Fight outcomes are enumerated: `FIGHT_RUN_AUTO/MANUAL`, `FIGHT_WON_AUTO/MANUAL`,
`FIGHT_LOST` — the AUTO forms ask the engine to apply running/rewards, the MANUAL
forms tell it the plugin already did. Menu requests are likewise bit-flagged:
`MNU_MAIN` 1, `MNU_INVENTORY` 2, `MNU_EQUIP` 4, `MNU_ABILITIES` 8.

### Adding RPGCode commands (`rpgcode.h`)

This is the mechanism behind E-99's "offered every unknown function call":

* `RPGCODE_COMMAND_FUNCTION` = `CReturnValue (*)(const CString)` — a command is a
  plain function taking the raw command line.
* `COMMAND_MAP_ENTRY { ASCII_STRING cmd; RPGCODE_COMMAND_FUNCTION func; }` and the
  macros `BEGIN_COMMAND_MAP()` / `COMMAND_MAP_ENTRY(x, y)` / `END_COMMAND_MAP()`
  build the `commandMap[]` a plugin registers.
* `CReturnValue` carries a `dataType` (`DT_VOID` −1, `DT_NUM` 0, `DT_LIT` 1) plus
  its numeric or literal payload.
* `CParameters` parses a command line into `PARAM_DETAIL { dataType, lit, num, dat }`
  entries — the same numeric/literal/unaltered triple the engine's own command
  parser uses — so a plugin sees parameters exactly as the interpreter does.

### What a plugin can call back into — 98 `CB*` services (`Callbacks.h`, SDK 2.0)

The engine passes the plugin a callback object. The 98 declared services, by
group:

| Group | Count | Examples |
| --- | --- | --- |
| RPGCode from the plugin | 1 | `CBRpgCode(line)` — run a line of RPGCode |
| Global variables | 4 | `CBGetString`, `CBGetNumerical`, `CBSetString`, `CBSetNumerical` |
| Command-line parsing | 7 | `CBGetCommandName`, `CBGetBrackets`, `CBCountBracketElements`, `CBGetBracketElement`, `CBGetStringElementValue`, `CBGetNumElementValue`, `CBGetElementType` |
| Game data access | 24 | `CBLoadEnemy`, `CBGetEnemyNum/String`, `CBGetPlayerNum/String`, `CBGetGeneralNum/String`, `CBLoadItem`, `CBGetItemNum/String`, `CBGetBoardNum/String`, `CBLoadSpecialMove`, `CBGetSpecialMoveNum/String` (+ the `Set` counterparts) |
| Paths / program control | 5 | `CBGetPathString`, `CBRunProgram`, `CBDetermineSpecialMoves`, `CBGetSpecialMoveListEntry`, `CBLoadString` |
| Fighting | 12 | `CBSetTarget`, `CBSetSource`, `CBFightTick`, `CBReleaseFighterCharge`, `CBFightDoAttack`, `CBFightUseItem`, `CBFightUseSpecialMove`, `CBFighterAddStatusEffect`, `CBFighterRemoveStatusEffect` |
| Fighter/party queries | 20 | `CBGetPartySize`, `CBGetFighterHP/MaxHP/SMP/MaxSMP/FP/DP/Name/Animation`, `CBGetFighterChargePercent`, `CBGetPlayerHP…`, `CBGetEnemyHP…` |
| Screen / message window | 6 | `CBGetScreenDC`, `CBGetMwinDC`, `CBPopupMwin`, `CBHideMwin`, `CBRefreshScreen`, `CBGetHwnd` |
| Input / sound / dialog | 4 | `CBCheckKey`, `CBPlaySound`, `CBMessageWindow`, `CBFileDialog` |
| Drawing | 2 | `CBDrawHand`, `CBDrawTextAbsolute` |
| Diagnostics | 1 | `CBDebugMessage` |
| DirectX legacy | 3 | `CBGetScratch1DC`, `CBGetScratch2DC` (both `OBSOLETE`) |

The whole list, with each function's declared parameters and the SDK's own
one-line description, is transcribed locally in
`fixtures/archaeology/toolkitzone/sdk-interface.md` (98 rows).

### Drawing and animation helpers

`CCanvas` (26 declared members) wraps a DirectX surface for plugin-drawn UI:
`blt`, `bltTransparent`, `bltTranslucent(intensity)`, `fill`, `resize`,
`getScreen`, `drawText`, `popup(x, y, stepSize, popupType)`, `drawLine`,
`drawRect`, `fillRect`, `drawHand`, `drawBackground`, `loadImage`,
`loadSizedImage`, plus `getWidth`/`getHeight` and an `HCANVAS` conversion.
Popups are enumerated `POPUP_NOFX` 0, `POPUP_VERTICAL` 1, `POPUP_HORIZONTAL` 2.
`CAnimation` (7 members) handles animation files: `draw`, `drawFrame`,
`currentFrame`, `frameCount`, `getWidth`, `getHeight`, `getImage(frame)`.
`CString` (38 members) is a plugin-side string class.

`CCanvas::popup` and the message-window constants are the plugin-visible half of
the message-window contract (`MW_OK` 0, `MW_YESNO` 1; returns `MWR_OK` 1,
`MWR_YES` 6, `MWR_NO` 7) that `docs/engine-features.md` and the RPGCode
`mwin`/`mwincls` functions imply but do not state.

### The engine data model — 251 information codes (`sdkBase.h`, SDK 2.0)

The `CBGet*Num`/`CBGet*String` families take an integer *info code*. The header
defines the whole vocabulary — the engine's field selectors as the plugin sees
them — in 22 groups:

| Group | Codes | Group | Codes |
| --- | --- | --- | --- |
| Numerical enemy info | 14 | Numerical board info | 25 |
| Literal enemy info | 9 | Literal board info | 20 |
| Numerical player info | 22 | Numerical item info | 17 |
| Literal player info | 21 | Literal item info | 11 |
| Numerical general info | 29 | Numerical special-move info | 5 |
| Literal general info | 21 | Literal special-move info | 5 |
| Paths | 16 | Message window definitions | 5 |
| Canvas popup definitions | 3 | Fight outcomes | 5 |
| Target and source entities | 3 | `fightInform` codes | 8 |
| Party definitions | 2 | Menu types | 4 |
| Data types | 3 | Public (plugin) types | 3 |

Examples of what this pins down (all transcribed locally in
`fixtures/archaeology/toolkitzone/sdk-constants.md`):

* **Board** — `BRD_TILETYPE` values: 0 normal, 1 solid, 2 under, 3 NS normal,
  4 EW normal, 11–18 "elevate to level 1…8"; `BRD_SAVING_DISABLED`; the program
  and item activation model (`BRD_PRG_ACTIVATION`/`_ACTIV_TYPE`,
  `_ACTIVE_VAR`/`_DONE_VAR`); layer arrays sized 50×50×8.
* **Player** — `PLAYER_DIR_FACING` (1 south, 2 west, 3 north, 4 east),
  `PLAYER_LEVELUP_TYPE` (0 exponential, 1 linear), `PLAYER_SM_MIN_EXPS` /
  `_MIN_LEVELS` arrays of 200 special moves.
* **Enemy** — `ENE_AI` level 0–4, `ENE_RUNYN`, `ENE_SNEAKCHANCES`,
  `ENE_RPGCODEPROGRAM` (RPGCode program used as enemy AI).
* **Item** — the four use contexts (`ITM_MENU_YN`, `ITM_BOARD_YN`,
  `ITM_FIGHT_YN`, `ITM_EQUIP_YN`) and one program per context
  (`ITM_MENU_PRG`, `ITM_FIGHT_PRG`, `ITM_ONBOARD_PRG`, `ITM_PICKEDUP_PRG`,
  `ITM_EQUIP_PRG`, `ITM_REMOVE_PRG`).
* **Paths** — 16 path codes (tile, board, char, special move, background, media,
  prg, font, item, enemy, main, bitmap, status effect, misc, save, project),
  which corroborate `docs/format-spec.md` §1.5's folder tree.
* **General** — `GEN_TILESX/Y`, `GEN_RESX/Y`, `GEN_TRANSPARENTCOLOR`,
  `GEN_INVENTORY_*` arrays of 500, `GEN_EQUIP_*` arrays of 16 slots × 5 players.

This is the single richest source recovered for the rebuild's data contract:
`docs/format-spec.md` and `docs/engine-features.md` describe the same surfaces
from the file formats and the manual, and this gives them exact field semantics.

## The other SDK — TK310 (RPG Toolkit 3.1.0), 2011

The **TK310 C++ SDK** is a different, later kit: a Visual Studio project
("preconfigured to build a simple Toolkit 3.1.0 plugin"), assembled 2011-05-27,
shipped inside the RPG Toolkits' own plugin libraries. It is the version-matched
partner of the recovered 3.1.0 manual.

### Entry points — a native export model, not COM

`Tkplugin.def` declares thirteen required exports, in this order (`@n`):

```
TKPlugInit @1        TKPlugVersion @2      TKPlugDescription @3   TKPlugBegin @4
TKPlugQuery @5       TKPlugExecute @6      TKPlugEnd @7           TKPlugMenu @8
TKPlugFight @9       TKPlugFightInform @10 TKPlugEventInform @11  TKPlugInputRequested @12
TKPlugType @13
```

Compare SDK 2.0's single COM `IMain` with `Plugin_Initialize` / `RPGCode_Execute`
/ `Menu` / `Fight` / `fightInform`: same capability set, two different ABIs five
years apart. `Tkplugin.h` sets `PLUGVERSION 30` (SDK version constant), and
re-declares the same flag constants the 2004 kit used — `PT_RPGCODE` 1,
`PT_MENU` 2, `PT_FIGHT` 4, `MNU_MAIN` 1, `MNU_INVENTORY` 2, `MNU_EQUIP` 4,
`MNU_ABILITIES` 8, `INFORM_*` 0–7 — and its copyright header reads *"The RPG
Toolkit Version 3 Plugin Libraries … copyright (C) 2003-2007 Christopher B.
Matthews … released under the AC Open License v 1.0"*.

### Callback surface — 131 services

`sdk/tkplugcallbacks.h` (2 549 lines, 88 312 B) declares **131** `CB*` services —
35 more than SDK 2.0 — each with a structured comment block
(`Function` / `Callback no` / `Parameters` / `Action` / `Returns`). Transcribed
locally to `fixtures/archaeology/rpgtoolkit-net/sdk310-interface.md`, e.g.

> `void CBFightDoAttack(…)` — "Cause one fighter to attack another. bSMP - is this an attack on SMP? (if false, it's an attack on HP) nAmount - FP of attack …"

The 35 additions are almost entirely the drawing/animation surface: SDK 2.0's
`CCanvas`/`CAnimation` **classes** became flat `CBCanvas*`/`CBAnimation*`
callbacks — `CBCanvasLoadImage`, `CBCanvasBlt*`, `CBCanvasDrawText`,
`CBCanvasPopup`, `CBCanvasFillRect`, `CBCanvasDrawLine`, `CBCanvasDrawHand`,
`CBCanvasDrawBackground`, `CBCanvasGetScreen`, `CBCanvasWidth/Height`,
`CBCanvasResize`, `CBCreateAnimation`, `CBAnimationMaxFrames`,
`CBAnimationCurrentFrame`, `CBAnimationSizeX/Y`, `CBAnimationFrameImage`,
`CBDrawCanvas*`, `CBDestroyAnimation`, plus `CBDoEvents`. The callback set is
otherwise the same family modernised: `std::string` instead of `CString`, `long`
instead of `HDC`.

### What else is in it

| Member | What it is |
| --- | --- |
| `Plugin.cpp`, `MenuPlugin.cpp`, `FightPlugin.cpp`, `RPGCodePlugin.cpp` | **one worked skeleton per plugin kind** — the readme says which file to edit for which role ("Inside of FightPlugin.cpp you can code handlers for a built-in battle system (like tk3fight.dll)") |
| `sdk/tkplugdefines.h` (17 013 B), `sdk/Tkplugin.h` (8 237 B) | constants and the plugin-facing defines (same families as SDK 2.0's `sdkBase.h`) |
| `sdk/tkpluginbase.cpp`, `tkpluglocalfns.*`, `tkParameter.*`, `tkXml.cpp` | SDK plumbing; `tkParameter.h` is explicitly **public domain** ("you can do anything with them with no restrictions") and replaces the SDK's own parameter extraction, which the readme says "don't work" |
| `Readme.h` | the SDK's own how-to: which file to edit per role, how to feed the command string to `TK::extractParameterInfo`, that parameter offsets are 1-based, and that out-of-range access throws `int` |
| `AC Open License.txt`, `AC Open License Derivative.txt`, `LICENSE.txt` | licences — ACOL / ACOL Derivative, © 2003 Christopher Matthews |

The readme also fixes a detail our docs get wrong in `docs/format-spec.md` §12:
the plugin ABI this SDK builds is **not** a plain "Windows DLL" interface of the
2004 COM kind — it is an export table plus a C++ class library, and the shipped
example is what the engine's own `tk3fight.dll` / `tk3menu.dll` were.

## Reading boundary (a deliberate call, reversible)

The recovery brief told the workstreams to read "documentation, manual, readme,
changelog, help" files and not source files (`*.h` included). Workstream A, which
recovered the TK310 zip, kept to that literally: it read only the three licence
files and treated the rest as inventory (`findings/01-rpgtoolkit-net.md` §5.1).

This report goes one step further **for interface declarations only**, and that is
a deliberate judgement call, not an oversight:

* Read: `pluginSDK.idl`, the header **declarations and constants**
  (`pluginSDK.h`, `sdkBase.h`, `misc.h`, `rpgcode.h`, `CCanvas.h`, `CAnimation.h`,
  `menuSystem.h`, `battleSystem.h`, `GUIDs.h`), the TK310 `.def` export list and
  `Tkplugin.h` constants, and both kits' readmes and licences.
* Not read: every `*.cpp` implementation file in either kit, and any inline
  function body in a header.
* Why: an SDK's public header is the *interface* the toolkit published to third
  parties — the thing a plugin author was told to code against — and it is
  written as a reference (structured `Function` / `Parameters` / `Action` /
  `Returns` comment blocks). Interfaces and specs are the legitimate clean-room
  input; implementations are not. Nothing here is implemented from, and under G7
  nothing may be implemented from these headers until the contract we want is
  written into `docs/` first.
* **Reversal is cheap.** If the team prefers workstream A's stricter line, delete
  `toolkitzone/sdk-interface.md`, `sdk-constants.md`, `rpgtoolkit-net/sdk310-interface.md`
  and the two extracted SDK trees, and treat both kits as inventories plus
  licences only — the rest of this report stands without them (the plugin kinds,
  capability flags and the readme facts come from readmes, the IDL signature
  list and the `.def`, which are interface artefacts in the same sense).

## Coverage and limits

* **SDK 2.0 (2004)** targets "TK 3.04+", predating 3.05/3.06; its `Callbacks.h`
  marks 3.04-era DirectX accessors obsolete for 3.05.
* **TK310 SDK (2011)** targets 3.1.0 and is the later of the two. Its callback
  header is dated 2007-04-10 with the project files 2011-05-27; nothing implies a
  further revision for 3.2.x, and no 3.2-era SDK is archived.
* Both contain worked examples (SDK 2.0: menu, battle and RPGCode
  implementations; TK310: one source file per kind). **Their implementation files
  are not read or transcribed here** (see below); only declarations, constants,
  the `.def`, the readmes and the licences were.
* The engine side of the contract (`trans3.exe`) is not recovered; only the
  plugin-facing half.
* Which ABI the engine actually loaded for a given plugin is not recoverable from
  these kits alone — the `.gam` only names the file. `[INFERENCE]` the 3.1.0
  engine supported the export model (its own shipped plugins and the TK310 SDK
  both use it), with COM as the 3.04–3.0x route.

## Decision required (G7 / G6)

Read this before anyone builds on the above:

* **G7** — this repository implements only from `docs/`. Everything in this
  report is *recovered source material*, not a spec: it lives in a findings file
  and a git-ignored local cache. Using it means first writing the interface we
  want into `docs/` (its own commit, per `CLAUDE.md`), in our own words, for our
  own sandboxed extension point (E-99) — then implementing from that. The same
  applies to the constants: they describe TK3's data model, which the rebuild
  deliberately redesigns (G1/G2/G3), so they are evidence, not a contract.
* **G6** — the TK3 engine, editor and stock `tk3menu.dll`/`tk3fight.dll` are GPL
  from 3.1.0 (see `findings/05-toolkitzone-library.md`); the plugin libraries and
  both SDKs carry their own licences (SDK 2.0: © 2004 Colin James Fitzpatrick;
  TK310: "The RPG Toolkit Version 3 Plugin Libraries", © 2003-2007 Christopher B.
  Matthews, **AC Open License / AC Open License Derivative** — a bespoke licence
  that is not on the Blue Oak Council list, so it does not meet G6's Bronze bar
  for dependencies). Nothing from any of them may be copied into, or depended on
  by, this MIT/Apache codebase. Both zips are kept out of git for that reason as
  well as for their own copyright notices.
* **Not read, deliberately:** the `*.cpp` implementation files of either kit
  (SDK 2.0: `CMain.cpp`, `Callbacks.cpp`, `rpgcode.cpp`, `battleSystem.cpp`,
  `menuSystem.cpp`, `misc.cpp`, `pluginSDK.cpp`; TK310: `sdk/tkplugcallbacks.cpp`,
  `sdk/tkpluginbase.cpp`, `tkParameter.cpp`, and the four example `*Plugin.cpp`
  files) and any inline function bodies in the headers. Only declarations,
  constants, exports, readmes and licence texts were transcribed. If the team
  wants the worked examples documented too, that is a separate decision for the
  user, not a research step.
