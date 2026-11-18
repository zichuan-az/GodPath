var gpNativeSwingBladeType = null;

NetworkEvents.dataReceived('godpath_blade_empty_swing', event => {
  var player = event.player;
  if (!player || !player.isAlive() || player.isSpectator() || player.isUsingItem()) return;
  var stack = player.getMainHandItem();
  if (!gpNativeSwingBladeType) gpNativeSwingBladeType = Java.loadClass('mods.flammpfeil.slashblade.item.ItemSlashBlade');
  if (stack.isEmpty() || !(stack.getItem() instanceof gpNativeSwingBladeType)) return;
  if (gpCooldown(player, 'gp_native_swing_cd', 2) > 0) return;
  stack.getItem().onLeftClickEntity(stack, player, player);
});
