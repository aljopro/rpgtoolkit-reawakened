// chime.prg - the start-up program of an authored RPGCode package (epic 19, entry 19.8).
//
// What it does for a game author: the package "chime" puts "chime:" in front of every mwin
// line the game shows. Start-up runs this program once, before the game, and it only
// registers: the layer it makes is rebuilt every time the game starts and is never saved.
// `chimeHandle` keeps the dictionary registerPlugin returns, for chimeHandle.remove().
chimeHandle = registerPlugin({
  name: "chime",
  commands: {
    mwin: (line, next) => {
      trace = trace + "chime> "
      r = next("chime:" + line)
      trace = trace + "<chime "
      return r
    }
  }
})
