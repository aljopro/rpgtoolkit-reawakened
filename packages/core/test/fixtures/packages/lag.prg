// lag.prg - the start-up program of an authored RPGCode package (epic 19, entry 19.8).
//
// What it does for a game author: the package "lag" holds the screen for one tick before
// every mwin line is shown, so a layer waits inside its own call. Registered after the other
// packages it is the outermost layer: it sees the text before anyone else changes it.
lagHandle = registerPlugin({
  name: "lag",
  commands: {
    mwin: (line, next) => {
      trace = trace + "lag> "
      sleep(1)
      r = next(line)
      trace = trace + "<lag "
      return r
    }
  }
})
