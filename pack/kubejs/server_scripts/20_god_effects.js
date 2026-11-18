function keep(p, effect, amp) {
  gpRun(p, 'effect give @s ' + effect + ' 6 ' + (amp || 0) + ' true');
}

PlayerEvents.tick(event => {
  var p = null;
  try { p = event.player } catch (e) { return }
  if (!p) return;
  if (!gpIsServer(p)) return;

  var age = gpAge(p);
  if (age % 20 != 0) return;

  try {

    var got = 0, owned = gpOwnedRelics(p);
    for (var i = 0; i < GP_GODS.length; i++) {
      var id = GP_GODS[i];
      if (owned[id]) {
        if (gpAddGod(p, id)) got++;
      }
    }
    if (got > 0) {
      var n = gpCount(p);
      gpTell(p, '§e§l神物共鸣 §7| §f新共鸣 §b' + got + ' §f件 · 神格 §a' + n + '§7/§a24');
      gpRun(p, 'playsound minecraft:block.amethyst_block.chime player @s ~ ~ ~ 1 1.6');
      gpRun(p, 'particle minecraft:end_rod ~ ~1 ~ 0.3 0.6 0.3 0.05 30');
      gpCheckLawMilestone(p);
      if (n >= 24 && !gpIsGod(p)) {
        gpTell(p, '§6§l★ 24 件神物已齐 · 到神座（磁石）前完成成神仪式 ★');
        gpRun(p, 'playsound minecraft:ui.toast.challenge_complete player @a[distance=..32] ~ ~ ~ 1 1');
      }
    }

    if (gpHeld(p, 'eternal_gear')) keep(p, 'minecraft:haste', 1);
    if (gpHeld(p, 'first_earth_crown') && p.isUnderWater && p.isUnderWater()) keep(p, 'minecraft:water_breathing', 0);
    if (gpHeld(p, 'starword_sigil')) keep(p, 'minecraft:night_vision', 0);
    if (gpHeld(p, 'dragonfang_blade')) keep(p, 'minecraft:strength', 1);
    if (gpHeld(p, 'energy_core')) keep(p, 'minecraft:health_boost', 2);
    if (gpHeld(p, 'harvest_chalice')) keep(p, 'minecraft:regeneration', 0);
    if (gpHeld(p, 'heart_of_seasons')) keep(p, 'minecraft:saturation', 0);
    if (gpHeld(p, 'logic_crystal')) keep(p, 'minecraft:luck', 1);

    if (gpIsGod(p)) {
      keep(p, 'minecraft:resistance', 1);
      keep(p, 'minecraft:health_boost', 4);
      keep(p, 'minecraft:regeneration', 1);
      keep(p, 'minecraft:night_vision', 0);
      keep(p, 'minecraft:water_breathing', 0);
      keep(p, 'minecraft:strength', 1);
    }
  } catch (err) {
    if (Math.random() < 0.02) console.error('[godpath] 神物扫描异常: ' + err);
  }
});

function gpCheckLawMilestone(p) {
  var names = { origin: '原初', life: '丰饶', gear: '机械', rail: '连接', arcane: '奥秘', blade: '斩断' };
  var keys = ['origin', 'life', 'gear', 'rail', 'arcane', 'blade'];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (gpLawDone(p, k)) {
      var flag = 'law_' + k;
      var done = false;
      try { done = p.persistentData.getBoolean(flag) } catch (e) { }
      if (!done) {
        try { p.persistentData.putBoolean(flag, true) } catch (e2) { }
        gpTell(p, '§6◆ ' + names[k] + '法则 · 四件已齐 · ' + names[k] + '之力苏醒 ◆');
        gpRun(p, 'playsound minecraft:ui.toast.challenge_complete player @s ~ ~ ~ 1 1.2');
        gpRun(p, 'particle minecraft:totem_of_undying ~ ~1 ~ 0.6 0.8 0.6 0.4 60');
      }
    }
  }
}

ItemEvents.rightClicked('godpath:origin_stone_core', event => {
  try {
    var p = event.player;
    var look = p.getLookAngle();
    var lx = gpVec(look, 'x'), ly = gpVec(look, 'y'), lz = gpVec(look, 'z');
    var moved = false;
    try { p.setDeltaMovement(lx * 1.8, ly * 1.8 + 0.42, lz * 1.8); moved = true } catch (e1) { }
    if (!moved) { try { p.setMotion(lx * 1.8, ly * 1.8 + 0.42, lz * 1.8); moved = true } catch (e2) { } }
    gpRun(p, 'playsound minecraft:item.trident.riptide_1 player @a[distance=..16] ~ ~ ~ 1.2 1.4');
    gpRun(p, 'particle minecraft:cloud ~ ~ ~ 0.4 0.4 0.4 0.1 24');
    gpRun(p, 'effect give @s minecraft:slow_falling 4 0 true');
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:world_seed', event => {
  try {
    var p = event.player;
    var sneak = false;
    try { sneak = p.isShiftKeyDown() } catch (e1) { }
    if (sneak) {
      var pos = gpPos(p);
      gpStorePoint(p, 'anchor');
      gpTell(p, '§b世界种子 §7| 锚点已记录 §f' + Math.floor(pos[0]) + ', ' + Math.floor(pos[1]) + ', ' + Math.floor(pos[2]));
      gpRun(p, 'playsound minecraft:block.amethyst_block.resonate player @s ~ ~ ~ 1 1.2');
    } else {
      if (!gpRecallPoint(p, 'anchor')) {
        gpTell(p, '§7世界种子 §c| 还没有锚点（潜行 + 右键记录）');
      } else {
        gpRun(p, 'playsound minecraft:entity.enderman.teleport player @s ~ ~ ~ 1 1');
        gpRun(p, 'particle minecraft:portal ~ ~1 ~ 0.4 0.6 0.4 0.1 40');
      }
    }
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:echo_of_origin', event => {
  try {
    var p = event.player;
    gpRun(p, 'playsound minecraft:block.sculk_sensor.clicking player @s ~ ~ ~ 1 0.8');
    gpRun(p, 'particle minecraft:sonic_boom ~ ~1 ~ 0.2 0.2 0.2 0 12');
    gpRun(p, 'locate structure #minecraft:village');
    gpRun(p, 'locate structure #minecraft:ruined_portal');
    gpRun(p, 'locate structure #minecraft:ancient_city');
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:heart_of_seasons', event => {
  try {
    var p = event.player;
    var grown = gpGrowCrops(p, 8);
    gpRun(p, 'playsound minecraft:block.grass.place player @a[distance=..24] ~ ~ ~ 1 0.7');
    gpRun(p, 'particle minecraft:happy_villager ~ ~1 ~ 8 3 8 0.2 120');
    gpTell(p, '§a四季之心 §7| 8 格内已催熟 ' + grown + ' 株作物');
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:harvest_chalice', event => {
  try {
    var p = event.player;
    gpRun(p, 'effect give @s minecraft:saturation 1 24 true');
    gpRun(p, 'effect give @s minecraft:regeneration 6 1 true');
    gpRun(p, 'playsound minecraft:entity.generic.drink player @s ~ ~ ~ 1 1.2');
    gpRun(p, 'particle minecraft:heart ~ ~1 ~ 0.5 0.5 0.5 0.05 30');
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:pastoral_bell', event => {
  try {
    var p = event.player;
    gpRun(p, 'playsound minecraft:block.bell.use player @a[distance=..32] ~ ~ ~ 1 1.1');
    var types = ['cow', 'sheep', 'pig', 'chicken', 'horse', 'donkey', 'wolf', 'cat', 'rabbit', 'goat', 'bee', 'llama'];
    for (var i = 0; i < types.length; i++) {
      gpRun(p, 'tp @e[type=minecraft:' + types[i] + ',distance=..48] @s');
    }
    gpRun(p, 'effect give @e[type=minecraft:wolf,distance=..16] minecraft:regeneration 5 0 true');
    gpRun(p, 'particle minecraft:note ~ ~1 ~ 3 1 3 0.2 40');
    gpTell(p, '§a牧歌铃铛 §7| 48 格内动物已召回');
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:fertile_sigil', event => {
  try {
    var p = event.player;
    var grown = gpGrowCrops(p, 6);
    gpRun(p, 'particle minecraft:composter ~ ~1 ~ 6 2 6 0.2 80');
    gpRun(p, 'effect give @a[distance=..10] minecraft:regeneration 8 0 true');
    gpRun(p, 'playsound minecraft:item.bone_meal.use player @a[distance=..16] ~ ~ ~ 1 1');
    gpTell(p, '§a沃土之印 §7| 6 格内已催熟 ' + grown + ' 株作物 · 友军获再生');
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:sky_craft_key', event => {
  try {
    var p = event.player;
    gpRun(p, 'setblock ~ ~ ~ minecraft:crafting_table replace');
    gpRun(p, 'setblock ~1 ~ ~ minecraft:furnace replace');
    gpRun(p, 'setblock ~-1 ~ ~ minecraft:anvil replace');
    gpRun(p, 'playsound minecraft:block.anvil.place player @s ~ ~ ~ 1 1.4');
    gpTell(p, '§6天工之钥 §7| 工作台 / 熔炉 / 铁砧已就位');
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:stellar_compass', event => {
  try {
    var p = event.player;
    var found = gpGetList(p);
    var missing = [];
    for (var i = 0; i < GP_GODS.length; i++) {
      if (found.indexOf(GP_GODS[i]) < 0) missing.push(GP_GODS[i]);
    }
    if (missing.length == 0) {
      gpTell(p, '§d星际罗盘 §7| §a24 件已齐，去神座成神');
      return;
    }
    var hint = missing[Math.floor(Math.random() * missing.length)];
    gpTell(p, '§d星际罗盘 §7| 还差 §e' + missing.length + ' §7件 · 下一线索：§b' + (GP_GOD_CN[hint] || hint));
    gpRun(p, 'particle minecraft:end_rod ~ ~1.5 ~ 0.2 0.2 0.2 0.02 20');
    gpRun(p, 'playsound minecraft:block.amethyst_block.chime player @s ~ ~ ~ 1 1.8');
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:orbit_staff', event => {
  try {
    var p = event.player;
    var look = p.getLookAngle();
    var lx = gpVec(look, 'x'), lz = gpVec(look, 'z');
    var dx = Math.abs(lx) > Math.abs(lz) ? (lx > 0 ? 1 : -1) : 0;
    var dz = dx == 0 ? (lz > 0 ? 1 : -1) : 0;
    for (var i = 1; i <= 32; i++) {
      gpRun(p, 'setblock ~' + (dx * i) + ' ~ ~' + (dz * i) + ' minecraft:rail replace');
    }
    gpRun(p, 'playsound minecraft:block.metal.place player @s ~ ~ ~ 1 1.2');
    gpTell(p, '§d轨道权杖 §7| 已铺设 32 格铁轨');
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:resonant_beacon', event => {
  try {
    var p = event.player;
    var sneak = false;
    try { sneak = p.isShiftKeyDown() } catch (e1) { }
    if (sneak) {
      var pos = gpPos(p);
      gpStorePoint(p, 'bp');
      gpTell(p, '§d共振信标 §7| 信标点已记录');
      gpRun(p, 'playsound minecraft:block.beacon.activate player @s ~ ~ ~ 1 1.4');
    } else {
      if (!gpRecallPoint(p, 'bp')) {
        gpTell(p, '§d共振信标 §c| 还没有信标点（潜行 + 右键记录）');
      } else {
        gpRun(p, 'playsound minecraft:entity.enderman.teleport player @s ~ ~ ~ 1 0.8');
        gpRun(p, 'particle minecraft:reverse_portal ~ ~1 ~ 0.4 0.8 0.4 0.2 60');
      }
    }
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:temporal_rivet', event => {
  try {
    var p = event.player;
    var remaining = gpCooldown(p, 'rivet_cd', 1200);
    if (remaining > 0) {
      gpTell(p, '§7时空铆钉 §c| 冷却中（还需 ' + Math.ceil(remaining / 20) + ' 秒）');
      return;
    }

    var list = ['zombie', 'skeleton', 'spider', 'creeper', 'witch', 'enderman', 'pillager', 'vindicator',
      'ravager', 'husk', 'stray', 'drowned', 'phantom', 'blaze', 'wither_skeleton', 'piglin', 'hoglin', 'zoglin',
      'slime', 'magma_cube', 'silverfish', 'endermite', 'vex', 'evoker'];
    for (var i = 0; i < list.length; i++) {
      gpRun(p, 'effect give @e[type=minecraft:' + list[i] + ',distance=..14] minecraft:slowness 8 200 true');
      gpRun(p, 'effect give @e[type=minecraft:' + list[i] + ',distance=..14] minecraft:weakness 8 10 true');
    }
    gpRun(p, 'particle minecraft:end_gateway ~ ~1 ~ 6 3 6 0 10');
    gpRun(p, 'playsound minecraft:block.conduit.deactivate player @a[distance=..24] ~ ~ ~ 1 0.6');
    gpTell(p, '§d时空铆钉 §7| 14 格内敌人冻结 8 秒');
  } catch (e) { }
});

ItemEvents.rightClicked('godpath:starword_sigil', event => {
  try {
    var p = event.player;
    gpRun(p, 'particle minecraft:end_rod ~ ~8 ~ 12 6 12 0.6 300');
    gpRun(p, 'particle minecraft:firework ~ ~6 ~ 6 4 6 0.1 60');
    gpRun(p, 'playsound minecraft:block.amethyst_block.chime player @a[distance=..32] ~ ~ ~ 1 0.6');
    gpRun(p, 'effect give @a[distance=..16] minecraft:night_vision 90 0 true');
  } catch (e) { }
});

function gpFindNearbySanctum(p) {
  var registryType = Java.loadClass('net.minecraft.core.registries.Registries').STRUCTURE;
  var registry = p.server.registryAccess().registryOrThrow(registryType);
  var cache = p.level.getChunkSource(), best = null;
  var centerX = Math.floor(p.x / 16), centerZ = Math.floor(p.z / 16);
  for (var x = centerX - 5; x <= centerX + 5; x++) {
    for (var z = centerZ - 5; z <= centerZ + 5; z++) {
      var chunk = cache.getChunkNow(x, z);
      if (chunk == null) continue;
      chunk.getAllStarts().forEach(function (type, start) {
        var id = '' + registry.getKey(type);
        if (!/^godpath:[a-z]+_sanctum$/.test(id) || !start.isValid()) return;
        var bounds = start.getBoundingBox();
        var px = Math.floor((bounds.minX() + bounds.maxX()) / 2);
        var pz = Math.floor((bounds.minZ() + bounds.maxZ()) / 2);
        var distance = Math.hypot(px - p.x, pz - p.z);
        if (!best || distance < best.distance) best = { id: id, x: px, z: pz, distance: distance };
      });
    }
  }
  return best;
}

ItemEvents.rightClicked('godpath:moondrop_lense', event => {
  var p = event.player;
  if (!gpIsServer(p) || gpCooldown(p, 'gp_sanctum_scan', 100) > 0) return;
  var nearest = gpFindNearbySanctum(p);
  if (!nearest) {
    gpTell(p, '§5月露透镜 §7| 附近已加载区块未发现六道遗迹。');
    return;
  }
  var law = nearest.id.substring(8).replace('_sanctum', '');
  var names = { origin: '晨星天文台', life: '四季圣苑', gear: '天工大圣堂', rail: '回响高架站', arcane: '月露星宫', blade: '断空武斗殿' };
  gpTell(p, '§5月露透镜 §7| §d' + names[law] + ' §fX ' + nearest.x + ' · Z ' + nearest.z + ' · ' + Math.round(nearest.distance) + ' 格');
  gpRun(p, 'particle minecraft:glow ~ ~1 ~ 0.8 0.5 0.8 0.04 24');
  gpRun(p, 'playsound minecraft:block.amethyst_cluster.place player @s ~ ~ ~ 1 1.6');
});

ItemEvents.rightClicked('godpath:spirit_wind_wand', event => {
  try {
    var p = event.player;
    var look = p.getLookAngle();
    var lx = gpVec(look, 'x'), ly = gpVec(look, 'y'), lz = gpVec(look, 'z');
    var moved = false;
    try { p.setDeltaMovement(lx * 2.6, ly * 2.6 + 0.55, lz * 2.6); moved = true } catch (e1) { }
    if (!moved) { try { p.setMotion(lx * 2.6, ly * 2.6 + 0.55, lz * 2.6) } catch (e2) { } }
    gpRun(p, 'playsound minecraft:entity.breeze.jump player @a[distance=..24] ~ ~ ~ 1.4 0.9');
    gpRun(p, 'particle minecraft:cloud ~ ~ ~ 1 1 1 0.3 60');
    gpRun(p, 'effect give @s minecraft:slow_falling 8 0 true');
  } catch (e) { }
});

function gpApplyPageEnchant(p, target) {
  if (target.isEmpty()) return null;
  var type = Java.loadClass('net.minecraft.core.registries.Registries').ENCHANTMENT;
  var registry = p.server.registryAccess().registryOrThrow(type);
  var resource = Java.loadClass('net.minecraft.resources.ResourceLocation');
  var helper = Java.loadClass('net.minecraft.world.item.enchantment.EnchantmentHelper');
  var enchantment = Java.loadClass('net.minecraft.world.item.enchantment.Enchantment');
  var current = helper.getEnchantmentsForCrafting(target), candidates = [];
  ['sharpness', 'protection', 'efficiency', 'fortune', 'unbreaking', 'mending',
    'looting', 'power', 'feather_falling', 'respiration'].forEach(function (id) {
    var holder = registry['getHolder(net.minecraft.resources.ResourceLocation)'](resource.parse('minecraft:' + id));
    if (!holder.isPresent()) return;
    holder = holder.get();
    var value = holder.value(), level = value.getMaxLevel();
    if (!value.canEnchant(target) || current.getLevel(holder) >= level) return;
    var compatible = true;
    current.keySet().forEach(function (other) {
      if (!other.equals(holder) && !enchantment.areCompatible(holder, other)) compatible = false;
    });
    if (compatible) candidates.push({ holder: holder, level: level, id: id });
  });
  if (candidates.length == 0 || gpCooldown(p, 'gp_page_enchant', 2400) > 0) return null;
  var selected = candidates[Math.floor(Math.random() * candidates.length)];
  helper.updateEnchantments(target, enchantments => enchantments.upgrade(selected.holder, selected.level));
  return selected;
}

ItemEvents.rightClicked('godpath:arcane_fragment_page', event => {
  var p = event.player;
  if (!gpIsServer(p)) return;
  var target = gpIdIs(p.getMainHandItem(), 'godpath:arcane_fragment_page') ? p.getOffHandItem() : p.getMainHandItem();
  var selected = gpApplyPageEnchant(p, target);
  if (!selected) {
    gpTell(p, '§5秘法残页 §7| 另一只手需要可附魔装备，成功后冷却 120 秒。');
    return;
  }
  gpRun(p, 'playsound minecraft:block.enchantment_table.use player @s ~ ~ ~ 1 1.4');
  gpRun(p, 'particle minecraft:enchant ~ ~1 ~ 0.5 0.8 0.5 0.6 32');
  gpRun(p, 'tellraw @s ' + JSON.stringify({ text: '秘法残页 · 已附魔 ', color: 'light_purple', extra: [
    { translate: 'enchantment.minecraft.' + selected.id }, { text: ' ' + selected.level }
  ] }));
});

ItemEvents.rightClicked('godpath:void_sheath', event => {
  try {
    var p = event.player;
    var look = p.getLookAngle();
    var lx = gpVec(look, 'x'), ly = gpVec(look, 'y'), lz = gpVec(look, 'z');
    var len = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1;
    for (var d = 1; d <= 8; d++) {
      var ox = (lx / len * d).toFixed(2), oz = (lz / len * d).toFixed(2);
      gpRun(p, 'particle minecraft:sweep_attack ~' + ox + ' ~1 ~' + oz + ' 0.4 0.4 0.4 0 12');
    }
    gpDamageNearby(p, 8, 12, true);
    gpRun(p, 'playsound minecraft:entity.player.attack.sweep player @a[distance=..16] ~ ~ ~ 1.6 0.7');
    gpRun(p, 'effect give @s minecraft:resistance 2 4 true');
  } catch (e) { }
});
