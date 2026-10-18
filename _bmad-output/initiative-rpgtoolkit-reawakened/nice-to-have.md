# Nice to have

Ideas that are not features now but could be great ones later. Nothing here is approved, planned or scheduled, and nothing here is a ticket. `tickets.py` does not read this file. To act on an idea, the owner says so and it becomes a ticket through the usual process.

Add one entry per idea: what it is, who raised it and when, what it depends on, and what to settle first.

## Lighting as an entity (night mode)

- **Raised by:** owner, 2026-10-17.
- **Idea:** a light that belongs to an entity, such as a sprite, and moves with it. The example is a night-mode board: dark ambient with a pool of light around the player.
- **Today:** lights come from the board file. Ticket 4.13 bakes them into shading layer 0 when the board loads and discards the light objects, so a light cannot move or follow anything.
- **Depends on:** 4.15 (sprites in the compositor), 4.16 (camera), and the answer to round-7 question 8 (light falloff), which sets the look of the light's pool.
- **Settle first:** what the light is anchored to; how the shading is recomputed as it moves at a fixed, deterministic cost per tick; the script commands to attach and remove a light, with docs to the ADR 0004 standard.
- **Status:** the static night scene in the lit-scene oracle is a first independent check of the same round light.

## Modern and retro audio formats

- **Raised by:** owner, 2026-10-18 (epic 6 pre-inception exploration).
- **Idea:** support modern game audio delivery formats (Ogg Vorbis, Opus, FLAC as a source format, gapless MP3 handling) and classic chip and tracker formats (MOD/XM/S3M/IT, SPC, NSF, GBS, SID, VGM) as pluggable music sources in `synth`.
- **Today:** legacy needs MIDI and WAV (including ADPCM); MP3/OGG appear in the spec but not in the fetched corpus; tracker modules are an epic 6 non-goal, though one corpus game ships an XM.
- **Depends on:** epic 6's `synth` interface and duration parsing; the import and packaging pipeline (editor epics, epic 9); a G6 licence survey, because most well-known chip players are LGPL or GPL.
- **Settle first:** the delivery format and loop-tag rule for new music; where transcoding lives; the music-source interface; which chip emulators pass G6. Full notes: `epic-audio-synth/discovery/audio-exploration.md` §10.

## AI harness for building games

- **Raised by:** owner, 2026-10-18.
- **Idea:** an agentic / LLM harness designed specifically for building, authoring, and testing games with the new RPG Toolkit Reawakened engine (generating boards, RPGCode scripts, dialogue, items, and verifying games headlessly).
- **Today:** the engine core and VM are completely headless, deterministic, and serialisable to plain JSON data (guard-rails G1–G3), making them uniquely suitable for programmatic manipulation and automated verification, but authoring tools are currently focused on human editors and manual pipeline tooling.
- **Depends on:** completion of core authoring data models / file format specifications (TKR/TK3 board, item, sprite, and dialogue formats), language tooling (LSP / diagnostics), and stable headless runner test harness capabilities.
- **Settle first:** harness interface boundaries (CLI, MCP server, or editor-ui integration); whether agents generate native TKR files directly or call project APIs/SDKs; automated evaluation loops (e.g., using headless goldens to let the AI playtest its own generated levels); model context constraints around tilesets, board dimensions, and script validation.
- **Status:** logged as an idea.
