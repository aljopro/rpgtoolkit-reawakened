// stock_battle's damage seam is deliberately RPGCode (BAT-5, EMIT-13). Each
// action calls one shared helper from the battle thread, so the cancelable
// dispatch parks that thread before any owner-backed stat write can clamp HP
// or SMP or publish a fallen transition.
localDamage = (request) => {
  local(event)
  local(source)
  local(target)
  local(amount)
  local(pool)
  local(sourceId)
  source = request.source
  target = request.target
  amount = request.amount
  pool = request.pool
  if (target == null) {
    return 0
  }
  sourceId = null
  if (source != null) {
    sourceId = source.id
  }
  event = target.emitCancelable("beforeDamage", {
    source: sourceId,
    target: target.id,
    damage: amount
  })
  if (event.canceled == 1) {
    return 0
  }
  return target.damage(event.detail.damage, sourceId, pool)
}

physical = (request) => {
  request.pool = "hp"
  return localDamage(request)
}

special = (request) => {
  request.pool = "hp"
  return localDamage(request)
}

drain = (request) => {
  request.pool = "smp"
  return localDamage(request)
}

attackall = (request) => {
  local(total)
  total = 0
  if (request.first != null) {
    total = total + physical({ source: request.source, target: request.first, amount: request.amount })
  }
  if (request.second != null) {
    total = total + physical({ source: request.source, target: request.second, amount: request.amount })
  }
  if (request.third != null) {
    total = total + physical({ source: request.source, target: request.third, amount: request.amount })
  }
  return total
}

drainall = (request) => {
  local(total)
  total = 0
  if (request.first != null) {
    total = total + drain({ source: request.source, target: request.first, amount: request.amount })
  }
  if (request.second != null) {
    total = total + drain({ source: request.source, target: request.second, amount: request.amount })
  }
  if (request.third != null) {
    total = total + drain({ source: request.source, target: request.third, amount: request.amount })
  }
  return total
}

registerPlugin({
  name: "stock_battle",
  commands: {
    fight: (skill, bkg, next) => {
      return next(skill, bkg)
    }
  }
})
