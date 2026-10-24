---
title: "Inventory, equipment, gold and event operations"
type: 'feature'
ticket: 4
created: '2026-10-22'
risk: "high"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md#e-81"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-82"
  - "spec - docs/spec/formats/item.md"
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md#emit-13"
---

## Intent

Implement the canonical inventory/equipment/gold model and expose it only through its owner operations, including the events approved in the normative spec.

## Boundaries

Item identity and quantities, equipment eligibility/slots/bonuses, party gold, their RPGCode operations and queued `itemAdded`, `itemRemoved` and `goldChanged` delivery. Use/equip/remove programs are executed by entry 5.

## Acceptance

Fixtures prove exact inventory and gold transitions, eligible/ineligible equipment results, bonus arithmetic and inverse removal, HP/SMP caps, and event emission exactly once per successful operation.

## Verification

Test success and refusal boundaries via consumer-visible built-ins; compare queued-event details and canonical snapshot hashes across replay and restore.

## Contract required before coding

The normative contract is E-81/E-82 in `docs/spec/engine/plugins-and-battle.md` and the event rows in EMIT-13 (`docs/spec/engine/rpgcode-modules-and-objects.md`). Item events carry exactly `{ entryId, source, handle, amount, previousQuantity, currentQuantity }`; stack identity (`entryId`) is distinct from asset identity (`source`, `handle`), and quantities are available/unequipped units. Add/remove item actions use positive safe-integer amounts; gold actions accept non-negative safe integers, with zero no-op and atomic refusal for negative/insufficient/overflow cases. The TS menu capability exposes read-only inventory items/gold and `addItem`, `removeItem`, `equip`, `unequip`, `addGold`, `removeGold`; each returns `MenuStateResult`-style `{ ok: true, error: null }` or `{ ok: false, error: { path, message } }`, with no mutation on refusal. RPGCode retains its existing `giveitem`, `takeitem`, `equip`, `remove`, `givegp`, `takegp`, `getgp`, and `itemcount` signatures; no public built-ins are added. Same-stack items can be equipped in distinct slots through stable actor-scoped references derived from each equipment tuple; implementation MUST test two copies of one asset in distinct slots and snapshot/restore stability. Equip/remove programs remain entry 5.

## Implementation map
Use entry 2's state ports and entry 3's party operations. Item data remains a read-only asset definition; inventory records reference item identity and quantity rather than turning items into actors. The inventory owner validates actor/slot/eligibility and coordinates actor 20.6's derived equipment-bonus operation. Equipment references are derived from saved `(actorId, slot, itemId)` tuples, not persisted as additional fields; deterministic collision avoidance against catalog names is required because actor resolution matches catalog `name` or `id`.
