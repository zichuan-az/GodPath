import json
from pathlib import Path
import unittest

DATA = Path(__file__).resolve().parents[1] / 'pack/kubejs/data'


def read(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


class DeepRepairTests(unittest.TestCase):
    def test_garnished_uses_quark_color_ids_for_each_material(self):
        for color, item in [
            ('blue/framed_glass', 'blue_framed_glass'),
            ('magenta/stool', 'magenta_stool'),
            ('purple/waxed_corundum', 'waxed_violet_corundum'),
        ]:
            recipe = read(f'garnished/recipe/dye_blowing/quark/{color}.json')
            self.assertEqual(recipe['results'], [{'item': {'id': 'quark:' + item}, 'count': 1}])

    def test_malum_uses_registered_spirit_and_repair_fields(self):
        root = 'malum/recipe/malum/spirit_repair/'
        chalk = read(root + 'occultism/red_chalk.json')
        self.assertEqual(chalk['validItems'], ['occultism:chalk_red'])
        sword = read(root + 'undergarden/forgotten.json')
        self.assertEqual(sword['regex']['itemIdRegex'], 'forgotten_.+')
        self.assertTrue(all(s['type'].startswith('malum:') for s in sword['spirits']))

    def test_smoke_bomb_has_a_legal_crafting_stack(self):
        recipe = read('undead_revamp2/recipe/smokebombrep.json')
        self.assertEqual(recipe['result'], {'id': 'undead_revamp2:sleepingsmokebomb', 'count': 1})

    def test_absent_compat_recipe_is_conditioned_before_item_codec(self):
        recipe = read('slashblade_addon/recipe/slashblade_tofu_ishi.json')
        self.assertIn({'type': 'neoforge:mod_loaded', 'modid': 'tofucraft'}, recipe['neoforge:conditions'])

    def test_warehouse_and_manor_chests_have_loot_when_optional_mods_are_absent(self):
        warehouse = read('wares/loot_table/chests/village/dark_forest_warehouse.json')
        self.assertTrue(any(entry.get('name') == 'minecraft:paper' for pool in warehouse['pools'] for entry in pool['entries']))
        manor = read('idas/loot_table/chests/haunted_manor/if_haunted_manor.json')
        self.assertEqual(manor['pools'][0]['entries'][0]['value'], 'idas:chests/haunted_manor/haunted_manor')


if __name__ == '__main__':
    unittest.main()
