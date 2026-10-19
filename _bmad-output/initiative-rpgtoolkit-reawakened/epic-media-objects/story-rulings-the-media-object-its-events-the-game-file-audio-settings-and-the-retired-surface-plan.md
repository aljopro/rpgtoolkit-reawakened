---
title: "Rulings: the media object, its events, the game-file audio settings and the retired surface"
type: 'feature'
ticket: 1
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/engine/audio-media.md (P3, P6, P7, legacy mapping, parity ledger, deferrals)"
  - "spec - docs/spec/engine/rpgcode-functions.md (audio rows)"
  - "spec - emitter and object sections written by 19.1"
  - "spine - AD-10, AD-14, AD-16, AD-32"
---

## Intent

Rule, before any code, the media object the owner decided on 2026-10-19, and amend `audio-media.md` so its author surface is the object model. The playback, cue, wait and fade rules in that page stand; P3, P6 and P7's command tables are replaced by object rows. Anchors for later entries: `#media-1` (objects and `mediaPlay` return), `#media-2` (events and fields), `#media-3` (`beforePlay`), `#media-4` (game-file settings), `#media-5` (removed commands).

## Boundaries

Documentation only. No TypeScript, no fixtures. The 3.1 alias table is carried over unchanged. Does not touch the cue stream, the runner protocol or Epic 9's handoff.

## Key Decisions

1. `mediaPlay(file[, options])` returns a voice object; legacy `mediaplay(file)` was `void`, so no 3.1 call site is affected.
2. A voice object holds data only (track, slot, cueId); its methods come from the 19.1 host-provided method mechanism; a replaced voice is stale.
3. Events are past-tense (`started`, `stopped`, `ended`, `looped`, `paused`, `resumed`, `faded`); voice events are re-emitted by the track and by `media`; cues stay imperative.
4. `beforePlay` is the one cancelable event; it carries `source` (`script`, `board`, `animation`, `battle`, `menu`, `video`) and listeners may change file, volume and loop.
5. Engine-phase cancelable emits are ruled with 19.11 (Assumption A-3).
6. The game file carries tracks, voice counts, the voice cap and the default SoundFont; settings are not saved.
7. Removed: `mediaTrack`, `mediaLoad`, `mediaPause`, `mediaResume`, `mediaSeek`, `mediaLoop`, `mediaFade`, `mediaWait`, `mediaVolume`, the query commands, `&voice`, `tkMD_*`, `priority` and `syncTrack` arguments.

## Acceptance

1. Every row cites evidence and a rejected alternative.
2. The removed-command list matches the catalogue names exactly.
3. The 2026-10-19 decisions each map to one ruled row.

## Verification

Link and anchor check; `pnpm provenance` and `pnpm licence` stay green; owner approval at the plan and done checkpoints.
