<!-- Owner-relayed fact sheet, clean-room extraction round 8 (ADR 0006). Status: prose facts as relayed by the owner, not yet folded into docs/spec/; each ruling that uses them is its own doc-first commit (G7). The numbered question list was not in this repository when the answers arrived; see the note below. -->

# Clean-room extraction, round 8 — audio behaviour answers (OWNER-RELAYED)

* **Source consulted:** not stated. The answerer is the TK-side engineer.
* **Answerer:** Jensen's TK-side engineer contact, relayed by the owner on 2026-10-18. The transcript is not given to implementers (ADR 0006 decision 1).
* **Date:** 2026-10-18
* **Questions answered:** Q1 to Q19 (all nineteen), as a table of one answer per question.
* **Versions.** The owner's covering line: *each answer applies to both versions unless it says otherwise.* The two versions are the **3.1.0 release** and the **final version** (the last released source). Where an answer differs between them, the row says which. Our rebuild must choose one behaviour per difference; that choice is a ruling, not a fact, and is not made here.
* **Confidence labels:** none were given. Every row is *owner-relayed, confidence not stated*; high confidence is **not** assumed. Nothing was observed in a running game as far as the relay says.
* **Question text:** the numbered question list is not in this repository. The topic labels below are written from the answers themselves, for readability; they are not the original question wording. Q numbers match the owner's table.
* **Review:** no separate reviewer agent has read the answerer's original prose. Implementers must treat every row as an owner-relayed behaviour statement.
* **Not relayed:** Q14 refers to a separate file that holds the per-case breakdown of when frame 0's sound plays. That file is not in this repository, so the per-case rule is **unanswered** here.
* Everything below is behaviour prose; no source expression is reproduced.

---

**Q1. `mp3pause`.** *Owner-relayed, confidence not stated.*
* It takes a **file argument**. Our spec row (`void mp3pause()`, "play a sound effect and pause the engine until it finishes") and the manual both list it with none; both are wrong on the signature.
* 3.1.0: it plays that file as a sound effect and freezes the game until the sound ends. Music keeps playing.
* Final version: it does not wait.
* There is no command that pauses music.

**Q2. `wav` and `mp3`.** `wav` never waits. `mp3` is another name for `wav`.

**Q3. Sound-effect slot.** There is one sound-effect slot. A different file replaces the current sound. The same name while it is still playing is ignored.

**Q4. `wavStop`.** It stops that slot: script effects, the default menu's cursor sounds and the default battle system's cursor sounds. It does not stop music or animation-frame sounds.

**Q5. Music change by name.** The new name is checked against the music already loaded, ignoring case. If it is the same and playing, the music carries on. If it is the same but stopped, it starts again from the beginning.

**Q6. Missing music file.** The old music stops first, so a missing file gives silence. Nothing reports an error.

**Q7. Board entry.**
* On entry, the board's music is compared with whatever music is loaded now, not with the previous board's music.
* An empty music field means silence.
* Final version: after a failed or empty name, the old track cannot be played again by name until some different file has loaded.

**Q8. Battle without music.** No fallback. Board music always stops when a fight starts, so a fight with no music is silent.

**Q9. After a fight.** The track from before the fight starts again from the beginning. Music changes made during the fight are lost. After a game-over reset you hear the pre-fight track, not the starting board's music.

**Q10. `mediaStop` then later events.** Yes, the stopped track restarts later. `mediaStop` keeps the track's name, so the next board entry, the end of a fight or the end of a video starts it again.

**Q11. Save, load and `reset()`.** Saves store no audio. Loading a save plays the board's own music. `reset()` does not stop the music.

**Q12. `setVolume`.**
* The value is clamped to 0 to 100 and starts at 100.
* It changes only what is loaded at that moment and is not remembered.
* 3.1.0: MIDI and WAV at 0 are still quiet but audible. Battle music always starts at full volume.
* Final version: the volume has no audible effect.

**Q13. Volume and saves.** Volume is not saved, and `reset()` does not change it.

**Q14. Animation-frame sounds.** They have their own player, separate from `setVolume` and `wavStop`. Whether frame 0's sound plays depends on what drives the animation; the per-case breakdown is in a file that is **not in this repository** (unanswered here).

**Q15. Losing focus.** Losing focus pauses the game. The engine never touches the audio; whether you still hear it depends on Windows and the audio libraries.

**Q16. Video.** The music stops and everything else freezes while the video plays. The player cannot skip it. Afterwards the music starts again from the beginning, even if it had been stopped with `mediaStop`.

**Q17. Formats.** 3.1.0: all the listed formats played and music looped. Final version: only MIDI plays.

**Q18. File names and folders.** All names are inside the Media folder. Subfolders are allowed, no extension is added, and case does not matter. Packaged (PAK) games do not unpack animation-frame sounds or check for videos inside the package.

**Q19. The music variable.** It shows the battle track during a fight. It is not empty after `mediaStop`.

---

## Disposition

Nothing below is a ruling. Each row says what the answer touches so a doc-first ruling can follow (G7).

| Q | Touches | Conflict with what is written today |
|---|---|---|
| 1 | `rpgcode-functions.md` `mp3pause` row (E-100/E-101); command-effect catalogue (`params` there is already `file`); AD-16 and review notes that assume a music pause/resume cue | The spec row has no argument. Epic 6 reviews (`review-reconcile` G-5, `review-rubric` F-12) ask for `music.pause`/`music.resume` for `mp3pause`; Q1 says no command pauses music, so those cue kinds are not needed for it |
| 2, 3, 4 | `wav`/`mp3`/`wavStop` rows; AD-16 `sfx.*` cues | none known; adds the single-slot rule |
| 5, 6, 7, 10 | `mediaPlay`/`midiPlay`/`mediaStop` rows; board-enter music rule | not checked against the spec yet |
| 8, 9 | Battle hand-off; audio-exploration §6 open items 9 and 6 | answers open items 9 (restarts from the beginning, no fade) and 6 (restart from the top) |
| 12, 13 | `setVolume` (E-102); epic 6 **Assumption A-3** | **Conflicts with A-3** ("game volume is saved game state"): Q13 says volume is not saved |
| 11 | AD-16 save/load re-emission | Q11 says saves store no audio and load plays the board's own music; epic 6 §5 says save/load restores the SoundFont bank (a Reawakened addition, not legacy) |
| 14 | Frame sounds; breakdown file | unanswered here |
| 15 | E-03 focus pause | agrees in effect: the game pauses; the engine leaves audio alone |
| 16 | `playAvi`/`playAviSmall` (E-104) | music restarts from the start after the video, even if stopped |
| 17 | Format support (audio-exploration §6 items 1 to 4) | only MIDI plays in the final version; 3.1.0 played all listed formats |
| 18 | Media path resolution; PAK packaging | not checked against the spec yet |
| 19 | The music variable | not checked against the spec yet |

### Decisions the owner should look at hardest

1. **Which version we follow.** Q1, Q7, Q12 and Q17 differ between 3.1.0 and the final version. The rebuild needs one rule each (for example, `mp3pause` waiting or not, and whether volume is audible).
2. **A-3 (Q12, Q13).** Volume is not saved and `reset()` leaves it alone. The epic's assumption that game volume is saved state is contradicted.
3. **Q14 breakdown file.** It must be supplied before frame-sound behaviour can be specified.
