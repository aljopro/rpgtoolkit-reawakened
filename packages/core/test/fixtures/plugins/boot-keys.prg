// boot-keys.prg - start-up of the key fixture game (epic 18, entry 18.7): the key gate and
// the hud layer stacked over mwin and wait, then the game.
#include "key-gate.prg"
#include "hud-log.prg"
trace = ""
installKeyGate()
installHud()
run("game-keys.prg")
