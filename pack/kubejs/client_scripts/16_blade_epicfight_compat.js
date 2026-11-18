if (Platform.isLoaded('epicfight') && Platform.isLoaded('slashblade')) {
  var gpEpicBladeEngine = Java.loadClass('yesman.epicfight.client.ClientEngine');
  var gpEpicNativeBlade = Java.loadClass('mods.flammpfeil.slashblade.item.ItemSlashBlade');

  ClientEvents.tick(event => {
    if (!(event.player.getMainHandItem().getItem() instanceof gpEpicNativeBlade)) return;
    var patch = gpEpicBladeEngine.getInstance().getPlayerPatch();
    if (patch && patch.isEpicFightMode()) patch.toVanillaMode(true);
  });
}
