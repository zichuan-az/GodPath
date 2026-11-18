const gpOrbitalMinecraft = Java.loadClass('net.minecraft.client.Minecraft');
let gpOrbitalScreenOpen = false;

KeyBindEvents.pressed('godpath_orbital_mode', event => {
  if ('' + event.player.getMainHandItem().id === 'godpath:orbital_cannon') {
    event.player.sendData('godpath_orbital_mode');
  }
});

ClientEvents.tick(() => {
  const client = gpOrbitalMinecraft.getInstance();
  const screenOpen = client.screen != null;
  if (screenOpen && !gpOrbitalScreenOpen && client.player &&
      '' + client.player.getMainHandItem().id === 'godpath:orbital_cannon') {
    client.player.sendData('godpath_orbital_cancel');
  }
  gpOrbitalScreenOpen = screenOpen;
});

ItemEvents.modifyTooltips(event => {
  event.add('godpath:orbital_cannon', [
    Text.translate('godpath.orbital.instruction'),
    Text.translate('godpath.orbital.key', Text.keybind('key.kubejs.godpath_orbital_mode'))
  ]);
});
