# TK2-era RPGCode coverage vs the 3.1 catalogue

Evidence base: archived RPG Toolkit 2.20b help (`help220.upd`, decrypted with the documented Caesar −1 byte shift from offset 0x3f) and 2.20b installer payload, archived TK2 games, and `docs/format-spec.md` §9.9/§9.11. Counts only; no script text, dialogue or art is quoted. Anything not directly observed is marked `[INFERENCE]`.

## Corpus

- **2.x corpus (the TK2 statistics below): 268 `.prg` files, 526,443 bytes**, from 45 archived games/collections. Top sources (files/bytes): `FinalDestiny` 55, `toolkit2.20b_wav.zip` 54, `caoquest.zip` 46, `contest2.zip` 18, `LittleMan.zip` 13, `spcfull-ice.zip` 6, `Fishing.zip` 6, `J.MIAH'S_Lotto_Program.ZIP` 6, `Send_20Programs.zip` 5, `multip.zip` 5, `wintermoonmethods.zip` 4, `inventors.zip` 3.
- **TK 1.x cross-check: 16 files** from the 1.4 demo (`TLKITV14.ZIP`) — kept separate because it uses a different block syntax (see below).
- Excluded: 1 stray TK2-syntax file inside the TK3 `rpgtoolkit321b` bundle; the forbidden legacy source tree/GitHub bundles were never opened.

## Summary: command coverage

| Class | Distinct commands | Call sites | Meaning |
|---|---:|---:|---|
| mapped | 141 | 11,480 | has a 3.1 §9.11 catalogue name (same or camel-cased) |
| compat-only | 2 | 9 | TK2 behaviour with no 3.1 twin (`empty`, `fbranch`) |
| unmapped/unknown | 39 | 473 | plugin-provided, library-namespace or undeclared name |
| user-defined | 119 | 436 | declared by `#Method` in the corpus itself |
| **total** | **301** | **12,398** | of which 143 are documented TK2 built-ins |

`mapped` here means the 3.1 catalogue **already carries the name** (frequently tagged *legacy* in §9.11), not that the signature is identical: `#SetImage(file,x,y,w,h)` vs the 3.1 `setImage*` family, `#WalkSpeed("Slow")`/`#ItemWalkSpeed("Slow")` (string) vs numeric `characterSpeed`/`itemSpeed`, `#NewPlyr` vs `newPlayer` all need argument-signature adapters.

## Context-dependent syntax forms

| Form | 2.x count | TK 1.4 count | Notes |
|---|---:|---:|---|
| `#`-prefixed assignment / expression statement (`#x! = 1`, `#a$="…"`) | 3,849 | 0† | `#` is a statement introducer, not only a command marker |
| `#If`/`#While` condition with a single `=` used as comparison | 293 | — | help220: “you can use one equal sign”; §9.2/§9.4 read `=` as assignment |
| bare text line shown as dialogue / loose statement | 113 | 95 | real but minority in 2.x; dominant in 1.x |
| `{` / `}` block lines | 3,120 / 3,121 | 0 | the TK2 block delimiter |
| `< … >` block + `then` (inline) | 0 / 1 | 43 / 22 | **TK 1.x only**; 0 inline `<` and 1 stray `then` in all of 2.x (see Gaps) |
| `:label` definitions | 124 | 28 | labels are plain `:name`, scoped per program |
| `#Branch(:label)` call sites | 363 | 9 | goto |
| `#FBranch(:label)` call sites | 6 | 18 | TK2 subroutine call stack → `#End`/end-of-function returns |
| `#Method` user-command definitions | 317 | 0 | the TK2 way of defining a command |
| `#ReturnMethod(v)` returns | 33 | 0 | → 3.1 `return v` |
| `*` comment lines | 1,527 | 28 | also inline after a closed command |
| `//` comment lines (inside TK2 files) | 0 | 0 | rare in this corpus |
| `@` blank-line command | 1 | 9 | writes a blank Message-Window line |
| implicit namespace include `#lib.method(args)` | 385 | — | calls into an included library (`system`, `mlib`, …) |
| `#If` / `#While` / `#For` statements | 2,724 / 155 / 158 | — | `#For(init;cond;step)` uses `;` internally |

† TK 1.4 assignments are written without the `#` prefix and its tokenizer here treats them as loose lines, so the 1.4 column is unrepresentative for that row. `—` = not separately measured.

Argument-shape totals across all command calls (kind: count): `num` 9,784, `var` 4,482, `expr` 3,323, `str` 3,110, `frac` 492, `label` 369, `unq` 207, `other` 15. `str`/`num` are quoted strings/numbers; `var` is a `sigil` variable (`x!`, `name$`); `unq` is an **unquoted word/filename** — the TK2 “unquoted string argument” form (e.g. `#SetImage(title.gif,…)`).

## What the TK2 help says that §9.9 does not

§9.9 lists six legacy forms; the 2.20b help and the 2.x corpus show the following are missing or wrong:

| # | Gap in §9.9 | Evidence |
|---|---|---|
| 1 | §9.9 says TK2 uses `< >` block delimiters. **2.x uses `{ }`**; `< … >` plus the `then` keyword is the **1.x** form. | 2.x: 3,120 `{`, 0 `<`; 1.4: 43 inline `<`, 22 `then` |
| 2 | `#` is described only as a command marker; it is a **statement introducer** — `#x! = 1` is the ordinary assignment form. | 3,849 such lines |
| 3 | Labels and flow: `:label`, `#Branch(:label)`, and **`#FBranch(:label)` subroutine sections** (the ADR's “call stack”). | 124 labels, 363 branches, 6 fbranches |
| 4 | `#Method`/`#ReturnMethod` are the current TK2 user-command mechanism, not merely “legacy”. | 317 definitions, 33 returns |
| 5 | `#Include(filename$)`, `#Redirect(old,new)`, `#KillRedirect`, `#KillAllRedirects`, `#RPGCode` and **implicit namespace includes** `#Library.method()`. | 385 namespace calls |
| 6 | `@` (blank Message-Window line) and `*` comment, plus `#Empty()` (clear all variables), `#Show`, `#Print`, `#Scan`, `#Mem`, `#Break` (debugger), `#Dos`/`#Windows`. | command-reference entries + corpus uses |
| 7 | The `=`-as-comparison rule applies to every `#If`/`#While` condition, and the help documents `==`, `~=`, `<`, `>`, `<=`, `>=` as the comparison set. | 293 single-`=` conditions |
| 8 | `#For(init;cond;step)` and the block-after-header form (`#If (c) { … }` on one line, or `{` on the next). | 158 `#For` |
| 9 | Strings are single-line `"…"`; the help shows `<var>` interpolation inside message strings (`spliceVariables`). | help `#Wait`/`#Prompt` examples |

## Mapping detail worth a doc/ADR note

- `#NewPlyr` → `newPlayer`; `#SetImage`/`#SetImageTransparent`/`#SetImageAdditive` → `setImage*`; `#WalkSpeed`/`#ItemWalkSpeed` → `characterSpeed`/`itemSpeed` (string→numeric adapter).
- Audio aliases `#MidiPlay`/`#MidiRest`/`#MP3`/`#Wav` are all listed in §9.11 as legacy aliases of `mediaPlay`/`mediaStop`/`wav`/`sound`, so 2.x audio needs no new catalogue names.
- Obsolete UI/game-state controls used by 2.x games: `#Dos`, `#Windows`, `#Over`, `#Reset`, `#Gone`, `#Win` are all present in §9.11 (mostly tagged *obsolete*).
- Only **two** TK2 built-ins have no 3.1 catalogue twin: `#Empty` (clear every variable) and `#FBranch` (section call/return stack). Both belong to the ADR 0004 `@rpgtoolkit/plugin-tk2-compat` plugin.

## Name-set deltas (help220 ↔ §9.11)

- Documented in the 2.20b help but absent from §9.11: `break`, `empty`, `fbranch`, `for`, `if`, `include`, `itemwalkspeed`, `killallredirects`, `killredirect`, `method`, `newplyr`, `redirect`, `return`, `returnmethod`, `setimage`, `setimageadditive`, `setimagetranslucent`, `setimagetransparent`, `underarrow`, `while`.
- In §9.11 with no 2.20b help entry: 102 names (e.g. `activeplayer`, `append`, `apppath`, `asc`, `autocommand`, `autolocal`, `binary`, `boardget`, `boardgettile`, `canvasdrawpart`, `canvasgetscreen`, `chr`, `closefile`, `cost` …).

## Unknowns / not determinable

- **39 command names are unmapped**: plugin-provided (`#httpRead`, `#ftpConnect`, `#ftpWrite`, `#fileRead`, `#xfmWin`, `#twSetButton`, `#giveDp`/`#giveFp`, …), library namespaces reached through implicit include (`#system.*`, `#mlib.*`, `#nlib.*`, `#engine.*`), or user commands whose `#Method` declaration lives in a file not present in the corpus. Full list in the CSV (`class=unknown`).
- **119 names are `#Method`-declared** in the corpus; they need no engine mapping, only that the TK2 frontend resolves user commands before built-ins (ADR 0004 Command Registry).
- `#GiveDP`/`#GiveFP` are used (Mazza201Methods, 2.x) but appear in **neither** help220 nor §9.11; whether they are late-2.x built-ins or a plugin's commands is `[INFERENCE]`-level and unresolved.
- TK 2.0b1 / 2.07 installers carry no extractable help or sample games (payloads are inside `tktzip.exe`/`zip.exe`), so nothing between 1.4 and 2.20b could be inspected; the `2.x = { }` conclusion rests on 2.20b + the 2.x corpus.
- 2.20b `Tk220bSource.udc` and all GitHub/source bundles were left unopened per the G7 ban; anything only visible in engine source is not answered here.
- Loose-text vs bare-statement disambiguation is heuristic: a line with no `#`/`*`/`:`/brace and no `=` is counted as dialogue. A few prose lines containing `=` may be misfiled either way.

