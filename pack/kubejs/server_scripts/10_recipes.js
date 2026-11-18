ServerEvents.recipes(event => {

  function shape(out, items) {
    try { event.shapeless(out, items) } catch (e) { console.error('[godpath] 配方失败 ' + out + ': ' + e) }
  }

  shape('godpath:origin_shard', ['minecraft:deepslate', 'minecraft:deepslate', 'minecraft:deepslate',
    'minecraft:deepslate', 'minecraft:deepslate', 'minecraft:deepslate', 'minecraft:deepslate',
    'minecraft:deepslate', 'minecraft:diamond']);

  shape('godpath:life_shard', ['minecraft:wheat', 'minecraft:wheat', 'minecraft:wheat',
    'minecraft:wheat', 'minecraft:wheat', 'minecraft:wheat', 'minecraft:wheat',
    'minecraft:wheat', 'minecraft:golden_apple']);

  shape('godpath:gear_shard', ['minecraft:iron_ingot', 'minecraft:iron_ingot', 'minecraft:iron_ingot',
    'minecraft:iron_ingot', 'minecraft:iron_ingot', 'minecraft:iron_ingot',
    'minecraft:iron_ingot', 'minecraft:iron_ingot', 'minecraft:redstone_block']);

  shape('godpath:rail_shard', ['minecraft:rail', 'minecraft:rail', 'minecraft:rail',
    'minecraft:rail', 'minecraft:rail', 'minecraft:rail', 'minecraft:rail',
    'minecraft:rail', 'minecraft:iron_block']);

  shape('godpath:arcane_shard', ['minecraft:amethyst_shard', 'minecraft:amethyst_shard', 'minecraft:amethyst_shard',
    'minecraft:amethyst_shard', 'minecraft:amethyst_shard', 'minecraft:amethyst_shard',
    'minecraft:amethyst_shard', 'minecraft:amethyst_shard', 'minecraft:glowstone']);

  shape('godpath:blade_shard', ['minecraft:rotten_flesh', 'minecraft:rotten_flesh', 'minecraft:rotten_flesh',
    'minecraft:rotten_flesh', 'minecraft:rotten_flesh', 'minecraft:rotten_flesh',
    'minecraft:rotten_flesh', 'minecraft:rotten_flesh', 'minecraft:iron_sword']);

  shape('godpath:origin_stone_core', [
    'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard',
    'minecraft:deepslate', 'minecraft:deepslate', 'minecraft:netherite_scrap']);

  shape('godpath:world_seed', [
    'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard',
    'minecraft:oak_sapling', 'minecraft:oak_sapling', 'minecraft:amethyst_shard']);

  shape('godpath:first_earth_crown', [
    'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard',
    'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard',
    'godpath:origin_stone_core']);

  shape('godpath:echo_of_origin', [
    'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard',
    'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard', 'godpath:origin_shard',
    'godpath:world_seed']);

  shape('godpath:heart_of_seasons', [
    'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard',
    'minecraft:wheat', 'minecraft:wheat', 'minecraft:golden_apple']);

  shape('godpath:harvest_chalice', [
    'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard',
    'minecraft:glass_bottle', 'minecraft:glass_bottle', 'minecraft:honey_bottle']);

  shape('godpath:pastoral_bell', [
    'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard',
    'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard',
    'godpath:harvest_chalice']);

  shape('godpath:fertile_sigil', [
    'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard',
    'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard', 'godpath:life_shard',
    'godpath:heart_of_seasons']);

  shape('godpath:eternal_gear', [
    'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard',
    'minecraft:iron_block', 'minecraft:iron_block', 'minecraft:redstone_block']);

  shape('godpath:energy_core', [
    'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard',
    'minecraft:copper_block', 'minecraft:copper_block', 'minecraft:redstone_block']);

  shape('godpath:logic_crystal', [
    'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard',
    'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard',
    'godpath:energy_core']);

  shape('godpath:sky_craft_key', [
    'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard',
    'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard', 'godpath:gear_shard',
    'godpath:eternal_gear']);

  shape('godpath:stellar_compass', [
    'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard',
    'minecraft:iron_ingot', 'minecraft:iron_ingot', 'minecraft:compass']);

  shape('godpath:orbit_staff', [
    'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard',
    'minecraft:rail', 'minecraft:rail', 'minecraft:stick']);

  shape('godpath:resonant_beacon', [
    'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard',
    'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard',
    'godpath:stellar_compass']);

  shape('godpath:temporal_rivet', [
    'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard',
    'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard', 'godpath:rail_shard',
    'godpath:orbit_staff']);

  shape('godpath:starword_sigil', [
    'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard',
    'minecraft:amethyst_shard', 'minecraft:amethyst_shard', 'minecraft:glowstone']);

  shape('godpath:moondrop_lense', [
    'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard',
    'minecraft:glass', 'minecraft:glass', 'minecraft:ender_eye']);

  shape('godpath:spirit_wind_wand', [
    'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard',
    'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard',
    'godpath:moondrop_lense']);

  shape('godpath:arcane_fragment_page', [
    'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard',
    'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard', 'godpath:arcane_shard',
    'godpath:starword_sigil']);

  shape('godpath:thunder_blade_soul', [
    'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard',
    'minecraft:iron_sword', 'minecraft:iron_sword', 'minecraft:lightning_rod']);

  shape('godpath:dragonfang_blade', [
    'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard',
    'minecraft:diamond', 'minecraft:diamond', 'minecraft:dragon_breath']);

  shape('godpath:void_sheath', [
    'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard',
    'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard',
    'godpath:thunder_blade_soul']);

  shape('godpath:final_tablet', [
    'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard',
    'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard', 'godpath:blade_shard',
    'godpath:dragonfang_blade']);

  shape('godpath:divinity_mark', [
    'godpath:origin_stone_core', 'godpath:heart_of_seasons', 'godpath:eternal_gear',
    'godpath:stellar_compass', 'godpath:starword_sigil', 'godpath:thunder_blade_soul',
    'minecraft:nether_star', 'minecraft:nether_star', 'minecraft:enchanted_golden_apple']);

  console.info('[godpath] 配方层加载完成');
});
