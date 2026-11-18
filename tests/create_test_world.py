"""Create a fresh flat NBT world for the isolated client's quick-play test."""
import gzip
from pathlib import Path
import struct
import argparse

ROOT = Path(__file__).resolve().parents[1]


def utf(value):
    data = value.encode('utf-8')
    return struct.pack('>H', len(data)) + data


def payload(kind, value):
    if kind in (1, 2, 3, 4, 5, 6):
        return struct.pack({1: '>b', 2: '>h', 3: '>i', 4: '>q', 5: '>f', 6: '>d'}[kind], value)
    if kind == 8:
        return utf(value)
    if kind == 9:
        child, values = value
        return bytes([child]) + struct.pack('>i', len(values)) + b''.join(payload(child, v) for v in values)
    if kind == 10:
        return b''.join(bytes([k]) + utf(name) + payload(k, v) for name, (k, v) in value.items()) + b'\0'
    raise ValueError(kind)


def create(name='GodPathValidation', terrain='flat'):
    world = ROOT / 'build/playtest/instance/saves' / name
    if (world / 'level.dat').exists():
        print('Retaining existing isolated smoke-test world:', world)
        return
    world.mkdir(parents=True, exist_ok=True)
    overworld = {'type': (8, 'minecraft:overworld'), 'generator': (10, {
        'type': (8, 'minecraft:flat'), 'settings': (10, {
            'biome': (8, 'minecraft:plains'), 'lakes': (1, 0), 'features': (1, 0),
            'structure_overrides': (9, (8, [])),
            'layers': (9, (10, [
                {'height': (3, 1), 'block': (8, 'minecraft:bedrock')},
                {'height': (3, 60), 'block': (8, 'minecraft:dirt')},
                {'height': (3, 1), 'block': (8, 'minecraft:grass_block')},
            ])),
        })})}
    if terrain == 'normal':
        overworld['generator'] = (10, {'type': (8, 'minecraft:noise'), 'settings': (8, 'minecraft:overworld'),
            'biome_source': (10, {'type': (8, 'minecraft:multi_noise'), 'preset': (8, 'minecraft:overworld')})})
    dimensions = {'minecraft:overworld': (10, overworld)}
    for name, biome in [('the_nether', 'nether'), ('the_end', 'the_end')]:
        dimensions['minecraft:' + name] = (10, {'type': (8, 'minecraft:' + name), 'generator': (10, {
            'type': (8, 'minecraft:noise'), 'settings': (8, 'minecraft:' + biome),
            'biome_source': (10, {'type': (8, 'minecraft:the_end')}) if name == 'the_end' else (10, {
                'type': (8, 'minecraft:multi_noise'), 'preset': (8, 'minecraft:nether')})})})
    data = {
        'DataVersion': (3, 3955), 'version': (3, 19133),
        'Version': (10, {'Id': (3, 3955), 'Name': (8, '1.21.1'), 'Series': (8, 'main'), 'Snapshot': (1, 0)}),
        'LevelName': (8, 'GodPath isolated smoke test'), 'GameType': (3, 1),
        'hardcore': (1, 0), 'Difficulty': (1, 3), 'allowCommands': (1, 0), 'initialized': (1, 0),
        'Time': (4, 0), 'DayTime': (4, 1000), 'LastPlayed': (4, 0),
        'SpawnX': (3, 0), 'SpawnY': (3, 80 if terrain == 'normal' else -2), 'SpawnZ': (3, 0), 'SpawnAngle': (5, 0),
        'GameRules': (10, {'doMobSpawning': (8, 'false'), 'doDaylightCycle': (8, 'false')}),
        'DataPacks': (10, {'Enabled': (9, (8, ['vanilla'])), 'Disabled': (9, (8, []))}),
        'WorldGenSettings': (10, {'seed': (4, 42), 'generate_features': (1, 1 if terrain == 'normal' else 0),
                                  'bonus_chest': (1, 0), 'dimensions': (10, dimensions)}),
    }
    with gzip.open(world / 'level.dat', 'wb') as output:
        output.write(bytes([10]) + utf('') + payload(10, {'Data': (10, data)}))
    print('Created isolated', terrain, 'test world:', world)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', default='GodPathValidation')
    parser.add_argument('--terrain', choices=['flat', 'normal'], default='flat')
    args = parser.parse_args()
    create(args.name, args.terrain)
