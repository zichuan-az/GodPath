var GP_HOSTILE = [
  'minecraft:zombie', 'minecraft:zombie_villager', 'minecraft:husk', 'minecraft:drowned',
  'minecraft:skeleton', 'minecraft:stray', 'minecraft:bogged', 'minecraft:wither_skeleton',
  'minecraft:spider', 'minecraft:cave_spider', 'minecraft:creeper', 'minecraft:witch',
  'minecraft:enderman', 'minecraft:pillager', 'minecraft:vindicator', 'minecraft:evoker',
  'minecraft:illusioner', 'minecraft:ravager', 'minecraft:vex', 'minecraft:phantom',
  'minecraft:blaze', 'minecraft:ghast', 'minecraft:magma_cube', 'minecraft:slime',
  'minecraft:silverfish', 'minecraft:endermite', 'minecraft:piglin', 'minecraft:piglin_brute',
  'minecraft:hoglin', 'minecraft:zoglin', 'minecraft:guardian', 'minecraft:elder_guardian',
  'minecraft:shulker', 'minecraft:wither', 'minecraft:warden', 'minecraft:breeze'
];

var gpIsHostile = function (idStr) {
  for (var i = 0; i < GP_HOSTILE.length; i++) {
    if (GP_HOSTILE[i] == idStr) return true;
  }
  return false;
};

var gpHomeOf = function (p) {
  var bp = null;
  try { bp = p.getRespawnPosition() } catch (e1) { }
  if (bp == null) { try { bp = p.respawnPosition } catch (e2) { } }
  if (bp == null) return null;
  var x = 0, y = 0, z = 0, dim = '';
  try { x = bp.getX(); y = bp.getY(); z = bp.getZ() } catch (e3) {
    try { x = bp.x; y = bp.y; z = bp.z } catch (e4) { }
  }
  try { dim = '' + p.getRespawnDimension().location() } catch (e5) { }
  return { x: x, y: y, z: z, dim: dim };
};

EntityEvents.checkSpawn(event => {
  try {
    var ent = null;
    try { ent = event.entity } catch (e0) { return }
    if (!ent) return;

    var id = '';
    try { id = '' + ent.type } catch (e1) { }
    if (!id) { try { id = '' + ent.getType() } catch (e2) { } }
    if (!gpHostileEntity(ent)) return;

    var lvl = null;
    try { lvl = event.level } catch (e3) { }
    var dim = '';
    dim = gpDimension(lvl);

    var ex = 0, ey = 0, ez = 0;
    try { ex = event.x; ey = event.y; ez = event.z } catch (e5) { return }

    var s = gpServer(event);
    if (!s) return;
    var players = null;
    try { players = s.players } catch (e6) { return }
    if (!players) return;

    var n = 0;
    try { n = players.size ? players.size() : players.length } catch (e7) { }

    for (var i = 0; i < n; i++) {
      var pl = null;
      try { pl = players.get ? players.get(i) : players[i] } catch (e8) { continue }
      if (!pl) continue;

      var home = gpHomeOf(pl);
      if (!home) continue;
      if (home.dim && dim && home.dim != dim) continue;

      var r = gpIsGod(pl) ? 64 : 48;
      var d2 = (ex - home.x) * (ex - home.x) + (ey - home.y) * (ey - home.y) + (ez - home.z) * (ez - home.z);
      if (d2 <= r * r) {
        try { event.cancel() } catch (c1) { try { event.setCanceled(true) } catch (c2) { } }
        return;
      }
    }
  } catch (err) {
    if (Math.random() < 0.005) console.error('[godpath] 结界异常: ' + err);
  }
});

PlayerEvents.tick(event => {
  var p = null;
  try { p = event.player } catch (e) { return }
  if (!p) return;
  if (!gpIsServer(p)) return;
  if (gpAge(p) % 60 != 0) return;

  try {
    var home = gpHomeOf(p);
    if (!home) return;
    var key = home.dim + ':' + Math.floor(home.x) + ':' + Math.floor(home.y) + ':' + Math.floor(home.z);
    var last = '';
    try { last = '' + p.persistentData.getString('gp_home_key') } catch (e1) { }
    if (last != key) {
      try { p.persistentData.putString('gp_home_key', key) } catch (e2) { }
      gpTell(p, '§a◆ 家园安宁结界已建立 §7| 以你重生点为中心，半径 48 格内不再刷怪 ◆');
      gpRun(p, 'playsound minecraft:block.beacon.activate player @s ~ ~ ~ 0.8 1.6');
    }
  } catch (e) { }
});
