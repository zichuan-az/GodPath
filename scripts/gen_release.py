"""Build the current delivery from project.json, canonical pack and locked manifest."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory

from build_expedition_world import create_world

ROOT = Path(__file__).resolve().parents[1]


def build():
    project = json.loads((ROOT / 'project.json').read_text(encoding='utf-8'))
    count = len(json.loads((ROOT / 'scripts/final_mods.json').read_text(encoding='utf-8')))
    shutil.copy2(ROOT / 'docs/项目分析与实测报告.md', ROOT / 'pack/docs/项目分析与实测报告.md')
    if (ROOT / 'docs/4.0-升级与实测报告.md').exists():
        shutil.copy2(ROOT / 'docs/4.0-升级与实测报告.md', ROOT / 'pack/docs/4.0-升级与实测报告.md')
    report = project.get('report', '4.0-升级与实测报告.md')
    if report != '4.0-升级与实测报告.md':
        shutil.copy2(ROOT / 'docs' / report, ROOT / 'pack/docs' / report)
    for script in ('gen_scripts.py', 'gen_mrpack.py'):
        subprocess.run([sys.executable, '-X', 'utf8', str(ROOT / 'scripts' / script)], cwd=ROOT, check=True)
    release = ROOT / 'dist' / project['release']
    release.mkdir(exist_ok=True)
    mrpack = ROOT / 'dist' / (project['artifact'] + '.mrpack')
    shutil.copy2(mrpack, release / mrpack.name)
    map_name = 'GodPath-Expedition'
    with TemporaryDirectory(prefix='godpath-world-') as directory:
        create_world(Path(directory) / map_name)
        world_archive = Path(shutil.make_archive(str(ROOT / 'dist' / map_name), 'zip', directory))
    shutil.copy2(world_archive, release / world_archive.name)
    shutil.copytree(ROOT / 'dist/manual-overrides', release / 'manual-overrides', dirs_exist_ok=True)
    shutil.copytree(ROOT / 'pack/docs', release / 'docs', dirs_exist_ok=True)
    for name in ('README.md', 'mods.json', 'download_mods.ps1', 'download_mods.sh'):
        shutil.copy2(ROOT / 'pack' / name, release / name)
    (release / '先看这个.md').write_text(
        f"# {project['name']}\n\n"
        '推荐：在 PCL2 中导入同目录的 `.mrpack`，创建新版本目录。\n\n'
        f'本版锁定 {count} 个模组。默认启用中文、CozyUI 和 MakeUp 光影，加入六道遗迹、神物饰品和六系拔刀剑。\n\n'
        '把 GodPath-Expedition.zip 解压到该实例的 saves/，可从两站铁路开局；也可新建普通世界。\n\n'
        f'手动安装见 README.md。实测结果和已知限制见 docs/{report}。\n\n'
        '包体包含安装清单和覆盖文件，启动器会下载模组；这不是包含全部 jar 的离线包。\n', encoding='utf-8')
    archive = Path(shutil.make_archive(str(ROOT / 'dist' / project['release']), 'zip', release))
    sums = []
    for file in (mrpack, world_archive, archive):
        with file.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        sums.append(f'{digest}  {file.name}')
    (ROOT / 'dist' / (project['edition'] + '-SHA256SUMS.txt')).write_text('\n'.join(sums) + '\n', encoding='utf-8')
    print('Release:', archive)


if __name__ == '__main__':
    build()
