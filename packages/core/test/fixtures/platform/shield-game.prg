// shield-game.prg - the game program of the emitter package fixture (epic 19, entry 19.14).
// A hero puts on the shield and a guard that ignores any hit under 4, takes four hits from a
// foe (each 2 * (2 + random(3))), loses both with `off`, and is knocked down by a last hit of
// 40. The foe has no shield. A listener that waits keeps `hurt` parked for a tick, so a save
// falls inside a delivery as well as between lines. `log` records what each listener saw, in
// the order the events were delivered.
log = ""
hero = { name: "hero", hp: 30 }
foe = { name: "foe", hp: 10 }
shieldUp(hero)
guardUp(hero, 4)
hero.on("beforeDamage", (e) => { threadSleep(getThreadId(), 0.02); log = log + "w" + e.canceled })
hero.once("damaged", (e) => { log = log + "first:" + e.detail.dmg + ";" })
hero.on("damaged", (e) => { log = log + "hurt:" + e.detail.dmg + ";" })
hero.on("blocked", (e) => { log = log + "blocked:" + e.detail.dmg + ";" })
for (round = 0; round < 4; round = round + 1) {
  roll = 2 * (2 + random(3))
  taken = hurt(hero, roll)
  log = log + "r" + round + ":" + roll + ">" + taken + ";"
}
hero.off("beforeDamage")
taken = hurt(hero, 40)
log = log + "bare:" + taken + ";"
taken = hurt(foe, 4)
log = log + "foe:" + taken + ";"
sleep(1)
done = 1
end()
