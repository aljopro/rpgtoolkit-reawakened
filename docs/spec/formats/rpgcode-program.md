# RPGCode program (`.prg`)

Game scripts. A program is plain text in the system ANSI code page (Windows-1252 on Western systems), no byte-order mark, one statement per line. Programs live in `Prg\` (sub-folders allowed). The language itself is described in [../engine/rpgcode-language.md](../engine/rpgcode-language.md).

## Text form

- **Line endings:** the editor writes CRLF and adds one extra CRLF at the end of every save. The engine accepts CRLF, CR or LF. The shipped sample programs use LF.
- **Comments:** `//` to end of line; `**` to end of line; a line whose first non-blank character is `*`; `/* … */` blocks. A `#` at the start of a command is a Toolkit 2 leftover and is ignored.
- **Statements** end at a newline or `;`. A line ending in `_` continues on the next line.
- **No header, version or checksum.**
- **Inline code:** wherever a board or script expects a program file name (board programs, board threads, `Thread()`), a name that does not exist as a file in `Prg\` is compiled **as RPGCode source text**. Short scripts can therefore live inside board files.

Before compiling, the original engine prepends a line containing `1` (a do-nothing statement) and appends a newline. This worked around crashes in files starting with `include` or `redirect`. It means error line numbers reported by the original engine may be off by one.

## Compiled form

The original engine can also load a "compiled" program: a binary file whose **first byte is `00`**. No shipped tool ever writes one (the engine's writer has no callers), so this form is documented only for completeness:

| Section | Encoding |
|---|---|
| marker | one `00` byte |
| function table | NUL-terminated names; an empty name ends the table. Position = function id. |
| classes | repeated: class name (empty ends the section); base class names, ended by an empty name; members (name, int visibility: 0 private, 1 public), ended by an empty name; methods (name, int parameter count, uint instruction index, int visibility), ended by an empty name |
| instructions | until end of file: int type flags, then a payload by type: number / open brace / close brace → double; literal / identifier / label → string; plugin call → string; function call → int function id, int parameter count; other types → nothing |

Type flags: 1 unset, 2 number, 4 literal string, 8 identifier, 16 function, 32 `{`, 64 `}`, 128 end of statement, 256 object, 512 label, 1024 plugin call.

A reimplementation does not need to read this form unless real games turn up that use it.

**Compiled programs and the dump — Reawakened rule (R-12).** A file whose **first byte is `00`** is a compiled program, not source text. The headless dump must report such a file as **compiled** rather than as text; the code that decides this is `packages/runner-headless/src/dump/formats.ts:79-82`, corrected to match in entry 2.24. The language that the loaded instructions run is ruled in [../engine/rpgcode-language.md](../engine/rpgcode-language.md), not here.

## Test runs from the editor

The editor's "Run program" writes the open program to `Prg\sys_test.prg`, prefixed with lines that apply the editor's test settings, for example:

```
Font("Arial");
FontSize(14);
WinGraphic("window.png");
AddPlayer("hero.tem");
Send("start.brd", 9, 5, 1);

<the program text>
```

Each line appears only if that test setting is filled in. It then starts the engine with `<main file> sys_test.prg` ([../engine/main-loop-and-startup.md](../engine/main-loop-and-startup.md#command-line)). The file is left in `Prg\` afterwards.

## Other script-created files

Scripts can read and write their own files:

- **`OpenFileInput/Output/Append(file, folder)`** with folder `Saved` (relative to the Toolkit folder) or any project sub-folder. Output files are written one string per line with CRLF.
- **`FileInput`** reads a line and **drops its last character**. That removes the stray end-of-line byte on CRLF lines, but chops a real character from LF-only lines and from an unterminated last line. A compatible engine must reproduce this or scripts that rely on it break.
- **`FileGet`/`FilePut`** read or write one byte.
