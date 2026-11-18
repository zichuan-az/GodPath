"""Build reproducible Chinese, CozyUI backport and MakeUp client assets."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'build/vision-research'
PACK = ROOT / 'pack'
RANK = {'1.18': 0, '1.19': 1, '1.20': 2, '1.20.1': 3, '1.21': 4, '1.21.1': 5}


def source_rank(path):
    version = path.split('/')[3]
    minor = int(re.match(r'1\.(\d+)', version)[1])
    return minor * 10 + (0 if 'fabric' in version else 2) + (1 if version.startswith('1.21.1') else 0)


def jsonc(text):
    text = text.lstrip('\ufeff')
    text = re.sub(r'("(?:\\.|[^"\\])*")|//[^\r\n]*|/\*[\s\S]*?\*/',
                  lambda m: m[1] or '', text)
    text = re.sub(r'("(?:\\.|[^"\\])*")|,\s*(?=[}\]])', lambda m: m[1] or '', text)
    return json.loads(text)


def encoded(value):
    return json.dumps(value, ensure_ascii=False, indent=2).encode('utf-8')


def chinese(value):
    return isinstance(value, str) and any('\u4e00' <= c <= '\u9fff' for c in value)


def languages():
    installed = {}
    for mod in json.loads((ROOT / 'scripts/final_mods.json').read_text(encoding='utf-8')):
        jar = ROOT / 'build/playtest/instance/mods' / mod['filename']
        if not jar.exists():
            jar = CACHE / mod['filename']
        with zipfile.ZipFile(jar) as archive:
            for name in archive.namelist():
                if name.startswith('assets/') and name.endswith('/lang/en_us.json'):
                    try:
                        english = jsonc(archive.read(name).decode('utf-8-sig'))
                        zhname = name[:-10] + 'zh_cn.json'
                        native = jsonc(archive.read(zhname).decode('utf-8-sig')) if zhname in archive.namelist() else {}
                        installed[name.split('/')[1]] = (english, native)
                    except (ValueError, UnicodeError):
                        pass
    repo = CACHE / 'cfpa-source'
    selected = json.loads((CACHE / 'cfpa-selection.json').read_text(encoding='utf-8'))
    translations, english_terms, skipped = {}, {}, []
    for file in sorted(selected, key=source_rank):
        parts = file.split('/')
        if not file.endswith('/lang/zh_cn.json'):
            continue
        try:
            values = jsonc((repo / file).read_text(encoding='utf-8-sig'))
            target = translations.setdefault(parts[4], {})
            target.update({k: v for k, v in values.items() if isinstance(v, str)})
            paired = repo / file.replace('/zh_cn.json', '/en_us.json')
            if paired.exists():
                source_en = jsonc(paired.read_text(encoding='utf-8-sig'))
                terms = english_terms.setdefault(parts[4], {})
                for key, value in source_en.items():
                    if chinese(values.get(key)) and isinstance(value, str):
                        terms[value.strip()] = values[key]
        except (ValueError, UnicodeError) as error:
            skipped.append({'file': file, 'error': str(error)})
    coverage = []
    shared_terms = {}
    for terms in english_terms.values():
        for text, translation in terms.items():
            shared_terms.setdefault(text, set()).add(translation)
    with zipfile.ZipFile(PACK / 'resourcepacks/GodPath-zh_cn.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('pack.mcmeta', encoded({'pack': {'pack_format': 34, 'description': '神格之路 · 模组简体中文补全 / CFPA'}}))
        for namespace, (english, native) in sorted(installed.items()):
            merged = {k: v for k, v in translations.get(namespace, {}).items() if k in english and chinese(v)}
            rekeyed = 0
            for key, text in english.items():
                if key in merged or chinese(native.get(key)) or not isinstance(text, str):
                    continue
                # Exact same English text can survive mod key renames. No fuzzy or machine translation.
                translation = english_terms.get(namespace, {}).get(text.strip())
                candidates = shared_terms.get(text.strip(), set())
                if not translation and len(candidates) == 1:
                    translation = next(iter(candidates))
                if translation:
                    merged[key] = translation
                    rekeyed += 1
            # Invalid format placeholders can break whole tooltips; retain native text for such entries.
            for key in list(merged):
                fmt = lambda s: sorted(re.findall(r'%(?:\d+\$)?([sdf])', str(s)))
                if fmt(merged[key]) != fmt(english[key]):
                    merged.pop(key)
            if merged:
                archive.writestr(f'assets/{namespace}/lang/zh_cn.json', encoded(merged))
            combined = dict(native, **merged)
            before = sum(chinese(native.get(k)) for k in english)
            after = sum(chinese(combined.get(k)) for k in english)
            coverage.append({'namespace': namespace, 'keys': len(english), 'chinese_before': before,
                             'chinese_after': after, 'added': after - before,
                             'matched_english_terms': rekeyed,
                             'remaining': [k for k in english if not chinese(combined.get(k))]})
        commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
        credits = ('# CFPA 模组简体中文翻译\n\n来源：https://github.com/CFPAOrg/Minecraft-Mod-Language-Package\n'
                   f'源码版本：{commit}\n本包按所装模组筛选并合并 1.21 与兼容旧版词条。\n'
                   '许可：CC BY-NC-SA 4.0；非商业使用、署名、相同方式共享。\n原作者与贡献者见上游 Git 历史。\n')
        archive.writestr('CREDITS.md', credits.encode('utf-8'))
        archive.writestr('LICENSE', (repo / 'LICENSE').read_bytes())
    report = {'source_commit': commit, 'namespaces': coverage, 'skipped_files': skipped,
              'chinese_keys_added': sum(x['added'] for x in coverage),
              'chinese_keys_after': sum(x['chinese_after'] for x in coverage),
              'total_keys': sum(x['keys'] for x in coverage)}
    (ROOT / 'build/localization-coverage-4.0.json').write_bytes(encoded(report))
    print('Chinese keys added:', report['chinese_keys_added'], 'total Chinese:', report['chinese_keys_after'])


def main():
    for name in ['resourcepacks', 'shaderpacks', 'config/fancymenu/assets', 'config/fancymenu/customization']:
        (PACK / name).mkdir(parents=True, exist_ok=True)
    shutil.copy2(CACHE / 'CozyUI+_v1.10.zip', PACK / 'resourcepacks/CozyUI+_v1.10.zip')
    shutil.copy2(CACHE / 'MakeUp-UltraFast-9.6.zip', PACK / 'shaderpacks/MakeUp-UltraFast-9.6.zip')
    with zipfile.ZipFile(CACHE / 'CozyUI+_ysnCE_v1.4.0-beta.zip') as source:
        with zipfile.ZipFile(PACK / 'resourcepacks/GodPath-Cozy-1.21.1.zip', 'w', zipfile.ZIP_DEFLATED) as target:
            target.writestr('pack.mcmeta', encoded({'pack': {'pack_format': 34,
                'description': '神格之路 4.0 · CozyUI+ / ysnCE 1.21.1 适配'}}))
            for name in source.namelist():
                # CE 1.4 targets new versions and contains a duplicated assets path.
                # Backport only sprites whose vanilla 1.21.1 IDs remain identical.
                normalized = name.replace('1_21_11/assets/assets/', 'assets/')
                if normalized.startswith('assets/minecraft/textures/gui/sprites/hud/effect_background'):
                    target.writestr(normalized, source.read(name))
            target.writestr('LICENSE.txt', source.read('LICENSE.txt'))
            target.writestr('CREDITS.md', ('CozyUI+：Fogg05 / https://github.com/Fogg05/CozyUI-Plus\n'
                'ysnCE：依斯那 / https://github.com/mc-ysn/ysn_resourcepacks\n'
                'GodPath 1.21.1 backport: HUD sprites relocated; unsupported 26.x overlays excluded.\n'
                'License: GPL-3.0. Source assets retained under build/vision-research.\n').encode('utf-8'))
            target.writestr('assets/minecraft/lang/zh_cn.json', encoded({
                'menu.singleplayer': '启程 · 单人世界', 'menu.multiplayer': '同行 · 联机冒险',
                'menu.options': '设置与画质…', 'menu.quit': '暂别这片世界',
                'menu.returnToGame': '返回冒险', 'menu.returnToMenu': '保存并返回主界面',
                'resourcePack.vanilla.name': '原版 · 基础资源'}))
    languages()
    (PACK / 'config/iris.properties').write_text('enableShaders=true\nshaderPack=MakeUp-UltraFast-9.6.zip\n'
        'disableUpdateMessage=true\nmaxShadowRenderDistance=24\ncolorSpace=SRGB\n', encoding='utf-8')
    with zipfile.ZipFile(CACHE / 'MakeUp-UltraFast-9.6.zip') as archive:
        props = archive.read('shaders/shaders.properties').decode('utf-8')
    medium = re.search(r'^profile.medium=([^\r\n]+)', props, re.M)[1].split()
    shader_options = {}
    for token in medium:
        if '=' in token:
            key, value = token.split('=', 1)
        else:
            key, value = (token[1:], 'false') if token.startswith('!') else (token, 'true')
        shader_options[key] = value
    shader_options.update(DOF='false', MOTION_BLUR='false', CHROMA_ABER='0', BLOOM='true')
    (PACK / 'shaderpacks/MakeUp-UltraFast-9.6.zip.txt').write_text(
        '\n'.join(f'{key}={value}' for key, value in shader_options.items()) + '\n', encoding='utf-8')
    resources = ['vanilla', 'file/CozyUI+_v1.10.zip', 'file/GodPath-zh_cn.zip', 'file/GodPath-Cozy-1.21.1.zip']
    (PACK / 'options.txt').write_text('version:3955\nlang:zh_cn\nfullscreen:false\nguiScale:3\n'
        'renderDistance:10\nsimulationDistance:6\nmaxFps:120\nentityDistanceScaling:0.8\n'
        'onboardAccessibility:false\n' + 'resourcePacks:' + json.dumps(resources, ensure_ascii=False) + '\n'
        'incompatibleResourcePacks:[]\n', encoding='utf-8')
    # The authored background is retained in the project, independent of a generator's local cache.
    art = PACK / 'config/fancymenu/assets/godpath_dawn.png'
    if not art.is_file():
        raise FileNotFoundError('Missing project menu artwork: ' + str(art))
    print('Cozy theme, CE backport, MakeUp medium preset and default resource order built.')


if __name__ == '__main__':
    main()
