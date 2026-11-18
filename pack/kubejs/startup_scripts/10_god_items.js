function godReg(event, id, cfg) {
  try {
    var b = event.create('godpath:' + id)
    if (id == 'divinity_mark') b.texture('minecraft:item/nether_star')
    b.maxStackSize(cfg.stack)
    try { b.rarity(cfg.rarity) } catch (e1) { }
    if (cfg.fire) { try { b.fireResistant() } catch (e2) { } }
    return b
  } catch (err) {
    console.error('[godpath] 物品注册失败 ' + id + ' -> ' + err)
  }
}

StartupEvents.registry('item', event => {

  godReg(event, 'origin_shard', { stack: 64, rarity: 'rare', fire: false })
  godReg(event, 'life_shard', { stack: 64, rarity: 'rare', fire: false })
  godReg(event, 'gear_shard', { stack: 64, rarity: 'rare', fire: false })
  godReg(event, 'rail_shard', { stack: 64, rarity: 'rare', fire: false })
  godReg(event, 'arcane_shard', { stack: 64, rarity: 'rare', fire: false })
  godReg(event, 'blade_shard', { stack: 64, rarity: 'rare', fire: false })

  godReg(event, 'origin_stone_core', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'world_seed', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'first_earth_crown', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'echo_of_origin', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'heart_of_seasons', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'harvest_chalice', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'pastoral_bell', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'fertile_sigil', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'eternal_gear', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'energy_core', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'logic_crystal', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'sky_craft_key', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'stellar_compass', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'orbit_staff', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'resonant_beacon', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'temporal_rivet', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'starword_sigil', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'moondrop_lense', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'spirit_wind_wand', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'arcane_fragment_page', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'thunder_blade_soul', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'dragonfang_blade', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'void_sheath', { stack: 1, rarity: 'epic', fire: true })
  godReg(event, 'final_tablet', { stack: 1, rarity: 'epic', fire: true })

  godReg(event, 'divinity_mark', { stack: 1, rarity: 'epic', fire: true })

})
