import gzip
import json
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'pack'
LAWS = ['origin', 'life', 'gear', 'rail', 'arcane', 'blade']


class VisionTests(unittest.TestCase):
    def test_all_godpath_items_have_models_with_existing_texture_references(self):
        root = PACK / 'kubejs/assets/godpath'
        names = list(root.glob('models/item/*.json'))
        definitions = json.loads((PACK / 'god_items.json').read_text(encoding='utf-8'))
        required = {item['id'] for item in definitions['items']}
        required.update(law['shard'] for law in definitions['laws'])
        required.add('divinity_mark')
        self.assertTrue(required.issubset({file.stem for file in names}))
        for file in names:
            model = json.loads(file.read_text(encoding='utf-8'))
            textures = model.get('textures', {})
            for texture in textures.values():
                if texture.startswith('#'):
                    self.assertIn(texture[1:], textures, file.name)
                    continue
                namespace, path = texture.split(':')
                if namespace == 'godpath':
                    self.assertTrue((root / 'textures' / (path + '.png')).is_file(), file.name)
        chinese = json.loads((root / 'lang/zh_cn.json').read_text(encoding='utf-8'))
        self.assertEqual(chinese['item.godpath.divinity_mark'], '神格印记')
    def test_server_worldgen_mods_are_installed_for_singleplayer_too(self):
        project = json.loads((ROOT / 'project.json').read_text(encoding='utf-8'))
        with zipfile.ZipFile(ROOT / 'dist' / (project['artifact'] + '.mrpack')) as archive:
            files = json.loads(archive.read('modrinth.index.json'))['files']
            for token in ['ctov', 'MoogsVoyagerStructures', 'YungsBridges', 'noisium', 'lootjs']:
                entry = next(x for x in files if token in x['path'])
                self.assertEqual(entry['env']['client'], 'required')
    def test_default_language_theme_and_shader_are_shipped_and_enabled(self):
        options = (PACK / 'options.txt').read_text(encoding='utf-8')
        self.assertIn('lang:zh_cn', options)
        self.assertIn('GodPath-Cozy-1.21.1.zip', options)
        config = (PACK / 'config/iris.properties').read_text(encoding='utf-8')
        self.assertIn('shaderPack=MakeUp-UltraFast-9.6.zip', config)
        self.assertTrue((PACK / 'shaderpacks/MakeUp-UltraFast-9.6.zip').is_file())

    def test_cozy_backport_has_real_1211_paths_and_compatible_metadata(self):
        with zipfile.ZipFile(PACK / 'resourcepacks/GodPath-Cozy-1.21.1.zip') as archive:
            self.assertEqual(json.loads(archive.read('pack.mcmeta'))['pack']['pack_format'], 34)
            names = archive.namelist()
            self.assertFalse(any('assets/assets' in n or n.startswith('26_') for n in names))
            self.assertIn('assets/minecraft/textures/gui/sprites/hud/effect_background.png', names)
            lang = json.loads(archive.read('assets/minecraft/lang/zh_cn.json'))
            self.assertIn('启程', lang['menu.singleplayer'])
            self.assertIn('LICENSE.txt', names)

    def test_chinese_overlay_contains_substantial_real_translations_with_credits(self):
        with zipfile.ZipFile(PACK / 'resourcepacks/GodPath-zh_cn.zip') as archive:
            entries = [n for n in archive.namelist() if n.endswith('/lang/zh_cn.json')]
            self.assertGreaterEqual(len(entries), 40)
            translated = 0
            for name in entries:
                values = json.loads(archive.read(name))
                translated += sum(any('\u4e00' <= c <= '\u9fff' for c in str(v)) for v in values.values())
            self.assertGreater(translated, 4000)
            self.assertIn('CREDITS.md', archive.namelist())

    def test_six_sanctums_use_natural_structure_sets_and_valid_loot_references(self):
        root = PACK / 'kubejs/data/godpath'
        structure_set = json.loads((root / 'worldgen/structure_set/law_sanctums.json').read_text(encoding='utf-8'))
        self.assertEqual({s['structure'] for s in structure_set['structures']},
                         {'godpath:' + law + '_sanctum' for law in LAWS})
        self.assertGreater(structure_set['placement']['spacing'], structure_set['placement']['separation'])
        for law in LAWS:
            name = law + '_sanctum'
            structure = json.loads((root / 'worldgen/structure' / (name + '.json')).read_text(encoding='utf-8'))
            self.assertEqual(structure['type'], 'minecraft:jigsaw')
            pool = json.loads((root / 'worldgen/template_pool' / (name + '.json')).read_text(encoding='utf-8'))
            self.assertEqual(pool['elements'][0]['element']['location'], 'godpath:' + name)
            nbt = gzip.decompress((root / 'structure' / (name + '.nbt')).read_bytes())
            self.assertIn(b'godpath:chests/' + law.encode() + b'_cache', nbt)
            loot = json.loads((root / 'loot_table/chests' / (law + '_cache.json')).read_text(encoding='utf-8'))
            self.assertTrue(any(e.get('name') == 'godpath:' + law + '_shard'
                                for pool in loot['pools'] for e in pool['entries']))


if __name__ == '__main__':
    unittest.main()
