// Isolated real-engine integration tests. Never included in a release.
var gpApotheosisRan = false;
var gpApotheosisResults = [];
function gpApotheosisCheck(name, callback) {
  try {
    if (!callback()) throw new Error('assertion returned false');
    gpApotheosisResults.push({ name: name, pass: true });
    console.info('[GP-APOTHEOSIS] PASS ' + name);
  } catch (error) {
    gpApotheosisResults.push({ name: name, pass: false, error: '' + error });
    console.error('[GP-APOTHEOSIS] FAIL ' + name + ': ' + error);
  }
}
function gpRunApotheosisSuite(p) {
  if (gpApotheosisRan || '' + p.username != 'GodPathTest') return;
  gpApotheosisRan = true;
  p.server.scheduleInTicks(110, function () {
    var Curios = Java.loadClass('top.theillusivec4.curios.api.CuriosApi');
    var SlotContext = Java.loadClass('top.theillusivec4.curios.api.SlotContext');
    var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation');
    var State = Java.loadClass('mods.flammpfeil.slashblade.capability.slashblade.BladeStateAccess');
    var inventory = gpCuriosInventory(p);
    gpApotheosisCheck('six actual relic slots and one divinity slot are attached to the player', function () {
      return inventory.getStacksHandler('godpath_relic').get().getSlots() == 6 &&
        inventory.getStacksHandler('godpath_divinity').get().getSlots() == 1;
    });
    gpApotheosisCheck('all 24 relics validate for equipment and divinity uses its own slot', function () {
      var context = new SlotContext('godpath_relic', p, 0, false, true);
      var godContext = new SlotContext('godpath_divinity', p, 0, false, true);
      return GP_GODS.every(id => Curios.isStackValid(context, Item.of('godpath:' + id))) &&
        Curios.isStackValid(godContext, Item.of('godpath:divinity_mark')) &&
        !Curios.isStackValid(context, Item.of('godpath:divinity_mark'));
    });
    gpApotheosisCheck('equipped relic works after removal from backpack and real set modifiers clear on unequip', function () {
      gpRun(p, 'clear @s godpath:world_seed');
      GP_LAWS.origin.forEach((id, slot) => inventory.setEquippedCurio('godpath_relic', slot, Item.of('godpath:' + id)));
      gpApplyResonance(p);
      var yes = gpHeld(p, 'world_seed') && gpOwnedRelics(p).world_seed &&
        p.getAttribute('minecraft:generic.armor').getModifier('godpath:resonance_origin_armor').amount() == 12 &&
        p.getAttribute('minecraft:generic.armor_toughness').getModifier('godpath:resonance_origin_toughness').amount() == 8;
      for (var i = 0; i < 6; i++) inventory.setEquippedCurio('godpath_relic', i, Item.of('minecraft:air'));
      gpApplyResonance(p);
      return yes && !gpHeld(p, 'world_seed') &&
        p.getAttribute('minecraft:generic.armor').getModifier('godpath:resonance_origin_armor') == null;
    });
    gpApotheosisCheck('all 19 native named blades produce real SlashBlade state and 18 recipes load', function () {
      var good = true;
      Object.keys(GP_LAWS).forEach(function (law) {
        for (var tier = 1; tier <= 3; tier++) {
          var id = 'godpath:' + law + '_' + tier;
          var stack = gpNamedBlade(p, id), state = State.of(stack);
          if (stack.isEmpty() || !state.isPresent() ||
              !p.server.getRecipeManager().byKey(ResourceLocation.parse('godpath:blades/' + law + '_' + tier)).isPresent()) good = false;
        }
      });
      var divine = State.of(gpNamedBlade(p, 'godpath:apotheosis')).get();
      console.info('[GP-APOTHEOSIS] DIVINE_BLADE ' + divine.getTranslationKey() + ' attack=' + divine.getBaseAttackModifier());
      return good && divine.getBaseAttackModifier() == 120;
    });
    gpApotheosisCheck('all 12 advanced native recipes reject an untrained blade and accept the required mastery', function () {
      var Input = Java.loadClass('net.minecraft.world.item.crafting.CraftingInput');
      var List = Java.loadClass('java.util.ArrayList');
      return Object.keys(GP_LAWS).every(function (law) {
        return [2, 3].every(function (tier) {
          var id = law + '_' + tier;
          var recipe = JsonIO.read('kubejs/data/godpath/recipe/blades/' + id + '.json');
          var items = new List();
          var blade = gpNamedBlade(p, 'godpath:' + law + '_' + (tier - 1));
          for (var slot = 0; slot < 9; slot++) {
            var symbol = recipe.pattern[Math.floor(slot / 3)].charAt(slot % 3);
            items.add(symbol == 'B' ? blade : Item.of(recipe.key[symbol].item));
          }
          var nativeRecipe = p.server.getRecipeManager().byKey(ResourceLocation.parse('godpath:blades/' + id)).get().value();
          if (nativeRecipe.matches(Input.of(3, 3, items), p.level)) return false;
          var state = State.of(blade).get(), request = recipe.key.B.request;
          state.setKillCount(request.kill); state.setRefine(request.refine); state.setProudSoulCount(request.proud_soul);
          if (!nativeRecipe.matches(Input.of(3, 3, items), p.level)) throw new Error(id + ' does not accept trained blade');
          return true;
        });
      });
    });
    gpApotheosisCheck('ascension armament is an actual named blade and is awarded exactly once', function () {
      gpRun(p, 'clear @s');
      p.persistentData.putBoolean('gp_divine_blade_reward', false);
      var first = gpGrantDivineArmament(p), second = gpGrantDivineArmament(p);
      var count = 0;
      for (var i = 0; i < 36; i++) if (gpIdIs(p.inventory.getItem(i), 'slashblade:slashblade')) count += p.inventory.getItem(i).count;
      return first && !second && count == 1;
    });
    gpApotheosisCheck('survival player has real flight without operator permissions', function () {
      p.setGameMode(Java.loadClass('net.minecraft.world.level.GameType').SURVIVAL);
      gpSyncDivineFlight(p);
      p.getAbilities().flying = true; p.onUpdateAbilities();
      return !p.isCreative() && !p.isSpectator() && !p.hasPermissions(2) && p.getAbilities().mayfly;
    });
    gpApotheosisCheck('ordinary fatal damage void damage and the real kill command cannot kill a god', function () {
      p.setHealth(p.getMaxHealth());
      var before = p.getHealth();
      gpRun(p, 'damage @s 1000000 minecraft:magic');
      gpRun(p, 'damage @s 1000000 minecraft:out_of_world');
      p.server.runCommandSilent('kill GodPathTest');
      return p.isAlive() && p.getHealth() == before && p.deathTime == 0;
    });
    gpApotheosisCheck('death-event fallback restores health even when ordinary damage handling is bypassed', function () {
      p.setHealth(0);
      p.die(p.damageSources().genericKill());
      return p.isAlive() && p.getHealth() == p.getMaxHealth();
    });
    // Leave real items in the test inventory for a visual icon and equipment check.
    gpRun(p, 'clear @s');
    GP_GODS.forEach(id => p.give(Item.of('godpath:' + id)));
    p.give(Item.of('godpath:divinity_mark'));
    Object.keys(GP_LAWS).forEach(law => p.give(gpNamedBlade(p, 'godpath:' + law + '_3')));
    p.give(gpNamedBlade(p, 'godpath:apotheosis'));
    inventory.setEquippedCurio('godpath_divinity', 0, Item.of('godpath:divinity_mark'));
    JsonIO.write('kubejs/apotheosis-result.json', { checks: gpApotheosisResults,
      failed: gpApotheosisResults.filter(x => !x.pass).length });
    console.info('[GP-APOTHEOSIS] COMPLETE');
  });
}
PlayerEvents.loggedIn(event => gpRunApotheosisSuite(event.player));
ServerEvents.tick(event => {
  if (!gpApotheosisRan) event.server.players.forEach(p => gpRunApotheosisSuite(p));
});
