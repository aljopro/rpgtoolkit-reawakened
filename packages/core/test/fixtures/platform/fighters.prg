// fighters.prg - the object-model package fixture (epic 19, entry 19.14).
//
// What it does for a game author: the package "fighters" gives a game fighters you can keep
// in variables, hand to other code and save with the game: a fighter is a bag of named values
// (name, hp, power) with a hit method, and a Potion is the old kind of object, a `class`,
// that works on the same fighter. The game never needs to know how either is stored.
//
// Precisely (docs/spec/engine/rpgcode-modules-and-objects.md, OOP-10 and OOP-11): a fighter is a
// dictionary object whose `hit` member holds a callable, so `hero.hit(x)` runs it with
// `this` = hero, a method taken out of the object (`strike = hero.hit`) keeps that receiver, and
// `bindThis(hero.hit, slime)` is a copy that runs with `this` = slime. Potion is a legacy class
// instance on the same object storage. The file defines functions and a class only, because
// `#include` imports those and does not run a loose top-level statement.
class Potion {
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
