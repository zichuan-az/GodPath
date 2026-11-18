function gpNamedBlade(p, name) {
  var type = Java.loadClass('mods.flammpfeil.slashblade.registry.slashblade.SlashBladeDefinition');
  var id = Java.loadClass('net.minecraft.resources.ResourceLocation').parse(name);
  var definition = p.server.registryAccess().registryOrThrow(type.REGISTRY_KEY).get(id);
  return definition == null ? null : definition['getBlade(net.minecraft.core.HolderLookup$Provider)'](p.registryAccess());
}

function gpGrantDivineArmament(p) {
  if (!gpIsGod(p) || p.persistentData.getBoolean('gp_divine_blade_reward')) return false;
  try {
    var blade = gpNamedBlade(p, 'godpath:apotheosis');
    if (blade == null || blade.isEmpty()) return false;
    p.give(blade);
  } catch (error) {
    console.error('[godpath] 专属刀发放失败：' + error);
    return false;
  }
  p.persistentData.putBoolean('gp_divine_blade_reward', true);
  gpTell(p, '§6神裁降临 §7| §d归墟 · 万象神裁 §f已与神格绑定。');
  return true;
}
