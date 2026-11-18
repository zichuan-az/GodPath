#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 PCL2 可直接导入的 .mrpack（Modrinth 格式）"""
import json, os, shutil, zipfile, sys, hashlib
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
BASE = str(Path(__file__).resolve().parents[1])
PACK = os.path.join(BASE, "pack")
OUT = os.path.join(BASE, "dist")
os.makedirs(OUT, exist_ok=True)

MODS = json.load(open(os.path.join(BASE, "scripts", "final_mods.json"), encoding="utf-8"))
PROJECT = json.loads((Path(BASE) / 'project.json').read_text(encoding='utf-8'))

# 客户端/服务端环境判定
CLIENT_ONLY_HINT = ("xaeros-minimap", "xaeros-world-map", "sodium", "iris", "distanthorizons",
                    "not-enough-animations", "first-person-model", "shoulder-surfing-reloaded",
                    "better-third-person", "entityculling", "immediatelyfast", "moreculling",
                    "dynamic-fps", "toast-control", "controlling", "mouse-tweaks",
                    "legendary-tooltips", "enchantment-descriptions", "better-advancements",
                    "advancement-plaques", "just-zoom", "betterf3", "entity-model-features",
                    "entitytexturefeatures", "3dskinlayers", "wavey-capes", "particle-rain",
                    "visual-workbench", "emi", "appleskin", "reeses-sodium-options",
                    "sodium-options-api", "pf-neoforge", "ambientsounds", "falling-leaves",
                    "badoptimizations", "particle-core", "fancymenu", "melody")


def env_of(mod):
    slug = mod['slug']
    if mod.get('server_side') == 'unsupported' or slug in CLIENT_ONLY_HINT:
        return {"client": "required", "server": "unsupported"}
    if mod.get('client_side') == 'unsupported' and not mod.get('integrated_server'):
        return {"client": "unsupported", "server": "required"}
    return {"client": "required", "server": "required"}


files = []
used_names = {}
for m in MODS:
    fn = m["filename"]
    if not fn.lower().endswith('.jar') or Path(fn).name != fn:
        raise ValueError('Not a mod jar filename: ' + fn)
    key = fn.lower()
    if key in used_names:
        raise ValueError('Duplicate mod filename: ' + fn)
    used_names[fn.lower()] = True
    files.append({
        "path": "mods/" + fn,
        "hashes": {"sha1": m["sha1"], "sha512": m["sha512"]},
        "env": env_of(m),
        "downloads": [m["url"]],
        "fileSize": m["size"],
    })

print(f"mods in pack: {len(files)}")

index = {
    "formatVersion": 1,
    "game": "minecraft",
    "versionId": PROJECT['version'],
    "name": PROJECT['name'],
    "summary": PROJECT['summary'],
    "files": files,
    "dependencies": {
        "minecraft": PROJECT['minecraft'],
        "neoforge": PROJECT['neoforge']
    }
}

overrides_src = PACK
stage = os.path.join(BASE, "build", "mrpack_stage")
if os.path.exists(stage):
    assert Path(stage).resolve().is_relative_to(Path(BASE).resolve() / 'build')
    shutil.rmtree(stage)
os.makedirs(stage)

# 复制 overrides 内容（kubejs / config / 文档等）
for item in os.listdir(overrides_src):
    if item in ("god_items.json",):
        continue
    s = os.path.join(overrides_src, item)
    scope = 'client-overrides' if item in ('resourcepacks', 'shaderpacks', 'options.txt') else 'overrides'
    d = os.path.join(stage, scope, item)
    if item == 'config':
        for config in Path(s).iterdir():
            client = config.name in ('fancymenu', 'iris.properties', 'DistantHorizons.toml')
            target = Path(stage) / ('client-overrides' if client else 'overrides') / 'config' / config.name
            target.parent.mkdir(parents=True, exist_ok=True)
            if config.is_dir(): shutil.copytree(config, target)
            else: shutil.copy2(config, target)
        continue
    if os.path.isdir(s):
        shutil.copytree(s, d)
    else:
        os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copy2(s, d)

json.dump(index, open(os.path.join(stage, "modrinth.index.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)

mrpack = os.path.join(OUT, PROJECT['artifact'] + '.mrpack')
if os.path.exists(mrpack):
    os.remove(mrpack)
with zipfile.ZipFile(mrpack, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for root, dirs, fs in os.walk(stage):
        for f in fs:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, stage).replace("\\", "/")
            z.write(full, rel)

size = os.path.getsize(mrpack)
print(f"wrote {mrpack}  ({size/1024/1024:.2f} MB)")

# 同时导出一份纯 overrides 目录（手动安装用）
manual = os.path.join(OUT, "manual-overrides")
if os.path.exists(manual):
    assert Path(manual).resolve() == Path(BASE).resolve() / 'dist' / 'manual-overrides'
    shutil.rmtree(manual)
shutil.copytree(os.path.join(stage, "overrides"), manual)
if (Path(stage) / 'client-overrides').exists():
    shutil.copytree(Path(stage) / 'client-overrides', manual, dirs_exist_ok=True)
print(f"wrote {manual}")
