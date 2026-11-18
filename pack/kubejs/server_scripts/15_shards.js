function dropAt(p, x, y, z, item) {
  var sx = x.toFixed(1), sy = y.toFixed(1), sz = z.toFixed(1);
  gpRun(p, 'summon minecraft:item ' + sx + ' ' + sy + ' ' + sz +
    ' {Item:{id:"' + item + '",count:1},PickupDelay:10s,Motion:[0.0,0.15,0.0]}');
}

function shardFeedback(p, item) {
  var cn = GP_SHARD_CN[item] || item;
  gpTell(p, '§e✦ 获得 §b' + cn);
  gpRun(p, 'playsound minecraft:block.amethyst_block.chime player @s ~ ~ ~ 0.6 1.9');
}

var GP_CROP_AGES = {
  'minecraft:wheat': 7, 'minecraft:carrots': 7, 'minecraft:potatoes': 7,
  'minecraft:beetroots': 3, 'farmersdelight:cabbages': 7,
  'farmersdelight:carrots': 7, 'farmersdelight:onions': 7,
  'farmersdelight:tomatoes': 3,
  'farmersdelight:rice': 3, 'farmersdelight:rice_panicles': 3
};

function shardCropMature(block, id) {
  if (id == 'minecraft:melon' || id == 'minecraft:pumpkin') return true;
  if (GP_CROP_AGES[id] === undefined) return false;
  try { return Number(block.properties.age) == GP_CROP_AGES[id] } catch (e) { return false }
}

var GP_BOSSES = [
  'minecraft:ender_dragon', 'minecraft:wither', 'minecraft:warden',
  'minecraft:elder_guardian', 'minecraft:ravager',
  'cataclysm:ignis', 'cataclysm:netherite_monstrosity', 'cataclysm:ender_guardian',
  'cataclysm:the_harbinger', 'cataclysm:the_leviathan', 'cataclysm:ancient_remnant',
  'cataclysm:maledictus', 'cataclysm:scylla',
  'aquamirae:captain_cornelia', 'aquamirae:maze_mother',
  'mowziesmobs:ferrous_wroughtnaut', 'mowziesmobs:frostmaw',
  'mowziesmobs:umvuthi', 'mowziesmobs:sculptor',
  'aether:slider', 'aether:valkyrie_queen', 'aether:sun_spirit',
  'eternal_starlight:starlight_golem', 'eternal_starlight:lunar_monstrosity',
  'the_bumblezone:bee_queen', 'deeperdarker:stalker'
];

BlockEvents.broken(event => {
  try {
    var b = null;
    try { b = event.block } catch (e0) { return }
    if (!b) return;

    var id = '';
    try { id = '' + b.id } catch (e1) { }
    if (!id) return;

    var p = null;
    try { p = event.player } catch (e2) { }
    if (!p || !gpIsServer(p)) return;

    var pos = gpPos(b);
    var roll = Math.random();

    if (id == 'minecraft:deepslate' || id == 'minecraft:tuff') {
      if (roll < 0.035) { dropAt(p, pos[0], pos[1], pos[2], 'godpath:origin_shard'); shardFeedback(p, 'origin_shard') }
      return;
    }
    if (id == 'minecraft:ancient_debris') {
      dropAt(p, pos[0], pos[1], pos[2], 'godpath:origin_shard');
      dropAt(p, pos[0], pos[1], pos[2], 'godpath:origin_shard');
      shardFeedback(p, 'origin_shard');
      return;
    }

    if (id == 'minecraft:iron_ore' || id == 'minecraft:deepslate_iron_ore' ||
      id == 'minecraft:copper_ore' || id == 'minecraft:deepslate_copper_ore') {
      if (roll < 0.05) { dropAt(p, pos[0], pos[1], pos[2], 'godpath:gear_shard'); shardFeedback(p, 'gear_shard') }
      return;
    }

    if (id == 'minecraft:rail' || id == 'minecraft:detector_rail' || id == 'minecraft:powered_rail') {
      if (roll < 0.12) { dropAt(p, pos[0], pos[1], pos[2], 'godpath:rail_shard'); shardFeedback(p, 'rail_shard') }
      return;
    }

    if (id == 'minecraft:amethyst_cluster' || id == 'minecraft:budding_amethyst' ||
      id == 'minecraft:amethyst_block') {
      if (roll < 0.10) { dropAt(p, pos[0], pos[1], pos[2], 'godpath:arcane_shard'); shardFeedback(p, 'arcane_shard') }
      return;
    }

    if (shardCropMature(b, id)) {
      var chance = id.indexOf('farmersdelight:') == 0 ? 0.08 : 0.07;
      if (roll < chance) { dropAt(p, pos[0], pos[1], pos[2], 'godpath:life_shard'); shardFeedback(p, 'life_shard') }
      return;
    }
  } catch (err) {
    if (Math.random() < 0.002) console.error('[godpath] 方块掉落异常: ' + err);
  }
});

EntityEvents.death(event => {
  try {
    var p = gpDamageAttacker(event);
    if (!p) return;
    if (!p.persistentData || !gpIsPlayer(p)) return;

    var id = '';
    try { id = '' + event.entity.type } catch (e3) { }
    var pos = gpPos(event.entity);
    var roll = Math.random();
    if (GP_BOSSES.indexOf(id) >= 0) {
      for (var i = 0; i < 4; i++) dropAt(p, pos[0], pos[1], pos[2], 'godpath:blade_shard');
      dropAt(p, pos[0], pos[1], pos[2], 'godpath:arcane_shard');
      shardFeedback(p, 'blade_shard');
      gpTell(p, '§c✦ 强敌陨落 · 斩断碎片 ×4 · 奥秘碎片 ×1');
      return;
    }

    if (gpHostileEntity(event.entity) && roll < 0.06) {
      dropAt(p, pos[0], pos[1], pos[2], 'godpath:blade_shard');
      shardFeedback(p, 'blade_shard');
    }
  } catch (err) {
    if (Math.random() < 0.002) console.error('[godpath] 击杀掉落异常: ' + err);
  }
});
