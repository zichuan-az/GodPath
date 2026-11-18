// Isolated game fixture. Exercise the loaded recipe manager and run real loot rolls.
var gpDeepRan = false;
PlayerEvents.loggedIn(event => {
  var p = event.player;
  if (gpDeepRan || '' + p.username != 'GodPathTest') return;
  gpDeepRan = true;
  p.server.scheduleInTicks(80, () => {
    var id = Java.loadClass('net.minecraft.resources.ResourceLocation');
    var recipes = p.server.getRecipeManager();
    var restored = [
      'undead_revamp2:smokebombrep',
      'garnished:dye_blowing/quark/blue/framed_glass',
      'garnished:dye_blowing/quark/magenta/stool',
      'garnished:dye_blowing/quark/purple/waxed_corundum',
      'malum:malum/spirit_repair/occultism/red_chalk',
      'malum:malum/spirit_repair/undergarden/forgotten',
      'godpath:blades/origin_1'
    ];
    restored.forEach(name => {
      console.info('[GP-DEEP] RECIPE ' + name + ' ' + recipes.byKey(id.parse(name)).isPresent());
    });
    ['slashblade_addon:slashblade_tofu_ishi',
      'create_ironworks:misc/compat/better_smithing_upgrades/iron_paxel_smithing'].forEach(name => {
      console.info('[GP-DEEP] OPTIONAL_RECIPE ' + name + ' ' + recipes.byKey(id.parse(name)).isPresent());
    });
    var dispatcher = p.server.getCommands().getDispatcher();
    var source = p.server.createCommandSourceStack().withSuppressedOutput();
    var held = [];
    for (var slot = 0; slot < 36; slot++) held.push(p.inventory.getItem(slot).copy());
    try {
      ['wares:chests/village/dark_forest_warehouse', 'wares:chests/village/plains_warehouse',
        'idas:chests/haunted_manor/if_haunted_manor', 'idas:chests/labyrinth/if_labyrinth_tomb'].forEach(name => {
        dispatcher.execute('clear ' + p.username, source);
        var count = dispatcher.execute('loot give ' + p.username + ' loot ' + name, source);
        var paper = 0;
        for (var slot = 0; slot < 36; slot++) {
          var stack = p.inventory.getItem(slot);
          if ('' + stack.id == 'minecraft:paper') paper += stack.count;
        }
        console.info('[GP-DEEP] LOOT ' + name + ' count=' + count + ' paper=' + paper);
      });
    } finally {
      held.forEach((stack, slot) => p.inventory.setItem(slot, stack));
    }
    gpDeepCheckLifecycle(p, held);
  });
});

function gpDeepCheckLifecycle(p, held) {
  var Hand = Java.loadClass('net.minecraft.world.InteractionHand');
  var Direction = Java.loadClass('net.minecraft.core.Direction');
  var Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3');
  var Hit = Java.loadClass('net.minecraft.world.phys.BlockHitResult');
  var Block = Java.loadClass('net.minecraft.world.level.block.Blocks');
  var pos = p.blockPosition().above(2);
  var level = p.level, previousBlock = level.getBlockState(pos);
  var data = p.persistentData;
  var saved = { god: data.getBoolean('gp_god'), found: data.getString('gp_found'),
    reward: data.getBoolean('gp_divine_blade_reward'), warmed: data.getBoolean('gp_nearby_warmup_started') };
  data.putBoolean('gp_god', false);
  data.putBoolean('gp_divine_blade_reward', true);
  data.putString('gp_found', GP_GODS.join(','));
  level.setBlockAndUpdate(pos, Block.LODESTONE.defaultBlockState());
  var hit = new Hit(Vec3.atCenterOf(pos), Direction.UP, pos, false);
  function useLodestone() {
    p.gameMode.useItemOn(p, level, Item.of('minecraft:air'), Hand.MAIN_HAND, hit);
    return gpActiveRituals.has('' + p.uuid);
  }
  var started = useLodestone();
  p.server.scheduleInTicks(40, () => {
    gpCancelRitual(p);
    console.info('[GP-DEEP] RITUAL_RESTART ' + (useLodestone() && started));
  });
  p.server.scheduleInTicks(270, () => {
    console.info('[GP-DEEP] RITUAL_OLD_TIMER_IGNORED ' + (!gpIsGod(p) && gpActiveRituals.has('' + p.uuid)));
  });
  p.server.scheduleInTicks(310, () => {
    console.info('[GP-DEEP] RITUAL_NEW_TIMER_COMPLETES ' + (gpIsGod(p) && !gpActiveRituals.has('' + p.uuid)));
    gpCancelRitual(p);
    level.setBlockAndUpdate(pos, previousBlock);
    data.putBoolean('gp_god', saved.god);
    data.putBoolean('gp_divine_blade_reward', saved.reward);
    data.putString('gp_found', saved.found);
    held.forEach((stack, slot) => p.inventory.setItem(slot, stack));
    if (gpChunkWarmup) gpFinishNearbyChunks('已停止');
    data.putBoolean('gp_nearby_warmup_started', false);
    var warmupStarted = gpStartNearbyChunks(p, 18, 1, true);
    gpFinishNearbyChunks('已停止');
    console.info('[GP-DEEP] WARMUP_CANCEL_RETRY ' + (warmupStarted &&
      !data.getBoolean('gp_nearby_warmup_started') && gpStartNearbyChunks(p, 18, 1, true)));
    gpDeepWatchWarmup(p, saved.warmed, 0);
  });
}

function gpDeepWatchWarmup(p, oldFlag, polls) {
  p.server.scheduleInTicks(20, () => {
    if (gpChunkWarmup && polls < 50) {
      gpDeepWatchWarmup(p, oldFlag, polls + 1);
      return;
    }
    console.info('[GP-DEEP] WARMUP_COMPLETED ' + (gpChunkWarmupResult.reason == '完成' &&
      gpChunkWarmupResult.prepared == 1 && p.persistentData.getBoolean('gp_nearby_warmup_started')));
    if (gpChunkWarmup) gpFinishNearbyChunks('已停止');
    p.persistentData.putBoolean('gp_nearby_warmup_started', oldFlag);
    console.info('[GP-DEEP] COMPLETE');
  });
}
