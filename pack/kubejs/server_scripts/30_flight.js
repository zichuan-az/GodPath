function flightHas(p, fullId) {
  var i, st;
  try {
    var inv = p.inventory;
    for (i = 0; i < 46; i++) { try { st = inv.getItem(i); if (gpIdIs(st, fullId)) return true } catch (e) { } }
  } catch (e1) { }
  try {
    var iv = p.getInventory();
    for (i = 0; i < 46; i++) { try { st = iv.getItem(i); if (gpIdIs(st, fullId)) return true } catch (e) { } }
  } catch (e2) { }
  return false;
}

function mainHandId(p) {
  try { var s = p.getMainHandItem(); if (s && !s.isEmpty()) return '' + s.id } catch (e) { }
  try { var s2 = p.mainHandItem; if (s2 && !s2.isEmpty()) return '' + s2.id } catch (e2) { }
  return '';
}

function isGliding(p) {
  try { return p.isFallFlying() } catch (e1) { }
  try { return p.isGliding() } catch (e2) { }
  return false;
}

function setVel(p, x, y, z) {
  try { p.setDeltaMovement(x, y, z); return true } catch (e1) { }
  try { p.setMotion(x, y, z); return true } catch (e2) { }
  return false;
}

var gpFlightTickCounter = 0;

PlayerEvents.tick(event => {
  var p = null;
  try { p = event.player } catch (e) { return }
  if (!p) return;
  if (!gpIsServer(p)) return;
  if (!isGliding(p)) return;

  var age = gpAge(p);
  if (age % 3 != 0) return;

  try {
    var hand = mainHandId(p);
    var hasTrident = (hand == 'minecraft:trident') || flightHas(p, 'minecraft:trident');
    var hasBucket = flightHas(p, 'minecraft:water_bucket');
    var hasWind = gpHeld(p, 'spirit_wind_wand');
    var isGod = gpIsGod(p);

    var wet = false;
    try { wet = p.isInWater() || (p.level.isRaining() && p.level.canSeeSky(p.blockPosition())) } catch (e1) { }

    if (!hasBucket && !wet) return;
    if (!hasTrident && !hasWind && !isGod) return;

    var look = p.getLookAngle();
    var lx = gpVec(look, 'x'), ly = gpVec(look, 'y'), lz = gpVec(look, 'z');
    var len = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1;
    lx = lx / len; ly = ly / len; lz = lz / len;

    var power = 1.05;
    if (hasTrident) power += 0.25;
    if (hasWind) power += 0.30;
    if (isGod) power += 0.35;

    var vy = ly * power + 0.055;
    if (vy < -0.30) vy = -0.30;

    setVel(p, lx * power, vy, lz * power);

    gpFlightTickCounter++;
    if (gpFlightTickCounter % 4 == 0) {
      gpRun(p, 'particle minecraft:splash ~ ~ ~ 0.3 0.2 0.3 0.05 8');
      gpRun(p, 'particle minecraft:bubble ~ ~ ~ 0.2 0.2 0.2 0.02 4');
    }
    if (gpFlightTickCounter % 12 == 0) {
      gpRun(p, 'playsound minecraft:item.trident.riptide_2 player @a[distance=..12] ~ ~ ~ 0.5 1.5');
    }

    if (gpFlightTickCounter % 600 == 0 && hasBucket) {
      gpTell(p, '§b水桶共鸣 §7| §f鞘翅推进中...');
    }
  } catch (err) {
    if (Math.random() < 0.01) console.error('[godpath] 飞行层异常: ' + err);
  }
});

PlayerEvents.tick(event => {
  var p = null;
  try { p = event.player } catch (e) { return }
  if (!p) return;
  if (!gpIsServer(p)) return;
  var age = gpAge(p);
  if (age % 40 != 0) return;

  try {
    var onGround = false;
    try { onGround = p.onGround() } catch (e1) { }
    if (!onGround) return;
    var was = false;
    try { was = p.persistentData.getBoolean('gp_flying') } catch (e2) { }
    if (was) {
      try { p.persistentData.putBoolean('gp_flying', false) } catch (e3) { }
    } else {
      try { p.persistentData.putBoolean('gp_flying', true) } catch (e4) { }
    }
  } catch (e) { }
});
