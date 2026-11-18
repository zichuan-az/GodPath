function bladeMainHand(p) {
  try { var s = p.getMainHandItem(); if (s && !s.isEmpty()) return '' + s.id } catch (e) { }
  try { var s2 = p.mainHandItem; if (s2 && !s2.isEmpty()) return '' + s2.id } catch (e2) { }
  return '';
}

function isSlashBlade(id) {
  if (!id) return false;
  return /^(slashblade|slashblade_resharped):slashblade($|_)/.test(id) || id.indexOf('slashblade_addon:slashblade_') == 0;
}

function applyBladeAura(p, on) {
  if (on) {
    gpRun(p, 'attribute @s minecraft:generic.attack_damage modifier add godpath:blade_atk 12 add_value');
    gpRun(p, 'attribute @s minecraft:generic.attack_speed modifier add godpath:blade_spd 0.6 add_value');
    gpSetBoolSafe(p, 'gp_blade_aura', true);
    gpTell(p, '§c§l刀魂觉醒 §7| 拔刀剑获得 +12 攻击 / +0.6 攻速');
    gpRun(p, 'playsound minecraft:item.trident.thunder player @a[distance=..24] ~ ~ ~ 1.2 0.7');
    gpRun(p, 'particle minecraft:crit ~ ~1 ~ 0.6 0.8 0.6 0.3 80');
  } else {
    gpRun(p, 'attribute @s minecraft:generic.attack_damage modifier remove godpath:blade_atk');
    gpRun(p, 'attribute @s minecraft:generic.attack_speed modifier remove godpath:blade_spd');
    gpSetBoolSafe(p, 'gp_blade_aura', false);
  }
}

function gpBoolSafe(p, key) {
  try { return p.persistentData.getBoolean(key) } catch (e) { return false }
}
function gpSetBoolSafe(p, key, v) {
  try { p.persistentData.putBoolean(key, v) } catch (e) { }
}

PlayerEvents.tick(event => {
  var p = null;
  try { p = event.player } catch (e) { return }
  if (!p) return;
  if (!gpIsServer(p)) return;
  if (gpAge(p) % 40 != 0) return;

  try {
    var hand = bladeMainHand(p);
    var blade = isSlashBlade(hand);
    var lawDone = gpLawDone(p, 'blade');
    var want = blade && lawDone;
    var have = gpBoolSafe(p, 'gp_blade_aura');

    if (want) {
      gpEnsureAttribute(p, 'minecraft:generic.attack_damage', 'godpath:blade_atk', 12);
      gpEnsureAttribute(p, 'minecraft:generic.attack_speed', 'godpath:blade_spd', 0.6);
      if (!have) applyBladeAura(p, true);
    } else {
      gpRemoveAttribute(p, 'minecraft:generic.attack_damage', 'godpath:blade_atk');
      gpRemoveAttribute(p, 'minecraft:generic.attack_speed', 'godpath:blade_spd');
      if (have) gpSetBoolSafe(p, 'gp_blade_aura', false);
    }
  } catch (err) {
    if (Math.random() < 0.02) console.error('[godpath] 刀魂层异常: ' + err);
  }
});

EntityEvents.death(event => {
  try {
    var p = gpDamageAttacker(event);
    if (!p) return;
    if (!p.persistentData || !gpIsPlayer(p)) return;

    var hand = bladeMainHand(p);
    if (!isSlashBlade(hand)) return;
    if (!gpLawDone(p, 'blade')) return;

    var pos = gpPos(event.entity);
    var bx = pos[0].toFixed(1), by = pos[1].toFixed(1), bz = pos[2].toFixed(1);
    gpRun(p, 'particle minecraft:electric_spark ' + bx + ' ' + by + ' ' + bz + ' 1 1 1 0.4 60');
    gpRun(p, 'playsound minecraft:item.trident.thunder player @a[distance=..32] ' + bx + ' ' + by + ' ' + bz + ' 1 0.8');

    if (gpHeld(p, 'dragonfang_blade')) {
      var boss = false;
      try {
        var id = '' + event.entity.type;
        if (id.indexOf('wither') >= 0 || id.indexOf('dragon') >= 0 ||
          id.indexOf('warden') >= 0 || id.indexOf('ravager') >= 0 ||
          id.indexOf('cataclysm') >= 0 || id.indexOf('boss') >= 0) boss = true;
      } catch (e3) { }
      if (boss) {
        gpTell(p, '§c§l龙牙制裁 §7| 对 §4' + ('' + event.entity.type) + ' §7造成额外神性伤害');
        gpRun(p, 'particle minecraft:explosion_emitter ' + bx + ' ' + by + ' ' + bz + ' 0 0 0 0 1');
      }
    }
  } catch (err) {
    if (Math.random() < 0.01) console.error('[godpath] 天雷层异常: ' + err);
  }
});
