var GP_GUIDE_PAGES = [
  '神格之路 · 远行手册\n\n输入 /journey 查看当前目标。高山远征存档可在枢纽站领取练习刀，坐铁路前往松脊前哨。\n\n先在白天找水源、床与食物，建立自己的落脚点。睡过的床可建立家园结界。\n\n前期生命较少，先收集六件神物解除脆弱期，再深入大型遗迹。',
  '世界本身就是任务书\n\n挖深板岩、采铁铜、收成熟作物、探索铁路和战斗，都有对应法则材料。\n\n在 JEI 查询碎片、神物和六系拔刀剑配方。二阶神物会消耗一阶，先确认共鸣。',
  '六道遗迹\n\n晨星天文台、四季圣苑、天工大圣堂、回响高架站、月露星宫、断空武斗殿会自然生成。\n\n留意高层宝箱和守卫；寻找建筑用探索者罗盘，寻找群系用自然罗盘。',
  '归家与成神\n\n铁路、传送石和世界种子让远行更方便。发展科技和庄园之后，继续收集六法则的二十四件神物。\n\n全部共鸣后，在磁石前右键，完成神格仪式。',
  '神物饰品与刀谱\n\n打开 Curios 饰品栏。佩戴同系两件或四件，或者六系各一件，可激活额外共鸣。\n\n六系拔刀剑可按杀敌、锻造和刀魂升级。成神赠送万象神裁，双击跳跃即可飞行。',
  '区块与画面\n\n单人首次进入世界会分批预热附近区块。用 /gp_pregen status 查看，start 手动开始，stop 停止。\n\n默认启用 MakeUp 均衡光影。需要更多帧率时可切换 low 预设。',
  '同行探索\n\nLootr 的自然宝箱可为每位玩家分别提供战利品。\n\n一起探索时记得保护家园。六座法则遗迹只会在新生成区块出现。'
];

var gpGiveAdventureGuide = function (p) {
  if (p.persistentData.getBoolean('gp_guide_4')) return false;
  var book = { title: '神格之路 · 远行手册', author: 'GodPath', generation: 0,
    pages: GP_GUIDE_PAGES.map(text => JSON.stringify({ text: text })), resolved: true };

  var server = gpServer(p), selector = gpSelector(p);
  if (!server || !selector) return false;
  var count = 0;
  try {
    count = server.getCommands().getDispatcher().execute('execute as ' + selector + ' at @s run give @s ' +
      'minecraft:written_book[minecraft:written_book_content=' + JSON.stringify(book) + ']',
      server.createCommandSourceStack().withSuppressedOutput());
  } catch (error) {
    console.error('[godpath] 远行手册发放失败：' + error);
  }
  if (count > 0) {
    p.persistentData.putBoolean('gp_guide_4', true);
    gpTell(p, '§6神格之路 4.1 §7| §f远行手册已放入背包。输入 /journey 查看下一步。');
    return true;
  }
  return false;
};
PlayerEvents.loggedIn(event => gpGiveAdventureGuide(event.player));
