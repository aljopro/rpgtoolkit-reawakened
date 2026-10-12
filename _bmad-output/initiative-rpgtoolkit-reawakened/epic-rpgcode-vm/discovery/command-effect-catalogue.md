# TK Reawakened — command effect catalogue (3.1 built-in catalogue)

Scope: **every name in format-spec §9.11** (the 3.1.0 built-in function catalogue, ~280 names) plus the §9.10 engine variables
and constants as separate lists. Built **from the repo docs only** (G7 clean-room: no legacy source was opened). TK2-era names
are listed separately in §7, taken from the shipped 2.20b help file (an allowed archive artifact), because the owner decision
requires TK2 games to play at launch and §9.11 is a 3.1.0-only list.

Sources: `docs/format-spec.md` §9.1–§9.11; `docs/engine-features.md` E-20…E-34, E-40…E-49, E-50…E-63, E-70…E-79,
E-80…E-87, E-90…E-99, E-100…E-104, E-110…E-113, E-120…E-123; architecture spine AD-8, AD-9, AD-10, AD-17, AD-26;
`tickets.toml` epics 3 (rpgcode-vm), 4 (board-rendering), 5 (movement-triggers), 6 (audio-synth), 7 (battle), 8 (menu-party-save).
Every row carries a confidence; anything the docs do not state is `[INFERENCE]`.

## 1. Effect-kind vocabulary

| kind | meaning |
|---|---|
| `pure` | returns a value only; reads sections, writes nothing |
| `state-write` | mutates one or more named AD-10 sections |
| `request` | emits a runner request per AD-17 (`asset`, `loadBlob`, `saveBlob`, `listBlobs`, `extension.call`, `quit`, `openUrl`, `playVideo`) |
| `wait` | yields an AD-9 `Wait`; the kind is named in the *wait* column |
| `spawn-thread` | creates a VM thread |
| `flow-control` | changes VM control flow (end, branch, change, restart) |
| `draw-audio-cue` | produces draw commands or audio cues (writes `surfaces`/`fx`/`audio`) |
| `mixed` | more than one of the above in one call |

Owners are the four domain epics plus the VM epic, per the AD-10 section-owner table and each epic's Boundaries. `byRef out` means the call has an optional trailing by-reference output (AD-8 `ParamSpec.byRef`; §9.11: "Most getters also accept a trailing by-reference output parameter"), so the VM must write `out` back.

## 2. The catalogue, by §9.11 group

### Dialogue & text  (26 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `mwin` | `text` | 4 board-rendering | ui | ui | state-write |  |  | stated |
| `mwinCls` | `—` | 4 board-rendering | ui | ui | state-write |  |  | stated |
| `mwinSize` | `%` | 4 board-rendering | ui | ui | state-write |  |  | stated |
| `setMwinTranslucency` | `%` | 4 board-rendering | ui | ui | state-write |  |  | stated |
| `winGraphic` | `file` | 4 board-rendering | ui,world | ui | mixed |  |  | [INFERENCE] |
| `winColor` | `dos` | 4 board-rendering | ui | ui | state-write |  |  | stated |
| `winColorRgb` | `r,g,b` | 4 board-rendering | ui | ui | state-write |  |  | [INFERENCE] |
| `text` | `x,y,s[,cnv]` | 4 board-rendering | ui,surfaces | surfaces | draw-audio-cue |  |  | stated |
| `pixelText` | `x,y,s[,cnv]` | 4 board-rendering | ui,surfaces | surfaces | draw-audio-cue |  |  | stated |
| `font` | `file` | 4 board-rendering | ui,world | ui | mixed |  |  | [INFERENCE] |
| `fontSize` | `size` | 4 board-rendering | ui | ui | state-write |  |  | stated |
| `bold` | `bool` | 4 board-rendering | ui | ui | state-write |  |  | stated |
| `italics` | `bool` | 4 board-rendering | ui | ui | state-write |  |  | stated |
| `underline` | `bool` | 4 board-rendering | ui | ui | state-write |  |  | stated |
| `color` | `dos` | 4 board-rendering | ui | ui | state-write |  |  | stated |
| `colorRgb` | `r,g,b` | 4 board-rendering | ui | ui | state-write |  |  | [INFERENCE] |
| `getColor` | `&r,&g,&b` | 4 board-rendering | ui | — | pure |  | yes | stated |
| `getFontSize` | `&size` | 4 board-rendering | ui | — | pure |  | yes | stated |
| `getTextWidth` | `&w` | 4 board-rendering | ui | — | pure |  | yes | [INFERENCE] |
| `getTextHeight` | `&h` | 4 board-rendering | ui | — | pure |  | yes | [INFERENCE] |
| `textSpeed` | `speed` | 4 board-rendering | ui | ui | mixed |  |  | stated |
| `prompt` | `question[,&dest]` | 4 board-rendering | ui,input | ui | wait | render.msgbox | yes | stated |
| `msgBox` | `...` | 4 board-rendering | ui,input | ui | wait | render.msgbox |  | stated |
| `print` | `text` | 4 board-rendering | ui | ui | draw-audio-cue |  |  | [INFERENCE] |
| `show` | `var` | 4 board-rendering | ui | ui | state-write |  |  | [INFERENCE] |
| `staticText` | `...` | 4 board-rendering | ui | ui | state-write |  |  | [INFERENCE] |

### Input  (16 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `wait` | `[&dest]` | 5 movement-triggers | input | — | wait | input.key | yes | stated |
| `get` | `[&dest]` | 5 movement-triggers | input | input | mixed |  | yes | stated |
| `mouseClick` | `&x,&y[,noWait]` | 5 movement-triggers | input | — | wait | input.mouse | yes | stated |
| `mouseMove` | `&x,&y` | 5 movement-triggers | input | — | pure |  | yes | [INFERENCE] |
| `scan` | `x,y,layer,&mem` | 5 movement-triggers | world | world | mixed |  |  | [INFERENCE] |
| `mem` | `x,y[,layer],mem` | 5 movement-triggers | world | world | mixed |  |  | [INFERENCE] |
| `clearBuffer` | `—` | 5 movement-triggers | input | input | state-write |  |  | stated |
| `setButton` | `file,num,x,y,w,h` | 5 movement-triggers | input | input | state-write |  |  | stated |
| `checkButton` | `x,y,&num` | 5 movement-triggers | input | — | pure |  | yes | stated |
| `clearButtons` | `—` | 5 movement-triggers | input | input | state-write |  |  | stated |
| `createCursorMap` | `...` | 4 board-rendering | ui | ui | state-write |  |  | [INFERENCE] |
| `cursorMapAdd` | `...` | 4 board-rendering | ui | ui | state-write |  |  | [INFERENCE] |
| `cursorMapRun` | `...` | 4 board-rendering | ui,input | ui | wait | input.key |  | [INFERENCE] |
| `killCursorMap` | `...` | 4 board-rendering | ui | ui | state-write |  |  | [INFERENCE] |
| `cursorMapHand` | `...` | 4 board-rendering | ui | ui | state-write |  |  | [INFERENCE] |
| `mouseCursor` | `...` | 4 board-rendering | ui | ui | state-write |  |  | [INFERENCE] |

### Screen & drawing  (27 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `clear` | `[cnv]` | 4 board-rendering | surfaces | surfaces | draw-audio-cue |  |  | stated |
| `bitmap` | `file[,cnv]` | 4 board-rendering | surfaces,world | surfaces | mixed |  |  | stated |
| `setImage` | `file,x,y,w,h` | 4 board-rendering | surfaces,world | surfaces | mixed |  |  | stated |
| `setImageTransparent` | `file,x,y,w,h,r,g,b` | 4 board-rendering | surfaces,world | surfaces | mixed |  |  | stated |
| `setImageTranslucent` | `file,x,y,w,h[,%]` | 4 board-rendering | surfaces,world | surfaces | mixed |  |  | stated |
| `setImageAdditive` | `file,x,y,w,h,%` | 4 board-rendering | surfaces,world | surfaces | mixed |  |  | stated |
| `drawLine` | `x1,y1,x2,y2[,cnv]` | 4 board-rendering | ui,surfaces | surfaces | draw-audio-cue |  |  | stated |
| `drawRect` | `x1,y1,x2,y2[,cnv]` | 4 board-rendering | ui,surfaces | surfaces | draw-audio-cue |  |  | stated |
| `fillRect` | `x1,y1,x2,y2[,cnv]` | 4 board-rendering | ui,surfaces | surfaces | draw-audio-cue |  |  | stated |
| `drawCircle` | `x,y,r[,a0,a1[,cnv]]` | 4 board-rendering | ui,surfaces | surfaces | draw-audio-cue |  |  | stated |
| `fillCircle` | `x,y,r[,cnv]` | 4 board-rendering | ui,surfaces | surfaces | draw-audio-cue |  |  | stated |
| `setPixel` | `x,y[,cnv]` | 4 board-rendering | ui,surfaces | surfaces | draw-audio-cue |  |  | stated |
| `getPixel` | `x,y,&r,&g,&b[,cnv]` | 4 board-rendering | surfaces | — | pure |  | yes | stated |
| `saveScreen` | `[slot,x1,y1,x2,y2]` | 4 board-rendering | surfaces | surfaces | state-write |  |  | stated |
| `restoreScreen` | `[slot,x1,y1,x2,y2,xd,yd]` | 4 board-rendering | surfaces | surfaces | state-write |  |  | stated |
| `restoreScreenArray` | `...` | 4 board-rendering | surfaces | surfaces | state-write |  |  | [INFERENCE] |
| `fade` | `type` | 4 board-rendering | fx | fx | draw-audio-cue |  |  | stated |
| `wipe` | `file,effect[,speed]` | 4 board-rendering | fx,world | fx | mixed |  |  | stated |
| `zoom` | `%` | 4 board-rendering | fx,camera | fx | draw-audio-cue |  |  | stated |
| `earthquake` | `intensity` | 4 board-rendering | fx,camera | fx | draw-audio-cue |  |  | stated |
| `borderColor` | `r,g,b` | 4 board-rendering | fx | fx | state-write |  |  | stated |
| `forceRedraw` | `—` | 4 board-rendering | engine,surfaces | engine | state-write |  |  | stated |
| `renderNow` | `bool` | 4 board-rendering | ui,surfaces | engine | state-write |  |  | stated |
| `viewBrd` | `file[,x,y[,cnv]]` | 4 board-rendering | world,surfaces | surfaces | mixed |  |  | stated |
| `getRes` | `&x,&y` | 4 board-rendering | engine | — | pure |  | yes | stated |
| `getCorner` | `&x,&y` | 4 board-rendering | camera | — | pure |  | yes | stated |
| `drawEnemy` | `file,x,y` | 4 board-rendering | battle,surfaces | surfaces | draw-audio-cue |  |  | [INFERENCE] |

### Canvases  (6 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `createCanvas` | `...` | 4 board-rendering | surfaces | surfaces | state-write |  |  | stated |
| `killCanvas` | `...` | 4 board-rendering | surfaces | surfaces | state-write |  |  | stated |
| `drawCanvas` | `...` | 4 board-rendering | surfaces | surfaces | draw-audio-cue |  |  | stated |
| `drawCanvasTransparent` | `...` | 4 board-rendering | surfaces | surfaces | draw-audio-cue |  |  | stated |
| `canvasDrawPart` | `...` | 4 board-rendering | surfaces | surfaces | draw-audio-cue |  |  | stated |
| `canvasGetScreen` | `...` | 4 board-rendering | surfaces | surfaces | state-write |  |  | stated |

### Board  (21 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `send` | `board,x,y[,layer]` | 4 board-rendering | world,sprites,camera | world,camera,sprites,vm,engine | mixed |  |  | stated |
| `getBoardName` | `[&name]` | 4 board-rendering | world | — | pure |  | yes | stated |
| `put` | `x,y,[layer,]tile` | 4 board-rendering | world | world | state-write |  |  | stated |
| `layerPut` | `x,y,layer,tile` | 4 board-rendering | world | world | state-write |  |  | stated |
| `getBoardTile` | `x,y,layer,&dest` | 4 board-rendering | world | — | pure |  | yes | stated |
| `boardGetTile` | `x,y,layer,&dest` | 4 board-rendering | world | — | pure |  | yes | [INFERENCE] |
| `getBoardTileType` | `x,y,layer,&dest` | 4 board-rendering | world | — | pure |  | yes | stated |
| `tileType` | `x,y,type[,layer]` | 4 board-rendering | world | — | pure |  | yes | stated |
| `animatedTiles` | `[&list]` | 4 board-rendering | world | — | pure |  | yes | [INFERENCE] |
| `parallax` | `setting` | 4 board-rendering | world | world | state-write |  |  | stated |
| `setAmbientLevel` | `r,g,b` | 4 board-rendering | world | world | state-write |  |  | stated |
| `boardGetVector` | `...` | 4 board-rendering | world | — | pure |  | yes | stated |
| `boardSetVector` | `...` | 4 board-rendering | world | world | state-write |  |  | stated |
| `boardGetVectorPoint` | `...` | 4 board-rendering | world | — | pure |  | yes | stated |
| `boardSetVectorPoint` | `...` | 4 board-rendering | world | world | state-write |  |  | stated |
| `boardGetProgram` | `...` | 4 board-rendering | world | — | pure |  | yes | stated |
| `boardSetProgram` | `...` | 4 board-rendering | world | world | state-write |  |  | stated |
| `boardGetProgramPoint` | `...` | 4 board-rendering | world | — | pure |  | yes | stated |
| `boardSetProgramPoint` | `...` | 4 board-rendering | world | world | state-write |  |  | stated |
| `prg` | `num,x,y[,layer]` | 4 board-rendering | world | world | state-write |  |  | stated |
| `setConstants` | `...` | 4 board-rendering | world | world | state-write |  |  | [INFERENCE] |

### Party & players  (15 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `addPlayer` | `file` | 8 menu-party-save | party,world | party,inventory | mixed |  |  | stated |
| `removePlayer` | `file` | 8 menu-party-save | party | party | state-write |  |  | stated |
| `newPlayer` | `file` | 8 menu-party-save | party,sprites,world | party,sprites | mixed |  |  | stated |
| `activePlayer` | `[handle]` | 8 menu-party-save | party | party | mixed |  |  | stated |
| `putPlayer` | `h,x,y,layer` | 5 movement-triggers | sprites | sprites | state-write |  |  | stated |
| `erasePlayer` | `h` | 5 movement-triggers | sprites | sprites | state-write |  |  | stated |
| `destroyPlayer` | `h` | 5 movement-triggers | sprites,party | sprites,party | state-write |  |  | stated |
| `restorePlayer` | `file` | 8 menu-party-save | party,sprites,world | party,sprites | mixed |  |  | stated |
| `callPlayerSwap` | `—` | 8 menu-party-save | party | party | state-write |  |  | stated |
| `playerLocation` | `h,&x,&y,&layer` | 5 movement-triggers | sprites | — | pure |  | yes | stated |
| `playerDirection` | `[h,]dir` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |
| `playerSpeed` | `[h,]speed` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |
| `playerStance` | `slot[,h]` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |
| `characterSpeed` | `speed` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |
| `walkSpeed` | `fast/slow` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |

### Items & NPCs  (11 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `createItem` | `file[,mem]` | 5 movement-triggers | sprites,world | sprites | mixed |  |  | stated |
| `destroyItem` | `mem` | 5 movement-triggers | sprites | sprites | state-write |  |  | stated |
| `putItem` | `h,x,y,layer` | 5 movement-triggers | sprites | sprites | state-write |  |  | stated |
| `eraseItem` | `itemnum` | 5 movement-triggers | sprites | sprites | state-write |  |  | stated |
| `itemLocation` | `itemnum,&x,&y,&layer` | 5 movement-triggers | sprites | — | pure |  | yes | stated |
| `itemDirection` | `[h,]dir` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |
| `itemSpeed` | `[h,]speed` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |
| `itemStance` | `slot[,h]` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |
| `itemCount` | `item,&n` | 8 menu-party-save | inventory | — | pure |  | yes | stated |
| `onBoard` | `[h,]&flag` | 5 movement-triggers | sprites | — | pure |  | yes | [INFERENCE] |
| `spriteTranslucency` | `%` | 5 movement-triggers | sprites | sprites | state-write |  |  | stated |

### Movement  (16 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `push` | `dirs[,h[,flags]]` | 5 movement-triggers | sprites | sprites | mixed | movement |  | stated |
| `pushItem` | `itemnum,dirs` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |
| `playerStep` | `h,x,y[,flags]` | 5 movement-triggers | sprites | sprites | mixed | movement |  | stated |
| `itemStep` | `itemnum,x,y[,flags]` | 5 movement-triggers | sprites | sprites | mixed | movement |  | stated |
| `playerPath` | `h,flags,…` | 5 movement-triggers | sprites | sprites | mixed | movement |  | stated |
| `itemPath` | `h,flags,…` | 5 movement-triggers | sprites | sprites | mixed | movement |  | stated |
| `playerGetPath` | `h,&path` | 5 movement-triggers | sprites | — | pure |  | yes | stated |
| `itemGetPath` | `h,&path` | 5 movement-triggers | sprites | — | pure |  | yes | stated |
| `wander` | `h[,restrict]` | 5 movement-triggers | sprites,rng | sprites | state-write |  |  | stated |
| `pathFind` | `x1,y1,x2,y2,&dest[,layer]` | 5 movement-triggers | world | — | pure |  | yes | stated |
| `smartStep` | `...` | 5 movement-triggers | sprites | sprites | mixed |  |  | [INFERENCE] |
| `pixelMovement` | `[bool[,push]]` | 5 movement-triggers | world | world | state-write |  |  | stated |
| `gameSpeed` | `n` | 5 movement-triggers | world | world | state-write |  |  | stated |
| `move` | `x,y[,layer]` | 5 movement-triggers | sprites | sprites | state-write |  |  | stated |
| `stance` | `slot,handle` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |
| `posture` | `slot,handle` | 5 movement-triggers | sprites | sprites | mixed |  |  | stated |

### Stats & progression  (18 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `hp` | `h,amount` | 8 menu-party-save | vm | vm | state-write |  |  | stated |
| `getHp` | `h,&dest` | 8 menu-party-save | vm | — | pure |  | yes | stated |
| `giveHp` | `h,amount` | 8 menu-party-save | vm | vm | state-write |  |  | stated |
| `maxHp` | `h,level` | 8 menu-party-save | vm | vm | state-write |  |  | stated |
| `getMaxHp` | `h,&dest` | 8 menu-party-save | vm | — | pure |  | yes | stated |
| `smp` | `h,amount` | 8 menu-party-save | vm | vm | state-write |  |  | stated |
| `getSmp` | `h,&dest` | 8 menu-party-save | vm | — | pure |  | yes | stated |
| `giveSmp` | `h,amount` | 8 menu-party-save | vm | vm | state-write |  |  | stated |
| `maxSmp` | `h,level` | 8 menu-party-save | vm | vm | state-write |  |  | stated |
| `getMaxSmp` | `h,&dest` | 8 menu-party-save | vm | — | pure |  | yes | stated |
| `getDp` | `h,&dest` | 8 menu-party-save | vm | — | pure |  | yes | stated |
| `getFp` | `h,&dest` | 8 menu-party-save | vm | — | pure |  | yes | stated |
| `getLevel` | `h,&dest` | 8 menu-party-save | vm | — | pure |  | yes | stated |
| `giveExp` | `h,amount` | 7 battle | vm | vm,engine | mixed |  |  | stated |
| `giveGp` | `amount` | 8 menu-party-save | inventory | inventory | state-write |  |  | stated |
| `takeGp` | `amount` | 8 menu-party-save | inventory | inventory | state-write |  |  | stated |
| `getGp` | `&dest` | 8 menu-party-save | inventory | — | pure |  | yes | stated |
| `inn` | `—` | 8 menu-party-save | vm | vm | mixed |  |  | stated |

### Inventory & equipment  (9 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `giveItem` | `file[,qty]` | 8 menu-party-save | inventory | inventory | state-write |  |  | stated |
| `takeItem` | `file[,qty]` | 8 menu-party-save | inventory | inventory | state-write |  |  | stated |
| `equip` | `h,slot,item` | 8 menu-party-save | inventory,vm | inventory,vm | mixed |  |  | stated |
| `remove` | `h,slot` | 8 menu-party-save | inventory,vm | inventory,vm | mixed |  |  | stated |
| `getItemName` | `item,&dest` | 8 menu-party-save | inventory,world | — | mixed |  | yes | stated |
| `getItemDesc` | `item,&dest` | 8 menu-party-save | inventory,world | — | mixed |  | yes | [INFERENCE] |
| `getItemCost` | `item,&dest` | 8 menu-party-save | inventory,world | — | mixed |  | yes | [INFERENCE] |
| `getItemSellPrice` | `item,&dest` | 8 menu-party-save | inventory,world | — | mixed |  | yes | [INFERENCE] |
| `callShop` | `item1,…` | 8 menu-party-save | inventory,menu | menu | wait | menu.screen |  | stated |

### Battle  (16 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `fight` | `skill,bkg` | 7 battle | world,battle,audio | battle,engine | mixed |  |  | stated |
| `fightEnemy` | `e1,…,bkg` | 7 battle | battle,world,audio | battle,engine | mixed |  |  | stated |
| `attackAll` | `fp` | 7 battle | battle,vm | battle,vm | state-write |  |  | stated |
| `drainAll` | `fp` | 7 battle | battle,vm | battle,vm | state-write |  |  | stated |
| `ai` | `level` | 7 battle | battle | battle | state-write |  |  | stated |
| `applyStatus` | `h,file` | 7 battle | battle,world | battle | mixed |  |  | stated |
| `removeStatus` | `h,file` | 7 battle | battle | battle | state-write |  |  | stated |
| `fightMenuGraphic` | `file` | 7 battle | ui,world | ui,battle | mixed |  |  | stated |
| `menuGraphic` | `file` | 8 menu-party-save | ui,world | ui | mixed |  |  | stated |
| `internalMenu` | `n` | 8 menu-party-save | menu | menu | state-write |  |  | stated |
| `fightStyle` | `0/1` | 7 battle | battle | battle | state-write |  |  | stated |
| `battleSpeed` | `speed` | 7 battle | world | world | state-write |  |  | stated |
| `sourceHandle` | `&dest` | 3 rpgcode-vm | vm | — | pure |  | yes | stated |
| `targetHandle` | `&dest` | 3 rpgcode-vm | vm | — | pure |  | yes | stated |
| `sourceLocation` | `&x,&y` | 3 rpgcode-vm | vm,sprites | — | pure |  | yes | stated |
| `targetLocation` | `&x,&y` | 3 rpgcode-vm | vm,sprites | — | pure |  | yes | stated |

### Audio & video  (14 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `mediaPlay` | `file` | 6 audio-synth | audio,world | audio | mixed |  |  | stated |
| `mediaStop` | `—` | 6 audio-synth | audio | audio | state-write |  |  | stated |
| `wav` | `file[,block]` | 6 audio-synth | audio,world | audio | mixed | audio.sfx |  | stated |
| `sound` | `file[,block]` | 6 audio-synth | audio,world | audio | mixed | audio.sfx |  | stated |
| `wavStop` | `—` | 6 audio-synth | audio | audio | state-write |  |  | stated |
| `mp3pause` | `file` | 6 audio-synth | audio,world | audio | mixed |  |  | stated |
| `setVolume` | `%` | 6 audio-synth | audio | audio | state-write |  |  | stated |
| `playAvi` | `file` | 6 audio-synth | engine | engine | mixed | video |  | stated |
| `playAviSmall` | `file` | 6 audio-synth | engine | engine | mixed | video |  | stated |
| `midiPlay` | `file` | 6 audio-synth | audio,world | audio | mixed |  |  | stated |
| `playMidi` | `file` | 6 audio-synth | audio,world | audio | mixed |  |  | stated |
| `midiRest` | `—` | 6 audio-synth | audio | audio | state-write |  |  | stated |
| `mediaRest` | `—` | 6 audio-synth | audio | audio | state-write |  |  | stated |
| `mp3` | `file` | 6 audio-synth | audio,world | audio | mixed |  |  | stated |

### Animations  (3 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `animation` | `file,x,y[,persist]` | 4 board-rendering | fx,world | fx | mixed |  |  | stated |
| `sizedAnimation` | `file,x,y,xs,ys[,persist]` | 4 board-rendering | fx,world | fx | mixed |  |  | stated |
| `endAnimation` | `id` | 4 board-rendering | fx | fx | state-write |  |  | stated |

### Program flow & threads  (19 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `run` | `prg` | 3 rpgcode-vm | vm | vm | spawn-thread |  |  | stated |
| `change` | `prg` | 3 rpgcode-vm | vm | vm | flow-control |  |  | stated |
| `rpgCode` | `line` | 3 rpgcode-vm | vm | vm | flow-control |  |  | stated |
| `multiRun` | `block` | 3 rpgcode-vm | sprites | — | wait | movement |  | stated |
| `delay` | `sec` | 3 rpgcode-vm | vm,time | vm | wait | sleep |  | stated |
| `end` | `—` | 3 rpgcode-vm | vm | vm | flow-control |  |  | stated |
| `done` | `—` | 3 rpgcode-vm | vm | vm | flow-control |  |  | stated |
| `stop` | `—` | 3 rpgcode-vm | vm | vm | flow-control |  |  | stated |
| `thread` | `file,persist` | 3 rpgcode-vm | vm | vm | spawn-thread |  |  | stated |
| `killThread` | `id` | 3 rpgcode-vm | vm | vm | flow-control |  |  | stated |
| `getThreadId` | `&id` | 3 rpgcode-vm | vm | — | pure |  | yes | stated |
| `threadSleep` | `[sec]` | 3 rpgcode-vm | vm | vm | wait | sleep |  | stated |
| `threadWake` | `id` | 3 rpgcode-vm | vm | vm | flow-control |  |  | stated |
| `threadSleepRemaining` | `id,&sec` | 3 rpgcode-vm | vm | — | pure |  | yes | stated |
| `tellThread` | `id,code` | 3 rpgcode-vm | vm | vm | flow-control |  |  | stated |
| `branch` | `:label` | 3 rpgcode-vm | vm | vm | flow-control |  |  | stated |
| `autoCommand` | `...` | 3 rpgcode-vm | vm | vm | flow-control |  |  | [INFERENCE] |
| `debug` | `on/off` | 3 rpgcode-vm | engine | engine | state-write |  |  | stated |
| `debugger` | `msg` | 3 rpgcode-vm | engine,vm | engine | state-write |  |  | stated |

### Game state  (12 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `save` | `file` | 8 menu-party-save | engine | engine | mixed |  |  | stated |
| `load` | `file` | 8 menu-party-save | engine | world,sprites,party,inventory,triggers,vm,battle,menu,ui,camera,fx,audio,surfaces,rng,time | mixed |  |  | stated |
| `dirSav` | `...` | 8 menu-party-save | engine,menu | menu | mixed | menu.screen |  | stated |
| `reset` | `—` | 8 menu-party-save | engine,world | world,sprites,party,inventory,triggers,vm,battle,menu,ui,camera,fx,audio,surfaces,rng,time | flow-control |  |  | stated |
| `start` | `file` | 3 rpgcode-vm | vm,engine | vm,engine | flow-control |  |  | stated |
| `mainFile` | `gam` | 8 menu-party-save | world,engine | engine | flow-control |  |  | stated |
| `win` | `—` | 8 menu-party-save | engine | engine | flow-control |  |  | stated |
| `gone` | `—` | 8 menu-party-save | sprites,engine | sprites,engine | flow-control |  |  | stated |
| `over` | `—` | 8 menu-party-save | engine | engine | flow-control |  |  | stated |
| `godos` | `command` | 8 menu-party-save | engine | engine | flow-control |  |  | stated |
| `dos` | `—` | 8 menu-party-save | engine | engine | flow-control |  |  | stated |
| `windows` | `—` | 8 menu-party-save | engine | engine | flow-control |  |  | stated |

### Strings & math  (27 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `len` | `s,&n` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `length` | `s,&n` | 3 rpgcode-vm | — | — | pure |  | yes | [INFERENCE] |
| `left` | `s,n[,&dest]` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `right` | `s,n[,&dest]` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `mid` | `s,start,n[,&dest]` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `inStr` | `s,find[,&pos]` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `replace` | `s,find,with[,&dest]` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `regExpReplace` | `s,pattern,with[,&dest]` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `split` | `str,delim,arr` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `trim` | `s[,&dest]` | 3 rpgcode-vm | — | — | pure |  | yes | [INFERENCE] |
| `lcase` | `s[,&dest]` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `ucase` | `s[,&dest]` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `asc` | `s,&n` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `chr` | `n,&dest` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `charAt` | `s,pos,dest` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `castNum` | `s,&dest` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `castInt` | `n,&dest` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `castLit` | `n,&dest` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `spliceVariables` | `s[,&dest]` | 3 rpgcode-vm | vm | — | pure |  | yes | stated |
| `random` | `max[,&dest]` | 3 rpgcode-vm | rng | — | pure |  | yes | stated |
| `sin` | `deg,&dest` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `cos` | `deg,&dest` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `tan` | `deg,&dest` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `sqrt` | `n,&dest` | 3 rpgcode-vm | — | — | pure |  | yes | stated |
| `log` | `n,&dest` | 3 rpgcode-vm | — | — | pure |  | yes | [INFERENCE] |
| `iif` | `c,a,b` | 3 rpgcode-vm | — | — | pure |  |  | stated |
| `getTickCount` | `[&ms]` | 3 rpgcode-vm | time | — | pure |  | yes | stated |

### Files  (11 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `openFileInput` | `file,folder` | 3 rpgcode-vm | engine | engine | request |  |  | stated |
| `openFileOutput` | `file,folder` | 3 rpgcode-vm | engine | engine | request |  |  | stated |
| `openFileAppend` | `file,folder` | 3 rpgcode-vm | engine | engine | request |  |  | stated |
| `openFileBinary` | `file,folder` | 3 rpgcode-vm | engine | engine | request |  |  | stated |
| `closeFile` | `handle` | 3 rpgcode-vm | engine | engine | state-write |  |  | stated |
| `fileInput` | `handle,&line` | 3 rpgcode-vm | engine | — | mixed |  | yes | stated |
| `filePrint` | `handle,text` | 3 rpgcode-vm | engine | engine | mixed |  |  | stated |
| `fileGet` | `handle,&byte` | 3 rpgcode-vm | engine | — | mixed |  | yes | stated |
| `filePut` | `handle,byte` | 3 rpgcode-vm | engine | engine | mixed |  |  | stated |
| `fileEof` | `handle,&flag` | 3 rpgcode-vm | engine | — | pure |  | yes | stated |
| `appPath` | `[&path]` | 3 rpgcode-vm | engine | — | pure |  | yes | [INFERENCE] |

### Scope  (4 names)

| name | params §9.11 | owner epic | reads | writes | kind | wait | byRef out | conf |
|---|---|---|---|---|---|---|---|---|
| `local` | `x` | 3 rpgcode-vm | vm | vm | state-write |  |  | stated |
| `global` | `x` | 3 rpgcode-vm | vm | vm | state-write |  |  | stated |
| `autoLocal` | `bool` | 3 rpgcode-vm | vm | vm | state-write |  |  | stated |
| `kill` | `x` | 3 rpgcode-vm | vm | vm | state-write |  |  | stated |

## 3. §9.10 engine variables (virtual, read and write)

| variable | section(s) | access | note | conf |
|---|---|---|---|---|
| `playerHandle[i]` | sprites, party | read-write | indexes party slots 0-4 | stated |
| `playerX[i]` | sprites | read-write | party slot pixel x | stated |
| `playerY[i]` | sprites | read-write | party slot pixel y | stated |
| `playerLayer[i]` | sprites | read-write | party slot layer | stated |
| `boardBackground` | world | read-write | world | stated |
| `boardSkill` | world | read-write | board battle skill level | stated |
| `boardTitle[i]` | world | read-write | indexed board title | stated |
| `constant[i]` | world | read-write | board constants | stated |
| `music` | audio | read-write | current music | stated |
| `threads[i]` | vm | read | indexes vm.threads | stated |
| `ambientRed` | world | read-write | call forceRedraw() after assigning | stated |
| `ambientGreen` | world | read-write | call forceRedraw() after assigning | stated |
| `ambientBlue` | world | read-write | call forceRedraw() after assigning | stated |
| `cnvRenderNow` | surfaces, ui | read-write | overlay canvas handle (E-57) | stated |
| `gameTime` | time, party | read | seconds played; E-87 | inferred |

## 4. §9.10 constants

| constant | value |
|---|---|
| `tkMV_PAUSE_THREAD` | 1 |
| `tkMV_CLEAR_QUEUE` | 2 |
| `tkMV_PATHFIND` | 4 |
| `tkMV_WAYPOINT_PATH` | 8 |
| `tkMV_WAYPOINT_LINK` | 16 |
| `tkVT_SOLID` | 1 |
| `tkVT_UNDER` | 2 |
| `tkVT_STAIRS` | 8 |
| `tkVT_WAYPOINT` | 16 |
| `tkVT_BKGIMAGE` | 1 |
| `tkVT_ALL_LAYERS_BELOW` | 2 |
| `tkVT_FRAME_INTERSECT` | 4 |
| `tkPRG_STEP` | 0 |
| `tkPRG_KEYPRESS` | 1 |
| `tkPRG_REPEAT` | 2 |
| `tkPRG_STOPS_MOVEMENT` | 4 |
| `tkDIR_E` | 1 |
| `tkDIR_SE` | 2 |
| `tkDIR_S` | 3 |
| `tkDIR_SW` | 4 |
| `tkDIR_W` | 5 |
| `tkDIR_NW` | 6 |
| `tkDIR_N` | 7 |
| `tkDIR_NE` | 8 |

## 5. Summaries

Total catalogued names: **271** (docs say "~280").

### 5.1 Counts per effect kind

| kind | count |
|---|---|
| state-write | 84 |
| pure | 69 |
| mixed | 67 |
| flow-control | 19 |
| draw-audio-cue | 17 |
| wait | 9 |
| request | 4 |
| spawn-thread | 2 |

### 5.2 Counts per owner epic

| epic slug | count |
|---|---|
| board-rendering | 89 |
| rpgcode-vm | 66 |
| menu-party-save | 46 |
| movement-triggers | 45 |
| audio-synth | 14 |
| battle | 11 |

### 5.3 Counts per state section written (and read)

| section | writes | reads |
|---|---|---|
| vm | 34 | 46 |
| sprites | 33 | 39 |
| ui | 30 | 41 |
| surfaces | 27 | 28 |
| engine | 26 | 29 |
| world | 18 | 60 |
| audio | 14 | 14 |
| battle | 11 | 9 |
| fx | 10 | 8 |
| party | 9 | 7 |
| inventory | 9 | 13 |
| menu | 5 | 3 |
| input | 4 | 11 |
| camera | 3 | 4 |
| triggers | 2 | 0 |
| time | 2 | 2 |
| rng | 2 | 2 |

### 5.4 Names with no clear single owner

These 24 rows have a 9.11 group label that points at one epic but an AD-10 section that belongs to another. The section owner wins for correctness, but the epic envelope must say so or two epics will both register the name.

| name | §9.11 group | conflict |
|---|---|---|
| `createCursorMap` | Input | 9.11 group implies epic 5, sections put it with epic 4 |
| `cursorMapAdd` | Input | 9.11 group implies epic 5, sections put it with epic 4 |
| `cursorMapRun` | Input | 9.11 group implies epic 5, sections put it with epic 4 |
| `killCursorMap` | Input | 9.11 group implies epic 5, sections put it with epic 4 |
| `cursorMapHand` | Input | 9.11 group implies epic 5, sections put it with epic 4 |
| `mouseCursor` | Input | 9.11 group implies epic 5, sections put it with epic 4 |
| `putPlayer` | Party & players | 9.11 group implies epic 8, sections put it with epic 5 |
| `erasePlayer` | Party & players | 9.11 group implies epic 8, sections put it with epic 5 |
| `destroyPlayer` | Party & players | 9.11 group implies epic 8, sections put it with epic 5 |
| `playerLocation` | Party & players | 9.11 group implies epic 8, sections put it with epic 5 |
| `playerDirection` | Party & players | 9.11 group implies epic 8, sections put it with epic 5 |
| `playerSpeed` | Party & players | 9.11 group implies epic 8, sections put it with epic 5 |
| `playerStance` | Party & players | 9.11 group implies epic 8, sections put it with epic 5 |
| `characterSpeed` | Party & players | 9.11 group implies epic 8, sections put it with epic 5 |
| `walkSpeed` | Party & players | 9.11 group implies epic 8, sections put it with epic 5 |
| `itemCount` | Items & NPCs | 9.11 group implies epic 5, sections put it with epic 8 |
| `giveExp` | Stats & progression | 9.11 group implies epic 8, sections put it with epic 7 |
| `menuGraphic` | Battle | 9.11 group implies epic 7, sections put it with epic 8 |
| `internalMenu` | Battle | 9.11 group implies epic 7, sections put it with epic 8 |
| `sourceHandle` | Battle | 9.11 group implies epic 7, sections put it with epic 3 |
| `targetHandle` | Battle | 9.11 group implies epic 7, sections put it with epic 3 |
| `sourceLocation` | Battle | 9.11 group implies epic 7, sections put it with epic 3 |
| `targetLocation` | Battle | 9.11 group implies epic 7, sections put it with epic 3 |
| `start` | Game state | 9.11 group implies epic 8, sections put it with epic 3 |

### 5.5 Obsolete names

`godos`, `dos`, `windows` are marked obsolete in §9.11 itself (in the Game state group). The doc gives no other obsolete marker, so they are the whole list.

| name | note |
|---|---|
| `godos` | marked obsolete in §9.11 |
| `dos` | marked obsolete in §9.11 |
| `windows` | marked obsolete in §9.11 |

### 5.6 Legacy aliases (accepted, but not the 3.1 canonical spelling)

§9.11 marks these `(legacy)`: `show`, `scan`, `mem`, `getBoardTile`, `prg`, `characterSpeed`, `walkSpeed`, `pathFind`, `move`, `stance`, `posture`, `fightStyle`, `battleSpeed`, `sound`, `midiPlay`, `playMidi`, `midiRest`, `mediaRest`, `mp3`, `done`, `stop`, `autoCommand`.

### 5.7 Stub-safe names

**170 of 271** names are `pure`, non-blocking `state-write` or `draw-audio-cue`: a stub can record an effect and return a default without changing control flow. The other **101** are `wait`, `request`, `spawn-thread`, `flow-control` or `mixed` and cannot be stubbed that way — a default answer to a `wait`/`request`/`flow-control` call desynchronises the VM.

Stub-safe names: `mwin`, `mwinCls`, `mwinSize`, `setMwinTranslucency`, `winColor`, `winColorRgb`, `text`, `pixelText`, `fontSize`, `bold`, `italics`, `underline`, `color`, `colorRgb`, `getColor`, `getFontSize`, `getTextWidth`, `getTextHeight`, `print`, `show`, `staticText`, `mouseMove`, `clearBuffer`, `setButton`, `checkButton`, `clearButtons`, `createCursorMap`, `cursorMapAdd`, `killCursorMap`, `cursorMapHand`, `mouseCursor`, `clear`, `drawLine`, `drawRect`, `fillRect`, `drawCircle`, `fillCircle`, `setPixel`, `getPixel`, `saveScreen`, `restoreScreen`, `restoreScreenArray`, `fade`, `zoom`, `earthquake`, `borderColor`, `forceRedraw`, `renderNow`, `getRes`, `getCorner`, `drawEnemy`, `createCanvas`, `killCanvas`, `drawCanvas`, `drawCanvasTransparent`, `canvasDrawPart`, `canvasGetScreen`, `getBoardName`, `put`, `layerPut`, `getBoardTile`, `boardGetTile`, `getBoardTileType`, `tileType`, `animatedTiles`, `parallax`, `setAmbientLevel`, `boardGetVector`, `boardSetVector`, `boardGetVectorPoint`, `boardSetVectorPoint`, `boardGetProgram`, `boardSetProgram`, `boardGetProgramPoint`, `boardSetProgramPoint`, `prg`, `setConstants`, `removePlayer`, `putPlayer`, `erasePlayer`, `destroyPlayer`, `callPlayerSwap`, `playerLocation`, `destroyItem`, `putItem`, `eraseItem`, `itemLocation`, `itemCount`, `onBoard`, `spriteTranslucency`, `playerGetPath`, `itemGetPath`, `wander`, `pathFind`, `pixelMovement`, `gameSpeed`, `move`, `hp`, `getHp`, `giveHp`, `maxHp`, `getMaxHp`, `smp`, `getSmp`, `giveSmp`, `maxSmp`, `getMaxSmp`, `getDp`, `getFp`, `getLevel`, `giveGp`, `takeGp`, `getGp`, `giveItem`, `takeItem`, `attackAll`, `drainAll`, `ai`, `removeStatus`, `internalMenu`, `fightStyle`, `battleSpeed`, `sourceHandle`, `targetHandle`, `sourceLocation`, `targetLocation`, `mediaStop`, `wavStop`, `setVolume`, `midiRest`, `mediaRest`, `endAnimation`, `getThreadId`, `threadSleepRemaining`, `debug`, `debugger`, `len`, `length`, `left`, `right`, `mid`, `inStr`, `replace`, `regExpReplace`, `split`, `trim`, `lcase`, `ucase`, `asc`, `chr`, `charAt`, `castNum`, `castInt`, `castLit`, `spliceVariables`, `random`, `sin`, `cos`, `tan`, `sqrt`, `log`, `iif`, `getTickCount`, `closeFile`, `fileEof`, `appPath`, `local`, `global`, `autoLocal`, `kill`

### 5.8 By-reference outputs and wait kinds

By-reference out write-back is required by **78** rows (all getters plus `split`, `charAt`, `cast*`, `prompt`, `mouseClick`, `playerGetPath`, `pathFind`, `wait`, `get`). AD-8's catalogue test must assert each of these declares `byRef`.

| name | wait kind (AD-9) |
|---|---|
| `prompt` | `render.msgbox` |
| `msgBox` | `render.msgbox` |
| `wait` | `input.key` |
| `mouseClick` | `input.mouse` |
| `cursorMapRun` | `input.key` |
| `callShop` | `menu.screen` |
| `multiRun` | `movement` |
| `delay` | `sleep` |
| `threadSleep` | `sleep` |

## 6. Proposed minimal plain-data effect record (proposal, not a decision)

One generic stub per catalogue name can respond, record what it did, and let owner code replace it later — provided the
record is plain data in `GameState` (G1/AD-7), indexes deterministically into the owning section, and round-trips through
the RFC 8785 canonical form (AD-11).

```ts
interface EffectRecord {            // PlainData; one object per built-in call
  seq: number;                      // monotonic counter in the owning section; never reused
  step: number;                     // time.step at the call
  thread: number;                   // vm thread id
  name: string;                     // canonical catalogue name (lower-case)
  group: string;                    // §9.11 group label
  kind: 'pure' | 'state-write' | 'request' | 'wait' | 'spawn-thread'
      | 'flow-control' | 'draw-audio-cue' | 'mixed';
  args: PlainData[];                // canonicalised argument values (by-value args only)
  out: { [index: string]: PlainData };   // byRef write-backs, index as a decimal string key
  result: PlainData;                // the default the stub returned
  patch: EffectPatch | null;        // how it indexes into the owning section
  wait: { kind: string, id: string } | null;         // AD-9 wait, if any
  request: { kind: string, key: PlainData } | null;  // AD-17 request, if any
}

interface EffectPatch {             // change-addressed, not index-addressed, so it survives reorder
  section: string;                  // an AD-10 section name: world | sprites | party |
                                    //   inventory | vm | battle | menu | input | ui |
                                    //   camera | fx | audio | surfaces | rng | time | engine | triggers
  path: string[];                   // segments into that section; numeric indices are decimal strings
  op: 'set' | 'append' | 'remove' | 'add' | 'merge';
  value: PlainData;                 // null for 'remove'
}
```
Storage: a `vm.effects: EffectRecord[]` list owned by `core/script` (the stub registry lives beside the built-in table). It snapshots with `vm` and needs an AD-23 schema entry `vm: { effects: 1, … }`.

How a stub uses it:

1. `makeStub(spec)` builds a `BuiltinSpec` from the catalogue row. `spec.target = { section, path }` and `spec.default` are authored per name.

2. `call(ctx, args)` pushes an `EffectRecord` and returns `{ done: spec.default, out }` — so the script sees a normal value and the by-reference arguments are written back by the VM.

3. Owner code replaces the stub and reads the same records, or replays `patch` operations through the section port. The record is therefore also the reconciliation log between stub and real implementation.

4. Waits, requests, spawns and flow-control are **not** stubbed: they must either be real or return `UNSUPPORTED` with a diagnostic, otherwise the control-flow contract breaks.

Round-trip rules (PlainData + AD-11):

- no `undefined`: absent means "key omitted"; a deliberately empty value is `null`;
- no `-0`: normalise to `0`;
- finite numbers only — non-finite uses the AD-7 tagged form `{ t: 'nan' | 'inf' | '-inf' }`;
- maps are ordered `[key, value]` entry arrays and sparse arrays are entry lists (AD-7);
- JCS sorts keys by UTF-16 code unit, so `out` and `path` use **string** keys/indexes (lists stay in insertion order);
- `seq` is monotonic in the section, so `canon(save)` is stable across re-runs (G5).

## 7. TK2 (Toolkit 2.x) command names — evidence the 3.1 catalogue is not sufficient

Owner decision: TK2 games must play at launch. §9.11 is the 3.1.0 list. The shipped 2.20b help file
`archive-org/rpg-toolkit-220b` → `zip.zip` → `help/rpgcodeEN.ref` is titled *RPGCode Language Specification, Version 2.1*
and states its command list was last updated for 2.19b. It contains **185 entries**. `#Command(arg$)` uses `$`/`!` sigils and
unquoted-word conventions that ADR 0004 routes to `@rpgtoolkit/plugin-tk2-compat`, not to the core VM.

Cross-check on live TK2 data: the archive's `FinalDestiny_201810` game (a Toolkit 2 title) has **55 `.prg` files** whose scripts
call 69 distinct commands, including `#Mwin`, `#MWinCls`, `#Send`, `#Wait`, `#GiveItem`, `#GetGP`, `#TakeGP`, `#RPGCode`,
`#SetButton`, `#Scan`, `#Mem`, `#ItemWalkSpeed`, `#WalkSpeed`, `#MidiPlay` — i.e. the TK2 spellings really are what TK2 games use.

### 7.1 TK2 names with no 9.11 counterpart (17)

| TK2 name | kind |
|---|---|
| `* Comment` | comment |
| `#Break()` | debug/flow |
| `#Empty()` | state-write (vm) |
| `#Fbranch(:label)` | flow-control |
| `#For(init;cond;inc)` | statement |
| `#If(condition){…}` | statement |
| `#include(filename$)` | module import (§9.6) |
| `#ItemWalkSpeed(fast/slow)` | state-write (sprites) |
| `#KillAllRedirects()` | flow-control |
| `#KillRedirect(method$)` | flow-control |
| `#Method(name)(params)` | declaration |
| `#Newplyr(filename$)` | maps to 3.1 `newPlayer` |
| `#Redirect(old$,new$)` | flow-control |
| `#Return()` | flow-control (refresh) |
| `#ReturnMethod(var)` | flow-control (return a value) |
| `#UnderArrow(on/off)` | state-write (ui) |
| `#While(cond){…}` | statement |

The full 185-entry TK2 list with signatures is in the JSON (`tk2Commands`). Names that exist in both eras usually differ in
spelling: `#MWin`/`mwin`, `#Newplyr`/`newPlayer`, `#GetBoardTile`/`boardGetTile`, `#Push`/`push`, `#ItemWalkSpeed` (no 3.1 name).

## 8. Unknowns / doc gaps

- **No TK2 command list in `docs/`.** §9.11 is 3.1.0 only; the repo docs never enumerate TK2 commands or say which of the 185 resolve natively versus through `plugin-tk2-compat`. Resolved only by the archive evidence in §7 (target decision still open: which TK2 names are parity-required at launch).
- **Wait kinds.** AD-9's list (`input.key`, `sleep`, `movement`, `blob`, `audio.sfx`, `video`, `render.msgbox`, `menu.screen`) does not include a mouse or cursor-map kind. `mouseClick` and `cursorMapRun` need one; the name is `[INFERENCE]`.
- **Cursor-map ownership.** §9.11 groups the `cursorMap*` family under *Input*, but AD-10 puts cursor maps in `ui` (`core/render`) and epic 5 claims "input built-ins". Unresolved.
- **`tileType`.** §9.11 reads as a query; the TK2 help shows `#TileType` *sets* the tile type. Which 3.1 behaviour is intended is unstated.
- **`print` / `show` / `staticText`.** Present in §9.11 with no parameters or described behaviour; roles inferred only.
- **`scan`/`mem`.** Grouped under *Input* in §9.11, but TK2 shows they stage board tiles (world). Group label looks wrong.
- **`gameTime`, `threads[i]`, `cnvRenderNow` section homes.** §9.10 names the variables; AD-10 does not say which section backs `gameTime` (time vs party.steps) or the thread array (vm.threads is likely).
- **Battle vs vm for stat writes.** AD-10 says battle never copies HP/SMP; stats live in `vm.globals` behind `StatsPort`. The `hp`/`smp`/`giveExp` built-ins therefore straddle epic 7 and epic 8.
- **`regExpReplace`, `getTickCount`, `log`.** Determinism (G3) forbids `Date`/`performance.now` and restricts math to `core/fmath`; the doc does not state the injected equivalents.
