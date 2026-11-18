import argparse
import gzip
from pathlib import Path
from tempfile import TemporaryDirectory

from build_sanctums import nbt, text


SEED = 12345


def dimension(name, biome_source):
    return 10, {
        'type': (8, 'minecraft:' + name),
        'generator': (10, {
            'type': (8, 'minecraft:noise'),
            'settings': (8, 'minecraft:' + name),
            'biome_source': (10, biome_source),
        }),
    }


def world_data():
    overworld = {'type': (8, 'minecraft:multi_noise'), 'preset': (8, 'minecraft:overworld')}
    nether = {'type': (8, 'minecraft:multi_noise'), 'preset': (8, 'minecraft:nether')}
    dimensions = {
        'minecraft:overworld': dimension('overworld', overworld),
        'minecraft:the_nether': dimension('the_nether', nether),
        'minecraft:the_end': dimension('the_end', {'type': (8, 'minecraft:the_end')}),
    }
    dimensions['minecraft:the_nether'][1]['generator'][1]['settings'] = (8, 'minecraft:nether')
    return {
        'DataVersion': (3, 3955), 'version': (3, 19133),
        'Version': (10, {'Id': (3, 3955), 'Name': (8, '1.21.1'), 'Series': (8, 'main'), 'Snapshot': (1, 0)}),
        'LevelName': (8, '神格之路 · 高山远征'), 'GameType': (3, 0),
        'hardcore': (1, 0), 'Difficulty': (1, 2), 'allowCommands': (1, 0), 'initialized': (1, 1),
        'Time': (4, 0), 'DayTime': (4, 1000), 'LastPlayed': (4, 0),
        'SpawnX': (3, 10), 'SpawnY': (3, 90), 'SpawnZ': (3, -7),
        'GameRules': (10, {'spawnRadius': (8, '0')}),
        'DataPacks': (10, {'Enabled': (9, (8, ['vanilla'])), 'Disabled': (9, (8, []))}),
        'WorldGenSettings': (10, {'seed': (4, SEED), 'generate_features': (1, 1),
                                  'bonus_chest': (1, 0), 'dimensions': (10, dimensions)}),
    }


def encoded(payload):
    return gzip.compress(bytes([10]) + text('') + nbt(10, payload), mtime=0)


def scoreboard_data():
    objective = {'Name': (8, 'gp_expedition'), 'CriteriaName': (8, 'dummy'),
                 'DisplayName': (8, '{"text":"GodPath Expedition"}'), 'RenderType': (8, 'integer')}
    score = {'Name': (8, 'map'), 'Objective': (8, 'gp_expedition'), 'Score': (3, 1), 'Locked': (1, 1)}
    return {'DataVersion': (3, 3955), 'data': (10, {'Objectives': (9, (10, [objective])),
                                                       'PlayerScores': (9, (10, [score]))})}


def create_world(destination):
    destination = destination.resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix='.expedition-', dir=destination.parent) as staging:
        world = Path(staging) / 'world'
        (world / 'data').mkdir(parents=True)
        (world / 'level.dat').write_bytes(encoded({'Data': (10, world_data())}))
        (world / 'data/scoreboard.dat').write_bytes(encoded(scoreboard_data()))
        if destination.exists():
            raise FileExistsError(destination)
        world.rename(destination)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination', type=Path)
    arguments = parser.parse_args()
    try:
        create_world(arguments.destination)
    except FileExistsError:
        parser.error(f'Save already exists: {arguments.destination}')
    print(arguments.destination.resolve())
