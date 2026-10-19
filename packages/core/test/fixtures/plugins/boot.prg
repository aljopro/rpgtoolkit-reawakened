// boot.prg - the start-up script of the plugin fixture game (epic 18, entry 18.7). It
// installs the four libraries, in this order, then hands over to game.prg. run() ends
// boot.prg, so every wrapper installed here outlives the program that made it.
#include "weather-system.prg"
#include "audio-stems.prg"
#include "pace.prg"
#include "hud-log.prg"
trace = ""
installWeather()
installStems()
installPace()
installHud()
run("game.prg")
