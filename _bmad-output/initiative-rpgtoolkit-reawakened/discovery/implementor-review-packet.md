---
type: discovery
title: "Review packet for the authors of docs/spec: ten questions where our evidence and their pages differ"
date: 2026-10-15
status: draft, for the owner to forward
---

# Ten questions for the authors of `docs/spec/`

We are migrating our earlier notes (`docs/format-spec.md`) into your `docs/spec/`, which is now our normative specification. Where the two agree we simply adopt yours. This packet covers only the ten places where they differ, or where our notes ask something your pages might answer. Most are quick: a yes or no and a sentence.

## How to answer (clean-room rules, please)

This project is a clean-room rebuild, so the way you answer matters as much as the answer (our ADR 0006).

- **Answer in your own words, as facts about behaviour or file layout.** Not code, not pseudocode, not identifiers, function or file names from the original program, not error strings.
- **Say how sure you are**, per answer: *observed* (you ran it or saw it in a file), *read from the program's logic*, or *not sure*.
- **Please don't send source.** If an answer needs more than a sentence, describe the behaviour instead.
- We will record your answers as extraction round 5 (`docs/provenance/extraction-log.md`) and review them before they enter the spec.

## Questions

### Q1. Text `.anm`: what does the frame-count line hold?
- **Your page** (`docs/spec/formats/legacy/text-formats.md:173`): the engine reads that line plus one, and "files from the Toolkit always stored UB = 50".
- **Our evidence:** all **17** text `.anm` files we have (Caoquest 7, ChimeranEmpire 9, the official 2.20b demo 1) store **0** on that line, yet **51** frames follow. We read 51 frames by position.
- **Ask:** Is "always 50" a documentation slip? Could a file with a non-zero value there exist, and if so which count does the engine honour: the line or the 51 frames?

### Q2. Binary `.gam` below minor 3: how wide are the two reserved fields?
- **Your page** (`docs/spec/formats/main-file.md:23, 37`): both are a 4-byte `int`.
- **Our evidence:** read as **2 bytes** (`short`), all **15** binary minor-2 main files we have parse to exactly the last byte. Read as 4 bytes, each BusDriver file leaves **1506 unread bytes** and the two FinalDestiny files run off the end.
- **Ask:** Are they 2 bytes in the real engine, or does a different earlier field explain the shift?

### Q3. How is `opt!=1` read?
- **Your page** (`docs/spec/engine/rpgcode-language.md:37`): `a != b` is `a!` then `=` then `b`, an assignment, because `!` is a type marker. `~=` is the only "not equal".
- **Our evidence:** real games contain both `x! = 1` (spaced, an assignment) and `if (opt!=1)` (no space, inside an `if`). We read the unspaced form as "not equal" so both work as the authors evidently intended.
- **Ask:** In the real engine, does `if (opt!=1)` compare, or assign? If it assigns, what does the `if` then test?

### Q4. A blocking command inside a thread
- **Your page** (`docs/spec/engine/rpgcode-language.md:59`): "A blocking command (`Wait`, `Delay`, `Prompt`…) inside a thread freezes the whole game until it completes."
- **Our current design:** only that thread waits; the other threads and the world keep running.
- **Ask:** Is the freeze certain (observed), or inferred from the logic? Do other threads and the board's movement really stop for the whole wait?

### Q5. Are error line numbers one too high?
- **Your page** (`docs/spec/formats/rpgcode-program.md:16-17`): the engine prepends a line, so error lines are off by one.
- **Our current design:** reports the exact line.
- **Ask:** Is that observed in a real error message, or read from the loader? Is it the same for every kind of error, or only compile errors?

### Q6. Does `FileInput` really drop the last character of every line?
- **Your page** (`docs/spec/formats/rpgcode-program.md:46-49`).
- **Ask:** Observed or inferred? Is it the final character of every line, or only when the line has no trailing newline? What does a file written by `FilePrint` and read back look like?

### Q7. Text `.gam`: plugin count of 5, four flags
- **Our evidence:** `caoquest.gam` and the `main.gam` in `devilsnight.tpk` (both 1146 lines) write a plugin count of **5**, then only **four** enabled-flag lines before the closing group.
- **Ask:** Is the count written one too high, or does a fifth line belong to it (a language file, say)? Is everything from field 32 on optional, as the shorter `DEMO.GAM` (1133 lines) suggests?

### Q8. Binary `.tem` at minor 3 and 4
- **Our evidence:** with the level-up experience field read as **1 byte at minor 3 and 4 bytes at minor 4**, followed by a size-type byte and 120 NUL-terminated graphic names, **14 of 16** real files close exactly. FinalDestiny's `Bill.tem` (minor 4) leaves **13** bytes and its `start.tem` (minor 3) leaves **96**. In Caoquest's `red.tem` the size-type byte reads **99** where its neighbour reads 1.
- **Your page** (`docs/spec/formats/legacy/older-binary-versions.md:78`) says a *level type*, not the experience field, is the one byte.
- **Ask:** Which field is one byte at minor 3? Why might two files carry extra bytes, and why might that size-type byte read 99?

### Q9. Text `.bkg`: the empty name line
- **Our evidence:** all **23** text `.bkg` files (845 lines each) have one name line between the four sounds and the shade grid. It is **empty in every file**.
- **Ask:** What is it for? (Your page lists it as ignored.)

### Q10. Text `.tem`: is `-2` an "empty picture" marker for characters?
- **Our evidence:** the two text character files we have (`start.tem`, `swim.tem`, 45091 lines each) are full length, so a `-2` marker is never exercised in them. Our notes say a first value of `-2` marks an empty picture of one line.
- **Your page** (`docs/spec/formats/legacy/text-formats.md:83-93`) gives that marker only for items.
- **Ask:** Does the marker apply to character pictures too?

## What a "you're wrong" costs us

| If you say… | What changes on our side |
|---|---|
| Q1, Q2 | A one-line correction in your page, and in our reader before it is built |
| Q3 | We move to your reading; one lexer rule and its tests change |
| Q4, Q5, Q6 | A rule block in the spec and a small change in how the script engine waits, reports errors and reads files |
| Q7 to Q10 | Open questions close; the text and binary readers are written from your answer |
