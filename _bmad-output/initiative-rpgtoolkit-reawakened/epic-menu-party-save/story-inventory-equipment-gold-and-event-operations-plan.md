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

Fixtures prove exact inventory and gold transitions, eligible/ineligible equipment results, bonus arithmetic and inverse removal, HP/SMP caps, and event emission exactly once per successful operation. RPGCode fixtures MUST cover filename-only giveitem/takeitem resolution with implicit `.itm`, itemcount's extension-dependent case-insensitive filename-vs-handle lookup, equip's handle-or-filename selector, and locations 1–16 including clamping and each custom accessory slot.

## Verification

Test success and refusal boundaries via consumer-visible built-ins; compare queued-event details and canonical snapshot hashes across replay and restore. Verify the trans3 location map at 0, 1–16, and above 16, plus case variations for filename/handle counting.

## Contract required before coding

The normative contract is E-81/E-82 in `docs/spec/engine/plugins-and-battle.md` and the event rows in EMIT-13 (`docs/spec/engine/rpgcode-modules-and-objects.md`). Item events carry exactly `{ entryId, source, handle, amount, previousQuantity, currentQuantity }`; stack identity (`entryId`) is distinct from asset identity (`source`, `handle`), and quantities are available/unequipped units. Add/remove item actions use positive safe-integer amounts; gold actions accept non-negative safe integers, with zero no-op and atomic refusal for negative/insufficient/overflow cases. Both TypeScript and RPGCode menus expose the same `inventory` read/actions (`items`, `equipment`, `gold`; `addItem`, `removeItem`, `equip`, `unequip`, `addGold`, `removeGold`) using language-appropriate syntax; results are `{ ok: true, error: null }` or `{ ok: false, error: { path, message } }`, with no mutation on refusal. RPGCode retains its existing signatures; no public built-ins are added. Same-stack items can be equipped in distinct slots through stable actor-scoped references derived from each equipment tuple; implementation MUST test two copies of one asset in distinct slots and snapshot/restore stability. Equip/remove programs remain entry 5.
**Owner/engineer compatibility ruling (trans3 runtime answer supplied for Epic 8.4; not inferred from repository extraction):** `giveitem` and `takeitem` resolve filenames, append `.itm` when needed, and call inventory add/remove; they do not resolve by handle. `itemcount` compares inventory filenames case-insensitively when the argument has `.itm`, otherwise it compares item handles case-insensitively. `equip`/`remove` locations are 1-based and clamped to 1–16: 1 Head, 2 Neck accessory, 3 Right hand, 4 Left hand, 5 Body, 6 Legs, and 7–16 ten distinct custom accessories. The existing `equip` item selector accepts handle or filename (`docs/spec/engine/rpgcode-functions.md#items`). The string-slot tokens for custom accessory locations are `accessory-7` through `accessory-16`. **This contract checkpoint is clear.**

## Implementation map
Use entry 2's state ports and entry 3's party operations. Item data remains a read-only asset definition; inventory records reference item identity and quantity rather than turning items into actors. The inventory owner validates actor/slot/eligibility and coordinates actor 20.6's derived equipment-bonus operation. Equipment references are derived from saved `(actorId, slot, itemId)` tuples, not persisted as additional fields; deterministic collision avoidance against catalog names is required because actor resolution matches catalog `name` or `id`. The RPGCode compatibility adapter maps locations 7–16 to `accessory-7` through `accessory-16` and clamps before mapping.
