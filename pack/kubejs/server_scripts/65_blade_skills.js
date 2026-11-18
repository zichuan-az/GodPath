var BLADE_TIERS = [
  { need: 0, atk: 0, spd: 0, name: '未开锋' },
  { need: 25, atk: 3, spd: 0.1, name: '斩击 I' },
  { need: 80, atk: 6, spd: 0.2, name: '斩击 II' },
  { need: 200, atk: 10, spd: 0.35, name: '斩击 III' },
  { need: 400, atk: 16, spd: 0.5, name: '斩击 IV · 刀魂' }
];

function bladeIsSlash(id) {
  return id && (/^(slashblade|slashblade_resharped):slashblade($|_)/.test(id) || id.indexOf('slashblade_addon:slashblade_') == 0);
}

function bladeMain(p) {
  try { var s = p.getMainHandItem(); if (s && !s.isEmpty()) return '' + s.id } catch (e) { }
  try { var s2 = p.mainHandItem; if (s2 && !s2.isEmpty()) return '' + s2.id } catch (e2) { }
  return '';
}

function bladeKills(p) {
  try { return p.persistentData.getInt('gp_blade_kills') } catch (e) { return 0 }
}

function bladeTierOf(n) {
  var t = 0;
  for (var i = 0; i < BLADE_TIERS.length; i++) { if (n >= BLADE_TIERS[i].need) t = i }
  return t;
}

function bladeApplyTier(p, tier) {
  var ops = [0, 1, 2, 3, 4];
  for (var i = 0; i < ops.length; i++) {
    if (ops[i] == tier && tier > 0) continue;
    gpRemoveAttribute(p, 'minecraft:generic.attack_damage', 'godpath:blade_t' + ops[i]);
    gpRemoveAttribute(p, 'minecraft:generic.attack_speed', 'godpath:blade_s' + ops[i]);
  }
  if (tier <= 0) return;
  var d = BLADE_TIERS[tier];
  gpEnsureAttribute(p, 'minecraft:generic.attack_damage', 'godpath:blade_t' + tier, d.atk);
  gpEnsureAttribute(p, 'minecraft:generic.attack_speed', 'godpath:blade_s' + tier, d.spd);
}

function bladeBool(p, k) {
  try { return p.persistentData.getBoolean(k) } catch (e) { return false }
}
function bladeSetBool(p, k, v) {
  try { p.persistentData.putBoolean(k, v) } catch (e) { }
}

EntityEvents.death(event => {
  try {
    var p = gpDamageAttacker(event);
    if (!p || !p.persistentData || !gpIsPlayer(p)) return;

    var hand = bladeMain(p);
    if (!bladeIsSlash(hand)) return;

    var n = bladeKills(p) + 1;
    try { p.persistentData.putInt('gp_blade_kills', n) } catch (e3) { }

    var oldTier = 0;
    try { oldTier = p.persistentData.getInt('gp_blade_tier') } catch (e4) { }
    var newTier = bladeTierOf(n);

    if (newTier != oldTier) {
      try { p.persistentData.putInt('gp_blade_tier', newTier) } catch (e5) { }
      bladeApplyTier(p, newTier);
      var t = BLADE_TIERS[newTier];
      gpTell(p, '§c§l刀阶提升 §7| §f' + t.name + ' §7（累计 ' + n + ' 斩）');
      gpRun(p, 'playsound minecraft:item.trident.thunder player @a[distance=..24] ~ ~ ~ 1 0.8');
      gpRun(p, 'particle minecraft:sweep_attack ~ ~1 ~ 1 0.6 1 0.1 60');
    }

    if (n % 50 == 0) {
      gpTell(p, '§7刀魂累积 §f' + n + ' §7斩 · 当前 §c' + BLADE_TIERS[newTier].name);
    }
  } catch (err) { }
});

PlayerEvents.tick(event => {
  var p = null;
  try { p = event.player } catch (e) { return }
  if (!p) return;
  if (!gpIsServer(p)) return;
  if (gpAge(p) % 80 != 0) return;

  try {
    var hand = bladeMain(p);
    var tier = 0;
    if (bladeIsSlash(hand)) tier = bladeTierOf(bladeKills(p));
    bladeApplyTier(p, tier);
  } catch (err) { }
});

NetworkEvents.dataReceived('godpath_blade_skill', event => gpUseBladeSkill(event.player));

function gpUseBladeSkill(p) {
  if (!p || !gpIsServer(p) || p.isSpectator() || !bladeIsSlash(bladeMain(p))) return;
  var n = bladeKills(p);
  var tier = bladeTierOf(n);
  var family = typeof gpBladeFamily == 'function' ? gpBladeFamily(p.getMainHandItem()) : '';
  if (tier <= 0 && !family) return;

  if (!p.isShiftKeyDown()) {

    if (gpCooldown(p, 'gp_slash_cd', 60) > 0) return;

    var dmg = 6 + tier * 4;
    if (typeof gpBladeVisual == 'function') gpBladeVisual(p, family, false);
    if (family == 'apotheosis' && gpIsGod(p)) dmg += 90;
    gpDamageNearby(p, 12, dmg, true);
    gpRun(p, 'playsound minecraft:entity.player.attack.sweep player @a[distance=..20] ~ ~ ~ 1.6 0.7');
    gpRun(p, 'playsound minecraft:item.trident.throw player @s ~ ~ ~ 0.8 1.4');
    return;
  }

  var remaining = gpCooldown(p, 'gp_burst_cd', 300);
  if (remaining > 0) {
    gpTell(p, '§c刀魂 §7| 冷却中 ' + Math.ceil(remaining / 20) + ' 秒');
    return;
  }

  var burst = 10 + tier * 6;
  gpDamageNearby(p, 8, burst, false, 'minecraft:magic');
  if (typeof gpBladeVisual == 'function') gpBladeVisual(p, family, true);
  gpRun(p, 'effect give @s minecraft:resistance 3 4 true');
  gpRun(p, 'effect give @s minecraft:regeneration 5 1 true');
  gpRun(p, 'playsound minecraft:item.trident.thunder player @a[distance=..32] ~ ~ ~ 1.4 0.6');
  gpTell(p, '§c§l刀魂爆发 §7| 半径 8 格 · §f' + burst + ' §7伤害');

  if (gpLawDone(p, 'blade')) {
    gpRun(p, 'particle minecraft:electric_spark ~ ~2 ~ 0.5 1.5 0.5 0.1 24 normal @a[distance=..32]');
  }
}

PlayerEvents.tick(event => {
  var p = null;
  try { p = event.player } catch (e) { return }
  if (!p) return;
  if (!gpIsServer(p)) return;
  if (gpAge(p) % 60 != 0) return;

  try {
    var hand = bladeMain(p);
    if (!bladeIsSlash(hand)) return;
    var n = bladeKills(p);
    var tier = bladeTierOf(n);
    var next = tier < BLADE_TIERS.length - 1 ? BLADE_TIERS[tier + 1].need : -1;
    var msg = '§c' + BLADE_TIERS[tier].name + ' §7| §f' + n + ' 斩';
    if (next > 0) msg += ' §7| 下一阶还需 §e' + (next - n);
    gpRun(p, 'title @s actionbar {"text":"' + msg.replace(/"/g, '\\"') + '","color":"white"}');
  } catch (e) { }
});

console.info('[godpath] 拔刀剑强化层加载完成');
