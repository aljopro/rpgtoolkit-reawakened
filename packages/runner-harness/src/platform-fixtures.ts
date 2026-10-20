/**
 * The authored package fixtures of entry 19.14 as the headless corpus runs them
 * (`synthetic-14-object-package`, `synthetic-15-emitter-package`,
 * `synthetic-16-namespaced-packages`).
 *
 * Each source is the file of the same name under `packages/core/test/fixtures/platform/`
 * with its full-line `//` comments left out; the corpus test reads those files and fails if
 * a copy here drifts from its file. The comments, and what each fixture proves, are in the
 * files and in `packages/core/test/script-platform-fixtures.test.ts`.
 */

export const PLATFORM_FIGHTERS = `class Potion {
public:
  var heal
  method Potion(amount) { heal = amount }
  method use(target) { target.hp = target.hp + heal }
}

function makeFighter(name, hp, power) {
  return {
    name: name,
    hp: hp,
    power: power,
    hit: (target) => {
      local(damage)
      damage = this.power + random(3)
      target.hp = target.hp - damage
      return damage
    }
  }
}
`;

export const PLATFORM_FIGHTERS_GAME = `#include "fighters.prg"
log = ""
hero = makeFighter("hero", 20, 4)
slime = makeFighter("slime", 12, 2)
roster[0] = hero
roster[1] = slime
sleep(1)
blow = hero.hit(slime)
log = log + "direct:" + blow + ";"
sleep(1)
strike = hero.hit
blow = strike(slime)
log = log + "torn-off:" + blow + ";"
sleep(1)
bite = bindThis(hero.hit, slime)
blow = bite(hero)
log = log + "rebound:" + blow + ";"
sleep(1)
potion = Potion(5)
potion.use(hero)
log = log + "potion:" + hero.hp + ";"
kill(slime.power)
log = log + "killed:" + slime.name + ";"
sleep(1)
done = 1
end()
`;

export const PLATFORM_SHIELD = `fallen = 0
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
`;

export const PLATFORM_SHIELD_GAME = `log = ""
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
`;

export const PLATFORM_WEATHER = `trace = ""
weather = {
  name: "weather",
  rain: (mm) => this.name + ":" + (mm + random(3))
}
rain = weather.rain
registerPlugin({
  name: "weather",
  commands: {
    mwin: (line, next) => {
      trace = trace + "weather> "
      local(r)
      r = next("weather|" + line)
      trace = trace + "<weather "
      return r
    }
  }
})
`;

export const PLATFORM_STORM = `local(earlier)
earlier = bindingOf("rain")
storm = {
  name: "storm",
  rain: (mm) => earlier(mm * 2) + "+" + this.name
}
rain = storm.rain
stormLayer = registerPlugin({
  name: "storm",
  commands: {
    mwin: (line, next) => {
      trace = trace + "storm> "
      sleep(1)
      local(r)
      r = next("storm|" + line)
      trace = trace + "<storm "
      return r
    }
  }
})
stormOff = () => {
  rain = earlier
  stormLayer.remove()
}
`;

export const PLATFORM_NAMESPACES_GAME = `log = ""
mwin("one")
log = log + rain(2) + ";"
log = log + weather.rain(2) + ";"
log = log + storm.rain(2) + ";"
sleep(1)
stormOff()
mwin("two")
log = log + rain(2) + ";"
sleep(1)
done = 1
end()
`;

/** File name under `fixtures/platform/` to the corpus copy of its source. */
export const PLATFORM_FIXTURE_SOURCES: Readonly<Record<string, string>> = {
  "fighters.prg": PLATFORM_FIGHTERS,
  "fighters-game.prg": PLATFORM_FIGHTERS_GAME,
  "shield.prg": PLATFORM_SHIELD,
  "shield-game.prg": PLATFORM_SHIELD_GAME,
  "weather.prg": PLATFORM_WEATHER,
  "storm.prg": PLATFORM_STORM,
  "namespaces-game.prg": PLATFORM_NAMESPACES_GAME,
};
