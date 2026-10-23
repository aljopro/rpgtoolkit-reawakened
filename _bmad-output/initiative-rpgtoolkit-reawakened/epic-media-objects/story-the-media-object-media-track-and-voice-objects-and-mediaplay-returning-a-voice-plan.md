---
title: "The media object: media, track and voice objects, and mediaPlay returning a voice"
type: 'feature'
ticket: 5
created: '2026-10-22'
status: 'built'
baseline_revision: 'c339264d808b6964c504f3ec4c0588a6c782b96'
route: 'full'
route_source: 'auto'
risk: 'high'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/audio-media.md#media-1'
  - 'docs/spec/engine/rpgcode-modules-and-objects.md#oop-12'
  - 'docs/spec/engine/rpgcode-functions.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `mediaPlay` still returns nothing and the only script surface is the procedural family the owner retired in MEDIA-1/MEDIA-5. Scripts cannot hold a sound, read its core state, or observe it as an emitter.

**Approach:** Add the global `media` emitter, hydrated `media.track` and `media.voice` host objects over the existing audio state, and make `mediaPlay(file[, options])` return the started voice. Every start still goes through the audio applier so a later `beforePlay` cannot be bypassed.

## Boundaries & Constraints

**Always:** Follow MEDIA-1/2/3 and the preserved Epic 6 playback, cue, wait, fade, allocation and stale rules. The voice object stores only `{track, slot, cueId}`; methods are hydrated by OOP-12 and nothing callable enters a save. Options are the ruled named fields; invalid input changes no playback. All 3.1 aliases keep their current cue streams and waits. G1–G7 hold (plain data, injected clock, no host APIs, doc-cited).

**Never:** Do not implement `beforePlay` or cancellation (21.4), retire `mediatrack`/`mediaload`/the other procedural names (21.6), add positional `priority`/`syncTrack`/`&voice`, change cue or tick timing, add ducking, or touch the runner protocol. Do not open the legacy source. Do not register a media emitter eagerly on `mediaPlay` (it would change every existing audio state hash).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Play a sound | `v = mediaPlay("boom.wav", {track:"sfx"})` | `v` has `track="sfx"`, its slot, its live `cueId`; `v.file/state/position/length/volume/loop` read core state | No error |
| Bad options | unknown key, bad type, volume 101, loop+wait | playback unchanged, call reports the located media/builtin error | Diagnostic/throw at the call |
| Same file | music playing same file; sfx playing same file | music returns the live voice (carry-on); sfx returns `null` (ignored) | No new cue |
| Stale voice | slot replaced by a later play | reads project "no live voice"; `stop/pause/resume/seek/fade/wait` and `volume`/`loop` writes emit one located `media.unknown-voice` diagnostic and do nothing | Replacement unaffected |
| Asset pending | length unknown at the play | voice object is returned unbound and binds when the held effect applies | No error |
| Priority | every slot active, `{priority}` | the lowest priority, then oldest `startTick`, then lowest slot is replaced, as `AudioRuntime.play` already decides | No error |
| Sync | `{sync:"music"}` | starts at the source's position modulo the destination length; missing/unknown/no-length source diagnoses and starts at zero | `media.sync-source` |
| Unknown track | `media.track("nosuch")` | returns `null`, creates no track | `media.unknown-track` |
| Track controls | `media.music.volume = 40`, `media.music.fade(0, 2)` | same `media.volume`/`media.fade` cues as the procedural calls | Invalid values diagnose, no mutation |
| Save / load | save at every tick | same hash after restore; audio section has no callable; unbound/bound members restore | No refused load |
| Legacy aliases | `mediaplay/midiplay/playmidi/wav/mp3/mp3pause` | byte-identical cue stream and wait to today | No error |
| Emitters | `v.on("ended")`, `track.on`, `media.on` | voice, then track, then `media` hear the ruled detail; registration only on emitter access or a declared native listener | No error |

</frozen-after-approval>

## Code Map

- `packages/core/src/audio/model.ts` — `AudioVoiceHandle`, `findTrack`, `voicePosition`, `fadeValue`; add pure `voiceOf(audio, {track, slot, cueId})` and `voiceWaitPayload(track, voice, tick)` reused by pack and script layer.
- `packages/core/src/audio/runtime.ts` — `applyEffect` `media.play` branch, `startVoice`, `locate`, `stop/pause/resume/seek/setLoop/setVoiceVolume/fade`. Extend the voice selector in effect args to a plain `{track,slot,cueId}`; `locate` emits the existing `media.unknown-voice` diagnostic (with `track`/`slot`) when `stale`; `media.play` accepts `volume` and calls `options.bindVoice(handle, outcome)`; no rule or cue changes.
- `packages/core/src/audio/script.ts` (new) — `MediaScriptService`, `createMediaScriptService(state, post)`, and `MEDIA_HOST_TYPES`: `media` (built-in track properties), `media.track` (`name`, writable `volume`, `fade`), `media.voice` (readable `track/file/state/position/length/volume/loop`, writable `volume/loop`, methods). Owns option parsing and the play/bind/wait flow.
- `packages/core/src/script/host.ts` — optional `emitterKey(record)` on `HostObjectType`; optional `media` on `HostObjectContext`.
- `packages/core/src/script/plugin.ts` — optional `media?: MediaScriptService` on `CommandView`.
- `packages/core/src/script/vm.ts` — register the three media host types when the media plugin is active; pass `media` into views/contexts; add control actions `mediaplay` (create voice object, post `media.play`, park on the `audio.track` wait when `wait:true`) and `emitterObject` (create/reuse a `media.track:<name>` object); register a host object's derived emitter key only on `on/once/off/emit/emitCancelable` access.
- `packages/core/src/script/packs/media.ts` — replace the six-argument `mediaplay` with `(file[, options])`; add `mediatrackget`, `mediatrackfade`, `mediavoicestop`, `mediavoicepause`, `mediavoiceresume`, `mediavoiceseek`, `mediavoicefade`, `mediavoicewait`, each `doc.access: "internal"`; route `midiplay/playmidi/wav/mp3/mp3pause` through the options form with today's flags and waits. Leave every other procedural command and `mediastop(track[,voice])` untouched.
- `packages/core/src/script/virtuals.ts` — read-only `media` virtual returning the `media` host object (the `game` precedent), created without registering it as an emitter.
- `packages/core/src/engine/engine.ts` — build the media service with `bus.postEffect`, `state.vm` and `bindVoice` (write `slot`/`cueId` into the voice object); pass it to the VM; register host emitters for the media/track keys a manifest declares as native listeners.
- `packages/core/src/audio/index.ts` — export the new module.
- `docs/spec/engine/audio-media.md#media-1` — one `Proposed clarification (pending owner review)` paragraph for the four author-visible derivations (Doc-first commit).
- `docs/spec/engine/rpgcode-functions.md` — `mediaplay` row becomes `object mediaplay(string file[, object options])` with the ruled options note (Doc-first commit).
- `packages/core/test/media-objects.test.ts` (new); update the positional call at `packages/core/test/audio-lifecycle-engine.test.ts:209`.
- Do not change: `audio/save.ts`, cue shapes, `golden/audio/*`, tracker fields, other epics' plans.

## Tasks & Acceptance

**Execution:**
- [x] `docs/spec/engine/audio-media.md#media-1` and `docs/spec/engine/rpgcode-functions.md` — the proposed clarification paragraph and the `object mediaplay(string file[, object options])` row, committed before code (G7).
- [x] `packages/core/src/audio/model.ts` — add the pure voice lookup and shared wait payload; one source for pack and script layer.
- [x] `packages/core/src/audio/runtime.ts` — descriptor selectors, `media.unknown-voice` for stale, start volume, `priority`, `sync`, `bindVoice` outcome; keep every rule and cue identical.
- [x] `packages/core/src/audio/script.ts`, `packages/core/src/audio/index.ts` — media service and host types; option validation, read/write hooks, method dispatch data.
- [x] `packages/core/src/script/host.ts`, `packages/core/src/script/plugin.ts`, `packages/core/src/script/vm.ts` — hydration/emitter-key hook, service plumbing, `mediaplay` and `emitterObject` control actions, lazy emitter registration.
- [x] `packages/core/src/script/packs/media.ts` — object `mediaplay`, internal (`access: "internal"`) method commands, legacy alias rewrite to options; docs (`see` MEDIA-1) for each.
- [x] `packages/core/src/script/virtuals.ts` — global `media` virtual.
- [x] `packages/core/src/engine/engine.ts` — wire service, binding, and declared-listener host emitters.
- [ ] `packages/core/test/media-objects.test.ts` — drive the real engine/VM for every matrix row, including priority, sync, unknown track, track controls, slot stealing and a save at every tick; update the one positional legacy test.

**Acceptance Criteria:**
- Given a real engine, when a script plays, reads, fades, pauses, resumes, seeks, loops, sets volume and waits through objects, then it observes the MEDIA-1 results and the same cue stream as the equivalent procedural call.
- Given a voice replaced by a later play, when its methods or writable fields are used, then exactly one located `media.unknown-voice` diagnostic names the track and slot, and the replacement is untouched.
- Given every slot on a track is active, when `mediaPlay` passes `priority`/`sync`, then the ruled stealing order and the source-modulo start position apply.
- Given `media.track("nosuch")`, when called, then it returns `null` and creates no track; given `track.volume = n` and `track.fade(p, s)`, then the same cues as `mediaVolume`/`mediaFade` are emitted.
- Given `mediaPlay(file)` with no options, when run, then it plays `music` looping; a positional `mediaplay("f.wav","sfx",4)` call fails as an arity error (no retired extension remains).
- Given every 3.1 alias, when replayed, then its cue stream and wait match the recorded legacy parity stream.
- Given a save at every tick and a restore, then `hashGameState` matches, the audio section contains no callable, and `media`/voice/track objects restore as data with their methods rehydrated.
- Given a voice/track/`media` listener, when a transition is applied, then it hears the MEDIA-2 detail in voice → track → media order; a world that never uses media emitters keeps its previous state shape.

## Design Notes

`mediaPlay` cannot read the options dictionary or create an object inside a `BuiltinSpec`, so the pack validates the file and hands the raw options value to one VM control action. That action uses `MediaScriptService.play`, which creates the `media.voice` host object, posts the ordinary `media.play` effect with the object's handle through `bus.postEffect`, and reads the outcome the audio applier reports synchronously. Posting stays the only start route: 21.4 adds `beforePlay` to the shared `media.play`/`music.play`/`sfx.play` start seam. A held (pending) play binds the same handle when the effect is retried, so saves stay plain.

Voice, track and `media` emitters are registered only on `on/once/off/emit/emitCancelable` access, or when a manifest declares a media native listener: that keeps MEDIA-2's lazy domain and every current audio state hash/golden unchanged. Creating or reading a `media.track`/`media.voice` object does not register it; the `emitterKey` host-type hook supplies the key at access time.

The method targets (`mediatrackget`, `mediatrackfade`, `mediavoice*`) are registered with `doc.access: "internal"`, the file-service convention, so no new public built-in, catalogue row or command-doc entry appears (MEDIA-5 forbids a second author API). `catalogue:check` and `command-docs:check` prove it.

Unruled author-visible details go into one labelled `Proposed clarification (pending owner review)` paragraph in `audio-media.md#media-1` before code: a stale voice's reads project "no live voice" as `file=""`, `state="stopped"`, `position=0`, `length=0`, `volume=0`, `loop=0`; a music carry-on returns the live voice, an ignored SFX returns `null`, and a pending play returns its unbound object. Stale writes and methods report the existing `media.unknown-voice` code with `track`/`slot` detail; no new diagnostic code is minted.

## Verification

**Results (2026-10-22, commit `1cbf8ee4`, logs `/tmp/rpgtoolkit-484-head/`):** all 23 gates passed — typecheck, lint, `test` (1784 passed, 0 failed, 0 skipped), `test:strict` (1784 passed, 0 skipped), fixtures check/author/test, `golden`, `golden:bun`, `closing` (8/8), `dump:check` (all digests match), graph + graph test, licence + test (0 violations), provenance + test (633 files, 0 violations), catalogue, command-docs + test, no-skips, oracle, audit --prod. A throwaway authored-script smoke against the real engine printed: cues `soundfont.set`, `media.play sfx`, `media.pause`, `media.resume`, `media.play ui`, two `media.stop`; events `paused` delivered voice→track→media and `resumed`, `ended` at ticks 3/31/33; no diagnostics; final hash `ab711894ddd8283b`; artifact removed.

**Commands:**
- `pnpm fixtures:fetch`, `pnpm typecheck`, `pnpm lint` — pass.
- `node --test packages/core/test/media-objects.test.ts packages/core/test/audio-lifecycle-engine.test.ts` — pass.
- `pnpm test`, `pnpm test:strict` — pass, no skips.
- `pnpm golden`, `pnpm golden:bun`, `pnpm closing` — unchanged.
- `pnpm graph`, `pnpm licence`, `pnpm provenance`, `pnpm catalogue:check`, `pnpm command-docs:check`, `pnpm fixtures:author:check`, `pnpm fixtures:test`, `pnpm dump:check`, `pnpm audit --prod` — pass.
- Full suite, strict, and every listed gate observed green before the PR is opened.

## Implementation Notes

- Built `packages/core/src/audio/script.ts` (service + `MEDIA_HOST_TYPES`), the `bindVoice`/scan seam in `runtime.ts`, the VM `mediaplay`/`mediaTrackObject` control actions and lazy `emitterKey` registration, the global `media` virtual, and the object `mediaplay` plus internal method commands in the pack.
- The one-argument `mediaPlay(file)` is the Toolkit 3.1 form: the command records the same seven-argument effect under the same name with the calling thread, creates no object and returns no value, so demo/Basic cue streams, effect records and state hashes are unchanged. An options dictionary selects the object form, which creates and binds the voice.
- `mediaPlay(..., {wait:1})` on a start held for its asset parks on an `audio.track` wait with `cueId: 0` and the object handle; the resolver binds from the object and wakes when the held effect is gone. The payload is plain data and survives snapshots; the permanent test replays the whole pending-to-ended path.
- Voice `loop` writes reject anything but `0`/`1` with a located `builtin.bad-arg` and no mutation; `volume` writes reject out-of-range values the same way.
- `media`/track/voice emitters register only on emitter access (or a declared native listener), so a world that never uses them keeps its previous state shape and hashes; `queueAudioEvent` reuses the host objects once active.

## Plan Change Log

- 2026-10-22 — Director review corrections: reuse `media.unknown-voice` instead of minting a code; record the author-visible derivations as one `Proposed clarification (pending owner review)` paragraph; keep emitter registration on access only; mark method commands `access: "internal"`; add priority, sync, unknown-track and track-control coverage.
- 2026-10-22 — Implementation settled the one-argument compatibility edge: `mediaPlay(file)` records the same seven-argument effect under the same command name (no object, no value), preserving demo's effect log and state hash; only an options dictionary selects the returned voice. `{wait:1}` on an asset-held start parks on a `cueId: 0` audio.track wait resolved from the object, and invalid `loop`/`volume` writes diagnose without mutating.
- 2026-10-22 — No golden or closing baseline was re-recorded; `pnpm golden`, `pnpm golden:bun`, `pnpm closing` and `pnpm dump:check` pass unchanged.

## Review Triage Log
