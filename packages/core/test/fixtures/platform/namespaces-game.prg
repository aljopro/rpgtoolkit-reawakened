// namespaces-game.prg - the game program of the namespaced package fixtures (epic 19, entry 19.14).
// It never mentions how the packages are built: it calls `rain`, `weather.rain`, `storm.rain` and
// `mwin`, then switches storm off and calls them again. `log` collects the answers and `trace`
// (written by the layers) shows the order the layers ran in.
log = ""
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
