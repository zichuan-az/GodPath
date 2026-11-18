"""Build six original, naturally generated law sanctums from vanilla blocks.

The structures are authored as reproducible block geometry, not copied maps.
"""
import gzip
import json
import math
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'pack/kubejs/data/godpath'
THEMES = {
    'origin': ('晨星天文台', 'smooth_quartz', 'quartz_pillar', 'oxidized_copper', 'light_blue_stained_glass', 'stray'),
    'life': ('四季圣苑', 'mossy_stone_bricks', 'stone_bricks', 'waxed_cut_copper', 'lime_stained_glass', 'bogged'),
    'gear': ('天工大圣堂', 'polished_deepslate', 'waxed_cut_copper', 'chiseled_stone_bricks', 'orange_stained_glass', 'vindicator'),
    'rail': ('回响高架站', 'stone_bricks', 'polished_andesite', 'waxed_cut_copper', 'cyan_stained_glass', 'pillager'),
    'arcane': ('月露星宫', 'smooth_quartz', 'purpur_pillar', 'amethyst_block', 'purple_stained_glass', 'witch'),
    'blade': ('断空武斗殿', 'polished_blackstone_bricks', 'red_nether_bricks', 'chiseled_polished_blackstone', 'red_stained_glass', 'wither_skeleton'),
}


def text(value):
    data = value.encode('utf-8')
    return struct.pack('>H', len(data)) + data


def nbt(kind, value):
    if kind in (1, 3, 4):
        return struct.pack({1: '>b', 3: '>i', 4: '>q'}[kind], value)
    if kind == 8:
        return text(value)
    if kind == 9:
        child, values = value
        return bytes([child]) + struct.pack('>i', len(values)) + b''.join(nbt(child, v) for v in values)
    if kind == 10:
        return b''.join(bytes([t]) + text(k) + nbt(t, v) for k, (t, v) in value.items()) + b'\0'
    raise ValueError(kind)


def write_json(relative, value):
    target = DATA / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


class Building:
    def __init__(self):
        self.blocks = {}

    def put(self, x, y, z, block, properties=None, entity=None):
        if not (0 <= x < 49 and 0 <= y < 48 and 0 <= z < 49):
            raise ValueError((x, y, z))
        self.blocks[x, y, z] = ('minecraft:' + block, tuple(sorted((properties or {}).items())), entity)

    def box(self, x1, y1, z1, x2, y2, z2, block):
        for x in range(x1, x2 + 1):
            for y in range(y1, y2 + 1):
                for z in range(z1, z2 + 1):
                    self.put(x, y, z, block)

    def disc(self, radius, y, block, inner=0):
        for x in range(24 - radius, 25 + radius):
            for z in range(24 - radius, 25 + radius):
                d = (x - 24) ** 2 + (z - 24) ** 2
                if inner ** 2 <= d <= radius ** 2:
                    self.put(x, y, z, block)

    def chest(self, x, y, z, law):
        self.put(x, y, z, 'chest', {'facing': 'south', 'type': 'single', 'waterlogged': 'false'},
                 {'id': (8, 'minecraft:chest'), 'LootTable': (8, f'godpath:chests/{law}_cache')})

    def spawner(self, x, y, z, mob):
        entity = {'id': (8, 'minecraft:mob_spawner'), 'Delay': (3, 200), 'MinSpawnDelay': (3, 300),
                  'MaxSpawnDelay': (3, 700), 'SpawnCount': (3, 2), 'MaxNearbyEntities': (3, 4),
                  'RequiredPlayerRange': (3, 12), 'SpawnRange': (3, 3),
                  'SpawnData': (10, {'entity': (10, {'id': (8, 'minecraft:' + mob)})})}
        self.put(x, y, z, 'spawner', entity=entity)

    def save(self, name):
        palette, indexes, blocks = [], {}, []
        for (x, y, z), (block, properties, entity) in sorted(self.blocks.items()):
            key = block, properties
            if key not in indexes:
                indexes[key] = len(palette)
                entry = {'Name': (8, block)}
                if properties:
                    entry['Properties'] = (10, {k: (8, str(v)) for k, v in properties})
                palette.append(entry)
            entry = {'pos': (9, (3, [x, y, z])), 'state': (3, indexes[key])}
            if entity:
                entry['nbt'] = (10, entity)
            blocks.append(entry)
        payload = {'DataVersion': (3, 3955), 'size': (9, (3, [49, 48, 49])),
                   'palette': (9, (10, palette)), 'blocks': (9, (10, blocks)), 'entities': (9, (10, []))}
        target = DATA / 'structure' / (name + '.nbt')
        target.parent.mkdir(parents=True, exist_ok=True)
        with gzip.open(target, 'wb', compresslevel=9) as stream:
            stream.write(bytes([10]) + text('') + nbt(10, payload))
        return len(blocks), len(palette)


def build(law, theme):
    title, stone, pillar, accent, glass, mob = theme
    b = Building()
    # Layered foundation, with a clear interior for hillside placement.
    for y, radius in [(0, 24), (1, 23), (2, 22), (3, 21)]:
        b.disc(radius, y, stone)
    for y in range(4, 39):
        b.disc(20, y, 'air')
    for radius, height in [(20, 4), (20, 17), (18, 31), (16, 40)]:
        b.disc(radius, height, accent, max(0, radius - 1))
    # Eight monumental buttresses and long lancet windows.
    for i in range(8):
        a = math.tau * i / 8
        x, z = round(24 + 18 * math.cos(a)), round(24 + 18 * math.sin(a))
        b.box(x - 1, 4, z - 1, x + 1, 39, z + 1, pillar)
        b.box(x - 1, 40, z - 1, x + 1, 41, z + 1, accent)
        b.put(x, 42, z, 'soul_lantern' if law == 'arcane' else 'lantern')
        for y in [12, 24, 35]:
            b.put(x, y, z, 'sea_lantern')
    # Open arcade perimeter rather than a sealed, inaccessible tower.
    for i in range(64):
        a = math.tau * i / 64
        x, z = round(24 + 19 * math.cos(a)), round(24 + 19 * math.sin(a))
        for y in range(5, 31):
            if y > 8 and (i % 8 in [2, 3, 4, 5]):
                if y > 13:
                    b.put(x, y, z, glass)
            elif y <= 8 or i % 8 in [0, 7]:
                b.put(x, y, z, stone)
    b.box(21, 4, 42, 27, 11, 45, 'air')
    for step in range(4):
        b.box(21, step, 45 - step, 27, step, 47 - step, stone)
    # Upper galleries connected by a continuous, one-block-rise spiral stair.
    for y in [17, 31]:
        b.disc(17, y, stone, 7)
        b.box(10, y, 23, 38, y, 25, accent)
    perimeter = ([(x, 12) for x in range(12, 37)] + [(36, z) for z in range(13, 37)] +
                 [(x, 36) for x in range(35, 11, -1)] + [(12, z) for z in range(35, 12, -1)])
    for y in range(4, 33):
        x, z = perimeter[y - 4]
        b.box(x, y, z, x + 1, y, z + 1, pillar)
        b.box(x, y + 1, z, x + 1, y + 2, z + 1, 'air')
    # Distinct themes: observatory rings, living courtyard, machinery, station, star core, arena.
    if law in ['origin', 'arcane']:
        for y in [25, 26, 36, 37]:
            b.disc(13 if law == 'origin' else 15, y, accent, 12 if law == 'origin' else 14)
        for x in range(19, 30):
            for y in range(33, 44):
                for z in range(19, 30):
                    d = (x - 24) ** 2 + (y - 38) ** 2 + (z - 24) ** 2
                    if 16 <= d <= 25:
                        b.put(x, y, z, glass)
        b.put(24, 38, 24, 'sea_lantern')
    elif law == 'life':
        for x in range(10, 39):
            for z in range(10, 39):
                if (x - 24) ** 2 + (z - 24) ** 2 < 16 ** 2:
                    if x in [23, 24, 25] or z in [23, 24, 25]:
                        b.put(x, 3, z, 'water')
                    else:
                        b.put(x, 3, z, 'moss_block')
                        if (x + z) % 4 == 0:
                            b.put(x, 4, z, 'azalea' if x % 2 else 'flowering_azalea')
        for x in [14, 34]:
            for z in [14, 34]:
                b.box(x, 4, z, x, 10, z, 'oak_log')
                b.box(x - 2, 10, z - 2, x + 2, 12, z + 2, 'flowering_azalea_leaves')
    elif law == 'gear':
        for x in [14, 34]:
            for z in [14, 34]:
                b.box(x - 2, 4, z - 2, x + 2, 14, z + 2, 'copper_grate')
                b.box(x - 1, 4, z - 1, x + 1, 12, z + 1, 'lava')
                b.box(x - 2, 15, z - 2, x + 2, 16, z + 2, 'cut_copper')
    elif law == 'rail':
        b.box(22, 4, 2, 26, 4, 46, 'stone_bricks')
        for z in range(3, 46):
            b.put(24, 5, z, 'rail', {'shape': 'north_south', 'waterlogged': 'false'})
        for z in [8, 20, 32, 44]:
            b.box(16, 5, z, 16, 13, z, pillar)
            b.box(32, 5, z, 32, 13, z, pillar)
            b.box(16, 14, z, 32, 14, z, accent)
    elif law == 'blade':
        for y in range(34, 41):
            radius = 22 - (y - 34) * 2
            b.disc(radius, y, 'polished_blackstone_brick_slab', max(0, radius - 3))
        b.box(20, 4, 19, 28, 4, 29, 'red_nether_bricks')
    # Loot has law materials, not free endgame relics.
    b.box(22, 31, 22, 26, 31, 26, accent)
    b.chest(24, 32, 24, law)
    b.chest(30, 4, 25, law)
    b.spawner(13, 4, 24, mob)
    b.spawner(34, 32, 15, mob)
    count, palette = b.save(law + '_sanctum')
    name = law + '_sanctum'
    write_json(f'worldgen/template_pool/{name}.json', {'name': 'godpath:' + name, 'fallback': 'minecraft:empty',
        'elements': [{'weight': 1, 'element': {'element_type': 'minecraft:single_pool_element',
        'location': 'godpath:' + name, 'processors': 'minecraft:empty', 'projection': 'rigid'}}]})
    write_json(f'worldgen/structure/{name}.json', {'type': 'minecraft:jigsaw', 'biomes': '#godpath:relic_grounds',
        'step': 'surface_structures', 'spawn_overrides': {}, 'terrain_adaptation': 'beard_thin',
        'start_pool': 'godpath:' + name, 'size': 1, 'start_height': {'absolute': 0},
        'project_start_to_heightmap': 'WORLD_SURFACE_WG', 'max_distance_from_center': 96, 'use_expansion_hack': False})
    write_json(f'loot_table/chests/{law}_cache.json', {'type': 'minecraft:chest', 'pools': [
        {'rolls': 1, 'entries': [{'type': 'minecraft:item', 'name': 'godpath:' + law + '_shard',
          'functions': [{'function': 'minecraft:set_count', 'count': {'type': 'minecraft:uniform', 'min': 4, 'max': 8}}]}]},
        {'rolls': {'type': 'minecraft:uniform', 'min': 2, 'max': 4}, 'entries': [
          {'type': 'minecraft:item', 'name': 'minecraft:golden_apple', 'weight': 2},
          {'type': 'minecraft:item', 'name': 'minecraft:diamond', 'weight': 3},
          {'type': 'minecraft:item', 'name': 'minecraft:emerald', 'weight': 5},
          {'type': 'minecraft:item', 'name': 'minecraft:ender_pearl', 'weight': 3}]},
        {'rolls': 1, 'entries': [{'type': 'minecraft:item', 'name': 'minecraft:paper', 'functions': [
          {'function': 'minecraft:set_name', 'name': {'text': title + ' · 遗迹手记', 'color': 'gold'}},
          {'function': 'minecraft:set_lore', 'mode': 'replace_all', 'lore': [{'text': '六道遗迹之一，法则材料藏于高处。', 'color': 'gray'},
            {'text': '探索、生产与战斗都能推进神物之路。', 'color': 'aqua'},
            {'text': '集齐二十四件神物，在磁石前完成仪式。', 'color': 'gold'}]}]}]}]})
    return {'law': law, 'title': title, 'size': [49, 48, 49], 'blocks': count, 'palette': palette}


def main():
    records = [build(law, theme) for law, theme in THEMES.items()]
    write_json('worldgen/structure_set/law_sanctums.json', {'structures': [
        {'structure': 'godpath:' + law + '_sanctum', 'weight': 1} for law in THEMES],
        'placement': {'type': 'minecraft:random_spread', 'spacing': 56, 'separation': 20,
                      'salt': 410624, 'spread_type': 'triangular',
                      'exclusion_zone': {'other_set': 'minecraft:villages', 'chunk_count': 8}}})
    write_json('tags/worldgen/structure/law_sanctums.json', {'replace': False,
        'values': ['godpath:' + law + '_sanctum' for law in THEMES]})
    write_json('tags/worldgen/biome/relic_grounds.json', {'replace': False, 'values': [
        '#minecraft:is_forest', '#minecraft:is_taiga', 'minecraft:plains', 'minecraft:sunflower_plains',
        'minecraft:meadow', 'minecraft:savanna', 'minecraft:cherry_grove', 'minecraft:windswept_hills']})
    (ROOT / 'build/sanctums-manifest.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(records, ensure_ascii=False))


if __name__ == '__main__':
    main()
