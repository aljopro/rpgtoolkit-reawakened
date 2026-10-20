---
title: "Pure-RPGCode package fixtures and legacy golden verification"
type: feature
ticket: 14
created: '2026-10-19'
status: done
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "fixtures - packages/core/test/fixtures/"
  - "golden - golden/scenes/"
---

## Intent

Prove the platform end to end before Epic 20 builds on it. Fixtures are authored, never legacy games (G7).

## Boundaries

Fixtures and goldens only.

## Key Decisions

1. Fixtures live beside the 18.7 plugin fixtures.

## Acceptance

1. Three fixture packages pinned.
2. Zero legacy diffs.

## Verification

`pnpm test:strict` (`packages/core/test/script-platform-fixtures.test.ts`, `packages/runner-harness/test/corpus.test.ts`) and the golden job. The fixtures are `packages/core/test/fixtures/platform/`: `fighters.prg` and `fighters-game.prg` (object model), `shield.prg` and `shield-game.prg` (emitter package with a shield that halves damage), `weather.prg`, `storm.prg` and `namespaces-game.prg` (two namespaced packages where the later overrides the earlier). Each runs from a seed, is saved and restored at every tick, and is hashed tick by tick twice.

Goldens: three entries are added to `golden/scripts/golden.json` and no existing entry moves (G5; `git diff` of the file is three added entries). Each is the state hash at the last tick of seed 0:

* `synthetic-14-object-package`: the fighters game. Hash covers the object table (two dictionaries and one class instance), the stored unbound `hit` member, the torn-off and rebound callables' receivers, and `log` `direct:5;torn-off:7;rebound:3;potion:22;killed:slime;`.
* `synthetic-15-emitter-package`: the shield game. Hash covers the three listeners left in the events section after `off` (the package's `fallen` listener on `game`, and the hero's `damaged` and `blocked` listeners), the game emitter and `log` `w1r0:6>0;blocked:6;w0r1:10>5;first:5;hurt:5;w1r2:6>0;blocked:6;w1r3:6>0;blocked:6;bare:40;hurt:40;foe:4;` (the shield halves each roll, the guard blocks a half below 4, `once` ran once, one `fallen` reached the game).
* `synthetic-16-namespaced-packages`: weather and storm. Hash covers the two namespace objects, the registration object, the closure cell storm holds and `log` `weather:5+storm;weather:5;weather:5+storm;weather:3;` with `trace` showing storm's `mwin` layer outside weather's until `stormOff()`.

Every sample-game golden, the 13 earlier synthetic goldens, the scene, audio and closing goldens are unchanged.
