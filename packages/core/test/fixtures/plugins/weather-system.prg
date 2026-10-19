// weather-system.prg - an authored RPGCode middleware library (epic 18, entry 18.7).
//
// What it does for a game author: include this file and call installWeather() once at
// start-up. From then on every mwin line the game shows carries the current weather,
// like "w:rain|hello". The game sets the weather with weatherSet(code) (0 clear, 1 rain,
// 2 snow) and reads it back with weatherNow().
//
// How it works: weatherSet, weatherNow, weatherName and the mwin wrapper are closures
// over one cell, `code`, made by installWeather() and shared by all four. The wrapper
// calls the handle bindingOf("mwin") returned, so it chains to whatever mwin ran before
// it was installed. (A library file is #included; only its functions run, MOD-4.)
function installWeather() {
  local(code)
  local(original)
  code = 0
  original = bindingOf("mwin")
  weatherSet = (next) => { code = next; return code }
  weatherNow = () => code
  weatherName = () => {
    if (code == 1) { return "rain" }
    if (code == 2) { return "snow" }
    return "clear"
  }
  mwin = (line) => {
    trace = trace + "weather> "
    r = original("w:" + weatherName() + "|" + line)
    trace = trace + "<weather "
    return r
  }
}
