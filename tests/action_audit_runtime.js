// Test-only fixture: isolated GodPathTest save, never included in pack/.
var gpActionState = Java.loadClass('mods.flammpfeil.slashblade.capability.slashblade.BladeStateAccess');
var gpActionHand = Java.loadClass('net.minecraft.world.InteractionHand');
var gpActionMode = Java.loadClass('net.minecraft.world.level.GameType');
var gpActionLast = null;
PlayerEvents.loggedIn(event => {
  var p = event.player;
  if ('' + p.username != 'GodPathTest') return;
  event.server.scheduleInTicks(80, () => {
    p.setGameMode(gpActionMode.SURVIVAL);
    p.setItemInHand(gpActionHand.MAIN_HAND, gpNamedBlade(p, 'slashblade:yamato'));
    p.getInventory().setItem(1, Item.of('minecraft:iron_sword'));
    p.getInventory().setItem(2, gpNamedBlade(p, 'godpath:apotheosis'));
    p.setHealth(p.getMaxHealth());
    gpRun(p, 'fill -8 198 -8 8 199 8 minecraft:stone');
    gpRun(p, 'fill -8 200 -8 8 210 8 minecraft:air');
    gpRun(p, 'tp @s 0.5 200 0.5 0 0');
    gpRun(p, 'time set noon');
    gpRun(p, 'weather clear');
    console.info('[GP-ACTION] READY: slot1 yamato, slot2 iron sword, slot3 apotheosis');
  });
});
PlayerEvents.tick(event => {
  var p = event.player;
  if ('' + p.username != 'GodPathTest') return;
  var state = gpActionState.of(p.getMainHandItem());
  var current = state.isPresent() ? ('' + p.getMainHandItem().id + ' ' + state.get().getLastActionTime() + ' ' + state.get().getComboSeq()) : ('' + p.getMainHandItem().id);
  if (current != gpActionLast) {
    gpActionLast = current;
    console.info('[GP-ACTION] STATE ' + current);
  }
});
