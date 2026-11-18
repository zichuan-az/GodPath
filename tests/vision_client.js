// Isolated render verification using Minecraft's own screenshot API.
var gpVisionClientTicks = 0;
var gpVisionCaptureStage = 0;
var gpVisionStageTicks = 0;
var gpVisionClientResults = [];
var gpVisionCamera = null;
var gpEffectCaptureWait = 0;

function gpVisionClientCheck(name, callback) {
  try {
    if (!callback()) throw new Error('assertion returned false');
    gpVisionClientResults.push({ name: name, pass: true });
    console.info('[GP-VISION] PASS ' + name);
  } catch (error) {
    gpVisionClientResults.push({ name: name, pass: false, error: '' + error });
    console.error('[GP-VISION] FAIL ' + name + ': ' + error);
  }
}

function gpVisionScreenshot(mc, name) {
  Java.loadClass('net.minecraft.client.Screenshot').grab(mc.gameDirectory, name,
    mc.getMainRenderTarget(), message => console.info('[GP-VISION] SCREENSHOT ' + name));
}

ClientEvents.tick(event => {
  var mc = Java.loadClass('net.minecraft.client.Minecraft').getInstance();
  // The isolated window is intentionally not focused during automated render checks.
  mc.options.pauseOnLostFocus = false;
  if (gpVisionCaptureStage < 2 && mc.screen) {
    mc.setScreen(null);
  }
  if (++gpVisionClientTicks == 160) {
    gpVisionClientCheck('simplified Chinese selected', () => '' + mc.getLanguageManager().getSelected() == 'zh_cn');
    gpVisionClientCheck('Cozy and Chinese resource packs selected', function () {
      var ids = '' + mc.getResourcePackRepository().getSelectedIds();
      console.info('[GP-VISION] RESOURCE_PACKS ' + ids);
      return ids.indexOf('CozyUI+') >= 0 && ids.indexOf('GodPath-zh_cn') >= 0 && ids.indexOf('GodPath-Cozy') >= 0;
    });
    gpVisionClientCheck('MakeUp shader actually active', function () {
      return Java.loadClass('net.irisshaders.iris.api.v0.IrisApi').getInstance().isShaderPackInUse();
    });
    gpVisionClientCheck('Chinese menu override resolved', function () {
      return ('' + Java.loadClass('net.minecraft.network.chat.Component').translatable('menu.singleplayer').getString()).indexOf('启程') >= 0;
    });
    gpVisionClientCheck('Chinese Curios labels and ascension title resolve exactly', function () {
      var text = Java.loadClass('net.minecraft.network.chat.Component');
      return '' + text.translatable('curios.identifier.godpath_relic').getString() == '神物' &&
        '' + text.translatable('curios.identifier.godpath_divinity').getString() == '神格' &&
        '' + text.translatable('godpath.ritual.ascended').getString() == '神格降临';
    });
  }
  if (gpVisionCaptureStage == 0 && gpVisionClientTicks % 40 == 0) {
    var control = JsonIO.read('kubejs/vision-control.json');
    if (control && control.capture) {
      mc.setScreen(null);
      mc.options.hideGui = true;
      gpVisionCamera = control.camera;
      gpVisionCaptureStage = 1;
    }
  }
  if (gpVisionCaptureStage == 0) return;
  if (gpVisionCaptureStage == 1 && gpVisionCamera) {
    mc.player.setYRot(gpVisionCamera.yaw);
    mc.player.setXRot(gpVisionCamera.pitch);
  }
  gpVisionStageTicks++;
  if (gpVisionCaptureStage == 1 && gpVisionStageTicks >= 400) {
    gpVisionScreenshot(mc, 'GodPath4-world.png');
    mc.options.hideGui = false;
    mc.setScreen(new (Java.loadClass('net.minecraft.client.gui.screens.TitleScreen'))());
    gpVisionCaptureStage = 2; gpVisionStageTicks = 0;
  } else if (gpVisionCaptureStage == 2 && gpVisionStageTicks >= 60) {
    gpVisionScreenshot(mc, 'GodPath4-menu.png');
    mc.setScreen(new (Java.loadClass('net.minecraft.client.gui.screens.inventory.InventoryScreen'))(mc.player));
    gpVisionCaptureStage = 3; gpVisionStageTicks = 0;
  } else if (gpVisionCaptureStage == 3 && gpVisionStageTicks >= 60) {
    gpVisionScreenshot(mc, 'GodPath4-inventory.png');
    mc.setScreen(null);
    gpVisionCaptureStage = 4;
    gpVisionStageTicks = 0;
    JsonIO.write('kubejs/vision-client-result.json', { checks: gpVisionClientResults,
      failed: gpVisionClientResults.filter(x => !x.pass).length });
    console.info('[GP-VISION] CLIENT_COMPLETE');
    JsonIO.write('kubejs/vision-effects.json', { request: 'ceremony' });
  } else if (gpVisionCaptureStage >= 4 && gpVisionCaptureStage <= 5) {
    var effects = JsonIO.read('kubejs/vision-effects.json');
    var wanted = gpVisionCaptureStage == 4 ? 'ceremony' : 'blade';
    if (effects && effects.capture == wanted && ++gpEffectCaptureWait >= 9) {
      gpVisionScreenshot(mc, 'GodPath4-' + wanted + '.png');
      gpVisionCaptureStage++;
      gpVisionStageTicks = 0;
      gpEffectCaptureWait = 0;
      JsonIO.write('kubejs/vision-effects.json', {});
    } else if (gpVisionCaptureStage == 5 && gpVisionStageTicks == 130) {
      JsonIO.write('kubejs/vision-effects.json', { request: 'blade' });
    }
  }
});
