# Plugin interface constants

Info codes and enumerations used by the callback interface ([plugins-and-battle.md](plugins-and-battle.md)). Values are identical to the plugin SDK header that shipped with the Toolkit for plugin authors.


## Numerical enemy info

| Name | Value | Meaning |
|---|---|---|
| `ENE_HP` | 0 | Enemy hp level |
| `ENE_MAXHP` | 1 | Enemy max hp level |
| `ENE_SMP` | 2 | Enemy smp level |
| `ENE_MAXSMP` | 3 | Enemy max smp level |
| `ENE_FP` | 4 | Enemy fp |
| `ENE_DP` | 5 | Enemy dp |
| `ENE_RUNYN` | 6 | Can we run from enemy? 0- no, 1- yes |
| `ENE_SNEAKCHANCES` | 7 | Chances of sneaking up on enemy |
| `ENE_SNEAKUPCHANCES` | 8 | Chances of enemy snaking up on you |
| `ENE_SIZEX` | 9 | Enemy size x |
| `ENE_SIZEY` | 10 | Enemy size y |
| `ENE_AI` | 11 | Enemy AI level 0- very low ... 4- very high |
| `ENE_EXP` | 12 | Experience you get from defeating enemy |
| `ENE_GP` | 13 | GP you get from defeating enemy |

## Literal enemy info

| Name | Value | Meaning |
|---|---|---|
| `ENE_FILENAME` | 0 | Enemy filename |
| `ENE_NAME` | 1 | Enemy name |
| `ENE_RPGCODEPROGRAM` | 2 | Rpgcode program to run as AI |
| `ENE_DEFEATPRG` | 3 | Rpgcode program to run when enemy is defeated |
| `ENE_RUNPRG` | 4 | Program to run when player runs away |
| `ENE_ATTACKSOUND` | 5 | Filename of sound to play when enemy does phys attack |
| `ENE_SMSOUND` | 6 | Filename of sound to play when enemy does special move |
| `ENE_HITSOUND` | 7 | Filename of sound to play when enemy is hit |
| `ENE_DIESOUND` | 8 | Filename of sound to play when enemy dies |

## Numerical player info

| Name | Value | Meaning |
|---|---|---|
| `PLAYER_INITXP` | 0 | Initial experience level |
| `PLAYER_INITHP` | 1 | Initial health level |
| `PLAYER_INITMAXHP` | 2 | Initial max health level |
| `PLAYER_INITDP` | 3 | Initial dp level |
| `PLAYER_INITFP` | 4 | Initial fp level |
| `PLAYER_INITSMP` | 5 | Initial smp level |
| `PLAYER_INITMAXSMP` | 6 | Initial max smp level |
| `PLAYER_INITLEVEL` | 7 | Initial level |
| `PLAYER_DOES_SM` | 8 | Player does special moves? 0- no, 1- yes |
| `PLAYER_SM_MIN_EXPS` | 9 | Minimum experience for each special move (arrayPos 0-200) |
| `PLAYER_SM_MIN_LEVELS` | 10 | Minimum level required for each special move (arrayPos 0-200) |
| `PLAYER_ARMOURS` | 11 | Is armour type used? |
| `PLAYER_LEVELTYPE` | 12 | Level progression type |
| `PLAYER_XP_INCREASE` | 13 | Experience increase factor for each level |
| `PLAYER_MAXLEVEL` | 14 | Max level |
| `PLAYER_HP_INCREASE` | 15 | HP increase on level up |
| `PLAYER_DP_INCREASE` | 16 | DP increase on level up |
| `PLAYER_FP_INCREASE` | 17 | FP increase on level up |
| `PLAYER_SMP_INCREASE` | 18 | SMP increase on level up |
| `PLAYER_LEVELUP_TYPE` | 19 | Level up type 0=exponential, 1=linear |
| `PLAYER_DIR_FACING` | 20 | Direction player is facing (1=south, 2=west, 3=north, 4=east) |
| `PLAYER_NEXTLEVEL` | 21 | Percentage of next level gained (0 - 100) |

## Literal player info

| Name | Value | Meaning |
|---|---|---|
| `PLAYER_NAME` | 0 | Player name (handle) |
| `PLAYER_XP_VAR` | 1 | Player experience var |
| `PLAYER_DP_VAR` | 2 | Player dp var |
| `PLAYER_FP_VAR` | 3 | Player fp var |
| `PLAYER_HP_VAR` | 4 | Player hp var |
| `PLAYER_MAXHP_VAR` | 5 | Player max hp var |
| `PLAYER_NAME_VAR` | 6 | Player name var |
| `PLAYER_SMP_VAR` | 7 | Player smp var |
| `PLAYER_MAXSMP_VAR` | 8 | Player max smp var |
| `PLAYER_LEVEL_VAR` | 9 | Player level var |
| `PLAYER_PROFILE` | 10 | Player profile picture filename |
| `PLAYER_SM_FILENAMES` | 11 | Player spcial move filename array (arrayPos 0-200) |
| `PLAYER_SM_NAME` | 12 | Player spcial move names |
| `PLAYER_SM_CONDVARS` | 13 | Player special move conditional vars (arrayPos 0-200) |
| `PLAYER_SM_CONDVARSEQ` | 14 | Player special move conditional variable conditions (arrayPos 0-200) |
| `PLAYER_ACCESSORIES` | 15 | Player accessory names (arrayPos 0-10) |
| `PLAYER_SWORDSOUND` | 16 | Player sword swipe sound |
| `PLAYER_DEFENDSOUND` | 17 | Player defend sound |
| `PLAYER_SMSOUND` | 18 | Player special move sound |
| `PLAYER_DEATHSOUND` | 19 | Player death sound |
| `PLAYER_RPGCODE_LEVUP` | 20 | Player rpgcode program to run on level up |

## Literal general info

| Name | Value | Meaning |
|---|---|---|
| `GEN_PLAYERHANDLES` | 0 | Handles of players (nPlayerSlot 0-4) |
| `GEN_PLAYERFILES` | 1 | Filenames of players (nPlayerSlot 0-4) |
| `GEN_PLYROTHERHANDLES` | 2 | Handles of other players (nArrayPos 0-25) |
| `GEN_PLYROTHERFILES` | 3 | Filenames of other players (nArrayPos 0-25) |
| `GEN_INVENTORY_FILES` | 4 | Filenames of inventory slots (nArrayPos 0-500) |
| `GEN_INVENTORY_HANDLES` | 5 | Handles of inventory slots (nArrayPos 0-500) |
| `GEN_EQUIP_FILES` | 6 | Filenames of equipped items (nArrayPos 0-16 (equip slot), nPlayerSlot 0-4) |
| `GEN_EQUIP_HANDLES` | 7 | Handles of equipped items (nArrayPos 0-16 (equip slot), nPlayerSlot 0-4) |
| `GEN_MUSICPLAYING` | 8 | Currently playing music |
| `GEN_CURRENTBOARD` | 9 | Current board filename |
| `GEN_MENUGRAPHIC` | 10 | Filename of menu graphic |
| `GEN_FIGHTMENUGRAPHIC` | 11 | Filename of fight menu graphic |
| `GEN_MWIN_PIC_FILE` | 12 | Filename mwin graphic |
| `GEN_FONTFILE` | 13 | Filename font |
| `GEN_ENE_FILE` | 14 | Filename of loaded enemies (nPlayerSlot 0-3) |
| `GEN_ENE_WINPROGRAMS` | 15 | Filenames of programs to run after defeating enemies (nPlayerSlot 0-3) |
| `GEN_ENE_STATUS` | 16 | Filenames of status effects applied to enemies (nArrayPos 0-10, nPlayerSlot 0-3) |
| `GEN_PLYR_STATUS` | 17 | Filenames of status effects applied to players (nArrayPos 0-10, nPlayerSlot 0-4) |
| `GEN_CURSOR_MOVESOUND` | 18 | Filename of the cursor move sound |
| `GEN_CURSOR_SELSOUND` | 19 | Filename of the cursor selection sound |
| `GEN_CURSOR_CANCELSOUND` | 20 | Filename of the cursor cancel sound |

## Numerical general info

| Name | Value | Meaning |
|---|---|---|
| `GEN_INVENTORY_NUM` | 0 | Number of each item in inventory (nArrayPos 0-500) |
| `GEN_EQUIP_HPADD` | 1 | Amount of hp added to player by equipment (nPlayerslot 0-4) |
| `GEN_EQUIP_SMPADD` | 2 | Amount of smp added to player by equipment (nPlayerslot 0-4) |
| `GEN_EQUIP_DPADD` | 3 | Amount of dp added to player by equipment (nPlayerslot 0-4) |
| `GEN_EQUIP_FPADD` | 4 | Amount of fp added to player by equipment (nPlayerslot 0-4) |
| `GEN_CURX` | 5 | Current player x pos (nPlayerSlot 0-4) |
| `GEN_CURY` | 6 | Current player y pos (nPlayerSlot 0-4) |
| `GEN_CURLAYER` | 7 | Current player layer pos (nPlayerSlot 0-4) |
| `GEN_CURRENT_PLYR` | 8 | Currently selected player |
| `GEN_TILESX` | 9 | Size of screen x (in tiles) |
| `GEN_TILESY` | 10 | Size of screen y (in tiles) |
| `GEN_BATTLESPEED` | 11 | Current battle speed (returns 0=slow -> 8=fast) |
| `GEN_TEXTSPEED` | 12 | Current text speed (returns 0=slow -> 3=fast) |
| `GEN_CHARACTERSPEED` | 13 | Current character speed (returns 0=slow -> 3=fast) |
| `GEN_SCROLLINGOFF` | 14 | Is scrolling turned off? 0=no, 1=yes |
| `GEN_RESX` | 15 | Screen x resolution, in pixels |
| `GEN_RESY` | 16 | Screen y resolution, in pixels |
| `GEN_GP` | 17 | GP carried by player |
| `GEN_FONTCOLOR` | 18 | Color of font (rgb value-- use red, green, blue fns) |
| `GEN_PREV_TIME` | 19 | Time spent in previuously loaded game |
| `GEN_START_TIME` | 20 | Time at start of game |
| `GEN_GAME_TIME` | 21 | Length of game, in seconds |
| `GEN_STEPS` | 22 | Number of steps taken |
| `GEN_ENE_RUN` | 23 | Can we run from the currently loaded enemies? 0=no, 1=yes |
| `GEN_ENEX` | 24 | X location of each enemy (nPlayerSlot 0-3) |
| `GEN_ENEY` | 25 | Y location of each enemy (nPlayerSlot 0-3) |
| `GEN_FIGHT_OFFSETX` | 26 | Fighting window x offset, in tiles |
| `GEN_FIGHT_OFFSETY` | 27 | Fighting window y offset, in tiles |
| `GEN_TRANSPARENTCOLOR` | 28 | Color used as the 'transparent' color universally throughout the engine |

## Paths

| Name | Value | Meaning |
|---|---|---|
| `PATH_TILE` | 0 | Tile path |
| `PATH_BOARD` | 1 | Board path |
| `PATH_CHAR` | 2 | Character path |
| `PATH_SPC` | 3 | Special move path |
| `PATH_BKG` | 4 | Background path |
| `PATH_MEDIA` | 5 | Media path |
| `PATH_PRG` | 6 | PRG path |
| `PATH_FONT` | 7 | Font path |
| `PATH_ITEM` | 8 | Item path |
| `PATH_ENEMY` | 9 | Enemy path |
| `PATH_MAIN` | 10 | Main file path |
| `PATH_BITMAP` | 11 | Bitmap path |
| `PATH_STATUSFX` | 12 | Status effects path |
| `PATH_MISC` | 13 | Misc path |
| `PATH_SAVE` | 14 | Saved games path |
| `PATH_PROJECT` | 15 | Project path |

## Literal special move info

| Name | Value | Meaning |
|---|---|---|
| `SPC_NAME` | 0 | Name of special move |
| `SPC_PRG_FILE` | 1 | Filename of rpgcode program to run |
| `SPC_STATUSFX` | 2 | Status effect filename connected to this move |
| `SPC_ANIMATION` | 3 | Filename of animation connected to this move |
| `SPC_DESCRIPTION` | 4 | Description of special move. |

## Numerical special move info

| Name | Value | Meaning |
|---|---|---|
| `SPC_FP` | 0 | FP of special move |
| `SPC_SMP` | 1 | SMP of special move |
| `SPC_TARGET_SMP` | 2 | SMP to remove from target |
| `SPC_BATTLEDRIVEN` | 3 | Battle driven? |
| `SPC_MENUDRIVEN` | 4 | Menu driven? |

## Literal item info

| Name | Value | Meaning |
|---|---|---|
| `ITM_NAME` | 0 | Name of item |
| `ITM_ACCESSORY` | 1 | Name of accessory slot this item can be equipped to. |
| `ITM_EQUIP_PRG` | 2 | Program to run when item is equipped. |
| `ITM_REMOVE_PRG` | 3 | Program to run when item is removed (unequipped). |
| `ITM_MENU_PRG` | 4 | program to run when used from menu |
| `ITM_FIGHT_PRG` | 5 | Program to run when used from fight |
| `ITM_ONBOARD_PRG` | 6 | Program to run when item is on the board (multitask) |
| `ITM_PICKEDUP_PRG` | 7 | Program to run when item is touched on the board |
| `ITM_CHARACTERS` | 8 | Characters who can use this item (nArrayPos 0-50) |
| `ITM_DESCRIPTION` | 9 | Item description |
| `ITM_ANIMATION` | 10 | Associated animation |

## Numerical item info

| Name | Value | Meaning |
|---|---|---|
| `ITM_EQUIP_YN` | 0 | Is item equipable? 0=no, 1=yes |
| `ITM_MENU_YN` | 1 | Is item usable from menu? 0=no, 1=yes |
| `ITM_BOARD_YN` | 2 | Is item usable from board? 0=no, 1=yes |
| `ITM_FIGHT_YN` | 3 | Is item usable from a fight? 0=no, 1=yes |
| `ITM_EQUIP_LOCATION` | 4 | Is item equippable on each body slot? (nArrayPos 1-7) |
| `ITM_EQUIP_HPUP` | 5 | HP increase upon equip |
| `ITM_EQUIP_DPUP` | 6 | DP increase upon equip |
| `ITM_EQUIP_FPUP` | 7 | FP increase upon equip |
| `ITM_EQUIP_SMPUP` | 8 | SMP increase upon equip |
| `ITM_MENU_HPUP` | 9 | HP increase upon use from menu |
| `ITM_MENU_SMPUP` | 10 | SMP increase upon use from menu |
| `ITM_FIGHT_HPUP` | 11 | HP increase upon use from battle |
| `ITM_FIGHT_SMPUP` | 12 | SMP increase upon use from battle |
| `ITM_USEDBY` | 13 | Not used by everyone? |
| `ITM_BUYING_PRICE` | 14 | Buying price |
| `ITM_SELLING_PRICE` | 15 | Selling price |
| `ITM_KEYITEM` | 16 | Key item? |

## Numerical board info

| Name | Value | Meaning |
|---|---|---|
| `BRD_SIZEX` | 0 | Board size x |
| `BRD_SIZEY` | 1 | Board size y |
| `BRD_AMBIENTRED` | 2 | Ambient red array for tiles (nArrayPos1 1-50, nArrayPos2 1-50, nArrayPos3 1-8) |
| `BRD_AMBIENTGREEN` | 3 | Ambient green array for tiles (nArrayPos1 1-50, nArrayPos2 1-50, nArrayPos3 1-8) |
| `BRD_AMBIENTBLUE` | 4 | Ambient blue array for tiles (nArrayPos1 1-50, nArrayPos2 1-50, nArrayPos3 1-8) |
| `BRD_TILETYPE` | 5 | Tile type array for tiles (nArrayPos1 1-50, nArrayPos2 1-50, nArrayPos3 1-8) (0=normal, 1=solid, 2=under, 3=ns normal, 4=ew normal, 11=elevate to level 1, ..., 18=elevate to level 8) |
| `BRD_BACKCOLOR` | 6 | Board background color (save as a long 3 (4) byte color value) |
| `BRD_BORDERCOLOR` | 7 | Board border color (save as a long 3 (4) byte color value) |
| `BRD_SKILL` | 8 | Board skill level |
| `BRD_FIGHTINGYN` | 9 | Fighting on board? 1=yes, 0=no |
| `BRD_CONSTANTS` | 10 | Board constants array (nArrayPos1 1-10) |
| `BRD_PRG_X` | 11 | Program x position (nArrayPos1 0-50) |
| `BRD_PRG_Y` | 12 | Program y position (nArrayPos1 0-50) |
| `BRD_PRG_LAYER` | 13 | Program layer position (nArrayPos1 0-50) |
| `BRD_PRG_ACTIVATION` | 14 | Program activation (nArrayPos1 0-50) 0=always active, 1=conditional activation |
| `BRD_PRG_ACTIV_TYPE` | 15 | Program activation type (nArrayPos1 0-50) 0=step on, 1=conditional (activation key) |
| `BRD_ITM_X` | 16 | Program x position (nArrayPos1 0-10) |
| `BRD_ITM_Y` | 17 | Program y position (nArrayPos1 0-10) |
| `BRD_ITM_LAYER` | 18 | Program layer position (nArrayPos1 0-10) |
| `BRD_ITM_ACTIVATION` | 19 | Program activation (nArrayPos1 0-10) 0=always active, 1=conditional activation |
| `BRD_ITM_ACTIV_TYPE` | 20 | Program activation type (nArrayPos1 0-10) 0=step on, 1=conditional (activation key) |
| `BRD_PLAYERX` | 21 | Starting player x position |
| `BRD_PLAYERY` | 22 | Starting player y position |
| `BRD_PLAYERLAYER` | 23 | Starting player layer position |
| `BRD_SAVING_DISABLED` | 24 | Is saving disabled? |

## Literal board info

| Name | Value | Meaning |
|---|---|---|
| `BRD_TILE` | 0 | Tile array (nArrayPos1 1-50, nArrayPos2 1-50, nArrayPos3 1-8) |
| `BRD_BACK_IMAGE` | 1 | Background image |
| `BRD_BORDER_IMAGE` | 2 | Border image |
| `BRD_DIR_LINK` | 3 | Directional links (nArrayPos1 1-4) (1=n, 2=s, 3=e, 4=w) |
| `BRD_FIGHT_BKG` | 4 | Fighting background |
| `BRD_MUSIC` | 5 | Board music |
| `BRD_LAYER_NAME` | 6 | Layer title (nArrayPos1 1-8) |
| `BRD_PRG` | 7 | Program filenames (nArrayPos1 0-50) |
| `BRD_PRG_GFX` | 8 | Program graphics (nArrayPos1 0-50) |
| `BRD_PRG_ACTIVE_VAR` | 9 | Program activation var (nArrayPos1 0-50) |
| `BRD_PRG_DONE_VAR` | 10 | Program activation var at end of program (nArrayPos1 0-50) |
| `BRD_PRG_ACTIVE_INIT` | 11 | Program activation var value at beginning of program (nArrayPos1 0-50) |
| `BRD_PRG_DONE_INIT` | 12 | Program activation var value at end of program (nArrayPos1 0-50) |
| `BRD_ITM` | 13 | Item filenames (nArrayPos1 0-10) |
| `BRD_ITM_ACTIVE_VAR` | 14 | Item activation var (nArrayPos1 0-10) |
| `BRD_ITM_DONE_VAR` | 15 | Item activation var at end of program (nArrayPos1 0-10) |
| `BRD_ITM_ACTIVE_INIT` | 16 | Item activation var value at beginning of program (nArrayPos1 0-10) |
| `BRD_ITM_DONE_INIT` | 17 | Item activation var value at end of program (nArrayPos1 0-10) |
| `BRD_ITM_PROGRAM` | 18 | Item step on program (nArrayPos1 0-10) |
| `BRD_ITM_MULTI` | 19 | Item multitask program (nArrayPos1 0-10) |

## Canvas popup definitions

| Name | Value | Meaning |
|---|---|---|
| `POPUP_NOFX` | 0 | Show the canvas with no special effects |
| `POPUP_VERTICAL` | 1 | Vertical scroll from centre |
| `POPUP_HORIZONTAL` | 2 | Horizontal scroll from centre |

## Message window definitions

| Name | Value | Meaning |
|---|---|---|
| `MW_OK` | 0 | Show message window with 'OK' option |
| `MW_YESNO` | 1 | Show message window with 'YES' and 'NO' options |
| `MWR_OK` | 1 | Message window returned 'OK' |
| `MWR_YES` | 6 | Message window returned 'YES' |
| `MWR_NO` | 7 | Message window returned 'NO' |

## Target and source entities

| Name | Value | Meaning |
|---|---|---|
| `TYPE_PLAYER` | 0 | Target type player |
| `TYPE_ITEM` | 1 | Target type item |
| `TYPE_ENEMY` | 2 | Target type enemy |

## Menu types

| Name | Value | Meaning |
|---|---|---|
| `MNU_MAIN` | 1 | Main menu requested |
| `MNU_INVENTORY` | 2 | Inventory menu requested |
| `MNU_EQUIP` | 4 | Equip menu requested |
| `MNU_ABILITIES` | 8 | Abilities menu requested |

## RPGCode data types

| Name | Value | Meaning |
|---|---|---|
| `PLUG_DT_VOID` | -1 | Void data |
| `PLUG_DT_NUM` | 0 | Numerical data |
| `PLUG_DT_LIT` | 1 | Literal data |
