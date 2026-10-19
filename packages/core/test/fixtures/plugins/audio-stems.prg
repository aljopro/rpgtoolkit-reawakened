// audio-stems.prg - an authored RPGCode middleware library (epic 18, entry 18.7).
//
// What it does for a game author: include this file and call installStems() once at
// start-up. Every mwin line is then tagged with the music stem playing, like "a1:hello",
// and stemCue holds how many lines have been spoken. The stem number is the line count
// halved and rounded down. A real game would start a sound at that point; the script
// host has no audio device, so the cue is the tag in the text and the count.
//
// How it works: `lines` is a closure cell shared by the wrapper and stemNow(). The
// wrapper calls the previous mwin through bindingOf, so it stacks over any other layer.
function installStems() {
  local(lines)
  local(original)
  lines = 0
  original = bindingOf("mwin")
  stemNow = () => castint(lines / 2)
  mwin = (line) => {
    trace = trace + "audio> "
    lines = lines + 1
    stemCue = lines
    r = original("a" + stemNow() + ":" + line)
    trace = trace + "<audio "
    return r
  }
}
