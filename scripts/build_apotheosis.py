"""Author Curios equipment and 19 native SlashBlade branches; reference installed artwork."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'pack/kubejs'
DATA = PACK / 'data'
BRANCHES = {
    'origin': ('太初', ['agito', 'orotiagito', 'yasha_true'], 'drive_vertical', 'amethyst_block', 'netherite_ingot'),
    'life': ('青帝', ['fox_white', 'fox_black', 'sange'], 'sakura_end', 'golden_carrot', 'enchanted_golden_apple'),
    'gear': ('天工', ['rodai_iron', 'rodai_diamond', 'rodai_netherite'], 'wave_edge', 'iron_block', 'nether_star'),
    'rail': ('逐星', ['ruby', 'doutanuki', 'yamato'], 'piercing', 'ender_pearl', 'echo_shard'),
    'arcane': ('月蚀', ['yuzukitukumo', 'koseki', 'orotiagito_sealed'], 'drive_horizontal', 'amethyst_block', 'end_crystal'),
    'blade': ('断空', ['yasha', 'muramasa', 'orotiagito'], 'void_slash', 'blaze_rod', 'wither_skeleton_skull'),
}


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    # Source definitions supply only resource IDs. No upstream art files are copied.
    sources = json.loads((ROOT / 'build/vision-research/slashblade-definitions.json').read_text(encoding='utf-8'))
    source = json.loads((ROOT / 'pack/god_items.json').read_text(encoding='utf-8'))
    for name, size, order, icon in [
        ('godpath_relic', 6, 50, 'curios:slot/empty_charm_slot'),
        ('godpath_divinity', 1, 49, 'curios:slot/empty_curio_slot'),
    ]:
        write(DATA / f'godpath/curios/slots/{name}.json', {
            'size': size, 'order': order, 'add_cosmetic': False,
            'icon': icon, 'validators': ['curios:tag']})
    write(DATA / 'godpath/curios/entities/player.json', {
        'entities': ['minecraft:player'], 'slots': ['godpath_relic', 'godpath_divinity']})
    write(DATA / 'curios/tags/item/godpath_relic.json', {
        'replace': False, 'values': ['godpath:' + item['id'] for item in source['items']]})
    write(DATA / 'curios/tags/item/godpath_divinity.json', {'replace': False, 'values': ['godpath:divinity_mark']})
    names = {}
    catalog = []
    for law, (prefix, models, art, middle, final) in BRANCHES.items():
        for tier in range(1, 4):
            id = f'{law}_{tier}'
            title = prefix + ' · ' + ['初鸣', '真解', '法相'][tier - 1]
            names['item.godpath.' + id] = title
            props = {'attack_base': [12, 28, 52][tier - 1], 'max_damage': [256, 768, 2048][tier - 1],
                     'slash_art': 'slashblade:' + art, 'sword_type': ['bewitched']}
            write(DATA / f'godpath/slashblade/named_blades/{id}.json', {
                'name': 'godpath:' + id, 'properties': props, 'render': sources[models[tier - 1]]['render']})
            base = {'type': 'slashblade:blade', 'items': ['slashblade:slashblade'], 'request': {}}
            if tier > 1:
                base['request'] = {'name': f'godpath:{law}_{tier-1}', 'kill': [0, 50, 200][tier - 1],
                                   'refine': [0, 3, 10][tier - 1], 'proud_soul': [0, 2000, 10000][tier - 1]}
            key = {'B': base, 'S': {'item': f'godpath:{law}_shard'}}
            pattern = ['SSS', 'SBS', 'SSS']
            if tier > 1:
                key['C'] = {'item': 'minecraft:' + (middle if tier == 2 else final)}
                pattern = ['SCS', 'CBC', 'SCS']
            write(DATA / f'godpath/recipe/blades/{id}.json', {
                'type': 'slashblade:shaped_blade', 'blade': 'godpath:' + id, 'category': 'equipment',
                'pattern': pattern, 'key': key, 'result': {'id': 'slashblade:slashblade', 'count': 1}})
            catalog.append({'id': 'godpath:' + id, 'name': title, 'law': law, 'tier': tier,
                            'attack': props['attack_base'], 'request': base.get('request', {}), 'art': art})
    names['item.godpath.apotheosis'] = '归墟 · 万象神裁'
    write(DATA / 'godpath/slashblade/named_blades/apotheosis.json', {
        'name': 'godpath:apotheosis', 'properties': {'attack_base': 120, 'max_damage': 9999,
        'unbreakable': True, 'destructable': False, 'slash_art': 'slashblade:void_slash',
        'sword_type': ['bewitched']}, 'render': sources['yamato']['render']})
    names.update({'curios.identifier.godpath_relic': '神物', 'curios.identifier.godpath_divinity': '神格',
                  'godpath.ritual.begin': '神座共鸣', 'godpath.ritual.begin.subtitle': '六道法则正在合一',
                  'godpath.ritual.ascended': '神格降临', 'godpath.ritual.ascended.subtitle': '六道法则已归于一身'})
    for lang in ['zh_cn', 'en_us']:
        path = PACK / f'assets/godpath/lang/{lang}.json'
        values = json.loads(path.read_text(encoding='utf-8'))
        values.update(names)
        write(path, values)
    write(ROOT / 'build/blade-catalog-4.0.json', catalog)
    rows = ['# 六道刀谱与饰品共鸣', '', '背包中的神物仍可登记。按 Curios 的饰品键（默认为 G，可在按键设置查看）打开六个神物槽和一个神格槽。',
            '佩戴同法则 2 / 4 件激活专精。六法则各一件激活万象共鸣。', '',
            '拔刀剑左键、右键和蓄力沿用原模组操作。手持成长刀、神裁，或达到刀阶 I 的原生拔刀剑时，按 `F8` 施放剑气斩，潜行时按 `F8` 施放刀魂爆发。技能键可在控制设置的 KubeJS 分类修改。', '',
            '| 法则刀系 | 初鸣攻击 | 真解攻击 | 法相攻击 | 原生 SA |', '|---|---:|---:|---:|---|']
    for law, (prefix, _, art, _, _) in BRANCHES.items(): rows.append(f'| {prefix} / {law} | 12 | 28 | 52 | {art} |')
    rows += ['', '初鸣：8 个本系碎片 + 一把原生无铭拔刀剑。',
             '真解：前阶刀达到 50 杀、锻造 3、刀魂 2000，再配合本系碎片和材料升级。',
             '法相：前阶刀达到 200 杀、锻造 10、刀魂 10000，再配合稀有材料升级。',
             '原生 JEI 配方可以查看具体刀身要求。六条分支各 3 阶，共新增 18 把成长刀。', '',
             '成神专属「归墟 · 万象神裁」基础攻击 120、不可损坏、原生虚空斩 SA。首次成神或旧神格升级后发放一次；重登与属性恢复不会重复赠送。', '',
             '| 佩戴法则 | 两件共鸣 | 四件共鸣 |', '|---|---|---|',
             '| 原初 | 护甲 +12 | 韧性 +8、抗击退 +0.5 |',
             '| 丰饶 | 生命 +20 | 对敌伤害的 15% 吸血，每次至多 12 生命 |',
             '| 机械 | 攻速 +0.3 | 攻击 +20 |',
             '| 连接 | 基础移速 +20% | 跨步高度 +1 |',
             '| 奥秘 | 幸运 +8 | 本包剑气与爆发冷却降低 35% |',
             '| 斩断 | 攻击 +18 | 总攻击再提高 35% |',
             '| 六系各一 | 生命 +40、攻击 +24、基础移速 +15% | 需要六个槽各选不同法则 |', '',
             '刀身外观引用已安装拔刀剑的原生模型与纹理；本包不重分发上游独立美术。']
    (ROOT / 'pack/docs/六道刀谱与饰品共鸣.md').write_text('\n'.join(rows) + '\n', encoding='utf-8')
    print('Built 7 Curios slots, 24 wearable relics, 18 native progression blades + 1 divine blade.')


if __name__ == '__main__':
    main()
