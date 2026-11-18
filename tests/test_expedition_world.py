import gzip
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/build_expedition_world.py'


class ExpeditionWorldTests(unittest.TestCase):
    def test_new_world_contains_opt_in_and_normal_survival_terrain(self):
        with TemporaryDirectory() as directory:
            world = Path(directory) / 'Expedition'
            result = subprocess.run([sys.executable, str(SCRIPT), str(world)], capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors='replace'))
            scoreboard = gzip.decompress((world / 'data/scoreboard.dat').read_bytes())
            self.assertIn(b'gp_expedition', scoreboard)
            self.assertIn(b'PlayerScores', scoreboard)
            nbt = gzip.decompress((world / 'level.dat').read_bytes())
            self.assertIn(b'minecraft:multi_noise', nbt)
            self.assertIn(b'minecraft:overworld', nbt)
            self.assertIn(b'GameType\x00\x00\x00\x00', nbt)
            self.assertIn(b'generate_features\x01', nbt)

    def test_existing_save_is_not_modified(self):
        with TemporaryDirectory() as directory:
            world = Path(directory)
            prior = world / 'level.dat'
            prior.write_bytes(b'original save')
            result = subprocess.run([sys.executable, str(SCRIPT), str(world)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(prior.read_bytes(), b'original save')
            self.assertFalse((world / 'data/scoreboard.dat').exists())


if __name__ == '__main__':
    unittest.main()
