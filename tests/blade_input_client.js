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
  if (gpCompatMapping) { gpCompatMapping.setDown(false); gpCompatMapping = null; }
  if (n < 180 || n > 1050) return;
  var stages = ['vanilla_air', 'vanilla_left', 'vanilla_right', 'divine_air', 'divine_left', 'divine_right'];
  var index = Math.floor((n - 180) / 140), phase = (n - 180) % 140;
  if (index >= stages.length) { if (n == 1020) console.info('[GP-INPUT] COMPLETE'); return; }
  var stage = stages[index];
  if (phase == 0) {
    mc.setScreen(null);
    mc.options.setCameraType(index < 3 ? gpCompatCamera.FIRST_PERSON : gpCompatCamera.THIRD_PERSON_BACK);
    mc.player.setXRot(0); mc.player.setYRot(0);
    gpCompatEpic.getInstance().getPlayerPatch().toEpicFightMode(true);
    mc.player.sendData('gp_blade_compat_fixture', {stage:stage});
    console.info('[GP-INPUT] STAGE ' + stage);
  }
  if (phase == 25 && stage.endsWith('_left')) mc.player.sendData('gp_blade_compat_fixture', {stage:'target'});
  if (phase >= 40 && phase <= 64 && phase % 8 == 0) {
    console.info('[GP-INPUT] CLICK ' + stage + ' target=' + mc.hitResult.getType() + ' epic=' + gpCompatEpic.getInstance().getPlayerPatch().isEpicFightMode());
    gpCompatMapping = stage.endsWith('_right') ? mc.options.keyUse : mc.options.keyAttack;
    gpCompatMapping.setDown(true); gpCompatKey.click(gpCompatMapping.getKey());
  }
  if (phase == 50) gpCompatCapture(mc, '4.1-' + stage + '.png');
});
