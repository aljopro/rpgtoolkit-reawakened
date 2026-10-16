---
type: discovery
title: "Clean-room extraction round 5: staging answers (UNREVIEWED)"
date: 2026-10-15
status: staging, awaiting the ADR 0006 reviewer
---

# Clean-room extraction, round 5 - staging answers (UNREVIEWED)

* **Questions:** Q1 to Q10 of `implementor-review-packet.md` (this folder), forwarded by the owner.
* **Source consulted (as stated by the answerer):** the original programs' logic. Revision not recorded. The answerer states they could not run the original programs, so no answer below is *observed*; every one is *read from the program's logic* unless marked *not sure*.
* **Answerer:** a session chosen by the owner. Its transcript is not given to implementers (ADR 0006 decision 1).
* **Received:** 2026-10-15, pasted into the orchestrating session by the owner. Reproduced verbatim apart from the answerer's working notes, which are dropped. Nothing here is yet in `docs/`.

---

**Q1. Text `.anm` frame-count line.** *Read from the program's logic.*
The editor ignores that line completely. It always reads 51 frames by position, and when it re-saves the file as binary it writes the full 51 slots. The engine does trust the line: it reads that many frames plus one, then takes the next line as the delay. With 0 on the line, the engine shows only the first frame and reads the delay from the second frame's image-name line, which normally comes out as no pause. A non-zero value would therefore only change what the engine does. **Recommendation:** read 51 frames by position and ignore the line.

**Q2. Binary `.gam` below minor 3: reserved field widths.** *Read from the program's logic.*
Both are 2 bytes. The spec page copied the engine, which reads 4 bytes at both places. The editor reads 2, matching the 2.x programs that wrote these files. So the original 3.1 engine misreads minor-2 main files, and only the editor reads them correctly. The other minor-2-and-below reserved fields on the page are correct: the 4-byte plus 2-byte pair after the plugin fields, and the 2-byte field after the custom battle program.

A related quirk: the engine also reads the "registered" field as 4 bytes where the editor writes 2. That only works out because the registration-code string after it is long enough to absorb the extra bytes. A file with a registration code shorter than 2 characters would throw the engine off. Read it as 2 bytes followed by a string.

**Q3. `if (opt!=1)`.** *Read from the program's logic.*
It assigns. The 3.1 language has no `!=` operator. `!` after a name is the numeric type marker, so the line reads as "assign 1 to `opt!`". An assignment's value is the value assigned, so the `if` tests 1: it is always true, and `opt` becomes 1. Games written that way were silently wrong under 3.1. How 2.x read it is not known. **Recommendation:** if unspaced `!=` is treated as not-equal for compatibility, record it as a deliberate departure from 3.1 behaviour, not as how 3.1 behaved.

**Q4. A blocking command inside a thread.** *Read from the program's logic; not observed.*
The freeze is certain. Scripts run on the engine's single main loop: `Delay` puts the whole program to sleep; `Wait` and `Prompt` loop on window events until they get their input, without returning to the main loop. During either, nothing else runs: no other threads, no movement, no redraws. Threads that need to pause without freezing the game use `ThreadSleep`. A design where only the waiting thread pauses is a behaviour change from 3.1; list it as a departure.

**Q5. Error line numbers.** *Read from the program's logic.*
It depends on the kind of error. The engine adds a dummy first line before compiling. **Syntax errors** report the exact line, because the engine compensates for the extra line. **Two declaration errors** report one line too high: a method defined twice with the same parameter count, and a call to a class method that does not exist. **Unmatched curly braces** are reported with an approximate line; whether it is one too high is *not sure*. **Runtime errors:** *not sure*; they are reported with an approximate line, probably exact. **Recommendation:** report exact lines; nothing should depend on the offset.

**Q6. `FileInput` dropping the last character.** *Read from the program's logic.*
Reading a line already strips a final carriage return, and `FileInput` then drops one more character. A line ending in CRLF comes back exactly as written. A line ending in LF only, or a final line with no line ending, loses its last real character. `FilePrint` always writes CRLF, so a file written by `FilePrint` and read back with `FileInput` comes back exactly.

**Q7. Text `.gam` plugin count of 5 with four flags.** *Read from the program's logic, plus a line count.*
The count is an exact count of flag lines (not "count minus one"). With 5 the editor would read five lines, so the first day/night value would be taken as a fifth flag, every later field would shift by one, and the last line would be lost. The editor silently ignores lines it cannot read past the end of the file, and those fields keep their defaults. The logic cannot tell whether the 2.x writer wrote the count one too high. **Test:** if the file's last line looks like a language-file name, the count is one too high and the four flags are right. The line count supports an optional tail: everything up to and including the registration-code line comes to exactly 1133 lines, which is `DEMO.GAM`'s length. That `DEMO.GAM` is an older file that stops there is an inference (*not sure*). Everything after that line (full-screen, resolution, plugins, day/night, protection, the old parallax line, the language file) can be treated as optional, with defaults.

**Q8. Binary `.tem` at minors 3 and 4.** *Read from the program's logic.*
It is the same field. The "level type" in the older page is the experience needed for the first level-up, which our notes call the level-up experience field. It is 1 byte at minor 3 and 4 bytes otherwise. "Level type" is a misleading name. The 120 graphic names are correct (walking 32, the four battle poses 64, battle rest 4, custom 20). Neither program reads anything after the names, so the 13 and 96 extra bytes are never read and are harmless. Where they came from is not known (*not sure*). For these versions the reader always reads 120 names regardless of the size-type byte, so a value of 99 does not affect reading. Why it is 99 is not known; possibly leftover data from an old writer (*not sure*).

**Q9. Text `.bkg` empty line.** *Read from the program's logic, plus a line count.*
Neither program uses it: both read the line and discard it. The 845 lines match exactly: header and version (3), tile grid 19 x 11 = 209, music and four sounds (5), this line (1), and the colour grid (627). What 2.x stored there is not known (*not sure*). Treat it as reserved.

**Q10. `-2` marker in text characters.** *Read from the program's logic.*
No, the marker is for items only. The character text reader always reads every picture at full size, with no empty-picture check. A `-2` line in a character file would shift everything after it.

**Q11. `FileInput` past the end of a file.** *Read from the program's logic; the Windows end-of-file detail is stated from memory of its documented behaviour and was not checked.* (Received later the same day, pasted by the owner.)
`FileInput` past the end returns an empty string. There is no error and no message, and the script carries on. The read position does not move, so every further read also returns an empty string. This depends on how Windows reports end of file (from memory, not checked); see the uncertainty below.
At end of file the result is an empty string. A rebuild should simply return empty.
Uncertainty: if Windows reported end of file as a successful zero-byte read instead of a failed read, the reader could loop and hang. This is believed unlikely (*not sure*), and is why this answer is "read from logic" rather than certain.
A blank line in the file looks the same as end of file. A script cannot tell them apart from the value alone.
`FileEOF` is how scripts are meant to detect the end. It is true once the read position reaches the file's size. After the last line has been read, including its line ending, `FileEOF` is already true, so a `while (!FileEOF(...))` loop stops cleanly without ever reading past the end.
On a file that is not open, `FileInput` silently does nothing: no error, and it sets no return value.
**Recommendation:** define reading past the end as returning an empty string with no error, and leave the position at the end. That matches 3.1 in every case that matters. If a diagnostic is wanted, put it in a debug log rather than raising a script error, since 3.1 games may read past the end routinely.
