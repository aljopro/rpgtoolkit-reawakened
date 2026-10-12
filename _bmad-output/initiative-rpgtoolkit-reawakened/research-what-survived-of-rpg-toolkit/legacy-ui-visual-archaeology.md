# RPG Toolkit 2.20b: editor and runtime UI, figure catalog

Compiled 2026-10-11. Replaces an earlier catalog of the same name that was written without looking at the images and contained invented details (20 of 31 pixel dimensions were wrong, and several controls it listed do not appear in the figures).

## What this is, and what it is not

The source is the illustrated manual shipped with **RPG Toolkit 2.20b (2002)**: `archive-org/rpg-toolkit-220b/help220.upd`. The file holds a zip whose bytes are each shifted up by one; subtracting 1 from every byte from offset `0x3f` recovers the zip (`PK\x03\x04`). It unpacks to `help1.htm` and `help1_files/`, copied to `research/legacy-ui-help-images/`.

- **122 image files = 61 distinct pictures.** Word's "save as web page" wrote every figure twice: an odd-numbered PNG at original size and the next even-numbered JPG, sometimes scaled down. Nine of the pictures are 24x24 toolbar icons.
- **This is the Toolkit 2 UI, not Toolkit 3.** Reawakened targets Toolkit 3 (vector boards, plugin-based menu and battle, a different editor). Nothing here shows the Toolkit 3 editor. **That gap is still open**: no Toolkit 3 editor screenshots have been found in the archive. Wayback captures of the old community sites and tutorial videos are the likely sources; the legacy source repository must not be opened for this (guard-rail G7).
- The internal menu and fight screens below belong to Toolkit 2.20b. In Toolkit 3 the stock menu and battle became plugins, so these are historical reference for behaviour and layout, not a spec for the Toolkit 3 screens.

## How this was checked

| Check | Result |
|---|---|
| Pixel sizes measured from the files by script and compared with every size written below | 105 of 105 match |
| Every "Manual says" quotation checked against the text of `help1.htm` | 67 of 67 quoted segments found verbatim |
| Figures viewed | Every PNG was viewed while writing its entry; most JPG twins were measured only (the first pairs were viewed and match); three entries (Figs 075, 107, 115) were re-viewed independently and agree |

Where the manual's text and the picture beside it disagree, the entry says so (list at the end).

## Figures

Source: help1.htm + help1_files/. Sizes measured from file headers. All screenshots show Windows 9x/XP-style grey dialogs. "Manual says" quotes are verbatim text from help1.htm near the figure (the figure sits immediately before the text that follows it unless noted). Odd-numbered PNG = original size; even-numbered JPG = same picture (scaled only where the size differs). JPGs were viewed for pairs 001/002, 003/004, 023/024 and confirmed identical in content; the other JPGs were not individually viewed (sizes only, listed in headings).

### Fig 001 - Main Menu (files image001.png 576x432 / image002.jpg 420x315)
Manual says: "Once the splash screen goes away, you will see the Main Menu screen, which has buttons that will take you to different places in the program."
Shows: A full-screen mock-up. Title bar "RPG Toolkit Development System, Version 2.2 (newgame)" (version digits small, read as 2.2). Menu bar: "File", "Editor", "Tools", "Help". Below it a small icon toolbar row. Left edge: a vertical column of about 14 buttons, each with a small icon and a label starting "Ed..." (e.g. truncated labels such as "Edit Board", "Edit Tile" style; only the leading letters are legible). Background is a dark blue swirl pattern; large title text at bottom "RPG Toolkit Development System" with "VERSION 2" beneath. Semi-transparent overlapping windows float over the background: a tile editor (colour grid, green tile art), a board editor (title "Board Editor - ..." with a blue background), a code-editor-like window with text lines, and a character sprite at lower right. A white file list with short names sits at top right. A status bar at the bottom shows a date and time (small, partly illegible).
Not visible / uncertain: exact button labels in the left column (cut off/too small); exact status-bar date/time; text inside the overlapping windows; the figure is a composite, not a plain screenshot.

### Fig 003 - Edit Tile (files image003.png 373x329 / image004.jpg 373x329)
Manual says: "Enter the Tile Editor by clicking on “Edit Tile” from the Main Menu."
Shows: Window "Tile Editor (Untitled)" with menu bar "File", "Edit", "Colour", "Draw", "Tools", "Import", "Help". Left/centre: a large pixel grid (blue grid lines over a grey/white checker), the full height of the window. Right column, top to bottom: group "Detail Level" with radio buttons "Low (16x16)" and "High (32x32)" (High selected); group "Colour Depth" with "16 Colours", "256 Colours", "16 Million Colours" (16 Million selected); a row of three icons (new page, open folder, save disk); a row of three icons (grid, an undo-arrow-style icon, a magnifier/disk icon); then a 3x3 tool palette: row 1 pencil, eyedropper, fill bucket; row 2 eraser, line, circle outline; row 3 filled circle, rectangle outline, filled rectangle (see icon group below); a "Scroll" group with buttons "W", "N", "S", "E"; a small white square above Scroll and a box labelled "Current Colour" (white) at lower right. Bottom: a horizontal rainbow/gradient colour bar. Lower left of the grid: coordinate text "(30,12)".
Not visible / uncertain: function of the two icons in the second toolbar row beyond their appearance; the tile contents (grid empty).

### Figs 005-022 - Tile Editor tool icons (nine 24x24-ish icons; PNG/JPG pairs)
Files: image005.png/image006.jpg 24x24; image007/008 24x24; image009/010 25x24; image011/012 24x24; image013/014 24x24; image015/016 24x24; image017/018 24x25; image019/020 24x25; image021/022 24x25. Only the PNGs were viewed (enlarged); each sits on a light grey button face.
Manual says (one line per icon, each verbatim):
- Fig 005: "Pencil Tool – Used to draw the tile."
- Fig 007: "Eyedropper Tool – Used to capture colors off the tile."
- Fig 009: "Fill Tool – Used to flood fill parts of the tile."
- Fig 011: "Eraser – Used to erase pixels from the tile."
- Fig 013: "Line Tool – Used to draw lines."
- Fig 015: "Circle Tool – Used to draw circles."
- Fig 017: "Filled Circle Tool – Used to draw filled circles."
- Fig 019: "Rectangle Tool – Used to draw rectangles."
- Fig 021: "Filled Rectangle Tool – Used to draw filled rectangles."
Shows:
- 005 yellow pencil, red eraser tip, black point, pointing lower left.
- 007 eyedropper: black bulb at top right, yellow glass tube running to lower left.
- 009 tilted yellow paint bucket (white highlight) with dark blue spill/outline on the left side.
- 011 blue eraser block with white band, on a grey shadow.
- 013 black diagonal line from upper left to lower right.
- 015 black octagonal/round outline, white inside.
- 017 same shape filled with bright blue (dithered), black outline.
- 019 black rectangle outline, white inside.
- 021 same rectangle filled with bright blue (dithered), black outline.
These match the tool palette seen in Fig 003 in the same order (pencil, eyedropper, fill / eraser, line, circle / filled circle, rectangle, filled rectangle).
Not visible / uncertain: the JPG copies were not viewed.

### Fig 023 - Edit Board (files image023.png 384x290 / image024.jpg 384x290)
Manual says: "So, the first thing you want to do is select “Edit Board” from the Main Menu screen."
Shows: Window "Board Editor (Untitled)". Menu bar: "File", "Board Settings", "Board Lighting", "RPGCode", "Help". Toolbar row of small icons (new, open, save, a multi-disk save, grid, undo-style, magnifier, a split-panel icon, two lock icons, an eraser). Beneath: label "Tile Lighting:" with two small input boxes and a horizontal scroll bar; a strip of coloured small triangle markers (grey, blue, magenta, green, red, then yellow) with the text "Tile Type:  Solid" under it; a button "Toggle"; a dropdown showing "Layer One"; a button "Draw All Layers". At far right a small panel: "Tile:" "None", "Draw Lock" and a coordinate "9, 6". The main area below is entirely white and empty. A vertical scroll bar is partly visible at the right edge.
Not visible / uncertain: icon functions; the small triangle strip is only colour-readable.

### Fig 025 - Layering, stairs (files image025.png 384x290 / image026.jpg 384x290)
Manual says: "First of all, you will have to create a board on layer 1."
Shows: "Board Editor (layer.brd)", same menus/toolbar as Fig 023. Tile type line reads "Tile Type: Stairs to layer 2" (text slightly small). Layer dropdown "Layer One". Right panel shows "Tile:" with a file name like "default.tst:04" and "Draw Lock" coordinate "8, 4". The map area: a brown stone/dirt floor with a darker grey border; rows of small coloured triangles (blue, white/grey) overlay the tiles as type markers, and a small yellow marker/sprite near the centre.
Not visible / uncertain: exact tile file name; meaning of the marker colours (not stated in the figure).

### Fig 027 - Layering, second layer (files image027.png 384x290 / image028.jpg 384x290)
Manual says: "The second layer should just be something like a ledge—something that hangs over layer one and which the player can walk on."
Shows: "Board Editor (layer.brd)"; Tile Type "Normal"; dropdown "Layer Two". Map area is white where empty, with a dark-grey stone border band at top, left and right and a bottom row, forming a ledge shape; type-marker triangles (blue and grey) sit over the tiles; a small sprite near the centre. Right panel shows a tile name and "4, 5".
Not visible / uncertain: tile file name digits.

### Fig 029 - Layering, Draw All Layers (files image029.png 384x290 / image030.jpg 384x290)
Manual says: "What you can do is lay down the grass tiles on layer one, then switch to layer two and lay down the tree tiles over top of the grass tiles."
Shows: "Board Editor (layer.brd)", dropdown "Layer Two", Tile Type "Normal". The map is a rendered view (no type markers): brown cobble/dirt floor with grey stone border bands and darker shadowed edges; the "Draw All Layers" button looks pressed. Right panel "10, 1".
Not visible / uncertain: Caption/figure mismatch: the manual text talks about grass and trees; the picture shows the brown ledge from the previous figures, not grass or trees.

### Fig 031 - Set Program (files image031.png 307x335 / image032.jpg 307x335)
Manual says: "In order for RPGCode programs to be executed, the player must have to opportunity to run them from the board."
Shows: Dialog titled "Set Program" with a bold heading "2, 5 Layer 1". Fields top to bottom: "Filename" text box with button "Browse..."; button "Advanced <<" (focused, dotted outline) and button "Set Program" at right; group "Activation Type" with radio buttons "Player Steps On This Program" (selected) and "Player Presses Activation Key Beside Program"; group "Graphic" with label "Display Program As", text box and "Browse..."; group "Activation" with radio buttons "Always Active" (selected) and "Conditional Activation", a note "Note: If you only want to run the program once, click on Conditional Activation and leave the defaults.", greyed fields "Active If Variable" ("BoardName(251)" = "0") and "After Activation," ("BoardName(251)" = "1").
Not visible / uncertain: none.

### Fig 033 - Edit Character (files image033.png 405x311 / image034.jpg 405x311)
Manual says: "The character editor allows you to create players that you can use in your games."
Shows: Window "Character Editor (Untitled)", menu "File", "Help", toolbar of three icons (new, open, save). Two tabs "Stats" (active) and "Advanced". Inside group "Stats", labels and value boxes: "Character Name:" = "Undefined"; "Starting Experience:" 0; "Starting Health:" 0; "Initial Max Health:" 0; "Starting DP:" 0; "Starting FP:" 0; "Starting S Move Power:" 0; "Starting Max S Move Power:" 0; "Starting Level:" 0. Right side: a black square preview box, and five buttons "Profile...", "Special Moves...", "Graphics...", "Equipment...", "Levels...".
Not visible / uncertain: content of the "Advanced" tab.

### Fig 035 - Player Graphics (files image035.png 384x293 / image036.jpg 348x265)
Manual says: "You can edit the player graphics by clicking on the ‘Graphics’ button to the left."
Shows: Window "Character Graphics". Sections: "Standard Walking Graphics:" with four rows of boxes (labels above them, tiny; they appear to be four direction groups) holding small red/green character sprites, an "Animate!" button, and a note "These graphics are 64x64, but you can use 32x32 by filling in only the right column of each box." (small, partly legible); "Standard Fighting Graphics:" with four boxes of sprites and an "Animate!" button; "Defence Graphics:" with sprites and "Animate!"; "Special Move Graphics:" with four empty boxes; "Dead Graphics:" with four grey sprites and "Animate!"; "Fight At Rest Graphic:" one box with a sprite; "Custom Postures:" a row of nine numbered empty boxes (0-8); at the bottom text boxes "Fight Sound:" (fight.wav), "Defend Sound:" (hit.wav), "Death Sound:" (die.wav), "Special Move Sound:" (item.wav), each with a "Browse..." button. A small eraser icon is at the upper right.
Not visible / uncertain: the four walking-row labels (too small); the exact size numbers in the note.

### Fig 037 - Special Moves (files image037.png 373x203 / image038.jpg 373x203)
Manual says: "Special Moves are a form of special attack that the player can perform that is usually more powerful than standard attacks."
Shows: Window "Character Special Moves". Question "Does this character use Special Moves?" with radio buttons "Yes" and "No" (No selected). Label "Official Name Of Special Moves:" with text box "Sp'l Move". A list box listing "1- .spc", "2- .spc", "3- None" … "9- None" (scrolls). Right buttons "Change Special Move" and "Special Move Info". Bottom-left button "Remove".
Not visible / uncertain: list contents beyond item 9.

### Fig 039 - Equipment (files image039.png 320x193 / image040.jpg 320x193)
Manual says: "In the character editor, if you click on the Equipment button, a new window will open up."
Shows: Window "Equippable Items" with an "OK" button. Group "Standard Equipment Can Be Equipped On:" with six checked check boxes: "Head", "Neck Accessory", "Left Hand", "Right Hand", "Body Armour", "Legs". Group "Accessory List:" with a drop-down "Accessory 1" and a text box labelled "Name:" (empty).
Not visible / uncertain: none.

### Fig 041 - Character Levels (files image041.png 295x307 / image042.jpg 295x307)
Manual says: "There are some important things in this menu. First of all is the ‘Initial Experience Required For Level Progression’."
Shows: Window "Character Levels" with "OK" button. Group "Experience": "Initial Exp For Level Up:" 100; "Experience Required Increases By:" 2 with "%". Group "Level-Up": "Level-up Type:" radio buttons "Exponential" (selected) and "Linear"; "Maximum Level:" 99. Group "Skill Increase At Level-Up": "Max Health Increase By" 5 %, "DP Increase By" 5 %, "FP Increase By" 5 %, "Max SMP Increase By" 5 %, "Level up RPGCode" text box with "Browse...".
Note: the on-screen label reads "Initial Exp For Level Up:", not the manual's quoted wording.
Not visible / uncertain: none.

### Fig 043 - Edit Enemy (files image043.png 377x276 / image044.jpg 377x276)
Manual says: "To start off with, click on ‘Edit Enemy’ in the main menu to open up the enemy editor window."
Shows: Window "Edit Enemy (Untitled)", menu "File", "Help", three-icon toolbar (new, open, save). Group "Basic Info": "Name:" Enemy 1; "Max Health Points:" 100; "Special Move Power:" 0; "Fighting Power:" 50; "Defence Power:" 50. Group "Fighting Conditions": check box "Player can run from this enemy" (unchecked); greyed "Program to run when player runs:" with text box; "Chances of sneaking up on enemy: 1 in" 0; "Chances of enemy sneaking up on you: 1 in" 0. Right column buttons: "Graphics", "Special Moves", "Tactics", "Rewards", "Sounds", "Animations"; separate lower button "Add Enemy To Game".
Not visible / uncertain: none.

### Fig 045 - Enemy Graphics (files image045.png 255x159 / image046.jpg 255x159)
Manual says: "Finally, just hit ‘Import Graphic’."
Shows: Window "Edit Enemy Graphics". Top row: two small number spinners showing "4" and "8" (each with up/down or left/right arrows) and three icons (a floppy/folder-style icon, an undo arrow, a grid); a small white square at top right; below, a large empty white canvas area.
Not visible / uncertain: There is no visible button labelled "Import Graphic"; the manual's caption sentence refers to a step not shown (the figure shows only the empty editor, likely the first icon is the import action but that is not stated or visible as text).

### Fig 047 - Enemy Special Moves (files image047.png 374x154 / image048.jpg 374x154)
Manual says: "To edit these characteristics, click on the ‘Special Moves’ button in the enemy editor."
Shows: Window "Enemy Special Move Info" with an "OK" button at top right. Two list boxes side by side: "Special Moves:" and "Weaknesses:", each listing "0: None" … "10: None" (scrolling) with "Set" and "Remove" buttons to the right of each list.
Not visible / uncertain: none.

### Fig 049 - Enemy Tactics (files image049.png 320x120 / image050.jpg 320x120)
Manual says: "You can set the level of intelligence that the enemy has by clicking on the ‘Tactics’ button in the Enemy Editor."
Shows: Window "Enemy Tactics" (text slightly blurred). Group "Battle Tactics" containing a sub-group "Artificial Intelligence" with a horizontal slider and the value text "Low"; a check box "Instead of AI, use RPGCode guided tactics" (unchecked); greyed "Program to run:" text box and "Browse ..." button. "OK" button at top right.
Not visible / uncertain: none.

### Fig 051 - Enemy Animations (files image051.png 392x151 / image052.jpg 392x151)
Manual says: "To set the animations for the enemy, hit the Animations button in the Enemy Editor."
Shows: Window "Enemy Animations" with "OK" button. Group "Enemy Animations": four rows, each a label, empty text box and "Browse..." button: "Fight Animation", "Defence Animation", "Special Move Animation", "Death Animation".
Not visible / uncertain: none.

### Fig 053 - Edit Background (files image053.png 479x361 / image054.jpg 456x343)
Manual says: "A background is just a backdrop against which a fight happens."
Shows: Window "Edit Fight Background (Untitled)". Menu: "File", "Media", "Help". Toolbar: new, open, save, a multi-disk icon, then grid and undo-style icons. Label "Tile Lighting:" with two small input boxes and a horizontal scroll bar. Right: "Tile:" "default.tst:48" with a small green tile thumbnail, and a coordinate "17, 1". The canvas shows a green grass field with a band of tree tiles along the top.
Not visible / uncertain: no layer drop-down or tile-type strip is visible (unlike the Board Editor).

### Fig 055 - Background Music (files image055.png 383x217 / image056.jpg 383x217)
Manual says: "If you click on the Media menu and select Background Music, a new window will pop up."
Shows: Window "Background Music" with "OK" button. Group "Background Fight Music": a wide text box with "Browse..." and two small buttons (a play triangle and a stop square). Group "Menu Sounds:" with four rows each a text box showing "None" and a "Browse..." button: "Click in Menu Sound:", "Select from Menu Sound:", "Player is Ready Sound:", "Illegal Action Command:".
Not visible / uncertain: none.

### Fig 057 - Main File, Project Settings (files image057.png 395x314 / image058.jpg 395x314)
Manual says: "To edit a Main File, just click on the ‘Main File’ button on the main option screen."
Shows: Window "Main Project Editor (newgame.gam)", menu "File", "Help", three-icon toolbar (new, open, save). Tabs: "Project Settings" (active), "Startup Info", "RPGCode", "Fighting", "Day and Night", "Graphics", "Plugins". Group "Project Info": "Project Name:" newgame; "Project Path:" Game\newgame\. Group "Environment Settings:" with "Multitasking Speed", slider labelled "Fast" left, "2000 ms" centre, "Slow" right; "Version 1.4 Memory Protection:" radio buttons "Off" (selected) and "On".
Not visible / uncertain: none.

### Fig 059 - Main File, Startup Info (files image059.png 395x314 / image060.jpg 324x258)
Manual says: "Startup Info This is a very important section. It sets up where the player starts in the game."
Shows: Same window, tab "Startup Info" active. Group "Startup Conditions:" with "Initial Board File:" start.brd and "Initial Character File:" start.tem, each with a "Browse..." button.
Not visible / uncertain: none.

### Fig 061 - Main File, RPGCode tab (files image061.png 395x314 / image062.jpg 395x314)
Manual says: "The RPGCode tab allows you to specify some RPGCode options for your game."
Shows: Same window, tab "RPGCode" active. Group "Programs": "Run Time Program:" None; "Startup Program:" start.prg; "Game Over Program:" None (each with "Browse..."); "Use Built In Menu System?" radio "Yes" (selected) / "No"; button "Skin". Group "Action Keys": labels "Run Time Program Activation Key:", "Built In Menu Activation Key:", "General Activation Key:" with a white box containing "ENTR" and a button "More".
Not visible / uncertain: none.

Source: help1.htm + help1_files/. Sizes measured with `file` (PNG) and a JPEG header parse (JPG). All figures are PNG/JPG pairs; the JPG is a rescaled copy. I viewed the PNG of every pair, and the JPG of pairs 063/064, 065/066 and 069/070 (same picture; 070 is a smaller rescale of 069, 348x277 vs 395x314). Other JPGs were not viewed. Manual quotes use straight apostrophes (the HTML has curly ones). In the HTML each `<img>` follows the text quoted as "Manual says" (heading + preceding sentences), except where noted.

### Fig 063 - Main File: Fight Options (Fighting tab) (files image063.png 395x314 / image064.jpg 395x314)
Manual says: "Fight Options" (heading) then "In the Fighting box, you have the option to turn fighting on or off for the game. If you turn it on, you must edit the fight settings."
Shows: Window titled "Main Project Editor  (newgame.gam)" with Windows-XP-style title bar buttons at top right. Menu: "File", "Help". Below it a toolbar with three icons (new page, open folder, save disk). Tab row: "Project Settings", "Startup Info", "RPGCode", "Fighting" (selected), "Day and Night", "Graphics", "Plugins". Tab body has a group box "Fighting:" containing label "Fighting In Game:", a button "Edit..." under it, and two radio buttons "Yes" (selected) and "No" to the right. Rest of body empty. JPG viewed: identical.
Not visible / uncertain: none

### Fig 065 - Main File: Main Fight Options dialog (files image065.png 448x362 / image066.jpg 448x362)
Manual says: "There is a list of 501 enemy slots to the left. To add an enemy to one of those slots, just double-click on an empty slot." ... "Click on the enemy, and notice the box to the right. That box shows what the enemys skill level is."
Shows: Dialog "Main Fight Options" with an "OK" button at top right. Group "Main Fight Options" containing: group "Enemy Skill Level" with a scrolling list at left ("Enemy 0: enemy.ene" highlighted, then "Enemy 1: None" ... "Enemy 7: None", vertical scrollbar) and at right a label "Enemy Skill Level" over a text box containing "1". Group "Fighting Type:" with radios "Random" (selected) and "Planned", plus "Chances of getting in a fight: (1 in x)" text box containing "0". Group "Use Built In Fighting System?" with radios "Yes" (selected) and "No, Run Program", a text box and a "Browse..." button. Group "Fighting Style" with radios "Side View" (selected) and "Front View". JPG viewed: identical.
Not visible / uncertain: none (the list shows 8 of the 501 slots).

### Fig 067 - Main File: Day and Night tab (files image067.png 395x314 / image068.jpg 395x314)
Manual says: "Day and Night" (heading) then "Your game can alternate between day and night, and this tab is where you set these options."
Shows: Same "Main Project Editor  (newgame.gam)" window and tab row as Fig 063, with "Day and Night" selected. Group "Day and Night Options" with check box "Game is affected by day and night" (checked, focus rectangle). Inside it group "Day length" with radios "Day and night corresponds to Real World" (selected) and "The day is a set number of minutes long", then a disabled (greyed) text box showing "0" and label "Minutes".
Not visible / uncertain: none

### Fig 069 - Main File: Graphics tab (files image069.png 395x314 / image070.jpg 348x277)
Manual says: "Graphics" (heading) "This option lets you choose what resolution the Toolkit will use when your game is played." (the figure sits after the Day-and-Night paragraphs and before the Graphics heading text)
Shows: Same window and tab row, "Graphics" selected. Group "Screen Mode" with radios "Set Resolution" (selected), "Default Resolution", and a check box "Run Full-Screen" (unchecked); at right a framed group of three radios "640x480" (selected), "800x600", "1024x768". Group "Parallaxing" with radios "Full system enabled" (selected) and "Parallaxing disabled (fastest)". JPG viewed (348x277): same picture, smaller scale.
Not visible / uncertain: none

### Fig 071 - Edit Program: RPGCode Program Editor (files image071.png 424x325 / image072.jpg 424x325)
Manual says: "Edit Program" (heading) "So far, Ive talked a lot about RPGCode programs. And you probably dont know anything about RPGCode. Well, now its time to get your feet wet."
Shows: Window "RPGCode Program Editor (Untitled)". Menus: "File", "Run", "Generate Code", "Help". Toolbar: new, open, save icons, then a green right-pointing triangle, a red right-pointing triangle, and a bold "E" button. White monospace text area with two lines of code: `*a program` and `#Mwin("lalalala")` with text cursor after it; vertical scrollbar at right and horizontal scrollbar at bottom.
Not visible / uncertain: what the green and red triangles do (the manual text near the figure does not label them); I did not read further in the manual for this.

### Fig 073 - Debugging: RPGCode Debugger (files image073.png 413x350 / image074.jpg 413x350)
Manual says: "Debugging" (heading) "One of the most useful things that the Toolkit has available to it is the RPGCode debugger. It allows you to modify the way a program runs while it is running so you can see ..."
Shows: Window "RPGCode Debugger" with one menu "Debug". Top left text "Press ENTER to step thru your code". Top right buttons: "Modify Line", "Toggle Step Into", "Breakpoint", "Delete Line", "Insert Line", and the text "Off" at far right edge. Large code pane with RPGCode lines (`#fontsize( 8)`, `#BREAK()`, banner comment lines "**  Basic Startup Program." etc., `#Fontsize(12)`, `#itemwalkspeed("slow")`), one line of asterisks highlighted grey (current line). Below: label "Watch" over an empty list box, and buttons "Add Watch", "Delete Watch", "Modify Variable".
Not visible / uncertain: what "Off" refers to (not labelled).

### Fig 075 - Editing Events: Edit Event window (files image075.png 377x237 / image076.jpg 377x237)
Manual says: "Editing Events" "If you dont want to memorize RPGCode commands, you can create programs using the event editor. This displays an RPGCode program as a series of English events." "You can edit a program as an event by hitting the big E button in the RPGCode editor."
Shows: Dialog "Edit Event" with "OK" button top right. Group "Generate Event"; label "Current Event Contents:" over a list box with numbered lines (e.g. "0: ****...", "11: * Some initial settings.  Maybe you want to chan...", "12: FontSize - Change the font size.", "13: ItemWalkSpeed - Adjust the walking speed of items", "14: WalkSpeed - Set the speed at which the player wal...", "17: BorderColor - Change the border color." (highlighted), "18: Fade - Fade screen."). Buttons "Insert Line" and "Delete Line" under the list; faint footer text "Double click a line to edit the event." (low contrast).
Not visible / uncertain: the footer text is faint; exact line contents are truncated at the list edge.

### Fig 077 - Edit Item: Item Editor (files image077.png 401x283 / image078.jpg 401x283)
Manual says: "Edit Item" (heading) "A very important concept in the RPG Toolkit is the Item. What is an item? It can be pretty well anything."
Shows: Window "Item Editor (Untitled)", toolbar new/open/save. Left: label "Item Name (Handle):" with empty text box. Group "Item Abilities" with four check boxes, each followed by a greyed "Edit" button: "Equipable", "Menu-Driven", "Board-Driven", "Battle-Driven". Group "Buy/Sell" at right: "Purchase Price:" text "0" followed by "GP", "Selling Price:" "0" "GP", "Description:" empty box, check box "Key Item". Group "Item Usage" bottom left with radios "Used By All Characters" (selected) and "Used By Defined Characters". Button "Graphics..." at bottom right.
Not visible / uncertain: none

### Fig 079 - Item Abilities: Equipable Item Properties (files image079.png 384x240 / image080.jpg 384x240)
Manual says: "Equipable" "To make the item equipable, check off the box and then hit the Edit button that becomes available. This will pop up a new window."
Shows: Dialog "Equipable Item Properties" with "OK" at top right. Group "Equipable To:" check boxes "Head", "Neck", "Left Hand", "Right Hand", "Body Armou" (text appears clipped as shown), "Legs", "Special Accessory". Group "Effects of Equipping Item": "Max Health Increase By", "DP Increase By", "FP Increase By", "Max Sp! Move Power Increase By" each with a number box "0" and "Points" (the last label's glyphs are partly garbled in the image). Group "RPGCode": three rows with a text box "None" and "Browse" button: "Program To Run When Item Is Equipped:", "Program To Run When Item Is Removed:", "Animation To Use During Battle (if item is on right or left hand)".
Not visible / uncertain: exact spelling of "Body Armou" and "Max Sp! Move Power" (glyphs unclear/clipped).

### Fig 081 - Item Abilities: Menu-Driven Properties (files image081.png 346x161 / image082.jpg 346x161)
Manual says: "Menu Driven" "You can also make the item Menu Driven. This means that you can use the item from the internal menu of the game."
Shows: Dialog "Menu-Driven Properties", "OK" button top right (blurry). Group "Menu Properties" with group "Effects of Using Item": "Health Increases By" number box "0" "Points"; "SMP Increases By" "0" "Points"; faint grey note "Negative values decrease health/SM Power". Group "RPGCode": "Program To Run When Item Is Used:" text box "None" and "Browse" button.
Not visible / uncertain: image is soft/blurred; note text is low contrast.

### Fig 083 - Item Abilities: Board-Driven Properties (files image083.png 352x82 / image084.jpg 352x82)
Manual says: "Board Driven" "This option is probably the most used. If you want to make an NPC (Non-player-character), this is how you do it."
Shows: Short wide dialog "Board-Driven Properties", "OK" button at right. Group "Board Properties": "Program To Run While Item Is On Board:" text "None" + "Browse..." ; "Program To Run When Item Is Picked Up:" text "None" + "Browse...". Blurry.
Not visible / uncertain: none. Caption/figure note: the manual text speaks of NPCs while the figure shows item-on-board programs only.

### Fig 085 - Edit Special Move: Special Move Editor (files image085.png 351x260 / image086.jpg 351x260)
Manual says: "Special moves can be used for everything from specialized physical attacks to powerful magical" [figure] "attacks. Its very easy to make a special move" (the figure interrupts the sentence).
Shows: Window "Special Move Editor (Untitled)", toolbar new/open/save. Fields (labels exact): "Name:" (empty), "Fight Power:" "0", "Amount of SMP Removed From Target:" "0", "Special Move Power Consumption:" "0", "Description:" (empty), "RPGCode Program:" (empty) + "Browse...", "Status Effect:" (empty) + "Browse...", "Effect Animation:" (empty) + "Browse...". Check boxes at bottom, both checked: "Battle-Driven", "Board-Driven".
Not visible / uncertain: none. Mismatch note: the manual text just before says "menu-driven" for the second option while the figure reads "Board-Driven".

### Fig 087 - Animated Tiles: Animated Tile editor (files image087.png 241x199 / image088.jpg 241x199)
Manual says: "Animated Tiles" "You can create animated tiles for your game. From the main screen, hit the Edit Animated Tile button. This opens the Tile Animation Editor." (figure sits after the end of the Special Moves text, immediately before this heading)
Shows: Small window titled "Animated Tile" with menu "File" and toolbar new/open/save. Left a white square preview box. Right a slider with labels "Slow" (left) and "Fast" (right) and text "1 of 1". Bottom row of buttons: two small arrow buttons (previous/next frame glyphs: "◂|" and "|▸"), a play triangle, a stop square, "Ins", "Del".
Not visible / uncertain: the window is titled "Animated Tile", not "Tile Animation Editor" as the text says. Function of the two small arrow buttons is not stated in the figure.

### Fig 089 - Animation Editor (files image089.png 329x294 / image090.jpg 329x294)
Manual says: "Animation Editor" "You can create animations composed of bitmapped images, such as GIF images to use in your game."
Shows: Window "Animation Editor (Untitled)", toolbar new/open/save. Large black square preview at top left. Right: group "Size" with radios "Small (64x64)" (selected), "Medium (128x128)", "Large (256x256)", "Other" with two disabled number boxes separated by "X" (both "0"). Slider labelled "Fast" (left) and "Slow" (right). Label "Sound" over an empty text box with an "X" button at its right. Label "Frame Transparent Colour" over a black colour bar with a "Select" button below. Text "1 of 0". Bottom-left buttons: two arrow buttons, a play triangle, "Ins", "Del".
Not visible / uncertain: none. Observation: speed slider here runs Fast-to-Slow, opposite order to Fig 087 (Slow-to-Fast).

### Fig 091 - Animation Editor: Status Effect Editor (files image091.png 281x313 / image092.jpg 281x313)
Manual says: "You can add a sound file for each frame by clicking in the Sound box." [figure] "Transparent Color" (the figure sits at the end of the Animation Editor text but shows a different window)
Shows: Window "Status Effect Editor (Untitled)", toolbar new/open/save. Group "General Info": "Status Effect Name:" empty box; "Number of Rounds Until Effect is Removed:" box "0" and a button "Until End of Fight". Group "Effects": check boxes "Speed Target Charge Time", "Slow Target Charge Time", "Disable Target", "Remove HP" with "Amount (neg values give hp)" box "0", "Remove SMP" with "Amount (neg values give smp)" box "0", "Run RPGCode Program" with a text box and a "Browse..." button.
Not visible / uncertain: none. Caption/figure mismatch: the text before the figure is about animation sound; the figure is the Status Effect Editor (the Status Effect section's text follows after it).

### Fig 093 - Tileset Manager: Tile Set Editor (files image093.png 193x153 / image094.jpg 193x153)
Manual says: "Tileset Manager" "You should use tilesets. The old .gph tiles are fine for getting to know the Toolkit, but youll really be doing yourself a favor by using tilesets."
Shows: Small window "Tile Set Editor". Large italic heading "Files To Add Filter" over an empty text box. Text "Wildcards are allowed (ie. *.gph, c*.gph, etc)." Three full-width buttons: "Add Files To Tileset", "Add Files Visually", "Browse A Tileset". A text box at the bottom, empty.
Not visible / uncertain: none

### Fig 095 - Tileset Manager: Add to Tileset dialog (files image095.png 249x211 / image096.jpg 249x211)
Manual says: "For example, *.gph will add all tiles into the tileset; c*.gph will add all tiles that start with the letter c." [figure] "Once you have filled out the filter box, just click on Add Files To Tileset."
Shows: Dialog "Add to Tilesetdefault.tst". Left label ".GPH Tiles In Directory" over a list holding one entry "a.gph" (highlighted); in the middle a small preview of a yellow-haired cartoon character, buttons "Add ->" and "<- Copy"; right label "Selected Tileset" over a list "Tile 1" ... "Tile 10" visible with a scrollbar. Below left: check box "Delete file when moved", buttons "Delete Selected File", "Remove Duplicates"; bottom right button "Stop!".
Not visible / uncertain: none

### Fig 097 - Font Editor (files image097.png 372x230 / image098.jpg 372x230)
Manual says: "Heres an example: In RPGCode, I could type:" [figure] "#Put(1,1,grass.gph)" (in Using Tilesets from RPGCode; the figure floats left of this text)
Shows: Window "Editing Font (Untitled)", toolbar new/open/save. Left: a black-on-white pixel grid showing a large capital "A"; below it a button "Go With It!" and small previews of "A" glyphs. Right: label "Please Type Something Here:" with a text area containing "Test", a button "Preview" and the rendered "Test" in bold underneath; check boxes "Bold", "Italics", "Underline" and a dropdown showing "8". Bottom strip: red-on-white rendering of the full character set (partly garbled).
Not visible / uncertain: Caption/figure mismatch: this is the font editor, unrelated to the surrounding Tilesets-from-RPGCode text (Word floated an unrelated figure there). Character-set strip is illegible in detail.

### Fig 099 - PakFiles: main toolbar crop with PakFile icon (files image099.png 189x73 / image100.jpg 189x73)
Manual says: "To create a PakFile, click on the PakFile icon on the main screen (the box with an arrow pointing into it)."
Shows: A zoomed crop of the main Toolkit window's top: menu text "...olkit" and "Help" cut off at left, then a toolbar row of icons: one dark/grey icon at far left, a page-with-arrows icon, a blue "MPJ"-like icon, a grey icon with a red element, a yellow box with a blue arrow (circled in red by a red ellipse: the PakFile icon), a globe icon, and a round icon with a figure inside a speech-bubble-like ring. Below, part of a window with "File" and a dark blue blotchy background. Blurry/low resolution.
Not visible / uncertain: purposes of the other icons are not given by this figure; the "MPJ" text is hard to read.

### Fig 101 - PakFiles: Pak File Compiler (files image101.png 320x93 / image102.jpg 320x93)
Manual says: "On this screen, you just have to select a filename for your PakFile, then you can hit the Create PakFile button. The Toolkit will handle the rest."
Shows: Short wide dialog "Pak File Compiler" with minimise/maximise/close buttons. Group "Pak File Manager" with a text box holding "F:\tktest\MAIN\myfile.tpk" and a "Browse..." button (focus rectangle). Right: buttons "Create PakFile" and "Cancel".
Not visible / uncertain: none

### Fig 103 - Starting Trans2.exe: Open Main File dialog (files image103.png 422x308 / image104.jpg 422x308)
Manual says: "Go ahead and start Trans2.exe. A file dialog will pop up. This dialog box lets you choose which main file you want to run."
Shows: A standard Windows 2000/XP-style "Open Main File" common dialog. "Look in:" combo with folder "MAIN"; left place bar ("My Recent Documents", "Desktop", "My Documents", "My Computer", "My Network Places"). File list in two columns: bugtest.gam, bugtest_nosprite.gam, bugtest_parallax.gam, DC.GAM, Demo.gam (selected, with tooltip "Type: GAM File / Date Modified: 3/8/2002 12:29 PM / Size: 1.91 KB"), demo_640.gam, demo_640_big.gam, demo_800_b..., demo_1024.g..., demo_big.gam, demo_internal.gam, fungame.gam, newgame.gam, one.gam, test.gam, test.tpk, testbig.gam, testlinks.gam, testmedia.gam, tutorial.gam. "File name:" Demo.gam; "Files of type:" Supported Files; check box "Open as read-only"; buttons "Open", "Cancel".
Not visible / uncertain: names of two files hidden by the tooltip.

### Fig 105 - Starting Trans2.exe: game start screen (files image105.png 480x360 / image106.jpg 360x270)
Manual says: "Runs the startup program." [figure] "Loads the initial character. Loads the opening board and places the character on it."
Shows: Full-screen black game title screen: white serif title "The Jewel Of Destiny"; below it a grey stone-textured horizontal bar with the words "New Game", "Load Game", "Quit"; a large rotated red gem image fills the centre-left; bottom-left white text "Copyright 1999 By Christopher B. Matthews" and "Developed with the RPG Toolkit Development System".
Not visible / uncertain: none. Note: the JPG is 360x270, a scaled copy (PNG is 480x360).

### Fig 107 - The Internal Menu: Main Menu (files image107.png 384x288 / image108.jpg 384x288)
Manual says: "The Internal Menu" "You can access the internal menu only if you have it enabled and have chosen an internal menu activation key in the main file."
Shows: Dark-blue 384x288 screen with italic white heading "Main Menu" at top left. Left: two party members, each with a portrait and text: "Frap  Level:1 / HP:100/100 / SMP:25/25" and "Tano  Level:1 / HP:110/110 / SMP:50/50". Right column of grey buttons: "Items", "Equip", "Abilities", "Customize", then a gap, "Save Game", "Load Game". Bottom right small text "GP: 0", "Steps: 59", "0h:01:34". Bottom left button "Exit to Windows"; bottom right button "Return to Game".
Not visible / uncertain: none

### Fig 109 - Item Submenu: Inventory (files image109.png 384x288 / image110.jpg 384x288)
Manual says: "Item Submenu" "When you press the Items button, a new window opens up. This is the players inventory."
Shows: Dark-blue screen, heading "Inventory". Large light-periwinkle list panel at left with a single entry "Basic Sword: 1". Right buttons "Use", "Info", "Drop"; bottom-right button "OK".
Not visible / uncertain: none

### Fig 111 - Equip Submenu: Equip Player (files image111.png 320x240 / image112.jpg 320x240)
Manual says: "Finally, you can drop any item by clicking on it and hitting the Drop button. This removes the item from inventory and it goes away." (figure after "Info" paragraph; shows the Equip screen that the next heading covers)
Shows: Dark-blue screen, heading "Equip Player". Top left portrait and stats "Frap  Level:1 / HP:100/100 / SMP:25/25 / Fight Power:20 / Defensive Power:5". Two list panels: "Equipped To:" with entries "Head", "Neck Accessory", "Left Hand", "Right Hand", "Body", "Legs"; and "Equipped:" with seven "None" entries. Right buttons (text blurry, probably "Equip"/"Remove") and bottom-right "OK".
Not visible / uncertain: the two top-right button labels are illegible at this size. Mismatch: the figure follows Inventory-submenu text but shows the Equip screen.

### Fig 113 - Abilities Submenu: Player Abilities (files image113.png 384x288 / image114.jpg 384x288)
Manual says: "Abilities Submenu" "The Abilities submenu allows you to see all of the special moves that the selected player can do."
Shows: Dark-blue screen, heading "Player Abilities". Top-left portrait with "Tano  Level:1 / Experience: 100 / HP:110/110 / SMP:50/50 / Fight Power:22 / Defensive Power:7"; to its right an empty white bar with italic text "Next Level: 0". Large list panel with one entry "#AttackAll - 26". Right buttons "Use", "Info"; bottom-right "OK".
Not visible / uncertain: none

### Fig 115 - Fighting: fight screen (files image115.png 320x240 / image116.jpg 320x240)
Manual says: "When a fight starts, the player is whisked away to a new screen. This will show the players facing the enemies they are fighting against the background image for the current ..."
Shows: 320x240 fight screen, black borders. Upper area: grey stone pillars/wall with a blue floor band bordered by yellow lines; a large brown rodent-like enemy at left; two small player sprites at right (side view). Bottom strip: left small grey box (text illegible, starts with "M..."); middle a white "Execute"-like button at left of a grey command list showing "Fight", "Item", "Run"; right a grey panel with two lines of purple/white stats text ("... HP: 100/100  SMP: 25/25", "Tano HP: 110/110 SMP: 50/50"); far right two colour gauge bars (red-to-cyan/magenta gradients) and grey empty bars.
Not visible / uncertain: bottom-strip text at this size is small; see Fig 117 for a readable crop.

### Fig 117 - The Fight Menu (files image117.png 379x52 / image118.jpg 379x52)
Manual says: "To the left is a list of enemies you are fighting. In the middle is the command menu. To the right is a list of your players, including their stats and charge times."
Shows: Wide strip of the fight menu on black. Left grey box listing "Mantis", "Mole", "Mole". Middle a small white button "Execute" then grey list "Fight" (highlighted), "Item", blank row, "Run". Right grey panel: "Frap  HP: 100/100  SMP: 25/25" (blue, italic, highlighted) and "Tano  HP: 110/110  SMP: 50/50" (dark). At far right a column of five bars: the top two show red/blue-cyan gradient fills (one with a thin yellow line), the lower three are empty grey.
Not visible / uncertain: bar meanings are given only in the manual text (not inspected here); the blank row between "Item" and "Run" is unlabelled.

### Fig 119 - Setting Up a Game For Distribution: Setup Utility Creator (files image119.png 408x239 / image120.jpg 408x239)
Manual says: "The Toolkit comes with a Setup Kit program that will create a setup file for you. You can run this program by hitting the Create Setup button in the Toolkit, ..."
Shows: Window "RPG Toolkit Setup Utility Creator". Group "Create Setup Utility": left a black picture showing a purple/green character figure, a small figure and a yellow folder with lines between them. Right fields: "Main File Of Game:" empty + "Browse...", "(Optional) 128 x 280 sidebar image:" empty + "Browse...", "Default Directory for Your Game:" "C:\Program Files\MyGame\", "Location of your RPG Toolkit Directory:" "f:\tktest". Bottom right buttons "Create Setup" and "Cancel".
Not visible / uncertain: none

### Fig 121 - Installing Upgrades: Auto-Update (files image121.png 361x297 / image122.jpg 288x237)
Manual says: "Upgrades occur with such frequency for a number of reasons:" [figure] "Bugs have been found and fixed. New features have been added to the Toolkit. ..."
Shows: Window "RPG Toolkit Auto-Update". Italic heading "RPG Toolkit Upgrade" over a round picture (bright light in a domed ceiling). Right text "This utility will install new updates for the RPG Toolkit. You can obtain your own free updates at http://www.rpgtoolkit.com"; bold "Please select a UPD or UDC file:" over a text box "Click here"; radios "Overwrite Windows\System Files" (selected) and "Relocate duplicated Windows\System Files". Bottom buttons "Cancel" and "Install Upgrade!". JPG is 288x237 (scaled).
Not visible / uncertain: none

## Where the manual's text and figure disagree

- Fig 029: the text talks about grass and trees; the figure shows the brown ledge board.
- Fig 045: the caption mentions "Import Graphic"; no such button is visible in the figure.
- Fig 041: the on-screen label is "Initial Exp For Level Up:", not the manual's wording.
- Fig 087: shows the "Animated Tile" window, not the "Tile Animation Editor" the text names.
- Fig 091: shows the Status Effect Editor, placed under animation-sound text.
- Fig 097: shows the Font Editor, placed inside the "Tilesets from RPGCode" text.
- Fig 111: shows the Equip screen, placed under the Inventory text.
- Fig 085: its "Board-Driven" check box conflicts with the text's "menu-driven".
- Fig 001 is a composite mock-up with tiny text; its left-hand button labels are illegible.

## Observed conventions (each bullet cites the figures that support it)

### From Figs 001-061
- Editors are separate top-level windows, each titled "<Editor name> (<file or Untitled>)" and with a File menu: Fig 003, 023, 033, 043, 053, 057.
- The new / open / save trio of icons is the first toolbar group in the editors: Fig 023, 033, 043, 053, 057.
- Tile and board editing offer a "Tile Lighting:" row with two small boxes and a scroll bar in both the Board Editor and the fight-background editor: Fig 023, 053.
- The Board Editor shows the current tile as "Tile:" plus a file:index name (e.g. "default.tst:04") and a coordinate readout at right: Fig 025, 029, 053.
- Board layers are chosen from a drop-down ("Layer One", "Layer Two") next to a "Draw All Layers" button: Fig 025, 027, 029.
- Per-tile type is shown as coloured triangle markers drawn over the map, with the active type named under a strip of markers: Fig 023, 025, 027.
- Files are chosen by a text box plus "Browse..." button throughout: Fig 031, 037 (via Change button), 041, 049, 051, 055, 059, 061.
- Sub-dialogs for one entity are opened from a right-hand column of buttons ("Profile...", "Special Moves...", "Graphics...", "Equipment...", "Levels..." for characters; "Graphics", "Special Moves", "Tactics", "Rewards", "Sounds", "Animations" for enemies): Fig 033, 043.
- Related options are grouped with etched-border group boxes with captions: Fig 003, 031, 041, 043, 057, 061.
- The Main Project Editor is a tabbed window with seven tabs: Fig 057, 059, 061.

### From Figs 063-121
- Editor windows are separate floating Windows windows with a title "<Name> (Untitled)" or filename in parentheses, a File/Help-style menu, and a three-icon new/open/save toolbar (Figs 063, 071, 077, 085, 087, 089, 091, 097).
- Settings are organised as tabbed pages (Fig 063: seven tabs) with titled group boxes inside (Figs 067, 069).
- Sub-dialogs for each item ability have an "OK" button at top right and a "Browse..." button next to each program-path field with default text "None" (Figs 079, 081, 083).
- Fields are plain labelled text boxes with "0" defaults and "Points"/"GP" unit labels (Figs 077, 079, 081, 085).
- RPGCode program hooks appear as "Program To Run ..." text box + Browse in item, special-move and status-effect editors (Figs 079, 081, 083, 085, 091).
- Fight, effect and animation editors use radio groups for modes and a slider for speed, but speed slider direction differs (Fig 087 Slow-Fast, Fig 089 Fast-Slow).
- The runtime internal menu is a dark-blue screen with italic white heading, light-periwinkle list panels, and grey buttons in a right-hand column with "OK"/"Return to Game" at bottom right (Figs 107, 109, 111, 113).
- Fight screen puts the enemy list at left, the command list in the middle ("Fight", "Item", "Run" with an "Execute" button), and party stats plus gauge bars at right in a bottom strip (Figs 115, 117).
- Standalone tools exist beyond the editor: Pak File Compiler, Setup Utility Creator, Auto-Update (Figs 101, 119, 121); the game launcher uses a standard Windows file dialog filtered to "Supported Files" (Fig 103).
- The manual's figure/caption alignment is unreliable in places because Word floated images (Figs 087, 091, 097, 111).

## Interpretation (mine, not observation)

These follow from the figures but are judgement calls to test with people, not requirements.

- **The Toolkit 2 editor was a set of single-purpose windows, not one workspace.** Each editor opens on its own with the same new/open/save trio and a File menu (Figs 023, 033, 043, 057, 071, 077). A modern editor can keep the one-job-per-screen clarity without copying the floating-window mechanics.
- **The event editor was a list, not blocks.** Fig 075 shows a numbered list of English-described lines ("FontSize - Change the font size.") with Insert Line and Delete Line, and the manual calls it "a series of English events". The idea of editing RPGCode as readable lines without memorising commands is supported; a drag-and-drop block editor is *not* something the original had.
- **Hooks were "program to run" fields.** Items, special moves and status effects all end in a "Program To Run ..." text box plus Browse (Figs 079, 081, 083, 085, 091). RPGCode attachment points were a consistent, discoverable pattern.
- **The stock fight screen offered Fight, Item and Run** (Figs 115, 117), with party stats and gauge bars in a bottom strip. The fight and menu screens were bitmap-era 320x240 and 384x288 layouts.
- **Distribution was three separate tools** (Pak File Compiler, Setup Utility Creator, Auto-Update: Figs 101, 119, 121), which fits the later complaint that shipping a game was not obvious.
