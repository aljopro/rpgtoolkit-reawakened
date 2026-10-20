// storm.prg - the second start-up program of the namespaced package fixtures (epic 19, entry 19.14).
//
// What it does for a game author: the package "storm" is listed after "weather" and overrides
// it. Plain `rain(mm)` now pours twice as much, and every message gets a "storm|" tag in front
// of weather's. Nothing of weather is lost: storm hands each call on to weather, and
// `weather.rain(2)` still reaches weather's own rain. `stormOff()` takes the whole override
// away again, the command and the message layer together.
//
// Precisely (PKG-1, PKG-4, PKG-5, MOD-4): later wins, so storm's `rain` and its `mwin` layer
// run first and reach weather's through `earlier` (the saved binding of the plain command) and
// through `next`. The layer waits for one tick before it passes the message on, so a thread
// can be parked inside it when the game is saved. `registerPlugin` returns the registration, and
// its `remove` takes the layer off for this session; storing `earlier` back under `rain` puts
// weather's plain command back, as 18.7's recipe does for a hand-written wrapper.
local(earlier)
earlier = bindingOf("rain")
storm = {
  name: "storm",
  rain: (mm) => earlier(mm * 2) + "+" + this.name
}
rain = storm.rain
stormLayer = registerPlugin({
  name: "storm",
  commands: {
    mwin: (line, next) => {
      trace = trace + "storm> "
      sleep(1)
      local(r)
      r = next("storm|" + line)
      trace = trace + "<storm "
      return r
    }
  }
})
stormOff = () => {
  rain = earlier
  stormLayer.remove()
}
