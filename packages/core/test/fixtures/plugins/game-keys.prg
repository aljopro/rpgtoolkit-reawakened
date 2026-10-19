// game-keys.prg - the game script of the key fixture game (epic 18, entry 18.7): show a
// line, wait for a key, show a second line.
mwin("press a key")
wait(pressed)
mwin("thanks")
done = keysSeen
end()
