# Community pain points for editor UX

## Scope and method

This is an evidence pass for TKR editor UX, not a history of the whole community. I mined:

- `nostalgia-messages.jsonl`: 3,535 Discord messages from 75 handles (2019–2026).
- `general-relevant-messages.jsonl`: 247 curated `#general` messages from 23 accounts (2025–2026). This is a selected file, not a complete export.
- `forum-posts.jsonl`: 9,674 archived posts, mainly 2002–2010. Its fields are `id`, `source`, `forum`, `thread_id`, `msg_id`, `author`, `ts`, `ts_raw`, `subject`, `text`, `attachments`, `capture`, and `wayback`.
- Existing synthesis: `research-what-survived-of-rpg-toolkit.md`, `general-analysis-2025-2026.md`, and headings/content in `legacy-ui-visual-archaeology.md`. I use those for context and avoid presenting their already-known claims as new corpus findings.

The exact matching expressions are preserved in [community-scan.py](community-scan.py). Run `python3 community-scan.py /path/to/rpgtoolkit-archive/data` to reproduce the table without emitting private message text. Corpus paths can be supplied explicitly; this script reads no legacy engine source.

1. Read each non-blank JSONL row and concatenate `subject + " " + text`.
2. Lowercase for matching; retain the original row for quotes.
3. Count a row once per theme if its regular-expression set matches. Counts below are lexical hits, not a claim that every hit is a confirmed UX report. A single message can count in several themes.
4. For the seven editor-specific how-to counts, require both an editor-term set and a question/confusion cue (`?`, `how`, `where`, `why`, `help`, `problem`, `trouble`, `confused`, `can't`, `cannot`, `doesn't`, or `won't`).
5. For feature requests, require a request cue (`suggest`, `suggestion`, `wish`, `would be nice`, `need`, `request`, `idea`, `feature`, `improvement`, `add`) **and** an editor/design cue (`editor`, `board`, `tile`, `tileset`, `animation`, `program`, `RPGCode`, `code`, `plugin`, `battle`, `background`, `save`, `undo`, `batch`, `spill`, `drag-and-drop`, `randomized`, `newbie`, `user-friendly`, `easy`, `export`, `setup`, or `build`).
6. Manually inspected candidate hits and selected short verbatim excerpts. Every excerpt is under 30 words and carries its corpus ID, handle, and source date. Private contact details in forum posts are not reproduced.

The actual matching logic is equivalent to this (the named regexes are described in the table below; `CUE` is the question cue above):

```python
for path in CORPORA:
    for row in read_jsonl(path):
        haystack = (row.get("subject", "") + " " + row.get("text", "")).lower()
        for theme, pattern in THEMES.items():
            if regex(pattern, IGNORECASE | DOTALL).search(haystack):
                hits[theme].append(row["id"])
        for editor, pattern in EDITOR_TERMS.items():
            if regex(pattern, IGNORECASE).search(haystack) and CUE.search(haystack):
                how_to[editor].append(row["id"])
```
### Keyword sets used for the counts

Exact patterns in the script take precedence over these readable summaries. Bounded expressions such as `.{0,35}` mean a gap of at most 35 characters; “either direction” is implemented by a separate reverse-order alternative. The script enables case-insensitive and dot-all matching. It is deliberately lexical: stems, boundaries and broad `.*` expressions can miss relevant messages or match unrelated ones.

| Count label | Keyword set / rule |
|---|---|
| Lost work | `lost`, `lose`, or `losing` within 35 characters of `work`, `game`, `project`, `file`, `stuff`, `copy`, `save`, or `data`; or `wiped hard drive`, `lost completely`, `gone forever`, or `formatted`. |
| Crash/freeze | `crash`, `crashes`, `crashed`, `crashing`, `freeze`, `freezes`, `freezing`, `freezed`, `not responding`, `won't reopen`, `will not reopen`, `won't open`. |
| Corruption/missing | `corrupt`, `corrupted`, `corruption`; or `file` within 30 characters of `missing`, `not recognised`, `not recognized`, or `error`; or `dll missing`, `bad file`. |
| Save failure | `save`, `saved`, `saves`, or `saving` within 30 characters of `fail`, `problem`, `error`, `wrong`, `work`, `lost`, `crash`, `freeze`, `can't`, `cannot`, `doesn't`, or `not`, in either direction. |
| Board how-to | `board editor`, `board linking`, `link board(s)`, `board settings`, `board information`, `place item on the board`, or `on the board`, plus the question/confusion cue. |
| Tiles how-to | `tile editor`, `tileset`, `tile set`, `make a tile`, an `import` phrase containing `tile`, `graphic`, or `sprite`, or a `tile`/`sprite` phrase containing `problem`, `help`, or `work`, plus the cue. |
| Scripting how-to | `RPGCode`, `RPG code`, `program editor`, `writing program(s)`, a `program` phrase containing `problem`, `help`, `work`, or `error`, a `code` phrase containing `problem`, `help`, `crash`, or `error`, `debugger`, or a `command` phrase containing `problem` or `help`, plus the cue. |
| Database how-to | `character editor`, `edit character`, `enemy editor`, `edit enemy`, `item editor`, `edit item`, `equipment`, an `NPC` phrase containing `problem` or `help`, or a `character` phrase containing `problem`, `help`, or `work`, plus the cue. |
| Animation how-to | `animation editor`, `tile animator`, an `animation` phrase containing `problem`, `help`, `work`, `need`, or `should`, an `animate` phrase containing `problem` or `help`, or a `frame` phrase containing `problem` or `help`, plus the cue. |
| Main-file how-to | `main file`, `.gam`, `new game`, a `start` phrase containing `game`, a `game` phrase containing `file`, `project`, `problem`, `help`, or `work`, or a `project` phrase containing `problem` or `help`, plus the cue. |
| Packaging how-to | `distribution`, `create setup`, `setup file`, `package`/`packaging`, `playable for others`, `upload game`, `build exe`, `build menu`, `create pak`, or `create setup`, plus the cue. |
| Scripting difficulty | A difficulty cue (`not good at`, `no clue`, `don't know`, `can't figure`, `confused`, `flounder`, `hard to`, `difficult`, `trouble`, `struggle`, `unintuitive`, `steep learning`, `programming problem`, or `writing code/program`) within 80 characters of `code`, `RPGCode`, `program`, `script`, `command`, `syntax`, or `editor`, in either direction. |
| Loved | `loved`, `love`, `favorite`, `favourite`, `amazing`, `masterpiece`, `learned to program`, `learned programming`, `career began`, `started game making/programming`, `nostalgia`, `community support`, `powerful`, `flexible`, or `custom` within 70 characters of `Toolkit`, `RPGTK`, `RPGCode`, `editor`, `game making`, `programming`, or `community`, in either direction. |
| Feature requests | A request cue (`suggest`, `suggestion`, `wish`, `would be nice`, `need`, `request`, `idea`, `feature`, `improvement`, `add`) **and** an editor/design cue (`editor`, `board`, `tile`, `tileset`, `animation`, `program`, `RPGCode`, `code`, `plugin`, `battle`, `background`, `save`, `undo`, `batch`, `spill`, `drag-and-drop`, `randomized`, `newbie`, `user-friendly`, `easy`, `export`, `setup`, `build`). |
| Comparisons | `RPG Maker`, `RPGMaker`, `Sphere`, `Adventure Game Studio`, `AGS`, `Godot`, `GameMaker`, `Game Maker`, `Wolf RPG`, `left it`, `leave it`, `switched`, `instead`, `recommend`, `regret choosing`, `stopped using`, or `stayed with`. |

For the editor rows, the cue is `?` or one of `how`, `where`, `why`, `what`, `can`, `could`, `help`, `problem`, `trouble`, `confused`, `don't know`, `not sure`, `cannot`, `can't`, `doesn't`, or `won't`.

The forum export was not deduplicated against Discord. A repeated event or quotation in two corpora therefore contributes one hit in each corpus, as shown in the `N / G / F` breakdown.

### Caveats


- Nostalgia chat is people remembering, rescuing, or replaying old work. It over-represents unusually memorable successes and failures, not ordinary daily editing.
- The forum is a surviving 2000s archive. Its active users were more likely to post when blocked, and the export contains role-play, off-topic, and site-administration posts. The editor counts therefore need manual interpretation.
- `#general` is curated and recent; its counts cannot be compared directly with the much larger forum corpus.
- IDs are stable source IDs, not chronological ranks. Forum timestamps contain some malformed hour values; dates below use the date portion of `ts`.
- A keyword hit is evidence that a topic was discussed, not prevalence in the user population. Quotes are illustrative, not a statistically random sample.

## Quantitative findings

Counts are unique messages matching the method above. Corpus order is nostalgia / general / forum.

| Pain or evidence theme | Count (N / G / F = total) | Representative IDs for citation |
|---|---:|---|
| Lost work or project files | 2 / 2 / 11 = **15** | N0453, G251002-141947, B117012, B296124 |
| Crash, freeze, or “not responding” | 8 / 1 / 35 = **44** | N0235, N0814, N3377, A1000-15984, B324936, B294347 |
| Save failure | 0 / 0 / 26 = **26** | B254913, B326326, B327387 |
| Corruption, missing file, or unrecognised file | 0 / 0 / 26 = **26** | B173884, B293080, B326390, B300625 |
| Board how-to/confusion | 1 / 0 / 60 = **61** | N1681, B250200, B254463, B303403 |
| Tiles/tileset how-to/confusion | 2 / 0 / 110 = **112** | N1519, N1669, B190398, B326326 |
| Scripting/programming how-to/confusion | 8 / 0 / 255 = **263** | N1682, N2124, B214779, K487494 |
| Character/item/enemy how-to/confusion | 1 / 0 / 76 = **77** | A1000-15982, K228604, B327350 |
| Animation how-to/confusion | 1 / 1 / 41 = **43** | N2412, A1002-2042, B189955, K421187 |
| Main-file/project setup how-to/confusion | 8 / 2 / 103 = **113** | N0734, N0735, K381760, B293080 |
| Packaging/distribution how-to/confusion | 1 / 1 / 13 = **15** | A1001-14258, B253278, N3451 |
| Scripting difficulty (explicit struggle/confusion) | 2 / 0 / 45 = **47** | N1652, N1682, B214779, N2124 |
| What people loved about the legacy tool/editor | 13 / 5 / 22 = **40** | N0814, N1940, N2015, G250927-010816, K487670 |
| Feature requests touching editor/design work | 17 / 4 / 351 = **372** | A1002-2028, A1002-3170, A1002-2042, A1002-10213, K421187 |
| Comparisons and reasons to leave/stay | 107 / 15 / 196 = **318** | G250528-153534, G250528-164846, N1911, A1000-28124, N3345 |

The safety search does find “lost my work,” but the strongest direct cases are hard-drive loss, formatted machines, a project lost completely, and a tile that disappeared after a failed save. There is no strong lexical evidence here for users explicitly asking for “autosave”; autosave is a design response to observed loss, not a quoted community request.

## Evidence excerpts

### Lost work, crashes, saves, and corruption

#### Lost work

- **N0453 — datomas — 2019-08-15.** “I'm just sad the majority of the stuff I made I deleted like an idiot or got lost when I had to wipe a hard drive”
- **G251002-141947 — toolkitz — 2025-10-02.** “I do have backups in old 20 year old CD-Rs, so chances are I probably didn't lost too much.”
- **B117012 — Mick — 2004-10-25.** “Same thing happened to me twice....but in my case my comp. got formatted.... but 1 hint, always backup!”
- **B296124 — herbular dopeness — 2006-02-08.** “i lost this game completely.... so im starting from scratch”

These are not all editor crashes: some are machine, backup, or archival failures. They still establish the user expectation that project loss is a real safety concern.

#### Crash or freeze

- **N0235 — grindalfgames — 2019-08-06.** “the exe crashes on occasion and then will not reopen.”
- **N0814 — capnmer1ca — 2021-01-19.** “it was the GameEngine that kept freezing on me”
- **N3377 — grindalfgames — 2026-05-03.** “if an error happens I have to do a complete reboot”
- **B324936 — darth duck — 2006-06-04.** “i crashes everytime i press open project and the tk stops responding.”
- **B294347 — decker666 — 2006-02-01.** “if i try to load my original game it just freeze and goes to "(Not Responding)"”

The failure mode is especially dangerous when it happens while opening a project or after testing: the user cannot tell whether the project, editor, or operating system is at fault.

#### Save failure

- **B254913 — Ryukenshen — 2005-09-07.** “TK 3.0.6 still won't work on my Windows XP. (I'm not an administator, is that why?) Nothing saves”
- **B326326 — jpsmtm — 2006-06-10.** “it wont let me saves, and usual ends up with me losing the tile i just drew.”
- **B327387 — Icbim — 2006-06-14.** “Cannot save into tileset!”

The tile cases are important: a save error is not merely an inconvenience if the editor has no recovery copy or visible draft.

#### Corruption or missing/unrecognised files

- **B173884 — Dominea — 2005-03-01.** “Now files are corrupt. Maybe a new upload.”
- **B293080 — micklo — 2006-01-28.** “character file (start.tem) not recognised”
- **B326390 — spoopryme — 2006-06-10.** “problems with my character sprites being corrupted”
- **B300625 — Delano — 2006-02-22.** “Sounds like your tileset is corrupted.”

The evidence does not prove whether every corruption report was caused by the editor. The design implication is narrower: validation and recovery should identify the asset and the operation that failed instead of presenting an opaque runtime symptom.

### “How do I?” confusion by editor

#### Board editor

- **N1681 — chaihaveaproblem — 2022-07-01.** “do you perhaps remember how to place an item on the board”
- **B250200 — Chilvan — 2005-08-26.** “ive been trying to find out how to link boards and nothing helps!”
- **B254463 — new game maker — 2005-09-05.** “how do you make your boards with paint. all i can use is tiles....?”
- **B303403 — Fingerz91 — 2006-03-04.** “setting the western(left) link to start board. ... Start the game. NOTHING WORKS!”

The board questions span placement, links, drawing modes, and setup. A board canvas alone does not teach the author what an object is or how a destination is connected.

#### Tile and tileset tools

- **N1519 — chaihaveaproblem — 2022-06-27.** “the tileset editor is truely awful and the workflow leaves so much to be desired”
- **N1669 — chaihaveaproblem — 2022-07-01.** “the horror. I have to do my own tile placement in 2022?”
- **B190398 — Metallic — 2005-04-04.** “I try to upload the picture onto the tile editor, but nothing appears.”
- **B190398 — Metallic — 2005-04-04.** “how can I eliminate the backround behind the sprite?”

The current editor plan should treat image import, transparency, tile extraction, and tileset insertion as one guided operation rather than separate unexplained prerequisites.

#### Scripting and program editor

- **N1682 — chaihaveaproblem — 2022-07-01.** “I just can't seem to grasp the syntax of createItem()”
- **N2124 — chaihaveaproblem — 2022-07-06.** “I can't seem to get tellThread to function”
- **B214779 — aebomb — 2005-06-04.** “im new to coding and still have no idea what im doing”
- **K487494 — Dylan RPG — 2009-12-27.** “I have done many searches on these forums looking for similar issues”

The direct need is not to remove code. It is to provide a discoverable first path, examples, typed command help, and a way to inspect what a trigger is actually running.

#### Character, item, and enemy editors

- **A1000-15982 — -Porian Kid — 2002-02-04.** “So is it possible to make them as characters and not items?”
- **K228604 — Tomb Lifter — 2005-07-06.** “How do i make an NPC”
- **K228604 — Tomb Lifter — 2005-07-06.** “How do i make the NPC sell me stuff”
- **B327350 — spoopryme — 2006-06-13.** “tk2 has the superior enemy creation system”

The first three questions show that “NPC,” “item,” “character,” and “program” were not obvious concepts or boundaries. The fourth is comparative praise for a more direct enemy-creation affordance, not proof that TK2 was objectively better in all cases.

#### Animation and sprite graphics

- **N2412 — seafroggys — 2022-07-26.** “importing them into the TK ... was so unintuitive, it took a long long time to import them”
- **A1002-2042 — wHO — 2002-01-31.** “the animation editor needs to use gifs as whole animations”
- **A1002-2042 — wHO — 2002-01-31.** “if you could just select a gif as an animation people would save hours”
- **B189955 — Metallic — 2005-04-03.** “how can I actually upload the sprites to the game and animate them?”

The repeated problem is a pipeline problem: authors have images, but do not know the required frame arrangement, transparency, animation format, or import step.

#### Main file and project setup

- **N0734 — unconnected5908 — 2020-10-29.** “project exists when I open files via the editor, but they do not exist in the explorer”
- **N0735 — unconnected5908 — 2020-10-29.** “same with the .Gam file in "Main", is this just a bug”
- **K381760 — clakes707 — 2007-02-21.** “How do I get it so that the board I have made shows up in the game.”
- **B293080 — micklo — 2006-01-28.** “how can i overcome this problem?”

The main-file flow is where users expect their project to become a game. If a board, character, or project file is not selected in the right place, the runtime can show a default grass board or a blank/white screen without explaining the missing link.

#### Packaging and distribution

- **A1001-14258 — matrix — 2002-06-06.** “Can anyone help me set up my game for distribution?”
- **A1001-14258 — matrix — 2002-06-06.** “it frezzes and then says it's done but I can't find the compressed file afterwards”
- **B253278 — prowlor — 2005-09-03.** “I dont know which one to do. ... PakFile, EXE, or Setup, or all three?”
- **N3451 — cuthalionxvi — 2026-06-28.** “It wasn't super obvious how distributing a game you made with the TK worked either.”

Distribution is a first-class author job, not an afterthought. The build UI needs one recommended action, a clear output location, and a post-build check that opens or explains the produced package.

### Scripting difficulty as a separate pain

- **N1652 — .armaniac — 2022-06-30.** “I was just a loser who didn't know how to code ... floundering around with it”
- **N1682 — chaihaveaproblem — 2022-07-01.** “I just can't seem to grasp the syntax of createItem()”
- **B214779 — aebomb — 2005-06-04.** “i do better with examples anyway.”
- **G251009-162151 — feer04229 — 2025-10-09.** “My problem is not generating the code, it is understanding how the machine interprets the scenes/environments.”

This supports the decision to make common actions one-click while keeping code available. It also argues for generated examples, fixture-based test runs, and diagnostics that explain the world effect rather than only the syntax error.

### What people loved

- **N0814 — capnmer1ca — 2021-01-19.** “I loved rpgcode, even with all its bugs xD”
- **N1940 — chaihaveaproblem — 2022-07-02.** “I love the toolkit though for instilling this lifelong passion of game design”
- **N2015 — fluidityz — 2022-07-04.** “if it wasn't for this project, I wouldn't be the software developer I have come to be today.”
- **G250927-010816 — turplepony — 2025-09-27.** “my love for game making began at rpgtoolkit when I was a little kid”
- **G250528-165628 — seafroggys — 2025-05-28.** “Toolkit was considered a stepup above RPGMaker because of RPGCOde”
- **K487670 — Mr. 404 — 2010-01-01.** “This editor comes closest to my unrealistically-perfect Dream Editor of the things I've used.”

The lasting value is agency: scripting, experimentation, and an approachable start that enabled people to learn. TKR should not “fix” the editor by hiding its expressive ceiling.

### Features people asked for

- **A1002-2028 — Jer1400 — 2002-01-27.** “There should be a spill affect for when you are putting down tiles”
- **A1002-3170 — grafxguy — 2002-06-01.** “have a drag and drop function that will allow you to place a small board ... into the larger board”
- **A1002-2042 — wHO — 2002-01-31.** “the animation editor needs to use gifs as whole animations”
- **A1002-10213 — computerdude800 — 2003-07-07.** “Have a plugin editor”
- **K421187 — SuperIsoRPG — 2007-11-15.** “it would be nice to see an integrated batch animator”
- **K461655 — comfox — 2008-12-17.** “The current help files and the current editor are very hard to understand and badly designed at parts.”

These requests map closely to modern TKR directions: flood/auto-tiling, reusable stamps/components, batch import, a plugin/extension surface, and beginner help. They are requests from different eras, not a single agreed specification.

### Comparisons and why people left or stayed

- **G250528-153534 — _thomasdillon — 2025-05-28.** “I regret choosing it for The Secret of Luin and wouldn't recommend it for any serious project.” (RPG Maker)
- **G250528-164846 — .several — 2025-05-28.** “doing simple stuff is a lot harder than it needs to be. At least, compared to Godot”
- **N1911 — cuthalionxvi — 2022-07-02.** “If you have coding experience, Godot will be more flexible and let you make pretty much whatever.”
- **A1000-28124 — -whist- — 2003-07-15.** “It isn't powerful enough, that's why I've left it in my dust”
- **N3345 — zerzic. — 2026-04-25.** “I personally moved onto Game Maker with my original rpg.”
- **N2859 — schererja — 2024-02-23.** “the rpgtoolkit was one of the best things like this I’ve used. I tried rpg maker and couldn’t stand it.”

The examples show different tradeoffs rather than a measured ranking: some praise the **legacy Toolkit/RPGCode** for custom behaviour; others moved to Godot or GameMaker, and RPG Maker receives both praise and criticism. TKR is the new project, not the historical tool these messages describe. No substantive AGS comparison was found in this selected pass; that is a search gap, not proof of absence.

## What this means for the design

| Corpus evidence | Decision/open question in `decisions.md` | Result |
|---|---|---|
| Direct lost-work reports include a wiped drive, formatted computer, project lost completely, and tile loss after save failure. | Foundation: “Nothing is ever lost” (atomic save, draft recovery, undo) is proposed. | **Confirm and strengthen.** The evidence supports recovery and atomic writes. Add an explicit “recover the last draft” entry point and an operation-level error that names the unsaved asset. Do not claim the corpus proves autosave demand; it proves loss is memorable and consequential. |
| Crashes/freezes appear around opening projects and running games. | Near-the-cause feedback and save-before-test are **proposals**, not owner-approved Play semantics. | Keep editor drafts independent of runner failure, show what revision is being tested, and never mistake a runtime crash for a save failure. |
| Board linking and placement questions repeatedly produce blank boards, wrong destinations, or invisible objects. | Board outline, contextual properties, destination arrows, and create-on-the-fly destinations are proposed. | **Confirm.** Add a visible “this board is not the start board” state, a destination preview, and a warning when a linked board cannot be resolved. |
| Tile import and animation reports describe manual conversion, transparency confusion, and long frame-by-frame work. | Tile grabber, shared tileset browser, live previews, and person “pick a look” are in the feature inventory/design. | **Confirm and prioritise.** Import should detect grid, show transparency, preview animation, and write into the project folder. Keep advanced per-frame control for complete capability. |
| NPCs being “items,” and enemy creation requiring many separate animations, are not obvious concepts. | Gallery of placeable things and the Person/Chest/Pickup/Equipment split are proposed; database master-detail is proposed. | **Confirm.** Expose meaning-based concepts while retaining one underlying model and an advanced path. “What is this?” should be answerable from the selected object. |
| Scripting questions show syntax confusion but also affection for RPGCode's power. | Common things become one-click blocks; code remains first-class; visual event builder priority is open/conflicted. | **Confirm the two-layer strategy.** Add sentence-like actions and generated code with “show as code,” plus a direct code editor with call tips, references, fixtures, and diagnostics. Do not replace hand-written RPGCode. |
| Historical accounts discuss starting, customisation and distribution difficulties; they are not tests of TKR. | Beginner/full-capability direction is selected; detailed packaging and template UX is proposed. | Treat first success and finishability separately. A new project should reach a playable board quickly, and a completed game needs an understandable build path. |
| Requests for spill fill, reusable board pieces, batch animation, plugin editor, and friendlier help recur across years. | Auto-solid tiles, components/instances, generated scripts, and native format are open/proposed. | **Add to owner review.** These are not just polish. They reduce repetitive work and explain why the editor should use semantic tools over a flat file tree. |
| The community praises flexibility and learning impact while criticising friction. | Complete editing capability and no cut-down beginner subset are decided. | **Confirm.** Beginner affordances must be alternate paths over the full model, not a locked “simple mode” that later strands the author. |

### Is “lost my work” really present?

Yes, but with a narrower and more useful interpretation than a raw keyword count suggests. Strong examples are:

1. **Archive/project loss:** N0453, G251002-141947, B117012, and B296124 describe deleted work, old TK files lost, formatted computers, and a project lost completely.
2. **Editor-operation loss:** B326326 and B327387 describe a tile save failure followed by having to redo the tile.
3. **Runtime/editor failure:** N0235, N3377, B294347, and B324936 describe crashes/freezes around opening or running projects.

The corpus does **not** establish that every user lost work because of a save bug, nor that autosave was explicitly requested. The defensible design requirement is: every edit has a recoverable draft, writes are atomic, undo is universal, and failures identify what was preserved.

## Open data gaps

1. **No complete Discord history.** The general analysis says the selected `#general` file covers the most recent 5,000 rows and earlier history is missing. Exporting the missing period could change counts.
2. **No channel semantics in the forum export.** Many forum posts are role-play, site, or off-topic material. A thread/category map would make editor-specific counts more precise.
3. **No controlled denominator.** We have message counts, not unique authors per pain theme, session-level incidents, or time spent blocked.
4. **No direct autosave survey.** Loss is evidenced, but the corpus does not tell us whether authors prefer timed drafts, save-on-play, version history, or explicit prompts.
5. **No reliable causal chain for corruption.** Reports often mix OS versions, video drivers, downloads, and editor versions. Reproduction steps and project artifacts are missing.
6. **AGS is not substantively represented.** Search hits for Adventure Game Studio/AGS produced no useful comparison. A targeted search of surviving communities is needed before treating that tool as a design reference.
7. **Sparse modern beginner evidence.** Most detailed how-to posts are from the 2000s, while current nostalgia messages are often from experienced returners. A usability study with first-time authors is still required.
8. **No quote-level thread context in this document.** Replies may contain the solution or correction; the IDs above point to source rows, but a future pass should reconstruct complete help threads before turning any one report into a requirement.

## Sources

- `/Users/jensen/projects/rpgtoolkit-archive/data/nostalgia-messages.jsonl`
- `/Users/jensen/projects/rpgtoolkit-archive/data/general-relevant-messages.jsonl`
- `/Users/jensen/projects/rpgtoolkit-archive/data/forum-posts.jsonl`
- `/Users/jensen/projects/rpgtoolkit-reawakened/_bmad-output/initiative-rpgtoolkit-reawakened/research-what-survived-of-rpg-toolkit/research-what-survived-of-rpg-toolkit.md`
- `/Users/jensen/projects/rpgtoolkit-reawakened/_bmad-output/initiative-rpgtoolkit-reawakened/research-what-survived-of-rpg-toolkit/general-analysis-2025-2026.md`
- `/Users/jensen/projects/rpgtoolkit-reawakened/_bmad-output/initiative-rpgtoolkit-reawakened/research-what-survived-of-rpg-toolkit/legacy-ui-visual-archaeology.md`
- `/Users/jensen/projects/rpgtoolkit-reawakened/_bmad-output/initiative-rpgtoolkit-reawakened/research-editor-ux-for-beginners/decisions.md`
- `/Users/jensen/projects/rpgtoolkit-reawakened/docs/editor-features.md`
- `/Users/jensen/projects/rpgtoolkit-reawakened/docs/adr/0004-script-ast-step-ir-and-plugins.md`
- `/Users/jensen/projects/rpgtoolkit-reawakened/docs/adr/0005-independent-product-v1-and-native-format.md`
- `/Users/jensen/projects/rpgtoolkit-reawakened/docs/guardrails.md`
