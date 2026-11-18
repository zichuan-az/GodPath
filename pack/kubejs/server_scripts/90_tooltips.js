ItemEvents.modifyTooltips(event => {
  function t(id, lines) {
    try { event.add(id, lines) } catch (e1) {
      try { event.add(id, lines[0]) } catch (e2) { }
    }
  }

  t('godpath:origin_shard', ['§7原初法则的碎片', '§8来源：深板岩 / 凝灰岩 / 远古残骸']);
  t('godpath:life_shard', ['§7丰饶法则的碎片', '§8来源：收获成熟作物']);
  t('godpath:gear_shard', ['§7机械法则的碎片', '§8来源：铁矿石 / 铜矿石']);
  t('godpath:rail_shard', ['§7连接法则的碎片', '§8来源：拆解铁轨']);
  t('godpath:arcane_shard', ['§7奥秘法则的碎片', '§8来源：紫水晶']);
  t('godpath:blade_shard', ['§7斩断法则的碎片', '§8来源：击杀敌对生物']);

  t('godpath:origin_stone_core', ['§7世界最底层的一粒心脏', '§b持有：摔落减免', '§b右键：向前冲刺']);
  t('godpath:world_seed', ['§7一枚还能发芽的世界', '§b潜行+右键：记录坐标', '§b右键：传送回记录点']);
  t('godpath:first_earth_crown', ['§7第一块陆地的王冠', '§b持有：水下呼吸 + 夜视']);
  t('godpath:echo_of_origin', ['§7世界第一次心跳的回声', '§b右键：扫描附近的遗迹与古城']);

  t('godpath:heart_of_seasons', ['§a四季在一颗心里轮转', '§b持有：饱食度持续恢复', '§b右键：全服生长加速 20 秒']);
  t('godpath:harvest_chalice', ['§a永远不会空的圣杯', '§b持有：缓慢再生', '§b右键：回满饥饿与生命']);
  t('godpath:pastoral_bell', ['§a牧场的钟声', '§b右键：召回 48 格内的动物']);
  t('godpath:fertile_sigil', ['§a土地的记忆', '§b右键：范围肥沃 + 友军再生']);

  t('godpath:eternal_gear', ['§6永远不会停下的齿轮', '§b持有：挖掘速度 +40%']);
  t('godpath:energy_core', ['§6一颗永恒跳动的能源', '§b持有：最大生命 +4']);
  t('godpath:logic_crystal', ['§6自动化的思考中枢', '§b持有：幸运 +1']);
  t('godpath:sky_craft_key', ['§6打开天工之门的钥匙', '§b右键：原地生成工作台/熔炉/铁砧']);

  t('godpath:stellar_compass', ['§d指向一切失落之物', '§b右键：提示下一件神物线索']);
  t('godpath:orbit_staff', ['§d铁轨之上的权柄', '§b右键：铺设 32 格直达铁轨']);
  t('godpath:resonant_beacon', ['§d两点的共鸣', '§b潜行+右键：记录信标点', '§b右键：传送回信标点']);
  t('godpath:temporal_rivet', ['§d把时间钉在原地的钉子', '§b右键：冻结 14 格内敌人 8 秒（冷却 60 秒）']);

  t('godpath:starword_sigil', ['§5星星写下的第一行字', '§b持有：夜视', '§b右键：流星粒子雨']);
  t('godpath:moondrop_lense', ['§5月光凝成的透镜', '§b右键：显示附近已加载的六道遗迹坐标']);
  t('godpath:spirit_wind_wand', ['§5风母树的一根枝', '§b右键：强风推进', '§b持有：飞行推进力额外 +30%']);
  t('godpath:arcane_fragment_page', ['§5无尽图书馆的一页', '§b右键：为另一只手的装备添加兼容附魔', '§7成功后冷却 120 秒']);

  t('godpath:thunder_blade_soul', ['§c雷枢中炼出的刀魂', '§b持有：攻击力 +4', '§b刀魂觉醒后击杀触发天雷']);
  t('godpath:dragonfang_blade', ['§c从龙骸厅拔出的牙', '§b持有：攻击力 +4', '§b对 Boss 额外制裁']);
  t('godpath:void_sheath', ['§c收纳一切的刀鞘', '§b右键：虚空斩（前方 8 格）']);
  t('godpath:final_tablet', ['§c刻着最后一行字的铭牌', '§6集齐 24 件后，在磁石（神座）前右键']);

  t('godpath:divinity_mark', ['§6§l成神者的凭证', '§7可佩戴于神格饰品槽', '§7生命 +180 · 攻击 +60 · 护甲 +40 · 韧性 +20', '§7移速 +50% · 幸运 +20 · 生存飞行与不死神躯']);
});

console.info('[godpath] 物品说明层加载完成');
