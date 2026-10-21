registerPlugin({
  name: "stock_battle",
  commands: {
    fight: (skill, bkg, next) => {
      return next(skill, bkg)
    }
  }
})
