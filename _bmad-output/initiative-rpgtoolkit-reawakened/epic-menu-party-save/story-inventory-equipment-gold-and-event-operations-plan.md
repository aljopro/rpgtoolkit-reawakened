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

## Implementation map

Use entry 2's state ports and entry 3's party operations. Item data remains a read-only asset definition; inventory records reference item identity and quantity rather than turning items into actors.
