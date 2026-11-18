import hashlib
import json
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PROJECT = json.loads((ROOT / 'project.json').read_text(encoding='utf-8'))
ARCHIVE = ROOT / 'dist' / (PROJECT['artifact'] + '.mrpack')


class DistributionTests(unittest.TestCase):
    def test_all_manifest_entries_are_mod_jars(self):
        mods = json.loads((ROOT / 'scripts/final_mods.json').read_text(encoding='utf-8'))
        self.assertTrue(all(m['filename'].lower().endswith('.jar') for m in mods))

    def test_downloader_and_release_share_the_locked_manifest(self):
        mods = json.loads((ROOT / 'scripts/final_mods.json').read_text(encoding='utf-8'))
        downloads = json.loads((ROOT / 'pack/mods.json').read_text(encoding='utf-8'))
        self.assertEqual({m['filename']: m['sha512'] for m in mods},
                         {m['name']: m['sha512'] for m in downloads})

    def test_archive_ships_current_scripts(self):
        with zipfile.ZipFile(ARCHIVE) as archive:
            for source in (ROOT / 'pack/kubejs').rglob('*.js'):
                key = 'overrides/' + source.relative_to(ROOT / 'pack').as_posix()
                self.assertEqual(archive.read(key), source.read_bytes(), key)
            for source in (ROOT / 'pack/kubejs/data').rglob('*.json'):
                key = 'overrides/' + source.relative_to(ROOT / 'pack').as_posix()
                self.assertEqual(archive.read(key), source.read_bytes(), key)

    def test_client_visuals_are_complete_and_isolated_tests_are_not_shipped(self):
        with zipfile.ZipFile(ARCHIVE) as archive:
            names = archive.namelist()
            for folder in ('resourcepacks', 'shaderpacks'):
                for source in (ROOT / 'pack' / folder).iterdir():
                    key = 'client-overrides/' + source.relative_to(ROOT / 'pack').as_posix()
                    self.assertEqual(archive.read(key), source.read_bytes(), key)
            self.assertFalse(any(any(marker in n for marker in ('zz_runtime', 'zz_vision', 'zz_apotheosis', 'zz_blade', 'zz_deep', 'runtime-control')) for n in names))
            options = archive.read('client-overrides/config/fancymenu/options.txt').decode('utf-8')
            self.assertIn("B:modpack_mode = 'true'", options)
            self.assertIn("B:show_customization_overlay = 'false'", options)
            self.assertIn("B:show_welcome_screen = 'false'", options)

    def test_optional_world_contains_only_generated_template(self):
        world_zip = ROOT / 'dist/GodPath-Expedition.zip'
        with zipfile.ZipFile(world_zip) as archive:
            files = {entry.filename for entry in archive.infolist() if not entry.is_dir()}
            self.assertEqual(files, {'GodPath-Expedition/level.dat', 'GodPath-Expedition/data/scoreboard.dat'})
        with zipfile.ZipFile(ARCHIVE) as archive:
            self.assertFalse(any('/saves/' in name for name in archive.namelist()))

    def test_blade_compatibility_data_is_shipped_and_redundant_animation_is_absent(self):
        with zipfile.ZipFile(ARCHIVE) as archive:
            tag = 'kubejs/data/spell_engine/tags/item/non_combat_tools.json'
            self.assertEqual(archive.read('overrides/' + tag), (ROOT / 'pack' / tag).read_bytes())
            index = json.loads(archive.read('modrinth.index.json'))
            self.assertFalse(any('notenoughanimations' in f['path'] for f in index['files']))

    def test_archive_manifest_matches_mod_hashes_and_environments(self):
        mods = json.loads((ROOT / 'scripts/final_mods.json').read_text(encoding='utf-8'))
        with zipfile.ZipFile(ARCHIVE) as archive:
            index = json.loads(archive.read('modrinth.index.json'))
            self.assertEqual(index['dependencies'], {'minecraft': '1.21.1', 'neoforge': '21.1.250'})
            entries = {f['path']: f for f in index['files']}
            self.assertEqual(len(entries), len(mods))
            for mod in mods:
                entry = entries['mods/' + mod['filename']]
                self.assertEqual(entry['hashes']['sha512'], mod['sha512'])
                if mod.get('server_side') == 'unsupported':
                    self.assertEqual(entry['env']['server'], 'unsupported', mod['slug'])


if __name__ == '__main__':
    unittest.main()
