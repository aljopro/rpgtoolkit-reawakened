# What legacy plugins actually did — sizing the E-99 rebuild surface

Spike entry 23 (epic rpgcode-vm). Written from repo docs + allowed archive artifacts only; no legacy source opened (G7).
Evidence root: `/Users/jensen/projects/rpgtoolkit-archive` (`data/zip-texts`, `wayback`, `archive-org`; DLLs inspected with
`strings`/`objdump -p` only, never loaded). Mystic Software catalogue pages are Wayback captures dated **2005-01-24**
(`wayback/mysticsoftware.net/code.php__*`; site footer © 2004).

---

## 1. The plugin KINDS

The TK3 SDK is the authority on kinds: `4305.zip/TK310_C++_SDK_sdk_Tkplugin.h:24-26` —
`PT_RPGCODE 1`, `PT_MENU 2`, `PT_FIGHT 4`; `TKPlugType(nRequestedFeature)` answers which of those a DLL supports
(`…sdk_tkpluginbase.cpp:91-131`). `…sdk_Tkplugin.h:28-31` gives the menu sub-requests `MNU_MAIN 1, MNU_INVENTORY 2,
MNU_EQUIP 4, MNU_ABILITIES 8`. TK2's export set has no `TKPlugType`, so TK2 plugins are RPGCode extensions by
construction (`zip-survey.md` Q2; every TK2 `.def` lists only the six mandatory exports).

| # | Kind | SDK identity | What the plugin supplied | First consumer in the rebuild |
|---|---|---|---|---|
| K1 | **RPGCode extension** | `PT_RPGCODE`, `TKPlugQuery`/`TKPlugExecute` | New RPGCode commands; dispatch was "any unknown function call → offered to each loaded plugin in order" (format-spec §9.11 closing line; `TK310_C++_SDK_RPGCodePlugin.cpp:31-63`) | `PluginDefinition.commands` + the extension tier of the 4-tier lookup (story 3) |
| K2 | **Menu subsystem** | `PT_MENU`, `TKPlugMenu(nRequestedMenu)` (`…MenuPlugin.cpp:29-41`) | The main/inventory/equip/abilities screens (presentation), rules stayed in the engine (E-80) | `PluginDefinition.subsystems.menu`; native E-80 menu + `MenuSubsystem` (epic menu-party-save) |
| K3 | **Battle subsystem** | `PT_FIGHT`, `TKPlugFight(nEnemyCount, nSkillLevel, bkg, nCanRun)` (`…FightPlugin.cpp:26-52`) | The battle UI; the rules/charge/AI lived in the engine (E-70…E-79) | `PluginDefinition.subsystems.battle`; native E-70…E-79 + `BattleSubsystem` (epic battle) |
| K4 | **Event/input plugin** (TK3 addition) | `TKPlugEventInform(nKeyCode,nX,nY,nButton,nShift,key,code)` + `TKPlugInputRequested(nCode)` + `TKPlugFightInform(...)` queue (`…sdk_tkpluginbase.cpp:158-243`; `…sdk_Tkplugin.h:44-95`) | A plugin could subscribe to keyboard/mouse events (`INPUT_KB 0`, `INPUT_MOUSEDOWN 1`) and battle events (`INFORM_REMOVE_HP` … `INFORM_SOURCE_PARTY_DEFEATED`) and drive its own loop | `PluginEventHook` on the deterministic event bus (ADR 0004 dec. 4; AD-32 event bus) — **no legacy game in the corpus uses it** |
| K5 | **Plugin loader/manager** | not a TK export set — replaced `tkplugX.dll` | Multi-Plug read a `plugins.ini` and loaded arbitrary DLLs; ExtendedPlugin SDK loaded VB ActiveX DLLs | none — the assembly function + `.gam` plugin list replaces the loader (story 3) |
| K6 | **Reflection/introspection** (TK3) | `TKPlugVersion`, `TKPlugDescription` (`…Tkplugin.def:2-3`) | Version/description metadata | `PluginDefinition.id`/`version` |

Mandatory DLL ABI (all SDKs, all real DLLs): `TKPlugInit, FunctionPtr, TKPlugBegin, TKPlugQuery, TKPlugExecute, TKPlugEnd`
(`4305.zip/…Tkplugin.def:8-13`; `wayback/aljo.afraid.org/…/Plugin/FTP.dll` PE exports via `objdump -p`). TK3 adds the
optional `TKPlugVersion/Description/Type/Menu/Fight/FightInform/EventInform/InputRequested` at ordinals 2-13.
The command path passes the **raw command string** to `TKPlugExecute`; the plugin parses it with the public-domain
`TK::extractParameterInfo` helper (`…tkParameter.h`) — so a plugin saw RPGCode text, not marshalled arguments.

### Counts

**Mystic Software catalogue** (`code.php__mode_1_type_plugins`, "Plugins (30)"): **30 entries**.
- **28 RPGCode extensions (K1).**
- **1 loader (K5):** `Multi-Plug` (replaces `tkplugX.dll`).
- **1 menu/battle-capable (K2/K3):** `Flash Plugin` (Triuken, id 116) — "you can also code your own menu systems and
  battle systems in … Flash" (catalogue blurb).
- **0 stock menu/battle plugins in the catalogue** — those shipped with the engine; their source is the SDK's
  `MenuPlugin.cpp` / `FightPlugin.cpp` (E-99: "The two stock plugins (menu, battle) must be re-implemented natively").
  The four SDK/tool pages (`Delphi SDK`, `ExtendedPlugin SDK`, `VC++ SDK`, `MFC Runtimes`, `id 133-136`) exist in the
  same `code.php` namespace but are not among the 30 plugin listings.

**Zips surveyed** (`zip-survey-plugins.csv`, 30 rows): **23 RPGCode-extension DLL entries (K1)**,
**1 loader** (`multiplug`, K5), **5 SDKs** (`vcplussdk`, `delphisdk`, `extendedplugin`, `4305` TK3 C++ SDK, `861` VB6 SDK),
**1 game** (`TransChat2b`, a K1 consumer). K4 event/input appears only as an SDK export, never as a shipped community plugin.

---

## 2. Capability-needs table — what each kind needed vs. what the rebuild already covers

Hooks are the TK3 callback table (`TK310_C++_SDK_sdk_tkplugcallbacks.h`, 131 callbacks, nos. 0-130) unless noted.

| Kind | Commands / hooks it needed | Covered natively by the rebuild? |
|---|---|---|
| K1 RPGCode ext. | Dispatch: unknown-call → `TKPlugQuery(name)` → `TKPlugExecute(fullString)`. Callbacks: `CBRpgCode(0)`, `CBGetString(1)/CBGetNumerical(2)`, `CBSetString(3)/CBSetNumerical(4)`, screen DCs (5-8), mwin popup/hide (9-10), `CBLoadEnemy(11)` + enemy get/set num/string (12-15), player (16-19), general (20-23), command/param parsing (24-30), `CBDebugMessage(31)`, `CBGetPathString(32)`, special move (33-35), item (36-38), board (39-42), `CBGetHwnd(43)`/`CBRefreshScreen(44)`/`CBCreateCanvas(45)`. | Yes, structurally: `PluginDefinition.commands` + 4-tier lookup (story 3) replace the DLL dispatch; the ~280-name §9.11 catalogue (`/tmp/command-effect-catalogue.md`: 271 names, 170 stub-safe) already owns most of what the callbacks exposed. Plugin-specific names map onto catalogue groups (§3). The DC/HWND callbacks (5-8, 43-45) are Win32-only and **drop** (AD-17). |
| K2 Menu | `TKPlugMenu(MNU_MAIN/INVENTORY/EQUIP/ABILITIES)`; needed party/inventory/stat reads and a draw/input loop. | Yes: E-80 default menu + `internalMenu(n)`, `menuGraphic`, `callShop` (catalogue: Ask epics 8). `MenuSubsystem` = `subsystems.menu`. |
| K3 Battle | `TKPlugFight(enemyCount,skill,bkg,canRun)` + `TKPlugFightInform` battle events; fighter queries (HP/SMP/FP/DP/charge %) and actions (attack/item/special/status). | Yes: E-70…E-79 native core; `fight`/`fightEnemy`/`attackAll`/`drainAll`/`ai`/`applyStatus`/`fightStyle` are catalogue rows (epic battle); `BattleSubsystem` = `subsystems.battle`; `customFightPrg` rides the script-driven UI loop (E-96). |
| K4 Events/input | `TKPlugEventInform`/`TKPlugInputRequested` with a keyboard/mouse event queue; `TKPlugFightInform` fight-event queue. | Yes via `PluginEventHook` on the deterministic event bus (ADR 0004 dec. 4; `world.eventQueue`, AD-32). No legacy content exercises it, so it is **defer-until-needed**. |
| K5 Loader | Replace `tkplugX.dll`; parse `plugins.ini`; ActiveX `CLSID=` entries. | Not rebuilt, not needed: plugins become in-process `PluginDefinition`s registered by the assembly function; the `.gam` plugin list + `menuPlugin`/`fightPlugin` names are the activation/ordering input (format-spec §2 row 29; story 3). |

---

## 3. Which community features a rebuild CANNOT support, and which replace a built-in

### 3a. Cannot be supported under G2/AD-17 (sandbox) — decline with a located diagnostic

| Capability | Legacy plugins | Why |
|---|---|---|
| **Raw network** (sockets, FTP, HTTP download) | FaeroSock (WinSock, id 115), Multiplayer Plugin `multip.dll` (WinSock, active-time CLSID `multiplayer_cy.ws_con`, id 122), FTP Plugin `FTP.dll` (WININET imports: `InternetOpenUrlA/FtpOpenFileA/…`, id 117) | Core reaches the host only through AD-17 requests; `openUrl` is `https:`-only and user-consented. Multiplayer/FTP cannot work. `httpread` → at best a user-consented `openUrl`/`asset` stub + diagnostic. |
| **DirectX / Windows media pipeline** | DragSound (`ds_*`, DirectX audio, id 175); `playAvi`/`playAviSmall` | Not portable; core has no DirectX. MIDI/WAV/OGG/MP3 are covered natively (epic audio-synth); AVI remains the open E-104 decision. |
| **Win32 UI / window handle access** | Erssy's Misc (resolution, msgbox, id 114), Edit Box Plugin (Aljo, id 171), bps_adv (`GetHwnd`, `GetScreenDC`, `GetMwinDC`, `GetScratch1/2DC`, `RefreshScreen`, id 110), Launch Any File (shell-exec, id 147), Resolution Changer (id 211) | No HWND/DC exists in the core; AD-17 forbids it. Replaceable in spirit by `prompt`/`msgBox`/window chrome. |
| **File system outside the save area** | filereadwrite (`filereadwrite.dll`, id 127), Never Fail R/W (`NeverFailRW.dll`, id 170, incl. `ShellPrint`/`ShellOpen`), Dan's Misc (`danplugpack.dll`, ActiveX, absolute `apppath`, id 111), VIP Plugin Pak 2 | AD-17: writes only to `saves`/`files`; reads try `saves` then read-only shipped folders. The **commands** are supported; arbitrary paths and shell/print are not. |
| **Flash/SWF embedding** | Flash Plugin (Triuken, id 116) | No Flash host exists in a cross-platform ES2022 core; menus/battles it hosted are re-done natively (K2/K3). |
| **ActiveX / VB6 DLL hosting** | E-Mail (`EMail.Class`), Dan's Misc (`DanPlugPack.main`), VB Mini-Game (`Project1.MainMod`), Sendback (`DarkAge.Revamped`) | No COM; an RPCode-only subset is emulated where useful. |
| **Printer output** | Never Fail R/W (`ShellPrint`) | No host printer request in AD-17. |

### 3b. Replaceable by built-in features (absorb into the first-party catalogue)

| Legacy plugin feature | Native replacement |
|---|---|
| **Menus** (advancemenu, chrizmenu, doddymenu, cursormenu, scrollbar_menu, easymenu, bradseguin custom menu, MenuMK2) | E-80 default menu + `MenuSubsystem`; script-driven custom screens via canvases/cursor maps (E-96). |
| **Battle systems** (mazzabattlesystem, MenuMK2 fight UI) | E-70…E-79 + `BattleSubsystem`; `customFightPrg`. |
| **String/math helpers** | proplug (`And`, `Or`, `Lprintf`, `lit*`), Dan's Misc (`split`, `left`, `right`, `mid`) → §9.11 *Strings & math* group (catalogue: `len/left/right/mid/inStr/replace/lcase/ucase/…`). |
| **MIDI / audio control** | Kaimu MidiTools (`FadeMidiIn/Out`, `SetMidiVolume`), TransTools (`FadeToBlack/White`), DragSound mixer → epic audio-synth (`mediaPlay/setVolume/wav…`). |
| **Fonts & text drawing** | Triuken `fontProperties/fontPropertiesExtended/drawText` → §9.11 *Dialogue & text* (`font/fontSize/getTextWidth/getTextHeight/text/pixelText`). |
| **Item/enemy/party stats** | GsMisc (`getEnemyStats`, `useItem`, `getEquip`, `getItems`, `getSpecialMoves`, `giveDp/giveFp`), Triuken `getItemStats` → *Stats & progression* / *Inventory & equipment* / *Battle* groups (epic battle + epic menu-party-save). |
| **Sandboxed file R/W** | filereadwrite, Never Fail R/W, VIPPluginPak2, BinaryReadWrite → E-97 sandboxed file I/O (`openFileInput/Output/Append/Binary`, `fileGet/Put`) via AD-17 requests. |
| **Multi-dimensional arrays** | Multi-D Arrays plugin → RPGCode arrays/maps (§9.3). |
| **Dialogue windows** | XFMWin (`xfmWin/xfmWinPrompt/xfmWinPromptNum`) → native `mwin/prompt/msgBox`. |
| **On-screen buttons / edit boxes** | TWButton (id 130), Edit Box (id 171) → `setButton/checkButton/clearButtons` (catalogue: input group) + `prompt`. |
| **Player coords/time/steps** | GsMisc `getDirection/getPlayerCoords/getTime`, Triuken `getSteps` → `playerLocation/playerDirection`, E-87 time & steps. |

---

## 4. Ranked: how many archived games use each plugin

Method: grep `#<command>\b` (case-insensitive) for the command sets in `zip-survey-plugins.csv` across **2 783**
`.prg`/`.gam` units — the 100 extracted `data/zip-texts` entries, the 83 loose `wayback` `.prg`, and the `.prg`/`.gam`
members of the 73 non-engine archive zips that contain any (engine distributions `rpg-toolkit*`/`toolkit2*` excluded).
"src files" = distinct `.prg` files containing a command; "packages" = distinct zip/dir roots. Corpus is skewed to
*libraries* (wintermoonmethods, Mazza201Methods) that then ship inside many games, so occurrence counts and package
counts rank slightly differently.

| Rank | Plugin (catalogue id) | Kind | Occurrences | Source files | Packages/games |
|---|---|---|---|---|---|
| 1 | Triuken's Plugin Pack (129) — font/getSteps/getItemStats | K1 | 71 | 10 | 6 |
| 2 | Misc Plugin Pack / GsMiscPlugins (120, MrG) | K1 | 57 | 14 | **7** |
| 3 | Read/Write Plugin — filereadwrite (127, Leuf) | K1 | 47 | 7 | 5 |
| 4 | FTP Plugin — FTP.dll (117, kaptan) | K1 | 41 | 15 | 5 |
| 5 | XFMWin Plugin (132, Leuf) | K1 | 16 | 4 | 2 |
| 6 | Programmer's Plugin — proplug (126, Leuf) | K1 | 13 | 6 | 4 |
| 7 | E-Mail Plugin (215, KSNiloc) | K1 | 10 | 2 | 2 |
| 8 | TWButton (130, Wintermoon) | K1 | 6 | 2 | 2 |
| 9 | Multiplayer Plugin — multip.dll (122, Cyranoid) | K1 | 4 | 4 | 2 |
| 10 | Kaimu's Plugins (119) — MIDI fade/transitions | K1 | 3 | 1 | 1 |
| 11 | Adv RPGCode Plugin (110, BP) | K1 | 2 | 2 | 1 |
| 12 | Vip Plugin Pak (20) | K1 | 2 | 2 | 1 |

Reproduce: the extractor maps each plugin to its command list from `zip-survey-plugins.csv` and counts
`#command` hits over the extracted `data/zip-texts`, loose `wayback` `.prg`, and the `.prg` members of every
non-engine archive zip (zip `rpg-toolkit*`/`toolkit2*` skipped as engine sources, G7).

Mention-frequency cross-check on the same units (games whose scripts/readmes name the plugin): GsMisc/MrG **3**,
Misc Plugin **2**, Triuken **2**, FTP Plugin **1**, Read/Write **1**, Multiplayer **2**, Flash **1** — consistent with
the command counts. Catalogue "Highly Recommended" popularity (`code.php … id`): GsMiscPlugins, FTP, Multiplayer,
Flash, Triuken, proplug, Read/Write, XFMWin, Kaimu (9 of the 30).

**TK2 vs TK3.** All top-ranked plugins are invoked by TK2-era games (the corpus is overwhelmingly TK2 / pre-3.x;
`game-versions.tsv` markers `actkrt2.dll+tkzip.dll+trans2.exe`). K2/K3/K4 are TK3-only. TK2 loads plugins under fixed
names `tkplug0.dll…tkplug4.dll` toggled by Main-File checkboxes; TK3 names them in the `.gam` list (row 29) and via
`menuPlugin`/`fightPlugin` (zip-survey.md Q2; format-spec §2).

---

## 5. Recommendation — rebuild-first list for TK2/TK3 compatibility

All the high-use community plugins are **K1 RPGCode extensions whose commands the ~280-name catalogue already
covers**. So the recommendation is not "port DLLs" but "**absorb the top plugin command sets as first-party
built-ins/aliases in the command registry**, in frequency order", because that both restores game compatibility and
reduces the E-99 surface:

1. **GsMiscPlugins (MrG, id 120)** — highest reach (**7 packages**, 57 sites). Absorb as built-ins/aliases:
   `getDp/giveDp/getFp/giveFp`→ catalogue `getDp/getFp`, `getDirection`→`playerDirection`, `getPlayerCoords`→
   `playerLocation`, `getBoardName`→`getBoardName`, `getEnemyStats/useItem/useSpecialMove/getSpecialMoves/
   getItemStats/getEquip/putEnemy/emptyEnemy` as thin thunks over the battle/inventory ports. **First.**
2. **Triuken's Plugin Pack (id 129)** — most occurrences (71, 6 packages). `fontProperties/fontPropertiesExtended/
   drawText`→ text/font group; `getTextWidth/Height`; `getSteps`→ E-87; `getItemStats`→ inventory. **Second.**
3. **filereadwrite (Leuf, id 127)** — 5 packages. Implement under E-97 sandboxed I/O
   (`fileread/filewrite/fileappend/filewriteparse/fileappendparse`), writes to `saves` only. **Third.**
4. **proplug (Leuf, id 126)** — 4 packages. `And/Or/Lprintf/lit*` → *Strings & math* group (algorithmic, no I/O). **Fourth.**
5. **XFMWin (id 132) + Kaimu (id 119)** — 2 and 1 packages. Provide as **aliases** to native `mwin/prompt` and the
   audio-synth MIDI fades; cheap and closes a long tail of dialogue/transition calls.
6. **Decline (diagnostic, not a stub):** FTP (117) and Multiplayer (122) raw sockets, FaeroSock, E-Mail, DragSound
   (DirectX), Flash (SWF), Edit Box / Resolution Changer / Launch Any File (Win32), and the ActiveX hosts — every one
   is outside AD-17/G2 and none has a portable equivalent. Offer `httpread`-style names a recorded
   `request`/`UNSUPPORTED` response so scripts get a located diagnostic instead of a silent hang.

Rejected alternatives (one line each):
- *Port the DLL ABI and run binaries under an emulator* — violates G2/G6 and the cross-platform contract (ADR 0004 context).
- *Rebuild FTP/multip natively with a socket API* — AD-17 forbids direct network; only `openUrl` is allowed, and it is user-consented.
- *Build K4 event hooks now* — no legacy game exercises `TKPlugEventInform`/`TKPlugInputRequested`; defer until a consumer exists.
- *Ship `decoders`/`subsystems` as one big E-99 API now* — entry 14 adds `decoders` when it is wired; `subsystems` arrives with the first menu/battle consumer (epics 7/8); keep each field added by the entry that first needs it (ticket 23 note, Jensen 2026-10-11).

This sizes the rebuild: legacy plugins were overwhelmingly (a) missing stat/string/file helper commands, (b) menu/battle
presentation skins, or (c) OS-specific I/O. (a) is absorbed by the standard library, (b) is the two stock subsystems the
epics already own, and (c) is the part the sandbox deliberately drops.
