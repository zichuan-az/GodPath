if (Platform.isLoaded('slashblade')) {
  var gpEmptySwingBlade = Java.loadClass('mods.flammpfeil.slashblade.item.ItemSlashBlade');
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$LeftClickEmpty'), event => {
    var player = event.getEntity();
    if (player.isSpectator() || player.isUsingItem()) return;
    if (player.getMainHandItem().getItem() instanceof gpEmptySwingBlade) {
      player.sendData('godpath_blade_empty_swing');
    }
  });
}
