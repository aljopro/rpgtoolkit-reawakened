// pace.prg - an authored RPGCode middleware library (epic 18, entry 18.7).
//
// What it does for a game author: include this file and call installPace() once at
// start-up. Every sleep(n) in the game, including the ones other libraries make, then
// waits twice as long, a slow-motion switch. The wrapper is parked inside its call
// while the original sleep waits, so the game can be saved at that moment.
//
// How it works: the wrapper keeps the sleep handle bindingOf("sleep") returned and
// calls it with the doubled count.
function installPace() {
  local(original)
  original = bindingOf("sleep")
  sleep = (ticks) => {
    trace = trace + "pace> "
    original(ticks * 2)
    trace = trace + "<pace "
    return 0
  }
}
