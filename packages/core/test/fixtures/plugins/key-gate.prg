// key-gate.prg - an authored RPGCode middleware library (epic 18, entry 18.7).
//
// What it does for a game author: include this file and call installKeyGate() once at
// start-up. Every wait(key) in the game, which stops the script until the player presses
// a key and stores it in `key`, is then counted in keysSeen. The script stays stopped
// inside the library's call while it waits, so a save made at that moment resumes in the
// same place and the key still reaches the game's variable.
//
// How it works: the wrapper calls the wait handle bindingOf("wait") returned and counts
// the press once it comes back. Its parameter is written (&key), a by-reference
// parameter, so the key the original stores lands in the caller's variable.
function installKeyGate() {
  local(original)
  original = bindingOf("wait")
  keysSeen = 0
  wait = (&key) => {
    trace = trace + "keys> "
    original(key)
    keysSeen = keysSeen + 1
    trace = trace + "<keys "
    return 0
  }
}
