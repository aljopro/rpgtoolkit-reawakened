// shield.prg - the start-up program of the emitter package fixture (epic 19, entry 19.14).
//
// What it does for a game author: the package "shield" is armour and a damage rule for any
// object. `shieldUp(who)` makes a hit on `who` do half its damage, `guardUp(who, least)` makes
// `who` ignore a hit that has fallen below `least` once the shield has taken its half, and
// `hurt(who, amount)` is the one way the game hurts something: it asks the object's listeners
// first, then takes the hit off `who.hp` unless a listener cancelled it. When something falls
// the package tells the whole game, so any script can listen for it on `game`.
//
// Precisely (docs/spec/engine/rpgcode-modules-and-objects.md, EMIT-2 to EMIT-6, EMIT-14 and
// EMIT-16 to EMIT-19): `hurt` sends the cancelable event `beforeDamage` on `who`; the listeners
// run in the order they were added, share one event object, and a cancel does not stop the
// ones after it, so `guardUp` is added after `shieldUp` to see the halved damage. The plain
// events `damaged` and `blocked` are queued, and `fallen` is queued on `game`. Start-up runs
// before the game on a fresh state, makes no layer, and only defines handles and registers
// the `game` listener, so everything it leaves is plain data in the saved state.
fallen = 0
game.on("fallen", (e) => { fallen = fallen + 1; lastfallen = e.detail.name })

shieldUp = (who) => {
  who.on("beforeDamage", (e) => { e.detail.dmg = e.detail.dmg / 2 })
}

guardUp = (who, least) => {
  who.on("beforeDamage", (e) => {
    if (e.detail.dmg < least) { e.cancel() }
  })
}

hurt = (who, amount) => {
  local(event)
  event = who.emitCancelable("beforeDamage", { dmg: amount })
  if (event.canceled == 1) {
    who.emit("blocked", { dmg: amount })
    return 0
  }
  who.hp = who.hp - event.detail.dmg
  who.emit("damaged", { dmg: event.detail.dmg })
  if (who.hp <= 0) { game.emit("fallen", { name: who.name }) }
  return event.detail.dmg
}
