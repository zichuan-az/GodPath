var GP_RESONANCE = [
  ['origin', 2, 'armor', 12, 'add_value', 'origin_armor'],
  ['origin', 4, 'armor_toughness', 8, 'add_value', 'origin_toughness'],
  ['origin', 4, 'knockback_resistance', 0.5, 'add_value', 'origin_stability'],
  ['life', 2, 'max_health', 20, 'add_value', 'life_health'],
  ['gear', 2, 'attack_speed', 0.3, 'add_value', 'gear_speed'],
  ['gear', 4, 'attack_damage', 20, 'add_value', 'gear_overload'],
  ['rail', 2, 'movement_speed', 0.2, 'add_multiplied_base', 'rail_speed'],
  ['rail', 4, 'step_height', 1, 'add_value', 'rail_step'],
  ['arcane', 2, 'luck', 8, 'add_value', 'arcane_luck'],
  ['blade', 2, 'attack_damage', 18, 'add_value', 'blade_attack'],
  ['blade', 4, 'attack_damage', 0.35, 'add_multiplied_total', 'blade_edge'],
  ['all', 6, 'max_health', 40, 'add_value', 'all_health'],
  ['all', 6, 'attack_damage', 24, 'add_value', 'all_attack'],
  ['all', 6, 'movement_speed', 0.15, 'add_multiplied_base', 'all_speed']
];

function gpApplyResonance(p) {
  var worn = gpWornRelics(p), counts = {}, different = 0;
  Object.keys(GP_LAWS).forEach(function (law) {
    counts[law] = GP_LAWS[law].filter(id => worn[id]).length;
    if (counts[law] > 0) different++;
  });
  counts.all = different;
  GP_RESONANCE.forEach(function (entry) {
    var attribute = 'minecraft:generic.' + entry[2], id = 'godpath:resonance_' + entry[5];
    if (counts[entry[0]] >= entry[1]) gpEnsureAttribute(p, attribute, id, entry[3], entry[4]);
    else gpRemoveAttribute(p, attribute, id);
  });
  p.persistentData.putBoolean('gp_res_life4', counts.life >= 4);
  p.persistentData.putBoolean('gp_res_arcane4', counts.arcane >= 4);
}

PlayerEvents.tick(event => {
  if (gpIsServer(event.player) && gpAge(event.player) % 20 == 0) gpApplyResonance(event.player);
});

EntityEvents.afterHurt(event => {
  var p = gpDamageAttacker(event);
  if (!p || !gpIsPlayer(p) || !p.persistentData.getBoolean('gp_res_life4')) return;
  if (!gpHostileEntity(event.entity)) return;
  p.setHealth(Math.min(p.getMaxHealth(), p.getHealth() + Math.min(12, Number(event.damage) * 0.15)));
});
