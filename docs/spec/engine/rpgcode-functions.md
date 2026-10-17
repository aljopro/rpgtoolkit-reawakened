# RPGCode built-in commands

All 282 command names the 3.1 engine registers, grouped by area. Names are case-insensitive. 14 names are aliases of another command. Signatures use the engine's own notation: `[x]` = optional parameter, `&` = the argument must be a variable (it receives a result), `ret` = the value the command returns. Types are `int`/`double` (numbers), `string`, `bool` (number or "on"/"off"), `canvas`/`thread`/`animation` (numeric handles).

<a id="e-94"></a>
**E-94 Built-in library.** About 280 functions, grouped by capability. Parity means every name in the catalogue resolves, with the same argument conventions, including optional trailing by-reference outputs and handles that accept a name, an index, `"source"` or `"target"`. The catalogue on this page is the 282 names the engine registers, aliases included.

**Compatibility notes.**

* **Binding is at compile time (R-35).** Calls to built-ins are bound when a program is compiled, so a script method with the same name as a built-in is never called at those call sites. If a name were registered twice the first registration would win. The control-flow words `if`, `elseif`, `else`, `while`, `until` and `for` are also built-ins internally but are documented in [rpgcode-language.md](rpgcode-language.md).

  **Reawakened rule.** A script method whose name matches a built-in is never called where the compiler binds the built-in — that is 3.1 behaviour, kept for parity — and the definition raises a **required warning** naming the built-in it shadows. The warning follows the owner's standing rule that every override warns (2026-10-11). This binding order is the reverse of the one the architecture spine's AD-8 described; the change is recorded here and applied by entry 3.8.
* **Obsolete commands (R-36).** A command marked *obsolete: raises an error* is a catchable runtime error, and its statement is skipped; a command marked *obsolete: warning* stays callable and shows a warning when warnings are on. Both kinds are handled the same way by an error handler. The eight names `empty`, `fbranch`, `mbox`, `newplyr` (`newplayer` is its alias), `restorearrayscreen`, `underarrow`, `itemwalkspeed` and `shopcolors` are part of the 282-name catalogue, and the command-effect catalogue JSON lists all 282 names.
* **`random(max)` edge cases and departures (Ruling 3).** *Legacy fact:* 3.1 drew from the C runtime generator (0..32767), took remainder by `max`, and added 1 (facts-round-6, Q6). `max` was truncated to an integer first. `max` 0 returned 1; negative `max` gave 1..|`max`|; NaN `max` gave 1..32768. Because the CRT draw ranged 0..32767, results never exceeded 32768, and the generator was seeded from the system clock at startup. **Reawakened rule:** MATCH the 3.1 edge cases: truncate `max` to an integer first (`Math.trunc`); `max` 0 returns 1; negative `max` gives 1..|`max`|; NaN `max` gives 1..32768. Deliberate departures: ranges above 32768 are NOT capped at 32768, and the draw comes from the injected deterministic RNG `1 + draw % max` rather than the system clock. Non-positive, non-integer and NaN arguments no longer raise `builtin.bad-arg`.
* **`getTickCount()` time source and departure (Ruling 5).** *Legacy fact:* 3.1 returned the Windows system uptime in milliseconds since the computer started, wrapping after ~49.7 days in 10–16 ms steps (facts-round-6, Q7). **Reawakened rule — deliberate departure:** `getTickCount()` returns the elapsed milliseconds since game startup based on the injected fixed 60 Hz simulation tick (`floor((tick * 1000) / 60)`), ensuring deterministic replays across platforms while preserving interval timing semantics.


## Message window, text & fonts (30)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `mwin` | `void mwin(string str)` | Show the message window. | Uses the logical-resolution message surface; the default geometry, colours and reveal speed are defined below. |
| `wait` | `string wait([string &ret])` | Wait for a key to be pressed, and return the key that was. |  |
| `mwincls` | `void mwincls()` | Clear and hide the message window. |  |
| `text` | `void text(double x, double y, string str, [canvas cnv])` | Displays text on the screen. | Uses fixed 8×16 logical-pixel cells; non-integer cell coordinates are truncated. |
| `pixeltext` | `void pixeltext(int x, int y, string str, [canvas cnv])` | Displays text on the screen using pixel coordinates. |  |
| `mbox` | `void mbox(string str)` | Show the message window. | alias of `mwin` |
| `font` | `void font(string font)` | Load a true type font. TK2 fonts are not supported. |  |
| `fontsize` | `void fontsize(int size)` | Set the font size. |  |
| `get` | `string get([string &ret])` | Get a key from the queue. |  |
| `bold` | `void bold(bool enable)` | Toggle emboldening of text. |  |
| `italics` | `void italics(bool enable)` | Toggle italicizing of text. |  |
| `underline` | `void underline(bool enable)` | Toggle underlining of text. |  |
| `wingraphic` | `void wingraphic(string file)` | Set the message window background image. |  |
| `wincolor` | `void wincolor(int dos)` | Set the message window's colour using a DOS code. |  |
| `wincolorrgb` | `void wincolorrgb(int r, int g, int b)` | Set the message window's colour. |  |
| `color` | `void color(int dos)` | Change to a DOS colour. |  |
| `colorrgb` | `void colorrgb(int r, int g, int b)` | Change the active colour to an RGB value. |  |
| `prompt` | `string prompt(string question, [string &ret])` | Ask the player a question and return the result. |  |
| `show` | `void show(string str)` | Show the message window. | alias of `mwin` |
| `print` | `void print(string text)` | Write the specified string one line down from the last call to text(). |  |
| `clearbuffer` | `void clearbuffer()` | Clear the keyboard buffer. |  |
| `textspeed` | `void textspeed(int speed)` | Set the message-window text speed. | `speed` is revealed glyphs per second; zero reveals immediately; the call does not wait. |
| `mwinsize` | `mwinsize(int percent)` | Obsolete. | obsolete: raises an error and the statement is skipped |
| `getcolor` | `void getcolor(int &r, int &g, int &b)` | Get the current colour. |  |
| `getfontsize` | `int getfontsize([int &ret])` | Get the current font size. |  |
| `statictext` | `void statictext()` | obsolete. | obsolete: raises an error and the statement is skipped |
| `msgbox` | `int msgbox(string text [,string title [, int style [, int textColor [, int backColor [, string bitmap]]]]])` | Display a message box containing one or two buttons, handled using a cursor map (keyboard input only). | Uses the deterministic centred panel and button order defined below, then waits for the cursor-map selection. |
| `gettextwidth` | `int gettextwidth(string text)` | Get the width of a string of text in pixels, relative to the current font and size. |  |
| `gettextheight` | `int gettextheight(string text)` | Get the height of a string of text in pixels, relative to the current font and size. |  |
| `setmwintranslucency` | `void setmwintranslucency(int percent)` | Set the translucency of the message window. 0% is invisible; 100% is opaque. |  |

<a id="e-55"></a>
**E-55 Message window ("mwin").** A dialogue box along the top of the screen, with a background colour or image, a size (per cent of the screen), translucency, a font, a size, bold/italic/underline and a colour. `Mwin(text)` appends a line and `MwinCls` hides and clears it; the text supports variable splicing (`<var>`), and the text speed is configurable.

<a id="reawakened-message-window-defaults"></a>
**Reawakened rule (OWNER; unverified default).** An author can show dialogue with `mwin(text)` and clear it with `mwincls()`; the message surface is deterministic and uses logical screen pixels. Its default rectangle is x = 10% of logical width, y = 4% of logical height, width = 80% and height = 24%, each rounded with `floor(value + 0.5)`. The inner margin is 8 logical pixels on every side, clamped to a non-negative rectangle. The default background is opaque DOS colour 0 and the default text is DOS colour 15; image, colour and translucency settings replace only their corresponding defaults. The default reveal rate is 60 glyphs per second, converted to whole fixed-60-Hz ticks. `textspeed(0)` reveals immediately; a negative value other than zero raises `builtin.bad-arg`; positive values update the rate and do not block.

<a id="message-window-text-and-fonts"></a>
**Reawakened rule (OWNER; FontRef-facing font semantics).** `font(name)` resolves a project asset by case-insensitive family name. If none resolves, `Arial`/sans-serif uses Liberation Sans, `Times New Roman`/serif uses Liberation Serif, and `Courier New`/monospace uses Liberation Mono, followed by the documented fallback family. A `.fnt` is selected when the name resolves to one or when the project is TK2; other names use family substitution. The draw-list `FontRef` carries `{ asset, size, bold, italic }`; underline remains a separate `line` command. Entry 4.3 owns the library and bundled assets.

## Program flow, errors & debugging (25)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `branch` | `void branch(label lbl)` | Jump to a label. |  |
| `change` | `void change(string program)` | Change this program so that next time it is triggered, a different program runs instead. Change() is active only while the player remains on the board (i.e., leaving... |  |
| `done` | `void done()` | End the program. |  |
| `dos` | `void dos()` | Quit the game. | Legacy alias of `quitGame`; emits one `quit` request and does not wait. |
| `windows` | `void windows()` | Quit the game. | Legacy alias of `dos` and `quitGame`; emits one `quit` request and does not wait. |
| `end` | `void end()` | End the program. |  |
| `fbranch` | `void fbranch(label lbl)` | Jump to a label. | alias of `branch` |
| `gone` | `void gone()` | Suppress the currently running board trigger until the board is left. | Writes only the `triggers` section and does not remove the source program or unrelated threads. |
| `over` | `void over()` | Show the game-over flow. | Requests the game-over flow owned by board-rendering; it does not choose host window behaviour. |
| `reset` | `void reset()` | Reset the game. | Clears the sections listed below, preserves `rng` and `time`, then reruns startup from E-02 step 3; the call does not wait. |
| `run` | `void run(string program)` | Transfer control to a different program. |  |
| `delay` | `void delay(double time)` | Delay for a certain number of seconds. |  |
| `godos` | `void godos(string command)` | Obsolete. | Obsolete: raises a catchable error and skips the statement; shell commands are unavailable. |
| `debug` | `void debug(bool enable)` | Toggle whether to show debug messages. |  |
| `rpgcode` | `void rpgcode(string line)` | Independently run a line of RPGCode. |  |
| `autocommand` | `void autocommand()` | Obsolete. | obsolete: shows a warning (when warnings are on) and still runs |
| `stop` | `void stop()` | End the program. | alias of `end` |
| `debugger` | `void debugger(string message)` | Show a debug message. |  |
| `setconstants` | `setconstants(...)` | Description. | obsolete: raises an error and the statement is skipped |
| `multirun` | `multirun()` | Multirun()'s behaviour depends on the program's context. |  |
| `iif` | `iif(condition, true, false)` | Obsolete. Use the tertiary operator result = (expression ? true part : false part) | obsolete: warning; use the `?:` operator |
| `gettickcount` | `int gettickcount()` | Get the number of milliseconds since Windows started. |  |
| `resumeNext` | `void resumeNext()` | Return to the statement after the statement where an error occurred. |  |
| `setErrorHandler` | `void setErrorHandler(label lbl)` | Set an error handler for the current function. This does not propagate up the call stack! Refer to the language features section of the manual for more information. |  |
| `setResumeNextHandler` | `void setResumeNextHandler()` | Cause errors in the current function to be silently ignored. |  |

## Variables, strings & math (30)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `empty` | `void empty()` | Clear all globals. |  |
| `random` | `int random(int max, [int &ret])` | Generate a random number from one to the supplied maximum, inclusive. |  |
| `castnum` | `double castnum(variant x, [double &ret])` | Cast the specified value to a number (double). There is really no need to do this ever. RPGCode by itself will cast values passed to functions to the correct types as... |  |
| `castlit` | `string castlit(variant x, [string &ret])` | Cast the specified value to a string. There is really no need to do this ever. RPGCode by itself will cast values passed to functions to the correct types as required. |  |
| `castint` | `int castint(variant x, [int &ret])` | Cast the specified value to an integer (i.e., a number in the sequence ...-2, -1, 0, 1, 2...). This is useful for removing fractional parts of numbers. Note that this... |  |
| `charat` | `string charat(string str, int pos, [string &ret])` | Get a character from a string. The first character is one. |  |
| `kill` | `void kill(variant &var, ...)` | Delete variables. |  |
| `sin` | `double sin(double x, [double &ret])` | Calculate sine x. |  |
| `cos` | `double cos(double x, [double &ret])` | Calculate cosine x. |  |
| `tan` | `double tan(double x, [double &ret])` | Calculate tangent x. |  |
| `sqrt` | `double sqrt(double x, [double &ret])` | Calculate the square root of x. |  |
| `local` | `variant &local(variant &var, [variant &ret])` | Allocates a variable off the stack and returns a reference to it. |  |
| `global` | `variant &global(variant &var, [variant &ret])` | Allocates a variable on the heap and returns a reference to it. |  |
| `length` | `int length(string str[, int &ret])` | Get the length of a string. |  |
| `len` | `int len(string str[, int &ret])` | Get the length of a string. | alias of `length` |
| `instr` | `int instr(string haystack, string needle[, int offset])` | Returns the first occurence of needle within haystack, optionally starting from an offset. Both the return value and the offset are one-based. |  |
| `splicevariables` | `string splicevariables(string str)` | Replaces substrings within angle brackets by the value of variables with respective names. |  |
| `split` | `int split(string str, string delimiter, array arr)` | Splits a string at a delimiter. Returns the number of upper bound of the array (i.e. the index of the last set element). |  |
| `asc` | `int asc(string chr[, int &ret])` | Get the ASCII value of a character. |  |
| `chr` | `string chr(int asc, [string &ret])` | Get the character represented by the ASCII code passed in. |  |
| `trim` | `string trim(string str, [string &ret])` | Trim whitespace from a string. |  |
| `right` | `string right(string str, int amount, [string &ret])` | Get characters from the right of a string. |  |
| `left` | `string left(string str, int amount[, string &ret])` | Get characters from the left of a string. |  |
| `log` | `double log(double x, [double &ret])` | Returns n such that en = x. |  |
| `autolocal` | `void autolocal(bool bEnabled)` | Set the default scope for variable resolution. When autolocal() is not enabled, variables are assumed to be global unless a local variable has been defined. When... |  |
| `lcase` | `string lcase(string str, [string &ret])` | Convert a string to lowercase. |  |
| `ucase` | `string ucase(string str, [string &ret])` | Convert a string to uppercase. |  |
| `mid` | `string mid(string str, int start, int length[, string &dest])` | Obtain a substring. The offset is one-based. |  |
| `replace` | `string replace(string str, string find, string replace[, string &dest])` | Replace within a string. |  |
| `regexpreplace` | `string regexpreplace(string subject, string pattern, string replace)` | Replace using a regular expression. |  |

## Threads (7)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `thread` | `thread thread(string file, bool persist, [thread &ret])` | Start a thread. |  |
| `killthread` | `void killthread(thread id)` | Kill a thread. |  |
| `getthreadid` | `thread getthreadid([thread &ret])` | Get the ID of this thread. |  |
| `threadsleep` | `void threadsleep(thread id, double seconds)` | Put a thread to sleep. |  |
| `tellthread` | `variant tellthread(thread id, string code)` | Execute code in the context of a thread (e.g., to run a method located in another thread). TellThread() returns the value returned by the function called in the thread. |  |
| `threadwake` | `void threadwake(thread id)` | Wake up a thread. |  |
| `threadsleepremaining` | `double threadsleepremaining(thread id, [double &ret])` | Check how much sleep remains for a thread. |  |

<a id="board-tiles-vectors-and-screen-effects"></a>
## Board, tiles, vectors & screen effects (33)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `send` | `void send(string file, int x, int y, [int z = 1])` | Send the player to a new board. |  |
| `fade` | `void fade(int type)` | Perform a fade using the current colour. There are several different types of fades. | Types 1–4 use a 30-tick blocking transition; invalid types raise `builtin.bad-arg`. |
| `viewbrd` | `void viewbrd(string filename [, int x, int y [, canvas cnv]])` | Draw a board to the screen or to a canvas, starting at co-ordinates topX, topY. |  |
| `move` | `void move(int x, int y, [int z = 1])` | Move this board program to a new location on the board. The effect lasts until the board has been left. |  |
| `prg` | `void prg(string program. int x, int y, [int z = 1])` | Move a program on the current board to a new location. This stays in effect until the board is left. |  |
| `put` | `void put(int x, int y, string tile)` | Puts a tile at the specified location on the board. The tile persists only until the program ends. Use LayerPut() to place a tile for the duration the user is on the... |  |
| `tiletype` | `void tiletype(int x, int y, string type, [int z = 1])` | Change a tile's type. Valid types for the string parameter are "NORMAL", "SOLID", "UNDER", "NS", "EW", "STAIRS#". |  |
| `mainfile` | `void mainfile(string gam)` | Load a new main file. | Requests the board-rendering lifecycle to switch the project; the call does not wait. |
| `scan` | `void scan(int x, int y, int pos)` | Save the tile specified to a buffer identified by pos. There is no particular number to pick for pos; any will do. | deprecated, still works |
| `mem` | `void mem(int x, int y, int pos)` | Lay a scanned tile on the screen at the specified position. | deprecated, still works |
<a id="reawakened-camera-built-ins"></a>
| `zoom` | `zoom(int percent)` | Zoom into the centre of the board by the specified percent. | 1–400 is the target scale percentage, 100 is one-to-one, and the transform applies immediately without waiting. |
| `earthquake` | `earthquake(int intensity)` | Make the screen jump more strongly as intensity rises, from 1 (barely noticeable) to 10 (strongest). The command waits until the shaking ends. | **Technical (OWNER):** clamp `intensity` to 1..10, then run `i` consecutive `shake(amplitudeForIntensity(p), 4)` calls for `p = 1..i`; each pass is four ticks, so the command blocks for `4*i` ticks. `amplitudeForIntensity(p) = p * PX_PER_INTENSITY`, with `PX_PER_INTENSITY = 1` logical pixel. Pass/corner facts are owner-relayed legacy facts logged by entry 2, never source-derived here. |
| `getcorner` | `void getcorner(int &topX, int &topY)` | Get the corner of the currently shown portion of the board. |  |
| `cameraPanTo` | `void cameraPanTo(double x, double y, double duration, string easing)` | Pan the camera to a point. | Reawakened addition; duration is seconds; easing is `linear`, `smoothstep`, `easeIn`, `easeOut` or `easeInOut`; non-blocking. |
| `cameraFollow` | `void cameraFollow(int entityId)` | Follow an entity with the camera. | Reawakened addition. |
| `cameraReset` | `void cameraReset()` | Restore default player-follow camera behaviour. | Reawakened addition. |
| `cameraShake` | `void cameraShake(double duration, double amplitude)` | Make the camera wobble for a while; a larger amplitude feels stronger, and the command does not hold up the script. | **Technical (OWNER):** duration is seconds and amplitude is logical-viewport pixels; `durationTicks = ceil(duration × 60)`, minimum one tick for positive duration; use the shared deterministic `shake(amplitude, ticks)` primitive, non-blocking, with a new shake replacing the active one and no RNG draw. |
| `layerput` | `void layerput(int x, int y, int layer, string tile)` | Place a tile on the board for the duration the player is on the board. |  |
| `getboardtile` | `string getboardtile(int x, int y, int z, [string &ret])` | Get the file name of the tile at x, y, z. |  |
| `boardgettile` | `string boardgettile(int x, int y, int z, [string &ret])` | Get the file name of the tile at x, y, z. | alias of `getboardtile` |
| `getboardtiletype` | `string getboardtiletype(int x, int y, int z[, string &ret])` | Get the type of a tile. |  |
| `forceredraw` | `void forceredraw()` | Force a redrawing of the screen. |  |
| `wipe` | `wipe(string file, int effect [, int speed])` | 'Wipe' a graphic to the screen. file: filename of the image to wipe to. effect: numeric value between 1 and 12. The valid types are: | Effects 1–12 use integer percentage progress; omitted speed is 4 points per fixed tick and the call blocks until completion. |
| `parallax` | `parallax(int setting)` | obsolete. | obsolete: raises an error and the statement is skipped |
| `animatedtiles` | `void animatedtiles()` | Toggle animated tiles. | obsolete: raises an error and the statement is skipped |
| `smartstep` | `void smartstep()` | Toggle "smart" stepping. | obsolete: raises an error and the statement is skipped |
| `getboardname` | `string getboardname([string ret])` | Get the current board's file name. |  |
| `setambientlevel` | `void setambientlevel(int red, int green, int blue)` | Set the global ambient level. Valid values range from -255 to + 255. |  |
| `boardgetvector` | `int boardgetvector()` | void boardGetVector(variant vector, int &type, int &pointCount, int &layer, bool &isClosed, int &attributes) |  |
| `boardsetvector` | `void boardsetvector(variant vector, int type, int pointCount, int layer, bool isClosed, int attributes)` | Sets the properties of a given vector. |  |
| `boardgetvectorpoint` | `void boardgetvectorpoint(variant vector, int pointIndex, int &x, int &y)` | Get a single point on a board vector. x, y are always pixel values. |  |
| `boardsetvectorpoint` | `void boardsetvectorpoint(variant vector, int pointIndex, int x, int y, bool apply)` | Set/move a single point on a board vector. x, y are always pixel values. |  |
| `boardgetprogram` | `void boardgetprogram(int programIndex, string &program, int &pointCount, int &layer, bool &isClosed, int &attributes, int &distanceRepeat)` | int boardGetProgram() |  |
| `boardsetprogram` | `void boardsetprogram(int programIndex, string program, int pointCount, int layer, bool isClosed, int attributes, int distanceRepeat)` | Sets the properties of a given program; creates a new program if one-past-the-end index is given. |  |
| `boardgetprogrampoint` | `void boardgetprogrampoint(int programIndex, int pointIndex, int &x, int &y)` | Get a single point on a board program. x, y are always pixel values. |  |
| `boardsetprogrampoint` | `void boardsetprogrampoint(int programIndex, int pointIndex, int x, int y)` | Set/move a single point on a board program. x, y are always pixel values. |  |

<a id="e-14"></a>
**E-14 Runtime board edits.** Scripts can place tiles (`Put`, `LayerPut`), change legacy tile types, read tiles, add, modify or delete **vectors** and **programs** point by point, and redraw. Path-finding data is rebuilt when a vector edit is "applied".

<a id="e-59"></a>
**E-59 Transitions and effects.** Fades of several types, wipes with an image (several effects and speeds), zoom, earthquake shake, and the border colour.
<a id="reawakened-fade-types"></a>
**Reawakened rule (OWNER; unverified default).** An author can fade the current frame or transition to the next frame with `fade(type)`. Types 1–4 mean: fade out to the current border colour; fade in from that colour; fade out then in using one captured frame; and crossfade from the captured frame to the next composed frame. The default duration is 30 fixed-60-Hz ticks with linear integer alpha. The command records a blocking `fx.fade` effect and resumes after the final tick. Type 0 and values outside 1–4 raise `builtin.bad-arg`.

<a id="reawakened-wipe-effects-and-speed"></a>
**Reawakened rule (OWNER; unverified default).** An author can wipe to an image with `wipe(file,effect,speed)`. Effects 1–12 are left-to-right, right-to-left, top-to-bottom, bottom-to-top, horizontal centre-out, horizontal edges-in, vertical centre-out, vertical edges-in, top-left diagonal, top-right diagonal, bottom-left diagonal and bottom-right diagonal. Progress is an integer percentage from 0 to 100, advanced by `speed` points per fixed tick; omitted speed is 4, so the default lasts 25 ticks. Speed 0 completes in one tick; negative or greater-than-100 speeds raise `builtin.bad-arg`. The final frame is exactly the resolved image, and the call blocks until it is shown.

<a id="reawakened-zoom"></a>
**Reawakened rule (OWNER; unverified default).** An author can zoom the board with `zoom(percent)`; 100 means one-to-one, 1–400 are valid target scales, and other values raise `builtin.bad-arg`. The camera stays centred on its current logical centre, nearest-neighbour sampling is used, and the transform applies to the next draw list immediately. A new call replaces the prior zoom target, `zoom(100)` clears it, and the command does not wait or alter world coordinates.

<a id="reawakened-earthquake"></a>
**Reawakened rule (OWNER; `earthquake` and `cameraShake` help).** An author can use `earthquake` when the whole game should jump in increasingly strong four-tick bursts and the script must wait for the effect; use `cameraShake` when the camera should wobble without stopping the script. Intensity is clamped to 1–10 for `earthquake`; amplitude is measured in logical-viewport pixels for `cameraShake`.

**Technical rule (OWNER).** `earthquake(intensity)` clamps `i` to 1..10 and runs `i` consecutive `shake(amplitudeForIntensity(p), 4)` calls for `p = 1..i`, blocking through the sleep wait until the final call ends. This is `4*i` ticks. `cameraShake(duration, amplitude)` converts positive seconds to `ceil(duration × 60)` ticks (minimum one), uses the same shared primitive and is non-blocking; a new shake replaces the active one. The shared primitive, corner cycle and `amplitudeForIntensity` constant are defined at [movement-and-collision.md#e-51](movement-and-collision.md#e-51). Pass/corner/5 ms details are owner-relayed legacy facts logged by entry 2 as round 7, never presented as read from source. Evidence includes the owner-relayed report and the authored corpus fixtures `fixtures/legacy/Caoquest/Prg/earthquake.prg` and `fixtures/legacy/ChimeranEmpire/Prg/Fire Bomb.prg`.

<a id="e-63"></a>
**E-63 Board preview.** `ViewBrd` renders a board, or part of one, to the screen or to a canvas without entering it.

## Players, party & sprite movement (31)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `newplyr` | `void newplyr(string file)` | Change the graphics of the main player to that of the file passed in. The file must be a character file (*.tem) |  |
| `newplayer` | `void newplayer(string file)` | Change the graphics of the main player to that of the file passed in. The file must be a character file (*.tem) | alias of `newplyr` |
| `push` | `void push(string direction [, variant handle [, int flags]])` | Push the player with the specified handle, or the default player if no handle is specified, along the given directions. The direction should be a comma delimited, but... |  |
| `addplayer` | `void addplayer(string file)` | Add a player to the party. |  |
| `removeplayer` | `void removeplayer(string handle)` | Remove a player from the party [to an old player list]. |  |
| `putplayer` | `void putplayer(string handle, int x, int y, int layer)` | Place the player on the board at the given location. |  |
| `eraseplayer` | `void eraseplayer(string handle)` | Erase a party player from the screen. |  |
| `restoreplayer` | `void restoreplayer(string filename)` | Restore a player who was previously on the team. |  |
| `targetlocation` | `void targetlocation(int &x, &int y)` | Get the location of the target object. |  |
| `walkspeed` | `void walkspeed()` | Obsolete. | obsolete: raises an error and the statement is skipped |
| `posture` | `posture(int id [, handle player])` | Show a custom player animation named "Custom" + str(id) (e.g. "Custom1") This command is obsolete - use playerStance() instead. | deprecated, still works |
| `destroyplayer` | `void destroyplayer(string handle)` | Permanently remove a player from the party. |  |
| `callplayerswap` | `callplayerswap(...)` | Unimplemented in 3.1.0. | not implemented (does nothing) |
| `stance` | `stance(int id [, handle player])` | Show a player stance. | obsolete: shows a warning (when warnings are on) and still runs |
| `characterspeed` | `void characterspeed()` | Obsolete. | obsolete: shows a message, then acts as `gamespeed` |
| `sourcelocation` | `void sourcelocation(int &x, &int y)` | Get the location of the source object. |  |
| `targethandle` | `string targethandle([string &ret])` | Get the handle of the target object. |  |
| `sourcehandle` | `string sourcehandle([string &ret])` | Get the handle of the source object. |  |
| `pathfind` | `string pathfind(int x1, int y1, int x2, int y2, string &ret [, int layer])` | Construct a directional string of the shortest tiled path from one location to the other. |  |
| `playerstep` | `void playerstep(variant handle, int x, int y [, int flags])` | Causes the player to take one step in the direction of x, y following a route determined by pathFind. |  |
| `gamespeed` | `void gamespeed(int speed)` | Set the overall walking speed. Changes the walking speed proportionally. |  |
| `onboard` | `int onboard(variant handle)` | Return whether a player is being shown on the board. |  |
| `pixelmovement` | `bool pixelmovement([bool pixelMovement [, bool pixelPush]])` | Toggles pixel movement and push() et al. in pixels. |  |
| `playerspeed` | `void playerspeed(string handle, int speed)` | Set the delay in seconds between a player's steps. |  |
| `playerstance` | `playerstance(handle player, string stance [, int flags])` | Animate a player's custom stance. |  |
| `playerlocation` | `void playerlocation(variant handle, int &x, int &y, int &layer)` | Get the location of a player. |  |
| `spritetranslucency` | `void spritetranslucency(int percent)` | int spriteTranslucency(void) Set the degree to which sprites drawn underneath other objects are visible. |  |
| `activeplayer` | `void activeplayer(variant handle)` | handle activePlayer(void) Set or get the active player, by handle. |  |
| `playerpath` | `void playerpath(variant handle, int flags, int x1, int y1, ... , int xn, int yn)` | void playerPath(variant handle, int flags tkMV_PATHFIND, int x1, int y1) void playerPath(variant handle, int flags tkMV_WAYPOINT_PATH, variant boardpath, int cycles)... |  |
| `playergetpath` | `int playergetpath(variant handle)` | void playerGetPath(variant handle, int index, int &x, int &y) |  |
| `playerdirection` | `int playerdirection(variant handle)` | void playerDirection(variant handle, int dir) |  |

## Items, inventory, shop & gold (28)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `giveitem` | `void giveitem(string itm)` | Add an item to the inventory. |  |
| `takeitem` | `void takeitem(string itm)` | Remove an item from the inventory. |  |
| `pushitem` | `void pushitem(variant item, string direction [, int flags])` | The first parameter accepts either a string that can be either "target" or "source" direction or the number of an item. The syntax of the directional string is the... |  |
| `wander` | `void wander(variant target, [int restrict = 0])` | The first parameter accepts either a string that can be either "target" or "source" or the number of an item. The selected item will take a step in a random... |  |
| `equip` | `void equip(variant handle, int location, string item)` | Equip an item from the inventory (by handle or filename) to a location on the player's body. |  |
| `remove` | `void remove(variant handle, int location)` | Remove an equipped item and return it to the inventory. |  |
| `givegp` | `void givegp(int gp)` | Give gold pieces. |  |
| `takegp` | `void takegp(int gp)` | Take gold pieces. |  |
| `getgp` | `int getgp([int &ret])` | Return the amount of gold pieces held. |  |
| `callshop` | `void callshop(string item1, string item2, string item3, ...)` | Displays a basic shop interface that allows the buying of the items given as parameters and the selling of items in the player's inventory. |  |
| `eraseitem` | `void eraseitem(variant handle)` | Erase an item from the screen, but keep it in memory. |  |
| `putitem` | `void putitem(variant handle, int x, int y, int layer)` | Place the item on the board at the given location. |  |
| `createitem` | `int createitem(string filename[, int &pos])` | Load an item and return the slot into which it was loaded. |  |
| `destroyitem` | `void destroyitem(variant handle)` | Remove an item from memory. |  |
| `itemwalkspeed` | `void itemwalkspeed()` | Obsolete. | obsolete: raises an error and the statement is skipped |
| `itemcount` | `int itemcount(string fileName[, int &ret])` | Count the number of a certain item in the inventory. |  |
| `itemlocation` | `void itemlocation(variant handle, int &x, int &y, int &layer)` | Get the location of an item. |  |
| `itemstep` | `void itemstep(variant handle, int x, int y [, int flags])` | Causes the item to take one step in the direction of x, y following a route determined by pathFind. |  |
| `getitemname` | `string getitemname(string fileName[, string &ret])` | Get an item's handle. |  |
| `getitemdesc` | `string getitemdesc(string fileName[, string &ret])` | Get an item's description. |  |
| `getitemcost` | `int getitemcost(string fileName[, int &ret])` | Get an item's cost. |  |
| `getitemsellprice` | `int getitemsellprice(string fileName[, int &ret])` | Get the price for which an item sells. |  |
| `shopcolors` | `shopcolors(int index, int r, int g, int b)` | Set the colors used in CallShop(). This function is obsolete from 3.1.0. | obsolete: shows a warning (when warnings are on) and still runs |
| `itemspeed` | `void itemspeed(variant handle, int speed)` | Set the delay in seconds between an item's steps. |  |
| `itemstance` | `itemstance(handle item, string stance [, int flags])` | Animate an item's custom stance. |  |
| `itempath` | `void itempath(variant handle, int flags, int x1, int y1, ... , int xn, int yn)` | void itemPath(variant handle, int flags tkMV_PATHFIND, int x1, int y1) void itemPath(variant handle, int flags tkMV_WAYPOINT_PATH, variant boardpath, int cycles) void... |  |
| `itemgetpath` | `int itemgetpath(variant handle)` | void itemGetPath(variant handle, int index, int &x, int &y) |  |
| `itemdirection` | `int itemdirection(variant handle)` | void itemDirection(variant handle, int dir) |  |

<a id="e-31"></a>
**E-31 Sprite translucency.** The parts of a sprite that are covered by higher content are drawn translucently (`SpriteTranslucency(%)`), so the player stays visible behind trees and roofs.

<a id="e-32"></a>
**E-32 Scripted sprite control.** Place, erase, create and destroy items; get or set a location and a facing; set a speed; play a stance; swap a player's graphics (`NewPlayer`); wander randomly, optionally restricted; query the queued path.

## Battle, stats & menus (29)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `fight` | `void fight(int skill, string background)` | Start a skill level fight. |  |
| `win` | `void win()` | Obsolete. | obsolete: raises an error and the statement is skipped |
| `hp` | `void hp(string handle, int value)` | Set a fighter's hp. |  |
| `givehp` | `void givehp(string handle, int add)` | Increase a fighter's current hp. |  |
| `gethp` | `int gethp(string handle, [int &ret])` | Get a fighter's hp. |  |
| `maxhp` | `void maxhp(string handle, int value)` | Set a fighter's max hp. |  |
| `getmaxhp` | `int getmaxhp(string handle, [int &ret])` | Get a fighter's max hp. |  |
| `smp` | `void smp(string handle, int value)` | Set a fighter's smp. |  |
| `givesmp` | `void givesmp(string handle, int value)` | Increase a fighter's smp. |  |
| `getsmp` | `int getsmp(string handle, [int &ret])` | Get a fighter's smp. |  |
| `maxsmp` | `void maxsmp(string handle, int value)` | Set a fighter's max smp. |  |
| `getmaxsmp` | `int getmaxsmp(string handle, [int &ret])` | Get a fighter's max smp. |  |
| `fightenemy` | `void fightenemy(string enemy, string enemy, ... string background)` | Start a fight. |  |
| `attackall` | `void attackall(int fp)` | Deal the specified amount in HP to all the members of the target's party. |  |
| `drainall` | `void drainall(int fp)` | Deal the specified amount in SMP to all the members of the target's party. |  |
| `inn` | `inn()` | Fully heal the player party. |  |
| `getlevel` | `int getlevel(string handle[, int &ret])` | Get the level of a player. |  |
| `ai` | `void ai(int level)` | Have the source enemy use the internal AI. |  |
| `menugraphic` | `void menugraphic(string image)` | Choose an image for the menu. |  |
| `fightmenugraphic` | `void fightmenugraphic(string image)` | Choose an image for the fight menu graphic. |  |
| `fightstyle` | `void fightstyle()` | Obsolete. | obsolete: raises an error and the statement is skipped |
| `battlespeed` | `void battlespeed(int speed)` | Obsolete. | obsolete: raises an error and the statement is skipped |
| `getdp` | `int getdp(string handle, [int &ret])` | Get a fighter's dp. |  |
| `getfp` | `int getfp(string handle, [int &ret])` | Get a fighter's fp. |  |
| `internalmenu` | `void internalmenu(int menu)` | Show a menu using the menu plugin. |  |
| `applystatus` | `void applystatus(string target, string file)` | Apply a status effect to a fighter. |  |
| `removestatus` | `void removestatus(string target, string file)` | Remove a status effect from a fighter. |  |
| `drawenemy` | `void drawenemy(string file, int x, int y, [canvas cnv])` | Draw an enemy. | Draws battle asset frame 0 at logical pixel coordinates without changing battle state or consuming RNG. |
| `giveexp` | `void giveexp(string handle, int amount)` | Give experience to a player. |  |

<a id="e-83"></a>
**E-83 Shop.** `CallShop(item, …)` opens a buy/sell screen that uses each item's buy and sell prices and the party's gold; its colours are configurable.

<a id="e-84"></a>
**E-84 Inn.** `Inn()` fully restores the party.

<a id="e-86"></a>
**E-86 Gold.** A global integer, changed by battle rewards, by the shop and by scripts.

## Graphics, canvases, animation & video (31)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `clear` | `void clear([canvas cnv])` | Clear a surface. clear() blanks the screen. |  |
| `setpixel` | `void setpixel(int x, int y, [canvas cnv])` | Set a pixel in the current colour. |  |
| `drawline` | `void drawline(int x1, int y1, int x2, int y2, [canvas cnv])` | Draw a line. |  |
| `drawrect` | `void drawrect(int x1, int y1, int x2, int y2, [canvas cnv])` | Draw a rectangle. |  |
| `fillrect` | `void fillrect(int x1, int y1, int x2, int y2, [canvas cnv])` | Draw a filled rectangle. |  |
| `bitmap` | `void bitmap(string file, [canvas cnv])` | Fill a surface with an image. |  |
| `bordercolor` | `void bordercolor(int r, int g, int b)` | Obsolete. | obsolete: raises an error and the statement is skipped |
| `playavi` | `void playavi(string movie)` | Play a movie full screen. Supported types are *.avi, *.mpg, and *.mov. |  |
| `playavismall` | `playavismall(string movie)` | Play a movie at actual size, centred. |  |
| `setimage` | `void setimage(string str, int x, int y, int width, int height, [canvas cnv])` | Set an image. |  |
| `drawcircle` | `void drawcircle(int x, int y, int radius [, int canvas])` | Draw a circle at x,y, optionally to a canvas. Previously an arc could be defined but this never worked, so the two parameters have been cut and the optional canvas is... |  |
| `fillcircle` | `void fillcircle(int x, int y, int radius [, int canvas])` | Draw a filled circle at x, y, to screen or canvas. |  |
| `savescreen` | `void savescreen([int position = 0])` | Save the current screen onto a canvas that can be restored at a later time. |  |
| `restorescreen` | `void restorescreen([int x1, int y1, int x2, int y2, int xdest, int ydest])` | Draw a buffered screen capture to the screen. The canvas drawn is the first in the screen array. x1, x2 specify the bottom- right corner of the screen, so that width... |  |
| `getpixel` | `void getpixel(int x, int y, int &r, int &g, int &b, [canvas cnv])` | Get the colour of the pixel at (x, y). |  |
| `setimagetransparent` | `void setimagetransparent(string file, int x, int y, int width, int height, int r, int g, int b, [canvas cnv])` | Set an image with a transparent colour. |  |
| `setimagetranslucent` | `void setimagetranslucent(string file, int x, int y, int width, int height, [canvas cnv])` | Set an image translucently. |  |
| `setimageadditive` | `void setimageadditive(string file, int x, int y, int width, int height, double percent[, canvas cnv])` | Set an image with a tint of the specified percent. |  |
| `animation` | `int id = animation(string file, int x, int y [, bool loop])` | Play an animation at pixel x,y. If animation() is called in a thread, it may be looped using the last parameter and returns an id that can be used to end the animation. |  |
| `sizedanimation` | `int id = sizedAnimation(string file, int x, int y, int height, int width [, bool loop])` | Play a resized animation at pixel x,y. If sizedAnimation() is called  in a thread, it may be looped using the last parameter and returns an id that can be used to end... |  |
| `getres` | `void getres(int &x, int &y)` | Get the screen's resolution. |  |
| `createcanvas` | `canvas createcanvas(int width, int height, [canvas &cnv])` | Create a canvas. |  |
| `killcanvas` | `void killcanvas(canvas cnv)` | Kill a canvas. |  |
| `drawcanvas` | `void drawcanvas(canvas cnv, int x, int y, [int width, int height, [canvas dest]])` | Blit a canvas forward. |  |
| `restorescreenarray` | `void restorescreenarray(int pos [,int x1, int y1, int x2, int y2, int xdest, int ydest])` | Draw a buffered screen capture to the screen. |  |
| `restorearrayscreen` | `void restorearrayscreen(int pos [,int x1, int y1, int x2, int y2, int xdest, int ydest])` | Draw a buffered screen capture to the screen. | alias of `restorescreenarray` |
| `endanimation` | `endanimation(int animationID)` | End a multitasking animation. |  |
| `rendernow` | `void rendernow(bool draw)` | Controls rendering of the cnvRenderNow reserved canvas. The canvas is drawn every frame above all board elements (e.g. tiles, sprites, animations). |  |
| `drawcanvastransparent` | `void drawcanvastransparent(canvas cnv, int x, int y, int r, int g, int b[, int width, int height[, canvas dest]])` | Blit a canvas forward, but don't blit one colour (the transparent colour). |  |
| `canvasdrawpart` | `void canvasdrawpart(int cnv, int x, int y, int xSrc, int ySrc, int width, int height[, canvas cnvDest])` | Draw part of a canvas. |  |
| `canvasgetscreen` | `void canvasgetscreen(canvas cnvDest)` | Copy the screen onto a canvas. |  |

**E-56 Text and primitives.** Text at tile-cell or pixel coordinates; lines, rectangles and circles, filled or outlined; pixel get and set; images drawn normally, colour-keyed, translucent (50 %) or additive (per cent). All of them work on the screen or on an **off-screen canvas**, and a canvas can be created, drawn whole or in part, colour-keyed and captured from the screen.

<a id="reawakened-text-cell-size"></a>
**Reawakened rule (OWNER; unverified default).** An author can place text with `text(x,y,...)` in stable character cells or use `pixeltext` for exact pixels. `text` truncates each coordinate toward zero and maps `(x,y)` to logical pixels `(x*8,y*16)`; its cell remains 8×16 even when the current font changes. Newlines advance one 16-pixel row, and out-of-range text clips to the target surface. `pixeltext` keeps pixel coordinates. Both use the current `FontRef` metrics for glyph layout.

<a id="e-58"></a>
**E-58 Screen save and restore.** Save the screen to numbered slots and restore it, whole or as partial rectangles.

## Mouse, buttons & cursor maps (11)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `setbutton` | `setbutton(string file, int slot, int x, int y, int width, int height)` | Create and draw a clickable button at screen pixel co-ords x, y that persists until clearButtons() is called. |  |
| `checkbutton` | `int = checkbutton(int x, int y)` | Check if any SetButton()s were clicked at screen pixel co-ords x, y. |  |
| `clearbuttons` | `clearbuttons([int slot1, int slot2...])` | Clear buttons set by SetButton(). Clear specific slot(s) if supplied, else clear all slots. |  |
| `mouseclick` | `mouseclick(int &x, int &y [, bool noWait])` | Wait for a mouseclick or immediately retrieve the last and return the x, y location (pixel values relative to the window). |  |
| `mousemove` | `mousemove(int &x, int &y)` | Wait for the mouse to move and return the x,y location in pixels from the window corner. |  |
| `createcursormap` | `cursor_map createcursormap([cursor_map &ret])` | Create a cursor map. |  |
| `killcursormap` | `void killcursormap(cursor_map map)` | Kill a cursor map. |  |
| `cursormapadd` | `void cursormapadd(int x, int y, cursor_map map)` | Add a point to a cursor map. |  |
| `cursormaprun` | `int cursormaprun(cursor_map map, [int &ret])` | Run a cursor map. |  |
| `cursormaphand` | `void cursormaphand(string cursor[, bool stretch = true])` | Change the cursor used everywhere cursors are used (e.g. cursor maps, the menu, the battle system), optionally not stretching it to 32 by 32 pixels. | The default hand is a bundled 16×16 asset; `stretch=true` scales it to 32×32 with nearest-neighbour sampling. |
| `mousecursor` | `void mousecursor(string file, int x, int y, int red, int green. int blue)` | Change the mouse cursor. "TK DEFAULT" or "" restores the default cursor. | `TK DEFAULT` and empty file restore the bundled 16×16 arrow with hot spot (0,0); custom assets retain the supplied hot spot and transparent colour. |

<a id="e-60"></a>
**E-60 Modal UI primitives.** A message box with OK or Yes/No buttons (keyboard or mouse), a text prompt, **cursor maps** (a list of hotspots navigated with the arrow keys or the mouse, returning the chosen index, with a custom cursor image), on-screen clickable **buttons** (slots with images), and a save-file picker (`DirSav`).
<a id="reawakened-msgbox-layout"></a>
**Reawakened rule (OWNER; unverified default).** An author can ask a player a question with `msgbox(text,title,style,...)`; the panel is centred on the logical surface at 60% width and 22% height with an 8-pixel inner margin. The title occupies the top inner row and the body wraps below using current font metrics. Style 0 displays one centred `OK` button; style 1 displays `YES` then `NO` left-to-right. Buttons are 16 pixels high with 8-pixel gaps, index 0 is selected, and the command yields `render.msgbox` until the cursor-map key selects a button. Explicit colours or a bitmap replace only their defaults. Invalid style values raise `builtin.bad-arg`.

<a id="reawakened-default-cursors"></a>
**Reawakened rule (OWNER; unverified default).** An author can restore a deterministic cursor with `mousecursor("TK DEFAULT",...)` or an empty file, rather than using a host cursor. The bundled arrow is 16×16 with transparent background and hot spot (0,0). The bundled cursor-map hand is 16×16 with hot spot (1,1); `cursormaphand(...,true)` scales it to 32×32 with nearest-neighbour sampling and `false` keeps 16×16. Asset keys, dimensions and hot spots are part of UI state.

## Audio (12)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `sound` | `void sound()` | Obsolete. | obsolete: raises an error and the statement is skipped |
| `wav` | `void wav(string file)` | Play a wave file (e.g. a sound effect). |  |
| `midiplay` | `void midiplay(string file)` | Play the specified file as the background music. |  |
| `playmidi` | `void playmidi(string file)` | Play the specified file as the background music. | alias of `midiplay` |
| `mediaplay` | `void mediaplay(string file)` | Play the specified file as the background music. | alias of `midiplay` |
| `mediastop` | `void mediastop()` | Stop the background music. |  |
| `mediarest` | `void mediarest()` | Stop the background music. | alias of `mediastop` |
| `midirest` | `void midirest()` | Stop the background music. | alias of `mediastop` |
| `wavstop` | `void wavstop()` | Stop the current sound effect. |  |
| `mp3` | `void mp3(string file)` | Play a wave file (e.g. a sound effect). | alias of `wav` |
| `mp3pause` | `void mp3pause()` | Play a sound effect and pause the engine until it finishes. |  |
| `setvolume` | `void setvolume(int percent)` | Set the volume of all music and sound using a value between 0 and 100. |  |

<a id="e-102"></a>
**E-102 Volume.** A master volume as a percentage, applied to all music and sound.

## Files, saves & OS (15)

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `start` | `void start(string file)` | Obsolete. | Obsolete: raises a catchable error and skips the statement because shell-open is unavailable in Reawakened. |
| `dirsav` | `string dirsav(string title, bool allowNewFile, int textColor, int backColor, string image)` | Allow the user to choose a *.sav file from the "Saved" directory. For historical reasons, returns "CANCEL" if no file is chosen, not "". |  |
| `save` | `void save(string file)` | Save the current game state to a file. |  |
| `load` | `void load(string file)` | Load the game state from a file. |  |
| `openfileinput` | `void openfileinput(string file, string folder)` | Open a file in input mode. |  |
| `openfileoutput` | `void openfileoutput(string file, string folder)` | Open a file in output mode. |  |
| `openfileappend` | `void openfileappend(string file, string folder)` | Open a file for appending. |  |
| `openfilebinary` | `void openfilebinary(string file, string folder)` | Obsolete. | obsolete: shows a message, then acts as `openfileinput` |
| `closefile` | `void closefile(string file)` | Close a file. |  |
| `fileinput` | `string fileinput(string file, [string &ret])` | Read a line from a line. |  |
| `fileprint` | `void fileprint(string file, string line)` | Write a line to a file. |  |
| `fileget` | `string fileget(string file, [string &ret])` | Get a byte from a file. |  |
| `fileput` | `void fileput(string file, string byte)` | Write a byte to a file. |  |
| `fileeof` | `bool fileeof(string file, [bool &ret])` | Check whether the end of a file has been reached. |  |
| `apppath` | `string apppath([string &dest])` | Retrieve the path of trans3.exe, without the final backslash. |  |

<a id="e-97"></a>
**E-97 File I/O.** Scripts can open text or binary files *inside the game's folders* (input, output, append, binary) to read and write lines or bytes ([../formats/rpgcode-program.md](../formats/rpgcode-program.md#other-script-created-files)).

**Reawakened rule.** Script file I/O is **sandboxed to the game's save area**: a script's file commands can only reach files under the game's own folders, never an arbitrary host path.

## Ownership of names with no single owner

The catalogue above groups names by capability, not by which part of the engine implements them, and a few names fell between two owners. This is the map the build uses so that every name resolves exactly once. It follows the command-effect catalogue's proposal; where it differs from a group label above, this map wins.

* **Input** (`wait`, `get`, `mouseClick`, `mouseMove`, `scan`, `mem`, `clearBuffer`, `setButton`, `checkButton`, `clearButtons`) belongs to the **movement-and-input** part. The `input.key` and `sleep` wait *kinds* those commands yield are the **VM's** (the VM owns the wait registry); the built-in itself is the input part's.
* **Cursor maps and the mouse cursor** (`createCursorMap`, `cursorMapAdd`, `cursorMapRun`, `killCursorMap`, `cursorMapHand`, `mouseCursor`) belong to **board-rendering**, even though the catalogue above files them under mouse, buttons and cursor maps: they draw onto the `ui` surface, so the section owner decides.
* **`wait`** is the input part's built-in and its `input.key` wait kind is the VM's — a split name, both parts stated.
* **`dirSav`** (the save/load picker) belongs to **menu-and-save**, which owns the save list and the `menu.screen` wait; board-rendering supplies the surface it draws on — a split name.
* **Game lifecycle** (`reset`, `mainFile`, `win`, `gone`, `over`, `quitGame`, `boot` and `quit`) belongs to **board-rendering**, which owns boot, reset and quit. The "Game state" group above does not imply the menu part. <!-- OWNER: §9.13 game lifecycle — alternatives: leave these with menu-and-save (where the catalogue guessed) or move them to board-rendering (the proposal). Decided: board-rendering, to match the boot/reset/quit owner. -->
* **Lifecycle aliases and obsolete names.** `dos()` and `windows()` are live aliases of `quitGame()` and emit one AD-17 `quit` request. `start(file)` and `godos(command)` are obsolete errors: shell-open and arbitrary shell commands are unavailable. `done()`, `end()` and `stop()` remain VM program-flow controls.
* **`menuGraphic`** belongs to **menu-and-save**, not battle, even though the catalogue above lists `menuGraphic` under battle; `internalMenu` and `fightMenuGraphic` stay with menu-and-save and battle respectively.
* The remaining names the catalogue's ownership table flags as ambiguous (`itemCount`, `giveExp`, `sourceHandle`, `targetHandle`, `sourceLocation`, `targetLocation`, and the party/player movement names) are owned as that table says: movement-and-input for the sprite and player movement names, battle for the fight stat writes, the VM for the source/target handle reads.

<!-- OWNER: §9.13 — the owner should confirm the game-lifecycle move (to board-rendering) and the two split names (`wait`,
`dirSav`) hardest; the rest follows the catalogue. If the game-lifecycle names stay with menu-and-save, edit this bullet
and the catalogue together. -->

## Not callable by name

The interpreter also has internal entries for operators, `if`/`else`/`elseif`/`while`/`until`/`for`, method and class definitions, and plugin calls. Scripts reach them only through the language syntax.

## Reawakened additions (not part of the 282 legacy catalogue)

The following functions are Reawakened built-in additions provided in the pure built-in pack (`pure.ts`). They are not part of the 282 legacy 3.1 command catalogue.

| Command | Signature | Purpose | Notes |
|---|---|---|---|
| `quitGame` | `void quitGame()` | Quit the game. | Reawakened addition; board-rendering posts one AD-17 `quit` request without choosing host window behaviour and the call does not wait. `dos()` and `windows()` are legacy aliases. |
| `isNaN` | `int isNaN(variant &value, [int &ret])` | Returns 1 if `value` is numeric and NaN, 0 otherwise. | Reawakened addition; takes first arg byRef |
| `isInfinity` | `int isInfinity(variant &value, [int &ret])` | Returns 1 if `value` is numeric and +Infinity or -Infinity, 0 otherwise. | Reawakened addition; takes first arg byRef |
| `isFinite` | `int isFinite(variant &value, [int &ret])` | Returns 1 if `value` is numeric and a finite number (not NaN, not ±Infinity), 0 otherwise. | Reawakened addition; takes first arg byRef |

* **Parameter by reference.** Each function declares its first parameter `byRef: true` (`&value`). This is necessary because reading a variable by name in RPGCode truncates numbers to 32-bit integers (SEM-3), which would convert NaN or Infinity to 0 before the function sees it. Passing by reference ensures the function inspects the stored full value directly. Computed temporaries (for example `isNaN(0/0)` or `isInfinity(1/0)`) pass their temporary value and work identically.
* **String handling.** Strings (both non-numeric strings like `"abc"` and numeric strings like `"123"`) return 0 for all three functions, because a string is not a number.
* **Numeric invariant.** For any numeric input, exactly one of `isNaN`, `isInfinity` and `isFinite` returns 1, and the other two return 0 (`isFinite == 1` iff `isNaN == 0 && isInfinity == 0`).
* **Corpus check (R-35).** None of these functions existed in 3.1. Verified that no legacy corpus or fixture script defines `isNaN`, `isInfinity` or `isFinite`.
