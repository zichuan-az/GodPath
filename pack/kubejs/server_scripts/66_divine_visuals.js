var GP_BLADE_PARTICLE = {
  origin: 'crit', life: 'cherry_leaves', gear: 'electric_spark', rail: 'reverse_portal',
  arcane: 'enchant', blade: 'soul_fire_flame', apotheosis: 'end_rod'
};

function gpBladeFamily(stack) {
  try {
    var access = Java.loadClass('mods.flammpfeil.slashblade.capability.slashblade.BladeStateAccess');
    var state = access.of(stack);
    if (!state.isPresent()) return '';
    var match = /(?:^|\.)godpath[.:](origin|life|gear|rail|arcane|blade|apotheosis)(?:_[123])?$/.exec('' + state.get().getTranslationKey());
    return match ? match[1] : '';
  } catch (error) { return ''; }
}

function gpParticleAt(p, particle, x, y, z, count) {
  return gpRun(p, 'particle minecraft:' + particle + ' ~' + x.toFixed(2) + ' ~' + y.toFixed(2) +
    ' ~' + z.toFixed(2) + ' 0.09 0.09 0.09 0.04 ' + count + ' normal @a[distance=..40]');
}

function gpParticleRing(p, particle, radius, height, points, count) {
  for (var i = 0; i < points; i++) {
    var angle = Math.PI * 2 * i / points;
    gpParticleAt(p, particle, Math.cos(angle) * radius, height, Math.sin(angle) * radius, count);
  }
}

function gpBladeVisual(p, family, burst) {
  var particle = GP_BLADE_PARTICLE[family] || 'crit';
  if (burst) {
    gpParticleRing(p, particle, 3.2, 0.9, 12, 3);
    gpParticleRing(p, family == 'apotheosis' ? 'totem_of_undying' : 'sweep_attack', 5.2, 1.2, 8, 2);
    return;
  }
  var look = p.getLookAngle();
  var direction = Math.atan2(gpVec(look, 'z'), gpVec(look, 'x'));
  for (var i = 0; i <= 10; i++) {
    var angle = direction + (i - 5) * 0.16;
    gpParticleAt(p, particle, Math.cos(angle) * 3.4, 0.85 + i * 0.08, Math.sin(angle) * 3.4, 3);
  }
  gpParticleAt(p, 'sweep_attack', Math.cos(direction) * 2.8, 1.05, Math.sin(direction) * 2.8, 1);
}

function gpCeremonyTitle(p, title, subtitle) {
  gpRun(p, 'title @s times 8 75 24');
  gpRun(p, 'title @s subtitle ' + JSON.stringify({ translate: subtitle, color: '#DCEFFD', font: 'godpath:ceremony' }));
  gpRun(p, 'title @s title ' + JSON.stringify({ translate: title, color: '#FFDB81', bold: true, font: 'godpath:ceremony' }));
}

function gpAscensionVisual(p, phase) {
  if (phase < 6) {
    var law = ['origin', 'life', 'gear', 'rail', 'arcane', 'blade'][phase];
    gpParticleRing(p, GP_BLADE_PARTICLE[law], 2.2 + phase * 0.32, 0.6 + phase * 0.28, 12, 3);
    return;
  }
  gpParticleRing(p, 'end_rod', 3.5, 0.7, 16, 3);
  gpParticleRing(p, 'totem_of_undying', 5.5, 1.8, 16, 3);
  gpRun(p, 'particle minecraft:firework ~ ~2 ~ 0.6 1.1 0.6 0.22 28 normal @a[distance=..40]');
}
