// hud-log.prg - an authored RPGCode middleware library (epic 18, entry 18.7).
//
// What it does for a game author: include this file and call installHud() once at
// start-up. Every mwin line then holds the HUD for one tick before it is shown, and
// hudShown counts the lines. Installed last it is the outermost layer: it sees the text
// the game wrote before any other library changes it. The game calls hudRemove() to take
// the layer off again, which puts back the one it covered.
//
// How it works: the wrapper calls sleep(1) itself (so pace.prg, if installed, stretches
// it) and then chains to the previous mwin through bindingOf. Storing that handle back under
// the name is what hudRemove does.
function installHud() {
  local(original)
  original = bindingOf("mwin")
  hudShown = 0
  mwin = (line) => {
    trace = trace + "hud> "
    hudShown = hudShown + 1
    sleep(1)
    r = original(line)
    trace = trace + "<hud "
    return r
  }
  hudRemove = () => { mwin = original; return 0 }
}
