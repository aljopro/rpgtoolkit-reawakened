# TK2 / RPGCode community-material survey (Epics 3 & 16, doc-first amendment)

Sources, all read-only:
- `data/zip-texts/` — 100 entries. **These are already-extracted directories named `*.zip`** (no archive to unpack; ~2,433 files, 2064 `*.prg`, 136 `*.txt`, 56 `*.htm`/`.html`, 16 `*.doc`, 7 `*.def`, 34 `*.cpp`, 56 `*.h`, 5 `*.bas`, 3 `*.frm`, 1 `*.pdf`). No `*.dll` or `*.exe` is present in this folder.
- `wayback/mysticsoftware.net/resources/` — `Classes%20In%20RPGCode.txt` (390 lines, the "Classes In RPGCode" tutorial by KSNiloc).
- `wayback/mysticsoftware.net/code.php__*` — the Mystic Software plugin catalogue pages.
- `wayback/aljo.afraid.org/.../LittleMan/zip/Plugin/` — real PE DLLs `FTP.dll` and `tkplug1.dll` (only `strings` + `objdump -p` export/import tables used; no decompile).
- `_bmad-output/.../epic-rpgcode-vm/discovery/tk2-rpgcode-commands.csv` (302 rows), `language-readiness.md`, and `docs/format-spec.md` §9.

Scratch: a copy of `zip-texts` was made at `/tmp/zipsurvey-scratch` for analysis and deleted at the end. Nothing was written under the repo.

Counts used below were taken with a script over all 2064 `.prg` files:
- `#Method` definitions: **248 distinct method names across 67 files**.
- Explicit `#Include(...)`: **17 sites / 13 files**; real `#Include("file.prg")` call sites in **9** game/library files.
- `#RPGCode` (case-insensitive, `#rpgcode`): **114 occurrences across 21 files**.
- Implicit `#File.Method` references: **242 sites / 18 files / 16 distinct namespace-prefixes** (excluding engine namespaces `system`, `sound`, `win`, `cursor`).
- Type sigils: `!` 12,234 times, `$` 3,378 times.

---

## Q1 — Include / namespace semantics (MOD-1, MOD-2)

The tutorial states the following rules. "Corroborated" means real `.prg` code in the zips does the same thing (or a plugin's own readme says so); "claimed" means only the tutorial asserts it.

| # | Rule as stated / demonstrated in `Classes%20In%20RPGCode.txt` | Corroboration | Evidence |
|---|---|---|---|
| R1 | `#Include("Program2.prg")` then call `#DoMet` — an explicit include makes the included file's methods callable. | **Corroborated** | `Sendback_system_v4.zip/ksniloc_sendback.prg:1` `#include("system.prg")` then calls `#ForceRedraw` etc.; `2DARRAY.zip/example_-_maze.prg:1` `#include("2DARRAY.prg")` then `#createnumarray(...)`, `#numarrayout(...)`; `chrizmenu.zip/CGMenu.prg:6` `#Include("Runtimes.prg")`. |
| R2 | `#Program2.DoMet` — an implicit *file.method* call: includes `Program2.prg` on first use and calls `DoMet`. | **Corroborated** | `contest2.zip/Asimircanteencatastrophe.zip_inner/…game_programs.prg` helpers called as `#game_programs.new_guy(3,4)` / `#game_programs.add_puzzle_queue(...)` (90+ sites); `contest2.zip/KSNilocLunchroomTroubleUnregistered…/Prg_FinishLevel.prg:7` `#Stacks.HasInNum(Ammo)`; `wintermoonmethods.zip/time.prg:34` `#Mlib.MWinTime("…")`; `wintermoonmethods.zip/npc_talk.prg:5` `#Mlib.MWinClr()`. |
| R3 | Implicit call works **with arguments**: `#BattleSystem.Enemy(1,"Blob")`. | **Corroborated** | `#game_programs.add_puzzle_queue(...)` (38), `#queue.queue_destroy(...)` (16), `#mycommands.pixeltext(330,itemplace!,itemhandle$)` (5), `#Mlib.MWinTime("…")` (14). The `.`-form with a bare no-arg method is also present (`#Mlib.MWinClr()`, `#Queues.PopNum(TotalAmmo)`). |
| R4 | After an implicit call, the `Program2.` prefix may be dropped; `#DoMet` alone works. | **Partly corroborated** | Intra-file unqualified calls to methods defined in that same file are common and prove callable-without-prefix: `…game_programs.prg:229` defines `#Method new_guy` and later calls `#new_guy(3,1)`; `Prg_Engine.prg:69` defines `#Method GameOver()` and calls `#GameOver()`. The *cross-file* "first use then unqualified" case was **not** directly observed. |
| R5 | "once *anything* from a program has been run, all its methods are available for calling without includes or implicit calling" (tutorial's Program1/Program2.Test / Test2 example). | **Claimed** (weakly corroborated) | The global-method-after-run behaviour is used by the tutorial's event pattern; real code only shows the intra-file instance. `gcnmethods.zip/README_FIST.txt` (`#WSRec("filename.method")`) independently confirms the file-qualified form is required by a plugin that runs a method "out of thin air … no place to put an #include", i.e. the engine resolves `file.method` at call time. |
| R6 | Properties are emulated by a **name convention**: a global whose name is `<class>_<member>` (e.g. `#battlesystem_enemy[num!]$=text$`). | **Corroborated** | Pervasive prefix-namespacing of globals: `ksniloc_temp$`, `ksniloc_point` (Sendback), `mazzabattlesystem_*`, `savescreen!`/`SetMwin!` (Mazza201Methods), `XMwinColorR!` (xfmwinplugin docs). |
| R7 | **Instances** are emulated by concatenating a variable name at runtime and evaluating it with `#RPGCode(string)`: e.g. build `"#battlesystem_"+inst2$+"_enemy["+num2$+"]$="+text$` then `#RPGCode(temp$)`. | **Corroborated** | `2DARRAY.zip/2DARRAY.PRG` builds `#command$ = "#" + arrayname$ + "." + arrayx$ + "." + arrayy$ + "$ = arrayvalue$"` then `#rpgcode(command$)` (all four helpers); `CustomShop.zip/myshop.prg:449,467` builds `#comm$="#stack"+item$+"!=stack"+item$+"!+1"` then `#rpgcode(comm$)`; `myshop.prg:145-150` builds `#itemhandle$=…`. |
| R8 | `#CastLit(num!, num2$)` converts a number to a string variable so it can be concatenated into a name; `#Kill(var)` unsets. | **Corroborated** | Tutorial + `2DARRAY.zip/2DARRAY.PRG` (`#castlit(arrayx!,arrayx$)` then `#kill(arrayname$)` …); `#kill` appears 448× / 27 files, `#castlit` 86× / 20 files. |
| R9 | A program's loose top-level code is what runs when the file is executed (`#Run("BeatHardBoss.prg")` runs it). | **Corroborated** | `#Run("…")` used mid-file (tutorial); `#Start(othercharwalk.prg)` in `multip.zip/mplayersupport2.prg`; `#Include` in zips is always paired with top-level statements in the includer. |
| R10 | Name clashes: two files may define the same method name; the `.`-qualifier disambiguates. | **Corroborated (implicitly)** | `contest2.zip/KSNiloc…/Prg_Queues.prg` and `…/Prg_Stacks.prg` both define `AddLit, AddNum, PopLit, PopNum, HasInLit`; the callers disambiguate with `#Queues.PopNum` vs `#Stacks.PopNum`. The tutorial never discusses clashes. |

**Notes for the amendment.** The docs distinguish explicit `#include` from implicit `File.Method` only as "two include forms" (§9.6). The tutorial's extra piece is that these plus "any method of a file that has been run" all share one flat method namespace resolved at call time.

---

## Q2 — Plugins

### How the engine dispatched to a plugin (from the SDKs and PE export tables only)

The mandatory export set for a TK plugin DLL is the same in every SDK `.def` and in the real DLLs:

```
TKPlugInit  @1     FunctionPtr @2     TKPlugBegin @3
TKPlugQuery @4     TKPlugExecute @5   TKPlugEnd   @6
```

- `4305.zip/TK310_C++_SDK_Tkplugin.def`, `vcplussdk.zip/pluginman_Libraries_Tkplugin.def` (and `…Example…`), `KaimuPlugs.zip/{TransTools,MIDITools}_Tkplugin.def`, `multiplug.zip/source.zip_inner/multiplug_Tkplugin.def`, `861.zip/SDK_pluginSDK.def` all list exactly this set.
- Real PE exports (`objdump -p`, no decompile):
  - `wayback/aljo.afraid.org/.../Plugin/FTP.dll` → `TKPlugInit, FunctionPtr, TKPlugBegin, TKPlugQuery, TKPlugExecute, TKPlugEnd` (DLL name in PE = `tkplugin.dll`).
  - `wayback/aljo.afraid.org/.../Plugin/tkplug1.dll` → `TKPlugInit, TKPlugBegin, TKPlugQuery, TKPlugExecute, TKPlugEnd` (DLL name in PE = `tkplugX.dll`).
- **Query/Execute protocol** (`4305.zip/TK310_C++_SDK_RPGCodePlugin.cpp`, from the SDK's own comments): the engine passes a **command name string** to `TKPlugQuery` which returns `1` if the plugin handles it, else `0`; the engine then passes the **full command string** (name + parameters) to `TKPlugExecute` which returns `1` (ok) or `0` (error). `TKPlugInit(callbackArray, nCallbacks)` hands the plugin the engine callback table; `TKPlugBegin`/`TKPlugEnd` bracket a call.
- The parameter text passed to `TKPlugExecute` is parsed by the plugin with `TK::extractParameterInfo` / `getStringParam` / `getFloatParam` (`4305.zip/…tkParameter.cpp/.h`, public-domain helper shipped in the SDK). So plugins receive the raw RPGCode-ish string, not a marshalled argument list.
- The TK3 SDK adds optional exports for menu/battle/event plugins: `TKPlugVersion, TKPlugDescription, TKPlugType, TKPlugMenu, TKPlugFight, TKPlugFightInform, TKPlugEventInform, TKPlugInputRequested` (`4305.zip/…Tkplugin.def`, `…sdk_tkpluginbase.cpp`). TK2 plugins (e.g. FTP.dll, 1998) export only the six.
- **Plugin loading**: `multiplug.zip` replaces `tkplugX.dll` and reads a `plugins.ini` listing `[file.dll]` blocks (`…/source.zip_inner/multiplug_Tkplugin.def`: `LIBRARY "tkplugX"`). Without Multi-Plug, TK2 uses fixed names `tkplug0.dll … tkplug4.dll` and the Main File Editor's "Use Plugin N" checkboxes (documented in `GsMiscPlugins.zip/Readme.txt`, `TransChat2b.zip/TransChat2b_readme.txt`). The `.gam` main file only names plugins; kind is `tkplugin` (native) or `ActiveX DLL` (with `CLSID=`), per every `plugins.ini` inspected (`danplugpack.zip/plugins.ini`, `gcnmethods.zip/plugins.ini`, `VB_Minigame_1-4.zip/plugins.ini`, `Sendback_system_v4.zip/Plugin_plugins.ini`).
- There is **no** separate "CanRegister" export in any observed SDK; registration is implicit via `TKPlugQuery`. Dispatch is "unknown command → offer to each loaded plugin in order" — consistent with §9.11's closing line and with the fact that `Mazza201Methods.prg` (a `.prg`) can sit alongside plugin commands.

### Plugin inventory

Full per-plugin data is in `/tmp/zip-survey-plugins.csv`. Highlights, and the answer to the specific question:

- **`httpRead, ftpConnect, ftpOpen, ftpWrite, ftpClose, ftpCloseFile, ftpGetFile, ftpGetBinFile` → `FTP.dll`** (the "FTP Plugin" / "Online plugin", submitted by *kaptan*, catalogue id 117). Proven three ways:
  1. PE ASCII strings in `wayback/aljo.afraid.org/.../Plugin/FTP.dll`: `httpread`, `ftpconnect`, `ftpopen`, `ftpwrite`, `ftpgetfile`, `ftpgetbinfile`, `ftpclose`, `ftpclosefile`, `Online plugin initialized!`, `onlinerror.txt`.
  2. PE import table shows WININET: `InternetOpenUrlA, InternetReadFile, InternetConnectA, FtpOpenFileA, InternetWriteFile, FtpGetFileA, InternetOpenA`.
  3. Call sites: `multip.zip/*.prg` (`*REQUIRES MrG's Misc. Plugin, FTP Plugin`), `TransChat2b.zip/TransChat2b_start.prg`, `LittleMan.zip/…Prg_update.prg` (`#httpread(...)`).
  So: **`fileRead` is NOT this DLL** — `fileRead` is the separate Leuf Read/Write plugin (`filereadwrite.dll`).
- **`fileRead / fileWrite / fileAppend / fileWriteParse / fileAppendParse` → `filereadwrite.dll`** (Leuf's Read/Write Plugin; `fileread.zip/Readme.txt`, catalogue id 127: "Will not work on Windows XP").
- **`giveDp / giveFp / getDirection / getPlayerCoords / getBrightness / getEquip / putEnemy / getItems / useItem / useSpecialMove / getSpecialMoves / getSpecialMoveInfo / getTime / getEnemyStats / emptyEnemy / getBoardName / getBkgSounds / getPlayerNum` → `GsMiscPlugins.dll`** (MrG's Misc. Plugin Pack One; `GsMiscPlugins.zip/Readme.txt`, catalogue id 120). `giveDp`/`giveFp` are documented at lines 343/344 of that readme.
- **`getItemStats / fontProperties / fontPropertiesExtended / drawText / getSteps` → Triuken's plugin pack** (`Triukens_plugin.zip/readme.txt`, catalogue id 129). DLL name not stated in the shipped readme → `[INFERENCE]` the font/item plugins.
- **`and / or / Lprintf / litncpy / litcmp / litncmp / littolower / littoupper / littotitle / litisalpha / litisdigit / litisalphadigit / litlen` → `proplug.dll`** (Leuf's Programmer's Plugin; `proplug.zip/readme.txt`, catalogue id 126). This is why `#And(...)` in `MLib.prg` is a *plugin* call, not a user method.
- **`twSetButton / twCheckButton / twDelButton` → TWButton plugin** (Wintermoon; `twbutton.zip/Readme.doc`, catalogue id 130).
- **`xfmWin / xfmWinPrompt / xfmWinPromptNum` → XFMWin plugin** (Leuf; `xfmwinplugin.zip/Readme.txt`, catalogue id 132; "Requires Triuken's Font plugin").
- **`iWait / wSConnect / wSDC / wSSend / wSStatus / wSRec` → `multip.dll`** (Cyranoid's Multiplayer Plugin, ActiveX `CLSID=multiplayer_cy.ws_con`; `gcnmethods.zip/README_FIST.txt`, catalogue id 122).
- **`ksniloc_email_send` (+ `ksniloc_email_from/to/body/subject`) → `E-Mail.dll`** (KSNiloc E-Mail plugin, ActiveX `CLSID=EMail.Class`; `E-Mail_20Plugin.zip/readme.txt` + `E-Mail.prg`).
- **Kaimu's Plugins** (`KaimuPlugs.zip/readme.txt`): `MidiTools.dll` (`#FadeMidiIn, #FadeMidiOut, #SetMidiVolume`), `TransTools.dll` (`#FadeToBlack, #FadeToWhite`).
- **`VIPPluginPak2.zip`**: `#WriteToFile, #AppendToFile, #ReadFile, #ReadFileArray, #GetPlayerSMName, #GetPlayerPic/#GetProfilePic, #SetSprite, #SetSpritePosition, #SetSpriteImage, #SetPic, #DeleteSprite` (needs MFC runtimes).
- **`FaeroSock.zip`**: WinSock plugin — `#FaeroSock(), #FSockConnect(server$,port!), #FSockClose(), #FSockSend(msg$), #FSockGet(return$)`; vars `FSock_Msg!`, `FSock_Connected!`. DLL name not given → `[INFERENCE]` `FaeroSock.dll`.
- **`danplugpack.zip`** (`danplugpack.dll`, ActiveX `CLSID=DanPlugPack.main`): `#writefile, #appendfile, #readfile, #readbyline, #readIni, #writeIni, #split, #left, #right, #mid, #app, #apppath, #now, #msgbox, #prompt2`.
- **`bps_adv_rpgcode_plugin.zip`**: BP's Adv RPGCode Plugin — exposes the SDK callbacks as RPGCode: a large `GetXxxNum/String/Numerical`, `SetXxx…`, `LoadEnemy/Item/SpecialMove`, `GetHwnd/GetScreenDC/GetMwinDC/GetScratch1DC/GetScratch2DC`, `GetBoardNum/String`, `RefreshScreen`, `DebugMessage` family.
- **`flashplug.zip`**: Triuken's Flash plugin — `#SetFlashMovie` and a large `SWF_*` family (`SWF_Play/Stop/Rewind/Change/Hide/Show/Enable/Disable/Remove/…`).
- **`NeverFailRW.zip`** (Aljo, `NeverFailRW.dll`): `#ReadOpen, #Read, #ReadLine, #GetLine, #WriteOpen, #AppOpen, #Write, #ReadClose, #WriteClose, #ShellOpen, #ShellPrint, #Split`.
- **`BinaryReadWrite.zip`** (KSNiloc, `BinaryReadWrite.dll`, ActiveX): `#BinaryOpenFile, #BinaryFileClose, #BinaryGet, #BinaryPut`.
- **`DragSound.zip`** (`DragSound.dll`, DirectX, ActiveX): `#DS_Mid_Set/Play/Stop`, `#DS_Wav_Set/Play/Stop/Pause/Pan/Vol`, `#DS_Play/#DS_Stop`.
- **`npcplugin.zip`** (Wintermoon, NPC Control System): `#NPCReadSchedule, #NPCSetSchedule, #SendN` (plugin form of `NLib.prg`).
- **`extendedplugin.zip`, `delphisdk.zip`, `4305.zip` (TK310 C++ SDK), `861.zip` (VB6 SDK by KSNiloc), `vcplussdk.zip`** — SDKs/managers, not command providers.
- **`Sendback_system_v4.zip`** ships `Plugin_plugins.ini` for `DarkAge.dll` (`CLSID=DarkAge.Revamped`, "Get ActiveX Path"); **`VB_Minigame_1-4.zip`** ships `shoot.dll` (`CLSID=Project1.MainMod`).
- **Non-plugins** (music/pack/data only, no commands): `WalzMIDI.zip`, `WalzMIDI2.zip`, `Midi_20Pack.zip` (MIDI packs), `ms_music_pak`, `six_gauntlets_music`, `rmxp_bkg`, `toolkit2.20b_wav`, `spcfull-ice`, `mfcruntimes` (MS MFC runtimes).
- `wayback/.../LittleMan/zip/` also holds non-TK runtime DLLs (`freeimage.dll`, `msimg32.dll`, `npmod32.dll`, `actkrt2.dll`, `vb5stkit.dll`, `ctl3d32.dll`); `tkzip.dll` is engine-internal. Not plugins.

---

## Q3 — Classification of the 39 `class=unknown` TK2 commands

(from `tk2-rpgcode-commands.csv`, column `class == unknown`; exactly 39 rows)

| command | class | named provider / file | evidence |
|---|---|---|---|
| `and` | plugin | `proplug.dll` | `proplug.zip/readme.txt` "Plugin Method #And"; call `wintermoonmethods.zip/MLib.prg:238` |
| `or` | plugin | `proplug.dll` | `proplug.zip/readme.txt` "#Or"; `wintermoonmethods.zip/npc_talk.prg:82` |
| `litlen` | plugin | `proplug.dll` | `proplug.zip/readme.txt`; `tandl.zip/t_and_l.prg:277`, `wintermoonmethods.zip/NLib.prg:174` |
| `litncpy` | plugin | `proplug.dll` | `proplug.zip/readme.txt`; `tandl.zip/t_and_l.prg:272` |
| `drawtext` | plugin | Triuken | `Triukens_plugin.zip/readme.txt` "#DrawText"; `NamePrompt.zip/NamePrompt.prg:39` |
| `fontproperties` | plugin | Triuken | `Triukens_plugin.zip/readme.txt`; `wintermoonmethods.zip/MLib.prg:3`, `NLib.prg:84` |
| `getitemstats` | plugin | Triuken | `Triukens_plugin.zip/readme.txt`; `CustomShop.zip/myshop.prg:145` |
| `getdirection` | plugin | `GsMiscPlugins.dll` | `GsMiscPlugins.zip/Readme.txt`; `multip.zip/mplayersupport.prg:29` ("REQUIRES MrG's Misc. Plugin") |
| `getplayercoords` | plugin | `GsMiscPlugins.dll` | `GsMiscPlugins.zip/Readme.txt`; `multip.zip/mplayersupport.prg:26`, `tandl.zip/t_and_l.prg:81` |
| `givedp` | plugin | `GsMiscPlugins.dll` | `GsMiscPlugins.zip/Readme.txt:343`; `Mazza201Methods.zip/mazza201methods.prg:211` |
| `givefp` | plugin | `GsMiscPlugins.dll` | `GsMiscPlugins.zip/Readme.txt:344`; `Mazza201Methods.zip/mazza201methods.prg:212` |
| `httpread` | plugin | `FTP.dll` | FTP.dll strings + WININET imports; `multip.zip/mplayermsgrecieve.prg:31`, `TransChat2b.zip/TransChat2b_start.prg:53` |
| `ftpconnect` | plugin | `FTP.dll` | FTP.dll strings; `TransChat2b.zip/TransChat2b_start.prg:35` |
| `ftpopen` | plugin | `FTP.dll` | FTP.dll strings; `TransChat2b.zip/TransChat2b_start.prg:109` |
| `ftpwrite` | plugin | `FTP.dll` | FTP.dll strings; `TransChat2b.zip/TransChat2b_start.prg:110` |
| `ftpclose` | plugin | `FTP.dll` | FTP.dll strings (`ftpclose`); `TransChat2b.zip/TransChat2b_start.prg:85` |
| `ftpfileclose` | plugin | `FTP.dll` | FTP.dll strings (`ftpclosefile`); `TransChat2b.zip/TransChat2b_start.prg:86` |
| `iwait` | plugin | `multip.dll` (Cy's Multiplayer) | `gcnmethods.zip/README_FIST.txt` "#IWait is a new command in this plugin"; `multip.zip/mplayeradminsend.prg:33` ("REQUIRES TC/IP Plugin") |
| `ksniloc_email_send` | plugin | `E-Mail.dll` | `E-Mail_20Plugin.zip/readme.txt` (`[E-Mail.dll] CLSID=EMail.Class`) + `E-Mail.prg:35` |
| `twsetbutton` | plugin | TWButton | `twbutton.zip/Readme.doc`; `twbutton.zip/button.prg:9` |
| `twcheckbutton` | plugin | TWButton | `twbutton.zip/Readme.doc`; `twbutton.zip/button.prg:21` |
| `twdelbutton` | plugin | TWButton | `twbutton.zip/Readme.doc`; `twbutton.zip/button.prg:34` |
| `xfmwin` | plugin | XFMWin (Leuf) | `xfmwinplugin.zip/Readme.txt`; `wintermoonmethods.zip/MLib.prg:229`, `NLib.prg:95` |
| `fileread` | plugin | `filereadwrite.dll` | `fileread.zip/Readme.txt`; `TransChat2b.zip/TransChat2b_start.prg:54`, `eternalrun.zip/eternalrun.prg:7` |
| `engine` | implicit include | `Prg/Engine.prg` | `contest2.zip/KSNiloc…/Prg_Engine.prg` defines `PlayGame/PlayGame2/GetAmmo/GameOver`; calls `#Engine.PlayGame()` etc. |
| `game_programs` | implicit include | `Prg/game_programs.prg` | `contest2.zip/Asimir…/canteencatastrophe_prg_game_programs.prg` defines `game2,new_guy,add_puzzle_queue,…` |
| `queue` | implicit include | `Prg/queue.prg` | `contest2.zip/Asimir…/canteencatastrophe_prg_queue.prg` defines `queue_create/destroy/has_left` |
| `queues` | implicit include | `Prg/Queues.prg` | `contest2.zip/KSNiloc…/Prg_Queues.prg` defines `AddNum/PopNum/…`; call `Prg_FinishLevel.prg:76` |
| `stack` | implicit include | `Prg/stack.prg` | `contest2.zip/Asimir…/canteencatastrophe_prg_stack.prg` defines `stack_create/destroy/has_left` |
| `stacks` | implicit include | `Prg/Stacks.prg` | `contest2.zip/KSNiloc…/Prg_Stacks.prg` defines `AddNum/PopNum/HasInNum`; call `Prg_Engine.prg:65` |
| `mlib` | implicit include | `MLib.prg` | `wintermoonmethods.zip/MLib.prg` defines `mwinclr,mwintime,…`; call `time.prg:34` |
| `nlib` | implicit include | `NLib.prg` | `wintermoonmethods.zip/NLib.prg` defines `npcreadschedule,npcsetschedule,…`; call `MLib.prg:232` |
| `npc_talk` | implicit include | `npc_talk.prg` | `wintermoonmethods.zip/npc_talk.prg` defines `talk,questtalk,…`; call `MLib.prg:36` |
| `system` | engine namespace | engine built-in (`#system.pause`) | `#system.pause` / `#system.pause()` in 24 files; also a `system.prg` library exists but the `system.` prefix is the engine's own namespace |
| `menu` | implicit include (file absent) | `Prg/menu.prg` | `Sendback_system_v4.zip/ksniloc_sendback.prg:169` `#menu.actualsave()`; file not shipped in the corpus |
| `mycommands` | implicit include (file absent) | `Prg/mycommands.prg` | `CustomShop.zip/myshop.prg:150` `#mycommands.pixeltext(...)`; `wayback/mysticsoftware.net/resources/index` lists an unfetched `mycommands.zip` |
| `addplyr` | **still unknown** | — | only `caoquest.zip/caoquestm_Prg_swim.prg:1` `#addplyr("swim.tem")`; no plugin doc anywhere in the archive. `[INFERENCE]` legacy alias/typo of `addPlayer(file)` |
| `cntrtext` | **still unknown** | — | only `CustomShop.zip/myshop.prg:276,279` `#cntrtext(x,y,val!)`; whole-repo grep of plugin docs finds nothing |
| `sell` | **still unknown** | — | only `CustomShop.zip/myshop.prg:79` bare `#sell`; no `#Method sell` and no plugin doc |

**Tally:** plugin-provided **24**, implicit-include library **11**, engine namespace **1**, still unknown **3** = **39**.

---

## Q4 — TK2 language evidence not in `docs/format-spec.md` §9

Observed in the tutorial and/or real `.prg`. §9 section cited where it is silent or incomplete.

1. **Inline `*` comment trailing a command on the same line.** `chrizmenu.zip/CGMenu.prg:37` `#InternalMenu(3) * Opens Details Menu *`; tutorial `#if(win!=1)* The player won`. §9.2 only defines `*` as a comment "when `*` is the **first non-blank character**"; the trailing form is undocumented. → adopt.
2. **A leading `#` on essentially every statement** (not just legacy commands): `#If(...)`, `#While(...)`, `#For(...)`, `#Method`, `#Kill`, `#CastLit`, `#Text`, `#Run`, `#Branch`, `#Include`, `#system.pause`, and even assignments `#temp$="…"`. §9.2 says a leading `#` "is ignored", but §9.5/§9.7 show only unprefixed forms and §9.9 implies `#`-forms are legacy-only. Corpus is pervasively `#`-prefixed (1016 distinct `#word` tokens). → state explicitly: `#` is an optional statement/command prefix in all versions.
3. **`#if(cond)` with no space**, uppercase keyword: e.g. `#if(ksniloc_point!=0)` (`ksniloc_sendback.prg:2`), `#If(SetMwin!=0)` (`mazza201methods.prg`). Case/spacing-insensitive keyword — §9.2 covers case only.
4. **Single `=` used as equality inside a condition**: `2DARRAY.zip/example_-_maze.prg:16` `#if(data! = 1)` (clearly equality); widespread (`#if(opt!=1)` uses `!=` elsewhere — note `!=`, not `~=`, as "not equal" here). §9.4 defines only `~=`; §9.9 lists `if (x = 5)` as legacy. Corpus strongly corroborates the legacy reading. → adopt (and note `!=` also appears as not-equal).
5. **Sigils on parameters and on array names**: `#Method Enemy(num!,text$)` and `#battlesystem_enemy[num!]$=text$`; `#Method numarrayout(arrayname$,arrayx!,arrayy!,arrayvalue!)`. §9.2 mentions sigils; §9.3 arrays. The tutorial's parameter sigils and the array-name-plus-sigil element form (`m[x]$`) are not spelled out.
6. **Dot as an index separator when building a name string**: `2DARRAY.PRG` composes `arrayname + "." + x + "." + y + "$"` and RPGCodes it, i.e. `<name>.<i>.<j>$`. §9.3 documents `a[1][2]` only; the `.`-index spelling is undocumented.
7. **`#RPGCode(string)` = runtime evaluation of a whole RPGCode statement string** (with the leading `#`), the documented-by-practice mechanism for dynamic variable names and instance emulation. §9.11 lists `rpgCode(line)` but gives no semantics; tutorial + `2DARRAY.PRG` + `myshop.prg` (114 sites) show it. → adopt.
8. **`<>` variable splicing inside string literals** passed to `#MWin/#Text/#Lprintf`: `"<length!>"`, `"<CharacterName$>"` (`mazza201methods.prg`). §9.11 has `spliceVariables` as a *callable* but does not say `mwin`/`text` auto-splice.
9. **`#Method Name ()` with a space before the parenthesis**, and lowercase `#method`, coexist with `#Method Name()` — purely cosmetic; §9's grammar implies no space. Low priority but worth one sentence.
10. **`#redirect(#old, #new.file.method)`** with `#`-prefixed operands and a target expressed as an implicit `file.method`: `myshop.prg` `#redirect(#myshop,#myshop.myshop)`, `#redirect(#giveitem,#myshop.mygiveitem)`, `#killredirect(#giveitem)`. §9.6 `redirect("old","new")` uses quotes; §9 doesn't cover the `#`-prefixed/implicit-target form.
11. **Engine exposes its own `system.*` namespace through the same dot syntax**: `#system.pause` (24 files). §9 never mentions a `system.` namespace.
12. **`for` with a comma as the first separator**: `2DARRAY.zip/example_-_maze.prg:10` `#for(x! = 0, x! < 8; x! = x! + 1)`. §9.5 grammar is `for(init; cond; step)`. `[INFERENCE]` a tolerated comma/tpyo; flag as an ambiguity, not a rule.
13. **Explicit `#Include` vs implicit `.` vs post-run global visibility** share one namespace, disambiguated only by the `file.` prefix; clashes across library files are real (`Prg_Queues` vs `Prg_Stacks`). §9.6/§9.7 do not state precedence among local method, included-file method, implicit-file method, plugin command, built-in. → adopt a lookup-order sentence (also OOP-6).

Items already covered by §9 but worth confirming: `#Kill` (kill), `#CastLit` (castLit), `#Run` (run), bare zero-arg call `#MwinCls` (9.5 "bare identifier = zero-arg call"), `*`/`**` whole-line comments.

---

## Q5 — Plugin-effect shapes (for recorded-effect stubs)

Arguments observed at call sites and/or documented. "out" = a variable name passed in and written back by the plugin.

**Network / HTTP / FTP** (`FTP.dll`):
| command | argument shape (observed) | returns / out |
|---|---|---|
| `httpread` | `httpread(url$, localpath$)` or `httpread(url$, destVar$)` | writes file, or the response into `destVar` (both forms seen in corpus) |
| `ftpconnect` | `ftpconnect(host$, user$, pass$)` (host may be a bare host **or** a URL; unquoted args tolerated) | — |
| `ftpopen` | `ftpopen(remotepath$)` | — |
| `ftpwrite` | `ftpwrite(text$)` | — |
| `ftpclose` | `ftpclose()` | — |
| `ftpfileclose` | `ftpfileclose()` | — (PE string is `ftpclosefile`) |
| `ftpgetfile` | not called in corpus | `[INFERENCE]` `ftpgetfile(remote$, local$)` (from WININET `FtpGetFileA`) |
| `ftpgetbinfile` | not called in corpus | `[INFERENCE]` binary variant |

**Socket** — `multip.dll` (Cy's Multiplayer, ActiveX):
`#WSConnect(host$, port!)`, `#WSDC()`, `#WSSend(message$/!, block!)`, `#WSStatus(dest!)` (out `dest!`, 0–9 status codes), `#WSRec("file.method")` (registers a callback run when data arrives), `#IWait()`.

**Socket** — FaeroSock:
`#FaeroSock()` (init), `#FSockConnect(server$, port!)`, `#FSockClose()`, `#FSockSend(msg$)`, `#FSockGet(return$)` (out `return$`); variables `FSock_Msg!`, `FSock_Connected!`.

**E-mail** — `E-Mail.dll`:
setters take the value and write a global: `ksniloc_email_from(email$)`, `ksniloc_email_to(email$)`, `ksniloc_email_subject(text$)`, `ksniloc_email_body(text$)`; action: `ksniloc_email_send` (no args). The shipped `E-Mail.prg` wraps these as `#Method From/To/Subject/Body/Send`.

**File R/W** — `filereadwrite.dll`: `FileWrite(subdir$, filename$, line1$, …)`, `FileAppend(subdir$, filename$, …)`, `FileWriteParse(subdir$, filename$, …)` (`<>` splices), `FileAppendParse(...)`, `FileRead(subdir$, filename$, handle$, line!, result!)` — **out** `handle$` (a literal-variable *name*, filled to `handle$` for one line or `handle[1..n]$` for the whole file) and `result!` (line count).
`VIPPluginPak2`: `ReadFile(subdir$, filename$, line!, dest$)`, `ReadFileArray(subdir$, filename$, handle$, dest!)` (out `handle$` array + `dest!` count), `WriteToFile(subdir$, filename$, string$)`, `AppendToFile(...)`.
`NeverFailRW`: `ReadOpen(file$)`, `Read(data$)`/`ReadLine(data$)`/`GetLine(line!, data$)` (out), `WriteOpen/AppOpen/Write(data$, spacer$)/ReadClose/WriteClose/ShellOpen(file$)/ShellPrint/Split`.
`BinaryReadWrite`: `BinaryOpenFile(file$)`, `BinaryFileClose(file$)`, `BinaryGet(file$, var!)` (out `var!`), `BinaryPut(file$, data$)`.
`danplugpack`: `readfile(file$, dest$)`, `readbyline(file$, dest$)`, `readIni(Section$, Key$, Dest$, IniFile$)`, `writefile/appendfile/writeIni`, `split(string$, splitchar$, dest$)`.

**Shape conventions to encode in a stub**: (a) string arguments are often `#`-prefixed raw text, sometimes unquoted; (b) a variable *name* is passed as a **string** when the plugin must read/write it (`result!`, `handle$`, `var!`); (c) commands may be given with or without parentheses and with/without quotes; (d) return is by mutating engine globals, not a value.

---

## Rules to adopt (doc-first amendment candidates)

1. **Statement prefix `#`**: a leading `#` is an optional prefix on any command, keyword, or statement (control flow, assignments, `#RPGCode`, `#Include`) and is stripped before parsing. (Q4.2)
2. **Inline `*` comment**: `*` … to end of line is a comment when it is the first non-blank character **or** follows a completed statement on the same line. (Q4.1)
3. **`#RPGCode(expr)` / `rpgCode(expr)`** evaluates `expr` as a fresh RPGCode statement (leading `#` allowed) in the current scope at runtime; this is the sanctioned way to build dynamic variable names and emulate instances. (Q1.R7, Q4.7)
4. **Name resolution order** for an unqualified call: method in the current file → method of an explicitly included file → method of a file already run/loaded → method of a file named by a prior implicit call → engine built-in → plugin command(s) in load order; `file.method` forces the file-specific namespace and includes `Prg/file.prg` on first use. (Q1.R2/R4/R5/R10, §9.6, §9.11)
5. **Sigils** `!`/`$` are ignored in identifiers **everywhere**, including method parameters and array names. (Q4.5)
6. **`<>` splicing** in string literals passed to text/message built-ins, not only in `spliceVariables`. (Q4.8)
7. **Legacy comparison** `=` (and `!=`) as equality/inequality inside conditions in TK2 files; `!=` is a second not-equal spelling alongside `~=`. (Q4.4, LEX-3)
8. **Plugin dispatch**: unknown commands are offered to loaded plugins; a plugin is a DLL exporting `TKPlugInit, FunctionPtr, TKPlugBegin, TKPlugQuery, TKPlugExecute, TKPlugEnd`; `TKPlugQuery(name)∈{0,1}` gates `TKPlugExecute(fullCommandString)`. TK3 adds `TKPlugType/Menu/Fight/*Inform`. (Q2)
9. **TK2 plugin inventory is a native-capability list**, not a loadable thing: FTP (http/ftp), filereadwrite, proplug (And/Or/lit*), GsMiscPlugins, Triuken (font/drawtext/getitemstats), TWButton, XFMWin, multip (winsock), FaeroSock, E-Mail, Kaimu, VIPPluginPak2, danplugpack, DragSound, NeverFailRW, BinaryReadWrite, flash. A rebuild must supply these natively (cf. §12).
10. **Explicit `#Include` is rare** (9 real sites) but implicit `file.method` is common (242 sites); both must load `Prg/<file>.prg`.

---

## Unknowns

- **`addplyr`, `cntrtext`, `sell`** — no documentation anywhere in `data/zip-texts/`, `wayback/`, `archive-org/`, or `research/`; not defined as `#Method` in any corpus file. Classification blocked without the missing libraries/plugins (`cntrtext` may live in a shop "MyCommands"-style plugin or a missing `mycommands.prg`; `addplyr` may be a TK2 engine alias of `addPlayer`). `[INFERENCE]` only.
- **`menu.prg`, `mycommands.prg`** — referenced by implicit calls but never shipped in the corpus; `mycommands.zip` is listed in the wayback directory index of `resources/` but was not fetched.
- **DLL names** for Triuken's plugin pack, VIPPluginPak2, XFMWin, TWButton, FaeroSock, and Dan's TBox are not stated in the shipped readmes (only the FTP/Multiplayer/E-Mail/Dan/DarkAge/shoot ones name their DLL). The zips hold the plugin *sources/readmes*, not binaries, so no PE export tables exist for them.
- **Only two real plugin DLLs** survive in the archive (`FTP.dll`, `tkplug1.dll`, both wayback/LittleMan). All other export tables here are inferred from `.def` files.
- **TK2 `TKPlug*` calling convention for callbacks** (`TKPlugInit` array contents) was not read in detail; `4305.zip/…sdk_tkplugcallbacks.*` exists but is the TK3 SDK. Whether TK2 and TK3 callback ABIs are identical is **not established**.
- The tutorial's **cross-file "unqualified after first use"** rule (R4/R5) is asserted but only intra-file instances were observed.
- Whether `=`-as-equality (Q4.4) is version-gated (TK2-only) or universal is **not established** from this material.
