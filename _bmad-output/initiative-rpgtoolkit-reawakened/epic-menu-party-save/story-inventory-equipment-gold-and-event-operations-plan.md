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
status: done
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
**Owner/engineer compatibility ruling (trans3 runtime answer supplied for Epic 8.4; not inferred from repository extraction):** `giveitem` and `takeitem` resolve filenames, append `.itm` when needed, and call inventory add/remove; they do not resolve by handle. `itemcount` compares inventory filenames case-insensitively when the argument has `.itm`, otherwise it compares item handles case-insensitively. `equip`/`remove` locations are 1-based and clamped to 1–16: 1 Head, 2 Neck accessory, 3 Right hand, 4 Left hand, 5 Body, 6 Legs, and 7–16 ten distinct custom accessories. The existing `equip` item selector accepts handle or filename (`docs/spec/engine/rpgcode-functions.md#items-inventory-shop--gold-28`). **This contract checkpoint is clear.**

**TKR design choice (Epic 8.4):** the inventory action's string `slot` identifies the ten custom accessory locations with canonical TKR tokens `accessory-7` through `accessory-16`, preserving each clamped trans3 location number. These tokens are a new Reawakened action contract choice, not trans3 names or an owner/engineer-supplied fact.

## Implementation map
Use entry 2's state ports and entry 3's party operations. Item data remains a read-only asset definition; inventory records reference item identity and quantity rather than turning items into actors. The inventory owner validates actor/slot/eligibility and coordinates actor 20.6's derived equipment-bonus operation. Equipment references are derived from saved `(actorId, slot, itemId)` tuples, not persisted as additional fields; deterministic collision avoidance against catalog names is required because actor resolution matches catalog `name` or `id`. TKR's string-slot mapping uses the canonical custom-accessory tokens from the design choice above.
Implementation: `packages/core/src/menu/inventory.ts` owns typed operations, refusal atomicity, quantity/gold events, derived equipment references and actor-rule integration; `packages/core/src/script/packs/inventory.ts` provides the existing RPGCode names and asset continuations, with the engine preloading equipped item/character definitions before equipment actions. `packages/core/test/menu-state.test.ts` covers owner transitions, same-stack two-slot equipment, collision-safe references, snapshot stability, gold refusal boundaries, and the authored RPGCode fixture `packages/core/test/fixtures/menu/inventory-operations.prg`. The normative contract remains E-81/E-82 and EMIT-13; no additional public built-ins or saved fields are introduced.
