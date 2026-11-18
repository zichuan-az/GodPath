var GP_GODS = [
  'origin_stone_core', 'world_seed', 'first_earth_crown', 'echo_of_origin',
  'heart_of_seasons', 'harvest_chalice', 'pastoral_bell', 'fertile_sigil',
  'eternal_gear', 'energy_core', 'logic_crystal', 'sky_craft_key',
  'stellar_compass', 'orbit_staff', 'resonant_beacon', 'temporal_rivet',
  'starword_sigil', 'moondrop_lense', 'spirit_wind_wand', 'arcane_fragment_page',
  'thunder_blade_soul', 'dragonfang_blade', 'void_sheath', 'final_tablet'
];

var GP_LAWS = {
  origin: ['origin_stone_core', 'world_seed', 'first_earth_crown', 'echo_of_origin'],
  life:   ['heart_of_seasons', 'harvest_chalice', 'pastoral_bell', 'fertile_sigil'],
  gear:   ['eternal_gear', 'energy_core', 'logic_crystal', 'sky_craft_key'],
  rail:   ['stellar_compass', 'orbit_staff', 'resonant_beacon', 'temporal_rivet'],
  arcane: ['starword_sigil', 'moondrop_lense', 'spirit_wind_wand', 'arcane_fragment_page'],
  blade:  ['thunder_blade_soul', 'dragonfang_blade', 'void_sheath', 'final_tablet']
};

var GP_SHARDS = {
  origin: 'origin_shard', life: 'life_shard', gear: 'gear_shard',
  rail: 'rail_shard', arcane: 'arcane_shard', blade: 'blade_shard'
};

var GP_SHARD_CN = {
  origin_shard: '原初碎片', life_shard: '丰饶碎片', gear_shard: '机械碎片',
  rail_shard: '连接碎片', arcane_shard: '奥秘碎片', blade_shard: '斩断碎片'
};

var GP_GOD_CN = {
  origin_stone_core: '起源石核', world_seed: '世界种子', first_earth_crown: '初土之冠', echo_of_origin: '原声回响',
  heart_of_seasons: '四季之心', harvest_chalice: '丰穗圣杯', pastoral_bell: '牧歌铃铛', fertile_sigil: '沃土之印',
  eternal_gear: '永动齿轮', energy_core: '能量核心', logic_crystal: '逻辑晶体', sky_craft_key: '天工之钥',
  stellar_compass: '星际罗盘', orbit_staff: '轨道权杖', resonant_beacon: '共振信标', temporal_rivet: '时空铆钉',
  starword_sigil: '星语符印', moondrop_lense: '月露透镜', spirit_wind_wand: '灵风之杖', arcane_fragment_page: '秘法残页',
  thunder_blade_soul: '天雷刀魂', dragonfang_blade: '龙牙之刃', void_sheath: '虚空刀鞘', final_tablet: '终焉铭牌'
};

var gpLog = function (msg) {
  try { console.info('[godpath] ' + msg) } catch (e) { }
};

var gpServer = function (ctx) {
  var s = null;
  try { s = ctx.server } catch (e1) { }
  if (!s) { try { s = ctx.getServer() } catch (e2) { } }
  if (!s) { try { s = ctx.player.server } catch (e3) { } }
  if (!s) { try { s = ctx.entity.server } catch (e4) { } }
  if (!s) { try { s = ctx.level.server } catch (e5) { } }
  if (!s) { try { s = ctx.minecraftServer } catch (e6) { } }
  return s;
};

var gpSelector = function (ctx) {
  var n = null;
  try { n = ctx.username } catch (e1) { }
  if (!n) { try { n = ctx.name.string } catch (e2) { } }
  if (!n) { try { n = '' + ctx.name } catch (e3) { } }
  if (n && /^[A-Za-z0-9_]{1,16}$/.test('' + n)) return '' + n;
  try {
    var uuid = '' + ctx.uuid;
    if (/^[0-9a-fA-F-]{36}$/.test(uuid)) return uuid;
  } catch (e4) { }
  return null;
};

var gpRun = function (ctx, cmd) {

  try {
    var s = gpServer(ctx);
    var sel = gpSelector(ctx);
    if (s && sel) {
      s.runCommandSilent('execute as ' + sel + ' at @s run ' + cmd);
      return true;
    }
  } catch (e2) { }
  return false;
};

var gpServerRun = function (ctx, cmd) {
  try { var s = gpServer(ctx); if (s) { s.runCommandSilent(cmd); return true } } catch (e) { }
  return false;
};

var gpIdIs = function (stack, fullId) {
  try {
    if (!stack) return false;
    try { if (stack.isEmpty()) return false } catch (e0) { }
    var id = null;
    try { id = stack.id } catch (e1) { }
    if (id == null) { try { id = stack.getItem().kjs$getId() } catch (e2) { } }
    if (id == null) { try { id = '' + stack.getItem() } catch (e3) { } }
    return ('' + id) == fullId;
  } catch (e) { return false }
};

var gpHeld = function (player, shortId) {
  var full = 'godpath:' + shortId;
  var i, st;
  try {
    var inv = player.inventory;
    if (inv) {
      for (i = 0; i < 46; i++) {
        try { st = inv.getItem(i); if (gpIdIs(st, full)) return true } catch (e) { }
      }
    }
  } catch (e1) { }
  try {
    var iv = player.getInventory();
    if (iv) {
      for (i = 0; i < 46; i++) {
        try { st = iv.getItem(i); if (gpIdIs(st, full)) return true } catch (e) { }
      }
    }
  } catch (e2) { }
  try { if (gpIdIs(player.getMainHandItem(), full)) return true } catch (e3) { }
  try { if (gpIdIs(player.getOffHandItem(), full)) return true } catch (e4) { }
  return gpEquipped(player, shortId);
};

var gpCuriosInventory = function (player) {
  try {
    var optional = Java.loadClass('top.theillusivec4.curios.api.CuriosApi').getCuriosInventory(player);
    return optional.isPresent() ? optional.get() : null;
  } catch (error) { return null; }
};

var gpEquippedCount = function (player, shortId) {
  var handler = gpCuriosInventory(player), count = 0;
  if (!handler) return count;
  var inventory = handler.getEquippedCurios();
  for (var i = 0; i < inventory.getSlots(); i++) {
    var stack = inventory.getStackInSlot(i);
    if (gpIdIs(stack, 'godpath:' + shortId)) count += Number(stack.count || stack.getCount());
  }
  return count;
};

var gpEquipped = function (player, shortId) { return gpEquippedCount(player, shortId) > 0; };

var gpWornRelics = function (player) {
  var result = {}, handler = gpCuriosInventory(player);
  if (!handler) return result;
  var inventory = handler.getEquippedCurios();
  for (var i = 0; i < inventory.getSlots(); i++) {
    var stack = inventory.getStackInSlot(i), id = '' + stack.id;
    if (id.indexOf('godpath:') == 0 && GP_GODS.indexOf(id.substring(8)) >= 0) result[id.substring(8)] = true;
  }
  return result;
};

var gpOwnedRelics = function (player) {
  var result = gpWornRelics(player);
  for (var i = 0; i < 41; i++) {
    var stack = player.inventory.getItem(i), id = '' + stack.id;
    if (id.indexOf('godpath:') == 0 && GP_GODS.indexOf(id.substring(8)) >= 0) result[id.substring(8)] = true;
  }
  return result;
};

var gpHeldCount = function (player, shortId) {
  var full = 'godpath:' + shortId, n = 0, i, st;
  try {
    var inv = player.inventory;
    for (i = 0; i < 46; i++) {
      try {
        st = inv.getItem(i);
        if (gpIdIs(st, full)) { try { n += st.count } catch (e) { n += 1 } }
      } catch (e2) { }
    }
  } catch (e3) { }
  return n + gpEquippedCount(player, shortId);
};

var gpGetList = function (player) {
  try {
    var s = player.persistentData.getString('gp_found');
    if (!s || s == 'null' || s == '') return [];
    var result = [];
    ('' + s).split(',').forEach(function (id) {
      if (GP_GODS.indexOf(id) >= 0 && result.indexOf(id) < 0) result.push(id);
    });
    return result;
  } catch (e) { return [] }
};

var gpSetList = function (player, arr) {
  try { player.persistentData.putString('gp_found', arr.join(',')) } catch (e) { }
};

var gpAddGod = function (player, id) {
  if (GP_GODS.indexOf(id) < 0) return false;
  var l = gpGetList(player);
  for (var i = 0; i < l.length; i++) { if (l[i] == id) return false }
  l.push(id);
  gpSetList(player, l);
  return true;
};

var gpCount = function (player) { return gpGetList(player).length };

var gpLawDone = function (player, law) {
  var l = gpGetList(player);
  var want = GP_LAWS[law];
  if (!want) return false;
  for (var i = 0; i < want.length; i++) { if (l.indexOf(want[i]) < 0) return false }
  return true;
};

var gpIsGod = function (p) {
  try { return p.persistentData.getBoolean('gp_god') } catch (e) { return false }
};

var gpIsServer = function (p) {
  try {
    var side = p.level.isClientSide;
    if (typeof side == 'boolean') return !side;
    if (typeof side == 'function') return !p.level.isClientSide();
  } catch (e1) { }
  return true;
};

var gpTell = function (player, text) {
  try { player.tell(Text.of(text)); return } catch (e1) { }
  try { player.tell(text) } catch (e2) { }
};

var gpSound = function (ctx, sound, vol, pitch) {
  gpRun(ctx, 'playsound ' + sound + ' player @a[distance=..24] ~ ~ ~ ' + (vol || 1) + ' ' + (pitch || 1));
};

var gpParticle = function (ctx, particle, count, spread) {
  gpRun(ctx, 'particle ' + particle + ' ~ ~1 ~ ' + spread + ' ' + spread + ' ' + spread + ' 0.05 ' + count);
};

var gpPos = function (p) {
  var x = 0, y = 0, z = 0;
  try { x = p.x; y = p.y; z = p.z } catch (e1) {
    try { x = p.getX(); y = p.getY(); z = p.getZ() } catch (e2) { }
  }
  return [x, y, z];
};

var gpVec = function (v, k) {
  try { var r = v[k]; if (typeof r == 'number') return r } catch (e) { }
  try { return v[k]() } catch (e2) { }
  return 0;
};

var gpAge = function (p) {
  try { if (typeof p.age == 'number') return p.age } catch (e1) { }
  try { if (typeof p.tickCount == 'number') return p.tickCount } catch (e2) { }
  return 0;
};

var gpDimension = function (level) {
  try {
    var d = typeof level.dimension == 'function' ? level.dimension() : level.dimension;
    try { return '' + d.location() } catch (e1) { }
    return '' + d;
  } catch (e2) { return '' }
};

var gpIsPlayer = function (entity) {
  try { return entity.isPlayer() } catch (e) { return false }
};

var gpDamageAttacker = function (event) {
  var source = event.source || event.damageSource;
  if (!source) return null;
  if (source.player) return source.player;
  if (typeof source.getActual == 'function') return source.getActual();
  if (typeof source.getEntity == 'function') return source.getEntity();
  return null;
};

var gpHostileEntity = function (entity) {
  try { if (entity.isMonster()) return true } catch (e) { }
  try { return GP_HOSTILE.indexOf('' + entity.type) >= 0 } catch (e2) { return false }
};

var gpCooldown = function (p, key, ticks) {
  if ((key == 'gp_slash_cd' || key == 'gp_burst_cd') && p.persistentData.getBoolean('gp_res_arcane4')) {
    ticks = Math.max(1, Math.floor(ticks * 0.65));
  }
  var now;
  try { now = Number(p.level.getTime()) } catch (e) {
    try { now = Number(p.level.getGameTime()) } catch (e2) { now = Number(p.level.gameTime) }
  }
  if (!isFinite(now)) throw new Error('Cannot read server world time');
  var data = p.persistentData;
  var last = Number(data.getLong(key));
  if (data.contains(key) && now >= last && now - last < ticks) return ticks - (now - last);
  data.putLong(key, now);
  return 0;
};

var gpEnsureAttribute = function (p, attribute, id, value, operation) {
  var instance = p.getAttribute(attribute);
  if (!instance) return;
  var current = instance.getModifier(id);
  operation = operation || 'add_value';
  if (current != null) {
    if (Number(current.amount()) == Number(value) && ('' + current.operation()).toLowerCase() == operation) return;
    gpRun(p, 'attribute @s ' + attribute + ' modifier remove ' + id);
  }
  gpRun(p, 'attribute @s ' + attribute + ' modifier add ' + id + ' ' + value + ' ' + (operation || 'add_value'));
};

var gpRemoveAttribute = function (p, attribute, id) {
  var instance = p.getAttribute(attribute);
  if (instance && instance.getModifier(id) != null) gpRun(p, 'attribute @s ' + attribute + ' modifier remove ' + id);
};

var gpStorePoint = function (p, key) {
  var pos = gpPos(p), data = p.persistentData;
  data.putDouble(key + '_x', Math.floor(pos[0]));
  data.putDouble(key + '_y', Math.floor(pos[1]));
  data.putDouble(key + '_z', Math.floor(pos[2]));
  data.putString(key + '_dim', gpDimension(p.level));
};

var gpRecallPoint = function (p, key) {
  var data = p.persistentData;
  if (!data.contains(key + '_x')) return false;
  var dim = '' + data.getString(key + '_dim');
  if (!dim) dim = gpDimension(p.level);
  if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(dim)) return false;
  return gpRun(p, 'execute in ' + dim + ' run tp @s ' + Math.floor(data.getDouble(key + '_x')) + ' ' +
    Math.floor(data.getDouble(key + '_y')) + ' ' + Math.floor(data.getDouble(key + '_z')));
};

var gpGrowCrops = function (p, radius) {
  var pos = gpPos(p), grown = 0;
  for (var dx = -radius; dx <= radius; dx++) {
    for (var dz = -radius; dz <= radius; dz++) {
      if (dx * dx + dz * dz > radius * radius) continue;
      for (var dy = -2; dy <= 2; dy++) {
        var b = p.level.getBlock(Math.floor(pos[0]) + dx, Math.floor(pos[1]) + dy, Math.floor(pos[2]) + dz);
        var max = GP_CROP_AGES['' + b.id];
        if (max === undefined) continue;
        var props = b.properties;
        if (Number(props.age) >= max) continue;
        props.age = '' + max;
        b.set(b.id, props);
        grown++;
      }
    }
  }
  return grown;
};

var gpDamageNearby = function (p, range, damage, directional, damageType) {
  var pos = gpPos(p), look = directional ? p.getLookAngle() : null;
  var lx = look ? gpVec(look, 'x') : 0, ly = look ? gpVec(look, 'y') : 0, lz = look ? gpVec(look, 'z') : 0;
  var entities = p.level.getEntitiesWithin(AABB.of(pos[0] - range, pos[1] - range, pos[2] - range,
    pos[0] + range, pos[1] + range, pos[2] + range));
  var hits = 0;
  entities.forEach(function (entity) {
    if (!gpHostileEntity(entity) && (typeof GP_BOSSES == 'undefined' || GP_BOSSES.indexOf('' + entity.type) < 0)) return;
    var epos = gpPos(entity), dx = epos[0] - pos[0], dy = epos[1] - pos[1], dz = epos[2] - pos[2];
    var distance = dx * dx + dy * dy + dz * dz;
    if (distance > range * range) return;
    if (directional) {
      var dot = dx * lx + dy * ly + dz * lz;
      if (dot <= 0 || distance - dot * dot > 2.25) return;
    }
    var uuid = '' + entity.uuid;
    if (!/^[0-9a-fA-F-]{36}$/.test(uuid)) return;
    if (gpRun(p, 'damage ' + uuid + ' ' + damage + ' ' + (damageType || 'minecraft:player_attack') + ' by @s')) hits++;
  });
  return hits;
};

gpLog('公共库加载完成: 24 件神物 / 6 法则');
