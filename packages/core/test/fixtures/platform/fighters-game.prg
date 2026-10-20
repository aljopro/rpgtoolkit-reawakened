// fighters-game.prg - the game program of the fighters package fixture (epic 19, entry 19.14).
// It builds two fighters and one potion, and every blow goes through a method of an object:
// a direct call, a method taken out of its object, and one rebound to the other fighter.
// Each `sleep(1)` lets the tick end, so a save can fall between any two lines.
#include "fighters.prg"
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
