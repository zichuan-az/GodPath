function stageOf(n) {
  if (n >= 24) return 4;
  if (n >= 12) return 3;
  if (n >= 6) return 2;
  return 1;
}

PlayerEvents.tick(event => {
  var p = null;
  try { p = event.player } catch (e) { return }
  if (!p) return;
  if (!gpIsServer(p)) return;
  if (gpAge(p) % 100 != 0) return;

  try {
    var n = gpCount(p);
    var st = stageOf(n);
    if (gpIsGod(p)) {
      st = 4;
      gpApplyDivinity(p);
    }
    var last = 0;
    try { last = p.persistentData.getInt('gp_stage') } catch (e1) { }

    if (st == 1) {
      gpEnsureAttribute(p, 'minecraft:generic.max_health', 'godpath:fragile', -6);
      if (!gpBool(p, 'gp_fragile')) {
        gpSetBool(p, 'gp_fragile', true);
        gpTell(p, '§c§l脆弱期 §7| 神格未成，生命上限 -6。集齐 6 件神物可解除');
        gpRun(p, 'playsound minecraft:entity.wither.spawn player @s ~ ~ ~ 0.4 1.6');
      }
    } else {
      gpRemoveAttribute(p, 'minecraft:generic.max_health', 'godpath:fragile');
      if (gpBool(p, 'gp_fragile')) {
        gpSetBool(p, 'gp_fragile', false);
        gpTell(p, '§a§l成长期 §7| 神格初显，生命上限恢复正常');
        gpRun(p, 'playsound minecraft:block.beacon.power_select player @s ~ ~ ~ 1 1.2');
      }
    }

    if (st >= 3 && !gpIsGod(p)) {
      gpRun(p, 'effect give @s minecraft:health_boost 6 0 true');
      gpRun(p, 'effect give @s minecraft:strength 6 0 true');
      if (!gpBool(p, 'gp_strong')) {
        gpSetBool(p, 'gp_strong', true);
        gpTell(p, '§6§l强势期 §7| 神格过半，力量开始反哺');
        gpRun(p, 'playsound minecraft:block.beacon.activate player @s ~ ~ ~ 1 1');
      }
    }

    if (last != st) {
      try { p.persistentData.putInt('gp_stage', st) } catch (e2) { }
    }
  } catch (err) {
    if (Math.random() < 0.02) console.error('[godpath] 难度层异常: ' + err);
  }
});

function gpBool(p, key) {
  try { return p.persistentData.getBoolean(key) } catch (e) { return false }
}
function gpSetBool(p, key, v) {
  try { p.persistentData.putBoolean(key, v) } catch (e) { }
}

PlayerEvents.tick(event => {
  var p = null;
  try { p = event.player } catch (e) { return }
  if (!p) return;
  if (!gpIsServer(p)) return;
  if (gpAge(p) % 200 != 0) return;

  try {
    if (stageOf(gpCount(p)) != 1) return;

    var night = false;
    try { night = p.level.isNight() } catch (e1) { }
    if (!night) return;

    var pos = gpPos(p);
    var home = gpHomeOf(p);

    if (home && home.dim == gpDimension(p.level)) {
      var d2 = (pos[0] - home.x) * (pos[0] - home.x) + (pos[2] - home.z) * (pos[2] - home.z);
      if (d2 < 48 * 48) return;
    }

    gpRun(p, 'effect give @s minecraft:hunger 8 0 true');
    gpRun(p, 'playsound minecraft:entity.warden.heartbeat player @s ~ ~ ~ 0.5 1.2');
  } catch (err) {
    if (Math.random() < 0.01) console.error('[godpath] 压力层异常: ' + err);
  }
});
