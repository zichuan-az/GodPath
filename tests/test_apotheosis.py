import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'pack/kubejs/data'


class ApotheosisDataTests(unittest.TestCase):
    def test_relics_have_six_real_equipment_slots_and_a_separate_divinity_slot(self):
        relic = json.loads((DATA / 'godpath/curios/slots/godpath_relic.json').read_text(encoding='utf-8'))
        self.assertEqual(relic['size'], 6)
        entities = json.loads((DATA / 'godpath/curios/entities/player.json').read_text(encoding='utf-8'))
        self.assertIn('godpath_relic', entities['slots'])
        tag = json.loads((DATA / 'curios/tags/item/godpath_relic.json').read_text(encoding='utf-8'))
        self.assertEqual(len(tag['values']), 24)
        divinity = json.loads((DATA / 'curios/tags/item/godpath_divinity.json').read_text(encoding='utf-8'))
        self.assertEqual(divinity['values'], ['godpath:divinity_mark'])

    def test_empty_relic_and_divinity_slots_use_distinct_curios_sprites(self):
        for slot, icon in [('godpath_relic', 'empty_charm_slot'), ('godpath_divinity', 'empty_curio_slot')]:
            data = json.loads((DATA / f'godpath/curios/slots/{slot}.json').read_text(encoding='utf-8'))
            self.assertEqual(data['icon'], 'curios:slot/' + icon)

    def test_native_blade_items_are_excluded_from_spell_engine_fallback(self):
        rules = json.loads((DATA / 'spell_engine/tags/item/non_combat_tools.json').read_text(encoding='utf-8'))
        self.assertFalse(rules['replace'])
        self.assertEqual(set(rules['values']), {
            'slashblade:slashblade', 'slashblade:slashblade_bamboo',
            'slashblade:slashblade_silverbamboo', 'slashblade:slashblade_white',
            'slashblade:slashblade_wood',
        })

    def test_nineteen_native_blades_have_real_progression_and_distinct_branches(self):
        blades = list((DATA / 'godpath/slashblade/named_blades').glob('*.json'))
        self.assertEqual(len(blades), 19)
        for law in ['origin', 'life', 'gear', 'rail', 'arcane', 'blade']:
            for tier in range(1, 4):
                id = f'{law}_{tier}'
                blade = json.loads((DATA / f'godpath/slashblade/named_blades/{id}.json').read_text(encoding='utf-8'))
                self.assertEqual(blade['name'], 'godpath:' + id)
                self.assertIn('slash_art', blade['properties'])
                recipe = json.loads((DATA / f'godpath/recipe/blades/{id}.json').read_text(encoding='utf-8'))
                self.assertEqual(recipe['type'], 'slashblade:shaped_blade')
                self.assertEqual(recipe['blade'], 'godpath:' + id)
                # SlashBladeIngredient 2.1.9 makes request a required codec field, including tier 1.
                self.assertIsInstance(recipe['key']['B'].get('request'), dict)
                if tier > 1:
                    request = recipe['key']['B']['request']
                    self.assertEqual(request['name'], f'godpath:{law}_{tier-1}')
                    self.assertGreaterEqual(request['kill'], 50)
        god = json.loads((DATA / 'godpath/slashblade/named_blades/apotheosis.json').read_text(encoding='utf-8'))
        self.assertTrue(god['properties']['unbreakable'])
        self.assertGreaterEqual(god['properties']['attack_base'], 100)


if __name__ == '__main__':
    unittest.main()
