var gpExpeditionBuild = null
function gpExpeditionEnabled(server) {
  return gpExpeditionScore(server, 'map') === 1
}

function gpExpeditionScore(server, name) {
  var board = server.getScoreboard()
  var objective = board.getObjective('gp_expedition')
  if (objective == null) return null
  var holder = Java.loadClass('net.minecraft.world.scores.ScoreHolder').forNameOnly(name)
  var score = board.getPlayerScoreInfo(holder, objective)
  return score == null ? null : score.value()
}

function gpExpeditionStationY(server, station) {
  if (station !== 'hub' && station !== 'trail') return null
  var score = gpExpeditionScore(server, station + '_y')
  return score >= 63 ? score : null
}

function gpExpeditionGrade(surface, hub, trail) {
  var grade = []
  var height = hub
  for (var x = 0; x <= 192; x++) {
    if (x >= 26 && x <= 167 && (x - 26) % 3 === 0) {
      var remaining = Math.floor((167 - x) / 3)
      var target = Math.round((surface[x - 2] + surface[x] * 2 + surface[x + 2]) / 4)
      var low = Math.max(height - 1, trail - remaining, 64)
      var high = Math.min(height + 1, trail + remaining, 296)
      height = Math.max(low, Math.min(high, target))
    }
    grade.push(height)
  }
  return grade
}

function gpExpeditionSurface(level, heightmap, x, z) {
  return Math.max(64, Math.min(296, level.getHeight(heightmap, x, z)))
}

function gpExpeditionStationSurface(level, heightmap, start) {
  var samples = []
  for (var x = start + 2; x <= start + 22; x += 5) {
    for (var z = -12; z <= 8; z += 5) samples.push(gpExpeditionSurface(level, heightmap, x, z))
  }
  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length / 2)]
}

function gpExpeditionMakePlan(job) {
  var surface = []
  var heightmap = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types').MOTION_BLOCKING_NO_LEAVES
  var hub = gpExpeditionStationSurface(job.level, heightmap, 0)
  var trail = gpExpeditionStationSurface(job.level, heightmap, 169)
  if (Math.abs(trail - hub) > 47) {
    var difference = Math.abs(trail - hub) - 47
    if (trail > hub) {
      hub += Math.floor(difference / 2)
      trail -= Math.ceil(difference / 2)
    } else {
      hub -= Math.ceil(difference / 2)
      trail += Math.floor(difference / 2)
    }
  }
  for (var x = 0; x <= 192; x++) surface.push(gpExpeditionSurface(job.level, heightmap, x, 0))
  var grade = gpExpeditionGrade(surface, hub, trail)
  var work = []
  work.push('execute positioned 0 ' + hub + ' 0 run function godpath:expedition/hub')
  work.push('execute positioned 169 ' + trail + ' 0 run function godpath:expedition/trail')

  for (var x = 0; x <= 192; x++) {
    var y = grade[x]
    var bridge = surface[x] <= y - 4 && x >= 24 && x <= 168
    var tunnel = surface[x] >= y + 5 && x >= 24 && x <= 168
    var stop = x < 2 || x > 190
    var coast = x >= 2 && x <= 4 || x >= 188 && x <= 190
    var power = !stop && !coast && (x - 5) % 5 === 0
    work.push('fill ' + x + ' ' + y + ' -1 ' + x + ' ' + (y + 3) + ' 1 air')
    work.push('fill ' + x + ' ' + (y - 1) + ' -1 ' + x + ' ' + (y - 1) + ' 1 ' + (bridge ? 'polished_deepslate' : 'stone_bricks'))
    if (power) work.push('setblock ' + x + ' ' + (y - 1) + ' 0 redstone_block')
    if (bridge && x % 8 === 0) {
      work.push('fill ' + x + ' ' + (surface[x] - 1) + ' -1 ' + x + ' ' + (y - 2) + ' 1 stone_bricks')
    }
    if (bridge) {
      work.push('setblock ' + x + ' ' + y + ' -1 spruce_fence')
      work.push('setblock ' + x + ' ' + y + ' 1 spruce_fence')
    } else if (tunnel && x % 5 === 0) {
      work.push('fill ' + x + ' ' + y + ' -2 ' + x + ' ' + (y + 4) + ' -2 deepslate_bricks')
      work.push('fill ' + x + ' ' + y + ' 2 ' + x + ' ' + (y + 4) + ' 2 deepslate_bricks')
      work.push('fill ' + x + ' ' + (y + 4) + ' -1 ' + x + ' ' + (y + 4) + ' 1 deepslate_bricks')
      work.push('setblock ' + x + ' ' + (y + 3) + ' 0 lantern[hanging=true]')
    }
  }

  work.push('setblock -1 ' + hub + ' 0 chiseled_stone_bricks')
  work.push('setblock 193 ' + trail + ' 0 chiseled_stone_bricks')
  work.push('setblock -1 ' + hub + ' 1 stone_button[face=wall,facing=south]')
  work.push('setblock 193 ' + trail + ' 1 stone_button[face=wall,facing=south]')
  for (var x = 0; x <= 192; x++) {
    var y = grade[x]
    var coast = x >= 2 && x <= 4 || x >= 188 && x <= 190
    var shape = grade[x + 1] > y ? 'ascending_east' : grade[x - 1] > y ? 'ascending_west' : 'east_west'
    work.push('setblock ' + x + ' ' + y + ' 0 ' + (coast ? 'rail' : 'powered_rail') + '[shape=' + shape + ']')
  }
  work.push('execute unless entity @e[type=minecart,tag=gp_expedition_cart] run summon minecart 0.5 ' + hub + ' 0.5 {Tags:["gp_expedition_cart"]}')
  work.push('setworldspawn 10 ' + hub + ' -7')
  job.hub = hub
  job.trail = trail
  job.commands = work
  console.info('[Expedition] rail grade hub=' + hub + ' trail=' + trail + ' corridor surface=' +
    Math.min.apply(null, surface) + '..' + Math.max.apply(null, surface))
}

function gpStartExpedition(server) {
  if (gpExpeditionBuild || !gpExpeditionEnabled(server)) return
  if (gpExpeditionScore(server, 'ready') === 1) return
  var level = server.overworld()
  var chunks = []
  for (var cx = -1; cx <= 13; cx++) {
    for (var cz = -2; cz <= 2; cz++) chunks.push([cx, cz])
  }
  gpExpeditionBuild = {level: level, chunks: chunks, loading: 0, cursor: 0, ticks: 0, commands: null}
}

ServerEvents.loaded(event => gpStartExpedition(event.server))

PlayerEvents.loggedIn(event => {
  gpStartExpedition(event.server)
  if (gpExpeditionBuild) gpTell(event.player, '§6高山远征 §7| 正在准备车站和山谷铁路，月台开放后会送你到枢纽。')
})

ServerEvents.tick(event => {
  var job = gpExpeditionBuild
  if (!job) return
  var server = event.server
  var elapsed = ++job.ticks
  if (!job.commands) {
    var cache = job.level.getChunkSource()
    if (job.loading < job.chunks.length) {
      if (elapsed % 2 !== 0) return
      var chunk = job.chunks[job.loading++]
      server.runCommandSilent('execute in minecraft:overworld run forceload add ' + chunk[0] * 16 + ' ' + chunk[1] * 16)
      return
    }
    if (elapsed % 10 !== 0 || !job.chunks.every(chunk => cache.getChunkNow(chunk[0], chunk[1]) != null)) return
    gpExpeditionMakePlan(job)
    return
  }
  for (var budget = 0; budget < 24 && job.cursor < job.commands.length; budget++) {
    server.runCommandSilent('execute in minecraft:overworld run ' + job.commands[job.cursor++])
  }
  if (job.cursor < job.commands.length) return
  server.runCommandSilent('scoreboard players set hub_y gp_expedition ' + job.hub)
  server.runCommandSilent('scoreboard players set trail_y gp_expedition ' + job.trail)
  server.runCommandSilent('scoreboard players set ready gp_expedition 1')
  server.runCommandSilent('execute in minecraft:overworld run forceload remove -16 -32 208 32')
  server.runCommandSilent('execute in minecraft:overworld run tp @a 10.5 ' + job.hub + ' -6.5 0 0')
  gpExpeditionBuild = null
  console.info('[Expedition] railway open after ' + elapsed + ' ticks')
})

ServerEvents.unloaded(event => {
  gpExpeditionBuild = null
})
