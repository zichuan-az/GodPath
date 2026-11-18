fill ~-2 ~-4 ~-13 ~23 ~-1 ~10 stone_bricks
fill ~-2 ~ ~-13 ~23 ~11 ~10 air
fill ~-2 ~-1 ~-13 ~23 ~-1 ~10 polished_andesite
fill ~-1 ~-1 ~-2 ~23 ~-1 ~2 stone_bricks
fill ~-1 ~-1 ~3 ~23 ~-1 ~4 polished_andesite
fill ~1 ~-1 ~-12 ~19 ~-1 ~-4 spruce_planks
fill ~1 ~ ~-12 ~19 ~4 ~-4 stripped_spruce_wood hollow
fill ~2 ~ ~-11 ~18 ~4 ~-5 air
fill ~2 ~2 ~-12 ~18 ~3 ~-12 glass_pane
fill ~2 ~2 ~-4 ~18 ~3 ~-4 glass_pane
fill ~8 ~ ~-4 ~12 ~2 ~-4 air
fill ~8 ~ ~-12 ~12 ~2 ~-12 air
fill ~0 ~5 ~-13 ~20 ~5 ~-3 dark_prismarine
fill ~0 ~6 ~-12 ~20 ~6 ~-4 dark_prismarine
fill ~0 ~7 ~-11 ~20 ~7 ~-5 dark_prismarine
fill ~0 ~8 ~-10 ~20 ~8 ~-6 dark_prismarine
fill ~0 ~9 ~-9 ~20 ~9 ~-7 dark_prismarine
fill ~0 ~10 ~-8 ~20 ~10 ~-8 waxed_exposed_cut_copper
fill ~1 ~ ~-12 ~1 ~5 ~-12 stone_bricks
fill ~1 ~ ~-4 ~1 ~5 ~-4 stone_bricks
fill ~6 ~ ~-12 ~6 ~5 ~-12 stone_bricks
fill ~6 ~ ~-4 ~6 ~5 ~-4 stone_bricks
fill ~14 ~ ~-12 ~14 ~5 ~-12 stone_bricks
fill ~14 ~ ~-4 ~14 ~5 ~-4 stone_bricks
fill ~19 ~ ~-12 ~19 ~5 ~-12 stone_bricks
fill ~19 ~ ~-4 ~19 ~5 ~-4 stone_bricks
fill ~-1 ~4 ~-3 ~22 ~4 ~2 waxed_exposed_cut_copper
fill ~-1 ~5 ~-2 ~22 ~5 ~1 dark_prismarine
fill ~-1 ~ ~-3 ~-1 ~4 ~-3 stripped_spruce_log
fill ~6 ~ ~-3 ~6 ~4 ~-3 stripped_spruce_log
fill ~14 ~ ~-3 ~14 ~4 ~-3 stripped_spruce_log
fill ~22 ~ ~-3 ~22 ~4 ~-3 stripped_spruce_log
fill ~-1 ~ ~2 ~-1 ~4 ~2 stripped_spruce_log
fill ~6 ~ ~2 ~6 ~4 ~2 stripped_spruce_log
fill ~14 ~ ~2 ~14 ~4 ~2 stripped_spruce_log
fill ~22 ~ ~2 ~22 ~4 ~2 stripped_spruce_log
setblock ~3 ~3 ~-2 lantern[hanging=true]
setblock ~10 ~3 ~-2 lantern[hanging=true]
setblock ~18 ~3 ~-2 lantern[hanging=true]
setblock ~3 ~0 ~-5 lantern
setblock ~17 ~0 ~-5 lantern
setblock ~8 ~ ~-8 red_bed[part=foot,facing=north]
setblock ~8 ~ ~-9 red_bed[part=head,facing=north]
setblock ~14 ~ ~-7 chest[facing=west]{Items:[{Slot:0b,id:"minecraft:bread",count:12},{Slot:1b,id:"minecraft:torch",count:16},{Slot:2b,id:"minecraft:minecart",count:1}]}
setblock ~17 ~ ~-8 crafting_table
setblock ~17 ~ ~-9 furnace[facing=west]
setblock ~17 ~ ~-10 smithing_table
setblock ~16 ~1 ~-10 grindstone[face=floor,facing=west]
setblock ~12 ~0 ~-3 spruce_sign[rotation=0]{front_text:{messages:['{"text":"云岭枢纽"}','{"text":"→ 松脊前哨"}','{"text":"尽头上车，按侧钮"}','{"text":"备用矿车在餐箱"}'],has_glowing_text:1b}}
setblock ~10 ~0 ~5 spruce_sign[rotation=8]{front_text:{messages:['{"text":"训练场"}','{"text":"持刀完成训练"}','{"text":""}','{"text":""}']}}
fill ~4 ~-3 ~10 ~20 ~-1 ~25 stone_bricks
fill ~4 ~-1 ~10 ~20 ~-1 ~25 gravel
fill ~4 ~ ~10 ~20 ~6 ~25 air
fill ~4 ~ ~12 ~4 ~ ~25 spruce_fence
fill ~20 ~ ~12 ~20 ~ ~25 spruce_fence
fill ~4 ~ ~25 ~20 ~ ~25 spruce_fence
fill ~4 ~ ~12 ~10 ~ ~12 spruce_fence
fill ~14 ~ ~12 ~20 ~ ~12 spruce_fence
fill ~5 ~-1 ~13 ~19 ~-1 ~24 packed_mud
fill ~10 ~-1 ~18 ~14 ~-1 ~22 chiseled_stone_bricks
setblock ~4 ~1 ~13 lantern
setblock ~20 ~1 ~13 lantern
setblock ~4 ~1 ~25 lantern
setblock ~20 ~1 ~25 lantern
execute unless entity @e[tag=gp_expedition_training,distance=..64] run summon husk ~12.5 ~ ~20.5 {Tags:["gp_expedition_training"],CustomName:'{"text":"铁路训练靶"}',CustomNameVisible:1b,NoAI:1b,Silent:1b,PersistenceRequired:1b,DeathLootTable:"minecraft:empty",Health:1024f,Attributes:[{Name:"minecraft:generic.max_health",Base:1024d},{Name:"minecraft:generic.knockback_resistance",Base:1d}]}
