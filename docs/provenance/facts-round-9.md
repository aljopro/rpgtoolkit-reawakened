<!-- Owner-relayed fact sheet, clean-room extraction round 9 (ADR 0006). Status: prose facts as relayed by the owner, not yet folded into docs/spec/; each ruling that uses them is its own doc-first commit (G7). -->

# Clean-room extraction, round 9 — music looping (OWNER-RELAYED)

* **Source consulted:** not stated.
* **Answerer:** relayed by the owner (Jensen) on 2026-10-18, in reply to the question "did legacy `mediaplay` loop or play once?" raised while designing the epic-audio-synth media commands.
* **Date:** 2026-10-18
* **Versions:** the **3.1.0 release** and the **final version** (the last released source), as in round 8.
* **Confidence labels:** none given. Every statement is *owner-relayed, confidence not stated*.
* Everything below is behaviour prose; no source expression is reproduced.

---

**M1. Music always loops.** `mediaPlay` always asked for the track to loop forever, in both versions. There is no argument to turn looping off, so a script could not play music just once.

* 3.1.0: MIDI and WAV repeated endlessly through the system music service. MP3, OGG and tracker files repeated through the decoder library, which restarts the file from the beginning when it ends.
* Final version: MIDI loops, because the MIDI player starts the file again from the beginning each time it finishes. Every other format fails to load in this version, so there is nothing to loop (consistent with round 8 Q17).

**M2. Same track already playing.** If `mediaPlay` names the track that is already playing, the track carries on rather than restarting.

**M3. Board and battle music.** Board music and battle music use the same repeat setting, so they loop too.

**M4. Sound effects never loop.** `wav`, `mp3` and `mp3pause` never loop.

---

## Disposition

Nothing below is a ruling.

| Fact | Touches | Effect on what is written today |
|---|---|---|
| M1, M3 | `rpgcode-functions.md` music rows; epic-audio-synth `audio-exploration.md` §13 | Confirms looping as the `music` default. Playing music once (`tkMD_ONCE` on `music`) is a Reawakened addition with no legacy equivalent. Answers §13 open item 2: 3.1.0 played MP3, OGG and tracker files as music. |
| M2 | §13 `tkMD_RESTART` | Confirms the default: replaying the same file carries on; restarting is opt-in. |
| M4 | §13 `sfx` defaults | Confirms `tkMD_ONCE` on `sfx`. |
