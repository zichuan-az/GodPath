// Installed only in the isolated game instance. Observes the actual server-side blade state.
var gpCompatSession = null;
var gpCompatStateAccess = Java.loadClass('mods.flammpfeil.slashblade.capability.slashblade.BladeStateAccess');
var gpCompatHand = Java.loadClass('net.minecraft.world.InteractionHand');
var gpCompatMode = Java.loadClass('net.minecraft.world.level.GameType');
var gpCompatSpell = Java.loadClass('net.spell_engine.api.spell.container.SpellContainerHelper');
var gpCompatTarget = null;

NetworkEvents.dataReceived('gp_blade_compat_fixture', event => {
  var p = event.player;
  if ('' + p.username != 'GodPathTest') return;
  var stage = event.data.getString('stage');
  if (/^(vanilla|divine)_(right|left)$/.test(stage)) {
    if (gpCompatTarget) {
      gpCompatTarget.discard();
      gpCompatTarget = null;
    }
    var id = stage.startsWith('divine') ? 'godpath:apotheosis' : 'slashblade:yamato';
    var blade = gpNamedBlade(p, id);
    if (!blade || blade.isEmpty()) throw new Error('Missing blade fixture ' + id);
    p.setGameMode(gpCompatMode.SURVIVAL);
    p.getAbilities().flying = false;
    p.onUpdateAbilities();
    p.setItemInHand(gpCompatHand.MAIN_HAND, blade);
    console.info('[GP-COMPAT] SPELL_CONTAINER ' + stage + ' blade=' +
      gpCompatSpell.hasUsableContainer(blade) + ' sword=' +
      gpCompatSpell.hasUsableContainer(Item.of('minecraft:iron_sword')));
    p.persistentData.putInt('gp_blade_kills', 25);
    p.persistentData.remove('gp_slash_cd');
    p.persistentData.remove('gp_burst_cd');
    gpCompatSession = { stage: stage, last: -1, slash: false, burst: false };
  } else if (stage == 'target') {
    var eye = p.getEyePosition(), aim = p.getLookAngle();
    gpCompatTarget = p.level.createEntity('minecraft:armor_stand');
    gpCompatTarget.setPos(eye.x + aim.x * 2.5, eye.y + aim.y * 2.5 - 1, eye.z + aim.z * 2.5);
    gpCompatTarget.setInvulnerable(true);
    gpCompatTarget.setNoGravity(true);
    p.level.addFreshEntity(gpCompatTarget);
  } else if (stage == 'curios') {
    if (gpCompatTarget) {
      gpCompatTarget.discard();
      gpCompatTarget = null;
    }
    var inv = gpCuriosInventory(p);
    inv.setEquippedCurio('godpath_divinity', 0, Item.of('minecraft:air'));
    for (var i = 0; i < 6; i++) inv.setEquippedCurio('godpath_relic', i, Item.of('minecraft:air'));
  }
});

PlayerEvents.tick(event => {
  var p = event.player;
  if (!gpCompatSession || '' + p.username != 'GodPathTest') return;
  var state = gpCompatStateAccess.of(p.getMainHandItem());
  if (!state.isPresent()) return;
  var b = state.get();
  var last = b.getLastActionTime();
  if (last != gpCompatSession.last) {
    console.info('[GP-COMPAT] COMBO ' + gpCompatSession.stage + ' ' + last + ' ' + b.getComboSeq());
    gpCompatSession.last = last;
  }
  var slash = p.persistentData.contains('gp_slash_cd');
  var burst = p.persistentData.contains('gp_burst_cd');
  if (slash != gpCompatSession.slash || burst != gpCompatSession.burst) {
    console.info('[GP-COMPAT] SKILL ' + gpCompatSession.stage + ' slash=' + slash + ' burst=' + burst);
    gpCompatSession.slash = slash;
    gpCompatSession.burst = burst;
  }
});
