// Replay the game's actual attack/use mappings. Capture Curios through its own GUI.
var gpCompatClientTicks = 0;
var gpCompatMapping = null;
var gpCompatMC = Java.loadClass('net.minecraft.client.Minecraft');
var gpCompatKey = Java.loadClass('net.minecraft.client.KeyMapping');
var gpCompatEpic = Java.loadClass('yesman.epicfight.client.ClientEngine');
var gpCompatShot = Java.loadClass('net.minecraft.client.Screenshot');
var gpCompatApi = Java.loadClass('top.theillusivec4.curios.api.CuriosApi');
var gpCompatTexture = Java.loadClass('net.minecraft.world.inventory.InventoryMenu');
var gpCompatMissing = Java.loadClass('net.minecraft.client.renderer.texture.MissingTextureAtlasSprite');
var gpCompatPacket = Java.loadClass('top.theillusivec4.curios.common.network.client.CPacketOpenCurios');
var gpCompatNetwork = Java.loadClass('net.neoforged.neoforge.network.PacketDistributor');
var gpCompatTitleScreen = Java.loadClass('net.minecraft.client.gui.screens.TitleScreen');
var gpCompatCamera = Java.loadClass('net.minecraft.client.CameraType');
var gpCompatMenu = null;
var gpCompatLoadTicks = 0;

NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.client.event.ClientTickEvent$Post'), event => {
  var mc = gpCompatMC.getInstance();
  if (mc.player || !mc.screen) return;
  var name = ('' + mc.screen).split('@')[0];
  if (name != gpCompatMenu) {
    gpCompatMenu = name;
    console.info('[GP-COMPAT] MENU ' + name + ' ' + mc.screen.getTitle().getString());
  }
  if (mc.screen instanceof gpCompatTitleScreen && ++gpCompatLoadTicks == 40) {
    try {
      mc.createWorldOpenFlows().openWorld('GodPath4-Adventure', () => {
        console.error('[GP-COMPAT] World open returned to the menu');
      });
    } catch (error) {
      console.error('[GP-COMPAT] World open failed: ' + error);
    }
  }
});

function gpCompatCapture(mc, name) {
  gpCompatShot.grab(mc.gameDirectory, name, mc.getMainRenderTarget(),
    message => console.info('[GP-COMPAT] SCREENSHOT ' + name));
}

ClientEvents.tick(event => {
  var mc = gpCompatMC.getInstance();
  mc.options.pauseOnLostFocus = false;
  var n = ++gpCompatClientTicks;
  if (n < 100 || n > 720) return;
  if (n == 100) {
    mc.setScreen(null);
    var keys = mc.options.keyMappings;
    for (var j = 0; j < keys.length; j++) {
      if (keys[j].getKey().getValue() == 297 && '' + keys[j].getKey().getType() == 'KEYSYM') {
        console.info('[GP-COMPAT] KEY_F8 ' + keys[j].getName());
      }
    }
    mc.options.setCameraType(gpCompatCamera.FIRST_PERSON);
    mc.player.setXRot(-16);
    gpCompatEpic.getInstance().getPlayerPatch().toEpicFightMode(true);
    console.info('[GP-COMPAT] MODE before-equip epic=' + gpCompatEpic.getInstance().getPlayerPatch().isEpicFightMode());
  }
  var setup = {100: 'vanilla_right', 215: 'vanilla_left', 345: 'divine_right', 460: 'divine_left'};
  if (setup[n]) mc.player.sendData('gp_blade_compat_fixture', { stage: setup[n] });
  if (n == 123 || n == 368) {
    console.info('[GP-COMPAT] MODE ' + n + ' epic=' + gpCompatEpic.getInstance().getPlayerPatch().isEpicFightMode());
  }
  if (gpCompatMapping) {
    gpCompatMapping.setDown(false);
    gpCompatMapping = null;
  }
  if (n == 235 || n == 480) mc.player.sendData('gp_blade_compat_fixture', { stage: 'target' });
  var waves = [[130, 'right'], [245, 'left'], [375, 'right'], [490, 'left']];
  waves.forEach(wave => {
    var ticks = n - wave[0];
    if (ticks < 0 || ticks > 24 || ticks % 8 != 0) return;
    console.info('[GP-COMPAT] INPUT ' + n + ' ' + wave[1] +
      ' target=' + (mc.hitResult ? mc.hitResult.getType() : 'none'));
    gpCompatMapping = wave[1] == 'right' ? mc.options.keyUse : mc.options.keyAttack;
    gpCompatMapping.setDown(true);
    gpCompatKey.click(gpCompatMapping.getKey());
  });
  if (n == 385) gpCompatCapture(mc, '4.0.1-native-blade.png');
  if (n == 560) mc.player.sendData('gp_blade_compat_fixture', { stage: 'curios' });
  if (n == 575) {
    gpCompatNetwork.sendToServer(new gpCompatPacket(Item.of('minecraft:air')));
  }
  if (n == 610) {
    console.info('[GP-COMPAT] SCREEN ' + mc.screen);
    gpCompatCapture(mc, '4.0.1-curios-empty.png');
    ['godpath_divinity', 'godpath_relic'].forEach(id => {
      var icon = gpCompatApi.getSlot(id, mc.level).get().getIcon();
      var sprite = mc.getTextureAtlas(gpCompatTexture.BLOCK_ATLAS).apply(icon);
      console.info('[GP-COMPAT] SLOT ' + id + ' ' + icon + ' present=' +
        ('' + sprite.contents().name() != '' + gpCompatMissing.getLocation()));
    });
  }
  if (n == 625) {
    mc.setScreen(null);
  }
  if (n == 640) mc.player.sendData('godpath_blade_skill');
  if (n == 650) gpCompatCapture(mc, '4.0.1-blade-skill.png');
  if (n == 668) mc.options.keyShift.setDown(true);
  if (n == 674) mc.player.sendData('godpath_blade_skill');
  if (n == 680) mc.options.keyShift.setDown(false);
  if (n == 700) console.info('[GP-COMPAT] CLIENT_COMPLETE');
});
