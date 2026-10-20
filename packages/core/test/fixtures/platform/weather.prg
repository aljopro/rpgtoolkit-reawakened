// weather.prg - the first start-up program of the namespaced package fixtures (epic 19, entry 19.14).
//
// What it does for a game author: the package "weather" puts a line of weather in front of every
// message the game shows, and offers `rain(mm)`, a command that gives back how much rain fell
// (with a random gust added). It keeps everything it owns under its own name, `weather`, so
// `weather.rain(2)` is always weather's own rain, whatever a later package does to plain `rain`.
//
// Precisely (docs/spec/engine/rpgcode-modules-and-objects.md, PKG-1, PKG-4, PKG-5, MOD-4,
// OOP-10, OOP-11): the namespace is a dictionary object named after the package, so
// `weather.rain(2)` is a call on a live object (MOD-2's object-first rule) and runs with
// `this` = weather. Storing the object's method under the command name `rain` makes it the
// plain command (FUN-8's environment table, a callable stored under a name). `registerPlugin`
// adds the package's layer for `mwin`; this package is first in the list, so its layer is the
// one nearest the engine.
trace = ""
weather = {
  name: "weather",
  rain: (mm) => this.name + ":" + (mm + random(3))
}
rain = weather.rain
registerPlugin({
  name: "weather",
  commands: {
    mwin: (line, next) => {
      trace = trace + "weather> "
      local(r)
      r = next("weather|" + line)
      trace = trace + "<weather "
      return r
    }
  }
})
