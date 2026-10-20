// shout.prg - the start-up program of an authored RPGCode package (epic 19, entry 19.8).
//
// What it does for a game author: the package "shout" wraps two commands in one registration.
// It writes every mwin line in capitals, and it makes every sleep twice as long (sleep(1)
// becomes sleep(2)). `shoutHandle` keeps the dictionary registerPlugin returns, so the game
// can take both layers off again with shoutHandle.remove().
shoutHandle = registerPlugin({
  name: "shout",
  commands: {
    mwin: (line, next) => {
      trace = trace + "shout> "
      r = next(ucase(line))
      trace = trace + "<shout "
      return r
    },
    sleep: (ticks, next) => {
      trace = trace + "slow> "
      next(ticks * 2)
      trace = trace + "<slow "
      return 0
    }
  }
})
