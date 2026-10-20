---
title: "Load actors from character, enemy and item sprite data"
type: 'feature'
ticket: 5
created: '2026-10-19'
status: built
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/formats/character.md, enemy.md, item.md"
  - "code - packages/core/src/formats/"
  - "fixtures - docs/spec/examples/game/"
---

## Intent

Hydrate only the source data owned by this ticket. Use authored fixtures and
the examples corpus; preserve reader defaults and diagnostics; invent no
values or destination types.

## Boundaries

Loading only; no rules, no scripts.

## Scope and ownership

This ticket hydrates character/player `.tem` and enemy `.ene` data into the
existing `ActorRecord` model. It also covers only the `.itm` fields assigned
to 20.5 in the actor inventory: collision/activation hulls and board
animation/program sources, through the existing sprite hydration path
(`packages/core/src/sprites/model.ts:actorFromSource`). Item definitions
(identity, permissions, prices, menu/equipment/equip-remove/battle effects)
remain read-only asset data outside `ActorRecord`s and belong to Epic 8,
Epic 7, or 20.6 as specified by `docs/spec/engine/actors.md`.

Status `.ste` definitions are not a 20.5 input. Status identity/duration is
owned by the status/core path and 20.6; status modifiers, ticks, and programs
are owned by Epic 7. Runtime actor status data is the counter map owned by
20.6. This ticket does not apply `.ste` definitions to actors or create a
status-definition persistence layer.

## Key Decisions

1. Loading never reads behaviour code; `behaviour` is empty unless a caller
   supplies a registered behaviour name.

## Acceptance

1. Fixture characters/players and enemies map every 20.5-owned actor field
   into the existing `ActorRecord` shape.
2. Fixture items map only the 20.5-owned board/sprite fields through the
   existing sprite adapter; item definitions never become actor records.
3. Unknown or out-of-range values retain reader defaults and diagnostics, and
   hydration output is stable across two runs.
4. `.ste` definition loading and status-counter rules are explicitly out of
   scope and remain owned by status/core, 20.6, and Epic 7.

## Verification

Focused fixture tests cover character, enemy, reader diagnostics,
determinism, and the existing item-to-sprite path. Full repository gates are
required before this plan may be marked `built`.
