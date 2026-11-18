var gpCompatMC = Java.loadClass('net.minecraft.client.Minecraft');
var gpCompatKey = Java.loadClass('net.minecraft.client.KeyMapping');
var gpCompatShot = Java.loadClass("net.minecraft.client.Screenshot");
function gpCompatCapture(mc, name) {
  gpCompatShot.grab(mc.gameDirectory, name, mc.getMainRenderTarget(),
    message => console.info('[GP-COMPAT] SCREENSHOT ' + name));
}


var gpReleaseTick = 0;
var gpReleaseInput = null;
var gpReleaseMode = '';
NetworkEvents.dataReceived('gp_orbital_fixture_ready', event => {
  gpReleaseInput = 0;
  gpReleaseMode = '' + event.data.getString('mode');
});
ClientEvents.tick(event => {
  var mc = gpCompatMC.getInstance();
  mc.options.pauseOnLostFocus = false;
  if (!mc.player || mc.screen || mc.player.getGameProfile().getName() !== 'GodPathTest') return;
  var n = ++gpReleaseTick;
  var modes = ['entities','terrain','locked'];
  var stage = n - 120;
  if (stage >= 0 && stage < 3 * 600 && stage % 600 == 0) mc.getConnection().sendCommand('gp_orbital_test ' + modes[Math.floor(stage/600)]);
  if (gpReleaseInput == null) return;
  var phase = ++gpReleaseInput;
  var use = mc.options.keyUse;
  if (phase === 10) {
    mc.setCameraEntity(mc.player);
    mc.player.setYRot(180);
    mc.player.setXRot(4);
  }
  if ((phase === 14 && gpReleaseMode === 'entities') || phase === 54) {
    use.setDown(true);
    gpCompatKey.click(use.getKey());
    console.info('[GP-COMPAT] NATIVE KEY ' + gpReleaseMode + ' ' + phase + ' target=' + mc.hitResult);
  }
  var holdingShort = gpReleaseMode === 'entities' && phase > 14 && phase < 34;
  var holdingLong = phase > 54 && phase < 145;
  if (holdingShort || holdingLong) use.setDown(true);
  if (phase === 34 || phase === 145) use.setDown(false);
  if (phase === 94 || phase === 116 || phase === 125 || phase === 240) gpCompatCapture(mc, '4.1-verified-orbital-' + gpReleaseMode + '-' + phase + '.png');
  if (phase === 245) gpReleaseInput = null;
});
