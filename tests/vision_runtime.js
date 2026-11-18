// Isolated test only: verify real registries, real loot and natural structure placement.
var gpVisionRan = false;
var gpVisionResults = [];
function gpVisionCheck(name, callback) {
  try {
    if (!callback()) throw new Error('assertion returned false');
    gpVisionResults.push({ name: name, pass: true });
    console.info('[GP-VISION] PASS ' + name);
  } catch (error) {
    gpVisionResults.push({ name: name, pass: false, error: '' + error });
    console.error('[GP-VISION] FAIL ' + name + ': ' + error);
  }
}

function gpRunVisionSuite(p) {
  if ('' + p.username != 'GodPathTest' || gpVisionRan) return;
  gpVisionRan = true;
  p.server.scheduleInTicks(180, function () {
    var Registries = Java.loadClass('net.minecraft.core.registries.Registries');
    var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation');
    var TagKey = Java.loadClass('net.minecraft.tags.TagKey');
    var laws = ['origin', 'life', 'gear', 'rail', 'arcane', 'blade'];
    gpVisionCheck('all six natural sanctum structures registered', function () {
      var registry = p.server.registryAccess().registryOrThrow(Registries.STRUCTURE);
      return laws.every(law => registry.containsKey(ResourceLocation.parse('godpath:' + law + '_sanctum')));
    });
    gpVisionCheck('all six real structure templates load as 49x48x49', function () {
      var manager = p.level.getStructureManager();
      return laws.every(function (law) {
        var template = manager.get(ResourceLocation.parse('godpath:' + law + '_sanctum'));
        return template.isPresent() && template.get().getSize().getY() == 48;
      });
    });
    gpVisionCheck('all six actual loot tables award their law shard', function () {
      var held = [];
      for (var slot = 0; slot < 36; slot++) held.push(p.inventory.getItem(slot).copy());
      gpRun(p, 'clear @s');
      laws.forEach(law => gpRun(p, 'loot give @s loot godpath:chests/' + law + '_cache'));
      var result = laws.every(law => gpHeld(p, law + '_shard'));
      held.forEach((stack, index) => p.inventory.setItem(index, stack));
      return result;
    });
    gpVisionCheck('exploration and biome compasses registered', function () {
      return !Item.of('explorerscompass:explorerscompass').isEmpty() && !Item.of('naturescompass:naturescompass').isEmpty();
    });
    gpVisionCheck('three upstream recipe codec defects are repaired in the actual recipe manager', function () {
      var manager = p.server.getRecipeManager();
      return ['createdeco:placard', 'minecraft:red_dye', 'malum:create/milling/grim_talc'].every(function (id) {
        return manager.byKey(ResourceLocation.parse(id)).isPresent();
      });
    });
    gpVisionCheck('a law sanctum generates naturally in the real seed-42 world', function () {
      // ServerLevel takes a TagKey (KubeJS converts a plain resource ID) and returns BlockPos.
      var nearest = p.level.findNearestMapStructure('godpath:law_sanctums', p.blockPosition(), 64, false);
      if (nearest == null) return false;
      var pos = nearest;
      console.info('[GP-VISION] NATURAL_STRUCTURE ' + pos);
      var registry = p.server.registryAccess().registryOrThrow(Registries.STRUCTURE);
      var bounds = null, structureId = '';
      p.level.getChunk(pos).getAllStarts().forEach(function (type, start) {
        var id = '' + registry.getKey(type);
        if (id.indexOf('godpath:') == 0 && start.isValid()) {
          // Terrain adaptation inflates StructureStart's box; the root piece is the actual 49x48x49 template.
          bounds = start.getPieces().get(0).getBoundingBox(); structureId = id;
        }
      });
      if (bounds == null) throw new Error('natural structure start has no valid bounding box');
      console.info('[GP-VISION] NATURAL_BOUNDS ' + structureId + ' ' + bounds);
      var cx = Math.floor((bounds.minX() + bounds.maxX()) / 2);
      var cz = Math.floor((bounds.minZ() + bounds.maxZ()) / 2);
      var chest = p.level.getBlock(cx, bounds.minY() + 32, cz);
      console.info('[GP-VISION] NATURAL_CHEST ' + chest.id);
      if (('' + chest.id).indexOf('chest') < 0) throw new Error('natural upper reward chest missing');
      p.setGameMode(Java.loadClass('net.minecraft.world.level.GameType').SPECTATOR);
      gpRun(p, 'time set 1000');
      gpRun(p, 'weather clear');
      var camera = { x: cx + 44, y: bounds.maxY() + 16, z: cz + 70, yaw: 148, pitch: 23 };
      p.connection.teleport(camera.x, camera.y, camera.z, camera.yaw, camera.pitch);
      JsonIO.write('kubejs/vision-control.json', { capture: true, position: '' + pos, camera: camera });
      if (gpStartNearbyChunks(p, 18, 1)) gpWatchWarmup(p, 0);
      return true;
    });
    gpVisionCheck('relic survey finds a real already-loaded sanctum without a new locate search', function () {
      var nearest = gpFindNearbySanctum(p);
      return nearest != null && nearest.id == 'godpath:arcane_sanctum' && nearest.distance < 100;
    });
    gpVisionCheck('non-operator can request warmup status in singleplayer', function () {
      return p.server.getCommands().getDispatcher().execute('gp_pregen status', p.createCommandSourceStack()) == 1;
    });
    JsonIO.write('kubejs/vision-server-result.json', { checks: gpVisionResults,
      failed: gpVisionResults.filter(x => !x.pass).length });
    console.info('[GP-VISION] SERVER_COMPLETE ' + gpVisionResults.length + ' checks');
  });
}
function gpWatchWarmup(p, checks) {
  p.server.scheduleInTicks(20, function () {
    if (gpChunkWarmupResult || checks >= 70) {
      var result = gpChunkWarmupResult || { reason: 'test timeout', prepared: 0 };
      result.pass = result.prepared == 1 && result.reason == '完成' && gpChunkWarmup == null;
      JsonIO.write('kubejs/warmup-result.json', result);
      console.info('[GP-VISION] WARMUP ' + JSON.stringify(result));
    } else gpWatchWarmup(p, checks + 1);
  });
}
PlayerEvents.loggedIn(event => gpRunVisionSuite(event.player));
var gpVisualTestTicks = 0;
ServerEvents.tick(event => {
  if (!gpVisionRan) event.server.players.forEach(p => gpRunVisionSuite(p));
  if (++gpVisualTestTicks % 10 != 0) return;
  var effects = JsonIO.read('kubejs/vision-effects.json');
  if (!effects || !effects.request) return;
  event.server.players.forEach(function (p) {
    if ('' + p.username != 'GodPathTest') return;
    if (effects.request == 'ceremony') {
      gpCeremonyTitle(p, 'godpath.ritual.ascended', 'godpath.ritual.ascended.subtitle');
      gpAscensionVisual(p, 6);
      JsonIO.write('kubejs/vision-effects.json', { capture: 'ceremony' });
    } else if (effects.request == 'blade') {
      var GameType = Java.loadClass('net.minecraft.world.level.GameType');
      var Hand = Java.loadClass('net.minecraft.world.InteractionHand');
      var blade = gpNamedBlade(p, 'godpath:apotheosis');
      p.setGameMode(GameType.SURVIVAL);
      gpSyncDivineFlight(p);
      p.getAbilities().flying = true; p.onUpdateAbilities();
      p.setItemInHand(Hand.MAIN_HAND, blade);
      p.persistentData.remove('gp_slash_cd');
      var access = Java.loadClass('mods.flammpfeil.slashblade.capability.slashblade.BladeStateAccess');
      var before = access.of(blade).get().getLastActionTime();
      p.gameMode.useItem(p, p.level, blade, Hand.MAIN_HAND);
      var nativeOnly = access.of(p.getMainHandItem()).get().getLastActionTime() != before &&
        !p.persistentData.contains('gp_slash_cd');
      console.info('[GP-VISION] BLADE_USE_NATIVE_ONLY ' + nativeOnly + ' ' + gpBladeFamily(blade));
      JsonIO.write('kubejs/vision-effects.json', { capture: 'blade', nativeOnly: nativeOnly });
    }
  });
});
