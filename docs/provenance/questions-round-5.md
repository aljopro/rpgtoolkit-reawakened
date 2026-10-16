<!-- Clean-room extraction round 5 (ADR 0006): question list. Answers: facts-round-5.md. -->

# Clean-room extraction, round 5 — where our evidence and `docs/spec/` differ

* **Status:** the owner forwarded the packet below to the authors of `docs/spec/` on 2026-10-15; this file is the numbered list.
* **Date:** 2026-10-15
* **Process:** [ADR 0006](../adr/0006-clean-room-spec-extraction.md). Answers are prose facts with a certainty label (*observed*, *read from the program's logic*, *not sure*), reviewed by a separate agent before they enter `docs/`.
* **Full text, with our evidence and the page each question is about:** `_bmad-output/initiative-rpgtoolkit-reawakened/discovery/implementor-review-packet.md`.
* **Legacy source:** not read by the orchestrating assistant to write this list.

| # | Question |
|---|---|
| Q1 | Text `.anm`: what does the frame-count line hold, and which count does the engine honour? |
| Q2 | Binary `.gam` below minor 3: how wide are the two reserved fields? |
| Q3 | How is `if (opt!=1)` read: compare or assign? |
| Q4 | Does a blocking command inside a thread freeze the whole game? |
| Q5 | Are error line numbers one too high? For which errors? |
| Q6 | Does `FileInput` drop the last character of every line? |
| Q7 | Text `.gam`: plugin count of 5 with four flag lines; is the tail optional? |
| Q8 | Binary `.tem` at minors 3 and 4: which field is one byte, and what are the leftover bytes and the size-type value 99? |
| Q9 | Text `.bkg`: what is the empty name line between the sounds and the shade grid for? |
| Q10 | Text `.tem`: does the `-2` empty-picture marker apply to characters? |
