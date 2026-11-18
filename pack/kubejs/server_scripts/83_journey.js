var GP_JOURNEY_STAGE = 'gp_journey_stage';
var GP_JOURNEY_BLADE = 'slashblade:slashblade_wood';
var GP_JOURNEY_TRAINING_TAG = 'gp_expedition_training';
var GP_JOURNEY_LAWS = {
  origin: ['原初', '晨星天文台', '挖深板岩、凝灰岩或远古残骸'],
  life: ['丰饶', '四季圣苑', '种植并收获成熟作物'],
  gear: ['机械', '天工大圣堂', '采铁矿和铜矿，备铁块、铜块与红石块'],
  rail: ['连接', '回响高架站', '探索铁路遗迹，或用备用铁轨 ×8 与铁块合成碎片'],
  arcane: ['奥秘', '月露星宫', '开采紫水晶块与紫水晶簇，备萤石和末影之眼'],
  blade: ['斩断', '断空武斗殿', '击杀敌对生物或 Boss，备避雷针、钻石与龙息']
};

function gpJourneyHasMap(player) {
  return typeof gpExpeditionEnabled == 'function' && gpExpeditionEnabled(player.server);
}

function gpJourneyLink(player, label, suffix) {
  player.tell(Text.of(label).aqua().clickRunCommand('/journey' + suffix));
}

function gpJourneyHub(player) {
  var y = gpExpeditionStationY(player.server, 'hub');
  return gpDimension(player.level) == 'minecraft:overworld' &&
    player.x >= 0 && player.x <= 23 && player.z >= -14 && player.z <= 25 && Math.abs(player.y - y) <= 7;
}

function gpJourneyAdvance(player, stage) {
  player.persistentData.putInt(GP_JOURNEY_STAGE, stage);
  gpJourneyShow(player);
}

function gpJourneyJournal(player) {
  var found = gpGetList(player);
  gpTell(player, '§6§l六法则 §7· §f已共鸣 ' + found.length + '/24');
  Object.keys(GP_JOURNEY_LAWS).forEach(law => {
    var entry = GP_JOURNEY_LAWS[law];
    var collected = GP_LAWS[law].filter(id => found.indexOf(id) >= 0).length;
    var missing = GP_LAWS[law].filter(id => found.indexOf(id) < 0).map(id => GP_GOD_CN[id]);
    gpTell(player, '§e' + entry[0] + ' ' + collected + '/4 §7· §f' + entry[1] + ' · ' + entry[2]);
    if (missing.length) gpTell(player, '§7待共鸣 §f' + missing.join('、'));
  });
  gpTell(player, '§7遗迹可用探索者罗盘定位。用 JEI 查配方；进阶神物会消耗同系一阶神物。持有或佩戴一阶神物片刻，待共鸣后再升级。');
  gpTell(player, '§7共鸣 24 件后右键磁石成神，获得万象神裁并解锁轨道炮使用资格。');
  gpJourneyLink(player, '[查看当前目标]', '');
}

function gpJourneyRelicHint(player, expedition) {
  if (expedition) {
    var y = gpExpeditionStationY(player.server, 'trail');
    gpTell(player, '§7到松脊前哨补给箱（183, ' + y + ', -7）找样品，在旁边的工作台合成。配方或物料丢失时，可按以下来源重新收集。');
  }
  gpTell(player, '§f世界种子 §7＝ §a原初碎片 ×4、橡树树苗 ×2、紫水晶碎片 ×1（工作台无序合成）。');
  gpTell(player, '§7挖深板岩或凝灰岩可掉落原初碎片；8 块深板岩加 1 颗钻石也能合成 1 枚。橡树叶掉树苗，矿洞晶洞里的成熟紫水晶簇掉碎片。');
}

function gpJourneyShow(player) {
  var data = player.persistentData;
  var stage = data.getInt(GP_JOURNEY_STAGE);
  var expedition = gpJourneyHasMap(player);
  gpTell(player, '§6§l远征日志 §7· §f当前目标');
  if (expedition && stage < 5) {
    switch (stage) {
      case 0:
        gpTell(player, '§e领取木制拔刀剑 §7· §f在枢纽站安顿，准备食物和床。请在站内领取训练用刀。');
        gpJourneyLink(player, '[领取训练用刀]', ' blade');
        break;
      case 1:
        gpTell(player, '§e完成练刀 ' + data.getInt('gp_journey_hits') + '/3 §7· §f主手持拔刀剑，前往站南训练场，攻击训练靶（12, 20；坐标为 X、Z）。');
        gpJourneyLink(player, '[训练刀遗失或损坏]', ' blade');
        break;
      case 2:
        gpTell(player, '§e乘车前往松脊前哨 §7· §f在枢纽站登上矿车，启动车站发车按钮，坐到东端终点。');
        break;
      case 3:
        gpTell(player, '§e取得第一件神物 §7· §f合成世界种子并把它放入背包。');
        gpJourneyRelicHint(player, true);
        break;
      case 4:
        gpTell(player, '§e乘车返回枢纽站 §7· §f从松脊前哨发车，坐到西端终点。世界种子到手后可继续发展工坊。');
        break;
    }
  } else if (!expedition && gpGetList(player).length == 0 && !gpIsGod(player)) {
    gpTell(player, '§e取得第一件神物 §7· §f先安顿食物和床，再尝试合成世界种子。任意其他神物的共鸣也会开启六法则路线。');
    gpJourneyRelicHint(player, false);
  } else if (gpIsGod(player)) {
    gpTell(player, gpHeld(player, 'orbital_cannon')
      ? '§e神域武装 §7· §f轨道炮已入手。在控制设置里查看模式键，持续瞄准并按住右键蓄能。'
      : '§e神域武装 §7· §f已登临神座。在 JEI 查找轨道炮并备齐材料合成。');
  } else if (gpCount(player) >= 24) {
    gpTell(player, '§e神格仪式 §7· §f共鸣 24/24。在磁石前右键开启仪式，完成后获得万象神裁。');
  } else {
    gpTell(player, '§e建立工坊与六法则 §7· §f已共鸣 ' + gpCount(player) + '/24。用 Create 机械加工补给和建造铁路。');
    gpTell(player, '§7例：从机械一阶刀谱开始；机械二阶刀需要一阶刀（50 杀敌、锻造 3、刀魂 2000）、机械碎片 ×4 与铁块 ×4。');
  }
  gpJourneyLink(player, '[六法则与仪式]', ' laws');
}

function gpJourneyHasBlade(player) {
  for (var slot = 0; slot < 41; slot++) {
    if (isSlashBlade('' + player.inventory.getItem(slot).id)) return true;
  }
  return false;
}

function gpJourneyRecoveryMaterials(player) {
  var logs = Ingredient.of('#minecraft:logs');
  var sword = null;
  var wood = [];
  var needed = 2;
  for (var slot = 0; slot < 36; slot++) {
    var stack = player.inventory.getItem(slot);
    if (stack.isEmpty()) continue;
    if (!sword && gpIdIs(stack, 'minecraft:wooden_sword')) sword = stack;
    if (needed > 0 && logs.test(stack)) {
      var count = Math.min(needed, stack.getCount());
      wood.push([stack, count]);
      needed -= count;
    }
  }
  if (!sword || needed > 0) return null;
  wood.push([sword, 1]);
  return wood;
}

function gpJourneyClaimBlade(player) {
  var data = player.persistentData;
  var stage = data.getInt(GP_JOURNEY_STAGE);
  if (!gpJourneyHasMap(player) || stage >= 2 || !gpJourneyHub(player) || player.isSpectator()) {
    gpTell(player, '§7开荒可自行制作木制拔刀剑：工作台中木剑放左下，原木放正中与右上。');
    return;
  }
  if (gpJourneyHasBlade(player)) {
    if (stage == 0) gpJourneyAdvance(player, 1);
    else gpTell(player, '§7背包里已有拔刀剑，可以继续训练。');
    return;
  }
  var recovery = data.getBoolean('gp_journey_starter_issued');
  var materials = recovery ? gpJourneyRecoveryMaterials(player) : [];
  if (!materials) {
    gpTell(player, '§7补领材料：木剑 ×1 与任意原木 ×2。备齐后在枢纽站再次运行 /journey blade。');
    return;
  }
  var empty = false;
  for (var slot = 0; slot < 36 && !empty; slot++) empty = player.inventory.getItem(slot).isEmpty();
  if (!empty || !player.inventory.add(Item.of(GP_JOURNEY_BLADE))) {
    gpTell(player, '§7请先留出一个背包空位。');
    return;
  }
  materials.forEach(cost => cost[0].shrink(cost[1]));
  data.putBoolean('gp_journey_starter_issued', true);
  gpTell(player, recovery ? '§a已补领木制拔刀剑。' : '§a已领取木制拔刀剑。');
  if (stage == 0) gpJourneyAdvance(player, 1);
}

function gpJourneyOnTrain(player, stage) {
  var data = player.persistentData;
  var vehicle = player.getVehicle();
  if (gpDimension(player.level) != 'minecraft:overworld' || !vehicle || '' + vehicle.type != 'minecraft:minecart' ||
      Math.abs(player.z - 0.5) > 2 || player.x < -2 || player.x > 194) {
    data.remove('gp_journey_cart');
    data.remove('gp_journey_midline');
    return;
  }
  var hubY = gpExpeditionStationY(player.server, 'hub'), trailY = gpExpeditionStationY(player.server, 'trail');
  var atHub = player.x <= 21 && Math.abs(player.y - hubY) < 3;
  var atTrail = player.x >= 171 && Math.abs(player.y - trailY) < 3;
  var outbound = stage == 2;
  var cart = '' + vehicle.uuid;
  if (outbound ? atHub : atTrail) {
    data.putString('gp_journey_cart', cart);
    data.remove('gp_journey_midline');
    return;
  }
  if (data.getString('gp_journey_cart') != cart) {
    data.remove('gp_journey_cart');
    data.remove('gp_journey_midline');
    return;
  }
  if (player.x >= 85 && player.x <= 107) data.putBoolean('gp_journey_midline', true);
  if (data.getBoolean('gp_journey_midline') && (outbound ? atTrail : atHub)) {
    data.remove('gp_journey_cart');
    data.remove('gp_journey_midline');
    gpJourneyAdvance(player, stage + 1);
  }
}

PlayerEvents.loggedIn(event => {
  var player = event.player;
  if (player.persistentData.getBoolean('gp_journey_intro')) return;
  player.persistentData.putBoolean('gp_journey_intro', true);
  gpJourneyLink(player, '[打开远征日志 /journey]', '');
});

PlayerEvents.tick(event => {
  var player = event.player;
  var stage = player.persistentData.getInt(GP_JOURNEY_STAGE);
  if (stage >= 5 || gpAge(player) % 4 != 0 || !gpJourneyHasMap(player) || player.isSpectator()) return;
  if (stage == 2 || stage == 4) gpJourneyOnTrain(player, stage);
  else if (gpAge(player) % 20 == 0) {
    if (stage == 0 && gpJourneyHasBlade(player)) gpJourneyAdvance(player, 1);
    if (stage == 3 && gpHeld(player, 'world_seed')) gpJourneyAdvance(player, 4);
  }
});

EntityEvents.beforeHurt('minecraft:husk', event => {
  var target = event.entity;
  if (!target.getTags().contains(GP_JOURNEY_TRAINING_TAG) || typeof gpExpeditionEnabled != 'function' ||
      !gpExpeditionEnabled(target.level.server) || gpDimension(target.level) != 'minecraft:overworld') return;
  var damage = event.getDamage();
  event.setDamage(0);
  var player = gpDamageAttacker(event);
  if (!(damage > 0) || !player || !gpIsPlayer(player) || player.isSpectator()) return;
  var data = player.persistentData;
  if (data.getInt(GP_JOURNEY_STAGE) != 1 || !isSlashBlade('' + player.getMainHandItem().id) ||
      !gpJourneyHub(player) || Math.abs(player.x - target.x) > 5 || Math.abs(player.z - target.z) > 5 ||
      gpCooldown(player, 'gp_journey_hit_time', 8)) return;
  var hits = data.getInt('gp_journey_hits') + 1;
  data.putInt('gp_journey_hits', hits);
  if (hits >= 3) gpJourneyAdvance(player, 2);
  else gpTell(player, '§a训练命中 ' + hits + '/3');
});

ServerEvents.commandRegistry(event => {
  var commands = event.commands;
  event.register(commands.literal('journey').requires(source => source.getPlayer() != null)
    .executes(context => {
      gpJourneyShow(context.source.getPlayerOrException());
      return 1;
    }).then(commands.literal('laws').executes(context => {
      gpJourneyJournal(context.source.getPlayerOrException());
      return 1;
    })).then(commands.literal('blade').executes(context => {
      gpJourneyClaimBlade(context.source.getPlayerOrException());
      return 1;
    })));
});
