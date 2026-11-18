// Test fixture only. Installed in build/playtest, never shipped in pack/.
var gpRuntimeResults = [];
var gpRuntimeRan = false;
function runtimeCheck(name, callback) {
  try {
    if (!callback()) throw new Error('assertion returned false');
    gpRuntimeResults.push({ name: name, pass: true });
    console.info('[GP-TEST] PASS ' + name);
  } catch (error) {
    gpRuntimeResults.push({ name: name, pass: false, error: '' + error });
    console.error('[GP-TEST] FAIL ' + name + ': ' + error);
  }
}

ServerEvents.loaded(event => console.info('[GP-TEST] SERVER_LOADED'));

function gpRunRuntimeSuite(p) {
  if (gpRuntimeRan) return;
  if ('' + p.username != 'GodPathTest') return;
  gpRuntimeRan = true;
  var server = p.server;
  server.scheduleInTicks(60, function () {
    p.setGameMode(Java.loadClass('net.minecraft.world.level.GameType').CREATIVE);
    // Crop fixtures need daylight even if a previous diagnostic left the player underground.
    gpRun(p, 'tp @s ~ 250 ~');
    p.persistentData.putBoolean('gp_god', false);
    gpCuriosInventory(p).setEquippedCurio('godpath_divinity', 0, Item.of('minecraft:air'));
    runtimeCheck('server-side player detection', () => gpIsServer(p));
    runtimeCheck('test player has no command permission', () => !p.hasPermissions(2));
    runtimeCheck('all 24 relic items registered', () => GP_GODS.every(id => !Item.of('godpath:' + id).isEmpty()));
    runtimeCheck('Chinese adventure book component is valid and delivered only once', function () {
      gpRun(p, 'clear @s');
      p.persistentData.putBoolean('gp_guide_4', false);
      if (!gpGiveAdventureGuide(p) || gpGiveAdventureGuide(p)) return false;
      for (var slot = 0; slot < 36; slot++) {
        if (gpIdIs(p.inventory.getItem(slot), 'minecraft:written_book')) return true;
      }
      return false;
    });
    runtimeCheck('arcane page applies a compatible real enchantment and respects cooldown', function () {
      p.persistentData.remove('gp_page_enchant');
      var target = Item.of('minecraft:iron_sword');
      var result = gpApplyPageEnchant(p, target);
      var helper = Java.loadClass('net.minecraft.world.item.enchantment.EnchantmentHelper');
      return result != null && helper.getEnchantmentsForCrafting(target).getLevel(result.holder) == result.level &&
        gpApplyPageEnchant(p, Item.of('minecraft:iron_sword')) == null;
    });
    runtimeCheck('ordinary command context grants item', function () {
      gpRun(p, 'clear @s');
      gpRun(p, 'give @s godpath:world_seed');
      return gpHeld(p, 'world_seed');
    });
    runtimeCheck('1.21.1 attribute holder conversion and command', function () {
      gpEnsureAttribute(p, 'minecraft:generic.attack_damage', 'godpath:runtime_probe', 3);
      return p.getAttribute('minecraft:generic.attack_damage').getModifier('godpath:runtime_probe').amount() == 3;
    });
    runtimeCheck('effect command applies regeneration', function () {
      gpRun(p, 'effect give @s minecraft:regeneration 10 1 true');
      return p.hasEffect('minecraft:regeneration');
    });
    runtimeCheck('progress and six laws unlock', function () {
      gpSetList(p, []);
      GP_GODS.forEach(id => gpAddGod(p, id));
      return gpCount(p) == 24 && Object.keys(GP_LAWS).every(law => gpLawDone(p, law));
    });
    runtimeCheck('ascension grants divinity and exact permanent health', function () {
      doAscend(p);
      return gpIsGod(p) && gpHeld(p, 'divinity_mark') &&
        p.getAttribute('minecraft:generic.max_health').getModifier('godpath:divine_hp').amount() == 180;
    });
    runtimeCheck('repeating ascension gives no duplicate rewards', function () {
      var before = gpHeldCount(p, 'divinity_mark');
      doAscend(p);
      return before == 1 && gpHeldCount(p, 'divinity_mark') == 1;
    });
    runtimeCheck('lost attributes restore without repeating rewards', function () {
      gpRemoveAttribute(p, 'minecraft:generic.max_health', 'godpath:divine_hp');
      gpApplyDivinity(p);
      return p.getAttribute('minecraft:generic.max_health').getModifier('godpath:divine_hp') != null && gpHeldCount(p, 'divinity_mark') == 1;
    });
    runtimeCheck('blade tier equip and unequip changes real attributes', function () {
      bladeApplyTier(p, 4);
      var on = p.getAttribute('minecraft:generic.attack_damage').getModifier('godpath:blade_t4').amount() == 16;
      bladeApplyTier(p, 0);
      return on && p.getAttribute('minecraft:generic.attack_damage').getModifier('godpath:blade_t4') == null;
    });
    runtimeCheck('first cooldown activates and immediate second use is blocked', function () {
      p.persistentData.remove('runtime_cd');
      return gpCooldown(p, 'runtime_cd', 60) == 0 && gpCooldown(p, 'runtime_cd', 60) > 0;
    });
    runtimeCheck('crop acceleration changes a real crop block locally', function () {
      var x = Math.floor(p.x) + 4, y = Math.floor(p.y), z = Math.floor(p.z);
      p.level.getBlock(x, y - 1, z).set('minecraft:farmland');
      var crop = p.level.getBlock(x, y, z);
      crop.set('minecraft:wheat', { age: '1' });
      var result = gpGrowCrops(p, 8) > 0 && '' + p.level.getBlock(x, y, z).properties.age == '7';
      crop.set('minecraft:air');
      return result;
    });
    runtimeCheck('Farmer Delight real tomato rice and panicle blocks mature at age 3', function () {
      var x = Math.floor(p.x) + 5, y = Math.floor(p.y), z = Math.floor(p.z);
      // Rice panicles require the lower rice block; farmland alone breaks them on updates.
      var fixtures = [
        [x, y, z, 'farmersdelight:tomatoes'],
        [x, y, z + 2, 'farmersdelight:rice'],
        [x, y + 1, z + 2, 'farmersdelight:rice_panicles']
      ];
      p.level.getBlock(x, y - 1, z).set('minecraft:farmland');
      p.level.getBlock(x, y - 1, z + 2).set('minecraft:dirt');
      fixtures.forEach(f => p.level.getBlock(f[0], f[1], f[2]).set(f[3], { age: '1' }));
      gpGrowCrops(p, 8);
      var ok = fixtures.every(function (f) {
        var crop = p.level.getBlock(f[0], f[1], f[2]);
        console.info('[GP-TEST] CROP_STATE ' + crop.id + ' ' + crop.properties);
        return '' + crop.id == f[3] && '' + crop.properties.age == '3';
      });
      fixtures.reverse().forEach(f => p.level.getBlock(f[0], f[1], f[2]).set('minecraft:air'));
      return ok;
    });
    runtimeCheck('area damage hurts a real enemy and spares a nearby animal', function () {
      var enemy = p.level.createEntity('minecraft:zombie');
      var animal = p.level.createEntity('minecraft:cow');
      enemy.setPos(p.x + 3, p.y, p.z);
      animal.setPos(p.x + 3, p.y, p.z + 1);
      enemy.setNoAi(true);
      p.level.addFreshEntity(enemy);
      p.level.addFreshEntity(animal);
      var enemyHealth = enemy.getHealth(), animalHealth = animal.getHealth();
      var hits = gpDamageNearby(p, 8, 5, false);
      console.info('[GP-TEST] DAMAGE_STATE hits=' + hits + ' enemy=' + enemyHealth + '->' + enemy.getHealth() +
        ' animal=' + animalHealth + '->' + animal.getHealth());
      var result = hits > 0 && enemy.getHealth() < enemyHealth && animal.getHealth() == animalHealth;
      enemy.discard(); animal.discard();
      return result;
    });
    var failed = gpRuntimeResults.filter(x => !x.pass).length;
    console.info('[GP-TEST] COMPLETE ' + gpRuntimeResults.length + ' checks, ' + failed + ' failed');
    JsonIO.write('kubejs/godpath-test-result.json', { checks: gpRuntimeResults, failed: failed });
  });
}

PlayerEvents.loggedIn(event => gpRunRuntimeSuite(event.player));
// Isolated-test control bridge: fixed reload/save operations only, no arbitrary commands.
var gpRuntimeControlTicks = 0;
ServerEvents.tick(event => {
  if (++gpRuntimeControlTicks % 20 != 0) return;
  var control = JsonIO.read('kubejs/runtime-control.json');
  if (control && control.reload) {
    JsonIO.write('kubejs/runtime-control.json', { reload: false });
    event.server.runCommandSilent('kubejs reload server-scripts');
    return;
  }
  if (control && control.save) {
    JsonIO.write('kubejs/runtime-control.json', { save: false });
    event.server.runCommandSilent('save-all flush');
    console.info('[GP-TEST] WORLD_SAVED');
  }
  if (control && control.resources) {
    JsonIO.write('kubejs/runtime-control.json', { resources: false });
    event.server.runCommandSilent('reload');
    console.info('[GP-TEST] DATAPACK_RELOAD_REQUESTED');
  }
  if (!gpRuntimeRan) event.server.players.forEach(p => gpRunRuntimeSuite(p));
});
