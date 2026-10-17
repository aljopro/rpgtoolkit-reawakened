# RPGCode command census (what authors actually wrote)

**Why this exists.** To choose which actions get one-click blocks, we counted what ~2,550 real community programs call, instead of guessing.

**Method.** `command-census.py` reuses the archive scanner's iterators: loose `.prg` files under `wayback/` and `archive-org/`, plus `.prg` members in supported nested ZIPs. Exact byte-content hashes collapse copies (2,550 distinct texts). It strips comments approximately, then matches identifiers followed by `(`, excluding a small keyword list. Run the copied script by absolute path with the **archive root as working directory**; it imports `tools/scan-thread-commands.py` from that directory. It is an exploratory lexical scan, not a parser or a census of all games ever published.

**Caveats.**
- Counts are **programs that call the command at least once**, not triggers; one long menu script counts once.
- Only calls written with parentheses are seen. Toolkit-2-style `#Command arg` lines and bare dialogue lines (which that dialect treats as messages) are invisible, so message and wait counts are probably **under**-stated for older games.
- Command meanings were initially inferred from names. Review against `docs/spec/engine/rpgcode-functions.md` confirms `put` edits board tiles, `kill` deletes variables, `push` moves the player, `clear` clears the screen, and `done` ends execution. **`put` is not a screen-layout command.** `bordercolor` is obsolete and raises an error; its frequency does not justify generating new calls to it.
- Corpus bias: community-shared programs from the site archives; archives overlap and byte-distinct versions remain separate. ZIP limits, unreadable files and non-ZIP containers restrict coverage.
- The scan does not remove string literals or parse declarations, method calls or computed calls. Matching strings can be false positives; excluded keywords may themselves be callable commands (`print` is excluded by this script). Counts and “coverage” therefore describe **detected identifier strings**, not verified runtime call graphs or block-convertible programs.

## Top 40 by programs using the command (of 2,550 unique programs)

| # | Command | Programs | Share | Total calls |
|--:|---|--:|--:|--:|
| 1 | `send` | 1121 | 44.0% | 1207 |
| 2 | `wait` | 810 | 31.8% | 2623 |
| 3 | `mwin` | 793 | 31.1% | 4088 |
| 4 | `mwincls` | 358 | 14.0% | 1469 |
| 5 | `delay` | 269 | 10.5% | 1216 |
| 6 | `text` | 248 | 9.7% | 3858 |
| 7 | `wav` | 245 | 9.6% | 466 |
| 8 | `colorrgb` | 219 | 8.6% | 1600 |
| 9 | `fontsize` | 213 | 8.4% | 657 |
| 10 | `branch` | 159 | 6.2% | 1042 |
| 11 | `include` | 158 | 6.2% | 170 |
| 12 | `setimage` | 139 | 5.5% | 934 |
| 13 | `bitmap` | 133 | 5.2% | 302 |
| 14 | `put` | 121 | 4.7% | 767 |
| 15 | `fade` | 119 | 4.7% | 226 |
| 16 | `end` | 112 | 4.4% | 225 |
| 17 | `clear` | 107 | 4.2% | 213 |
| 18 | `givegp` | 106 | 4.2% | 174 |
| 19 | `giveitem` | 106 | 4.2% | 316 |
| 20 | `kill` | 106 | 4.2% | 1702 |
| 21 | `push` | 104 | 4.1% | 690 |
| 22 | `run` | 103 | 4.0% | 176 |
| 23 | `setimagetransparent` | 102 | 4.0% | 635 |
| 24 | `midiplay` | 97 | 3.8% | 173 |
| 25 | `done` | 88 | 3.5% | 110 |
| 26 | `font` | 87 | 3.4% | 138 |
| 27 | `fillrect` | 77 | 3.0% | 637 |
| 28 | `color` | 76 | 3.0% | 392 |
| 29 | `setbutton` | 75 | 2.9% | 498 |
| 30 | `pause` | 75 | 2.9% | 246 |
| 31 | `bordercolor` | 74 | 2.9% | 194 |
| 32 | `load` | 74 | 2.9% | 97 |
| 33 | `random` | 73 | 2.9% | 304 |
| 34 | `getgp` | 70 | 2.7% | 90 |
| 35 | `mouseclick` | 70 | 2.7% | 127 |
| 36 | `fightenemy` | 67 | 2.6% | 70 |
| 37 | `savescreen` | 65 | 2.5% | 143 |
| 38 | `checkbutton` | 65 | 2.5% | 82 |
| 39 | `dirsav` | 64 | 2.5% | 90 |
| 40 | `restorescreen` | 61 | 2.4% | 482 |

Reading guide: `send` = send the player to another board; `wait` = wait for a key; `mwin`/`mwincls` = message window show/clear; `delay` = pause; `wav`/`midiplay` = sound/music; `branch` = jump to a labelled part; `include` = reuse another program; `giveitem`/`givegp` = give item/gold; `fightenemy` = start a battle; `fade` = screen fade.

## Detected-identifier coverage (not block-conversion coverage)

Of 2,521 texts with at least one non-excluded match:

| If blocks cover the top N commands... | Programs that use *only* those | Programs that use *at least one* |
|--:|--:|--:|
| 5 | 49.9% | 85.7% |
| 10 | 51.0% | 91.0% |
| 20 | 55.7% | 92.8% |
| 30 | 62.4% | n/a |
| 50 | 67.3% | n/a |

Takeaways:
1. The five most frequent detected identifiers occur in 85.7% of matched texts; 49.9% have no detected identifier outside those five. This suggests prioritising transitions and dialogue, **not** that five blocks fully express half of all programs. Variables, branches, declarations and non-parenthesised syntax still matter.
2. The long tail supports keeping hand-written code first-class. The exact block-convertible share requires a parser-based follow-up and real conversion of representative scripts; it has not been measured here.
3. Separate counts for `text`, colours, fonts, images, rectangles and buttons suggest repetitive screen authoring. A shared layout designer is a **design hypothesis**; these counts do not identify how many distinct programs are menus or prove that their authors preferred a visual editor. Exclude board-edit command `put` and obsolete `bordercolor` from new screen generation.
4. `include` indicates reuse; keep shared programs reachable without claiming that every include is a reusable editor component.

## Reproduce

```bash
cd ~/projects/rpgtoolkit-archive
python3 <path to>/command-census.py
```
