function gpSyncDivineFlight(p) {
  var abilities = p.getAbilities(), data = p.persistentData;
  if (gpIsGod(p)) {
    var changed = !abilities.mayfly || !data.getBoolean('gp_divine_flight');
    abilities.mayfly = true;
    if (changed) {
      abilities.setFlyingSpeed(0.08);
      data.putBoolean('gp_divine_flight', true);
      p.onUpdateAbilities();
    }
  } else if (data.getBoolean('gp_divine_flight')) {
    data.putBoolean('gp_divine_flight', false);
    if (!p.isCreative() && !p.isSpectator()) {
      abilities.mayfly = false;
      abilities.flying = false;
      abilities.setFlyingSpeed(0.05);
      p.onUpdateAbilities();
    }
  }
}

EntityEvents.beforeHurt('minecraft:player', event => {
  if (!gpIsGod(event.entity)) return;
  event.setDamage(0);
  event.cancel();
});

EntityEvents.death('minecraft:player', event => {
  if (!gpIsGod(event.entity)) return;
  event.entity.setHealth(event.entity.getMaxHealth());
  event.cancel();
});

PlayerEvents.tick(event => {
  var p = event.player;
  if (!gpIsServer(p) || gpAge(p) % 20 != 0) return;
  gpSyncDivineFlight(p);
  if (!gpIsGod(p)) return;
  gpApplyDivinity(p);
  if (gpAge(p) % 200 == 0 && typeof gpGrantDivineArmament == 'function') gpGrantDivineArmament(p);
  if (p.y < p.level.getMinBuildHeight() - 8) {
    var heightmap = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types');
    var safeY = Math.max(80, p.level.getHeight(heightmap.WORLD_SURFACE, Math.floor(p.x), Math.floor(p.z)) + 8);
    gpRun(p, 'tp @s ~ ' + safeY + ' ~');
    p.getAbilities().flying = true;
    p.fallDistance = 0;
    p.onUpdateAbilities();
  }
});
