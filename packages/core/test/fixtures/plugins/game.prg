// game.prg - the game script of the plugin fixture game (epic 18, entry 18.7). It knows
// nothing about the libraries: it calls mwin and sleep and the weather handles only.
weatherSet(1)
mwin("hello")
weatherSet(2)
mwin("again")
sleep(1)
done = weatherNow()
end()
