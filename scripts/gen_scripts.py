#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""导出 mods.json + 双平台下载脚本"""
import json, os, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
BASE = str(Path(__file__).resolve().parents[1])
PACK = os.path.join(BASE, "pack")
MODS = json.load(open(os.path.join(BASE, "scripts", "final_mods.json"), encoding="utf-8"))

simple = [{
    "name": m["filename"],
    "url": m["url"],
    "sha512": m["sha512"],
    "size": m["size"],
    "slug": m["slug"],
    "version": m["version_number"],
} for m in MODS]
json.dump(simple, open(os.path.join(PACK, "mods.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("wrote mods.json", len(simple))

PS1 = r'''# ============================================================
#  神格之路 GodPath 4.0 · 模组下载器 (Windows / PowerShell)
#  用法:
#     .\download_mods.ps1                  # 下载到 .\mods
#     .\download_mods.ps1 -Mirror mcim     # 走 MCIM 镜像
#     .\download_mods.ps1 -Threads 8
# ============================================================
param(
  [string]$OutDir = "mods",
  [ValidateSet("official","mcim","none")][string]$Mirror = "official",
  [ValidateRange(1,32)][int]$Threads = 6
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$listFile = Join-Path $here "mods.json"
if (-not (Test-Path $listFile)) { Write-Host "找不到 mods.json，请与本脚本放在同一目录" -ForegroundColor Red; exit 1 }
$list = Get-Content $listFile -Raw -Encoding UTF8 | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path -LiteralPath $OutDir).Path
New-Item -ItemType Directory -Force -Path (Join-Path $here ".cache") | Out-Null

function Resolve-Url($item) {
  $u = $item.url
  if ($Mirror -eq "mcim") {
    # MCIM 镜像：把 cdn.modrinth.com 换到镜像域
    $u = $u.Replace("https://cdn.modrinth.com", "https://mod.mcimirror.top/modrinth_cdn")
  }
  return $u
}

function Check-File($path, $sha512) {
  if (-not (Test-Path $path)) { return $false }
  try {
    $h = (Get-FileHash -Algorithm SHA512 -Path $path).Hash.ToLower()
    return $h -eq $sha512.ToLower()
  } catch { return $false }
}

$total = $list.Count
$ok = 0; $skip = 0; $fail = @()
$sw = [System.Diagnostics.Stopwatch]::StartNew()

Write-Host ""
Write-Host "神格之路 GodPath 4.0 · $total 个模组 · 镜像=$Mirror · 线程=$Threads" -ForegroundColor Cyan
Write-Host ("=" * 70)

$jobs = @()
$queue = [System.Collections.Queue]::new()
foreach ($m in $list) { $queue.Enqueue($m) }

$script = {
  param($item, $outDir, $mirror)
  $dst = Join-Path $outDir $item.name
  if (Test-Path $dst) {
    try {
      $h = (Get-FileHash -Algorithm SHA512 -Path $dst).Hash.ToLower()
      if ($h -eq $item.sha512.ToLower()) { return @{ ok=$true; skipped=$true; name=$item.name } }
    } catch {}
  }
  $url = $item.url
  if ($mirror -eq "mcim") { $url = $url.Replace("https://cdn.modrinth.com", "https://mod.mcimirror.top/modrinth_cdn") }
  for ($try = 0; $try -lt 3; $try++) {
    try {
      $tmp = "$dst.part"
      Invoke-WebRequest -Uri $url -OutFile $tmp -TimeoutSec 300 -UseBasicParsing -ErrorAction Stop
      $h = (Get-FileHash -Algorithm SHA512 -Path $tmp).Hash.ToLower()
      if ($h -ne $item.sha512.ToLower()) { Remove-Item $tmp -Force; throw "sha512 不匹配" }
      Move-Item $tmp $dst -Force
      return @{ ok=$true; skipped=$false; name=$item.name }
    } catch {
      Start-Sleep -Seconds (2 * ($try + 1))
    }
  }
  return @{ ok=$false; skipped=$false; name=$item.name; err="下载失败" }
}

$running = @()
while ($queue.Count -gt 0 -or $running.Count -gt 0) {
  while ($queue.Count -gt 0 -and $running.Count -lt $Threads) {
    $item = $queue.Dequeue()
    $ps = [PowerShell]::Create().AddScript($script).AddArgument($item).AddArgument($OutDir).AddArgument($Mirror)
    $running += [pscustomobject]@{ PS=$ps; Handle=$ps.BeginInvoke(); Item=$item }
  }
  $done = $running | Where-Object { $_.Handle.IsCompleted }
  foreach ($d in @($done)) {
    $r = $null
    try { $r = $d.PS.EndInvoke($d.Handle); $r = $r[0] } catch { $r = @{ ok=$false; name=$d.Item.name } }
    $d.PS.Dispose()
    $running = $running | Where-Object { $_.Item.name -ne $d.Item.name }
    if ($r.ok) {
      if ($r.skipped) { $skip++ } else { $ok++ }
      $c = if ($r.skipped) { "DarkGray" } else { "Green" }
      Write-Host ("  [OK] " + $r.name) -ForegroundColor $c
    } else {
      $fail += $d.Item
      Write-Host ("  [FAIL] " + $d.Item.name) -ForegroundColor Red
    }
  }
  Start-Sleep -Milliseconds 120
}

$sw.Stop()
Write-Host ("=" * 70)
Write-Host ("完成: 新下载 $ok · 已存在 $skip · 失败 " + $fail.Count + " · 耗时 " + [int]$sw.Elapsed.TotalSeconds + "s") -ForegroundColor Cyan
if ($fail.Count -gt 0) {
  Write-Host "`n失败的模组（可重跑脚本自动续传）:" -ForegroundColor Yellow
  $fail | ForEach-Object { Write-Host ("  " + $_.name) }
  Write-Host "`n如果大面积失败，试试: .\download_mods.ps1 -Mirror mcim" -ForegroundColor Yellow
  exit 2
}
exit 0
'''

SH = r'''#!/usr/bin/env bash
# ============================================================
#  神格之路 GodPath 4.0 · 模组下载器 (Linux / macOS / Termux)
#  用法:  bash download_mods.sh [output_dir]
# ============================================================
set -u
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-mods}"
LIST="$DIR/mods.json"
mkdir -p "$OUT"

if [ ! -f "$LIST" ]; then echo "找不到 mods.json"; exit 1; fi
if ! command -v python3 >/dev/null 2>&1; then echo "需要 python3"; exit 1; fi

python3 - "$LIST" "$OUT" <<'PY'
import json, os, sys, hashlib, urllib.request, concurrent.futures as cf
lst = json.load(open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
UA = {"User-Agent": "godpath-pack/4.0"}

def sha512(p):
    h = hashlib.sha512()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()

def one(m):
    dst = os.path.join(out, m["name"])
    if os.path.exists(dst) and sha512(dst) == m["sha512"]:
        return (m["name"], "cached")
    for attempt in range(3):
        try:
            req = urllib.request.Request(m["url"], headers=UA)
            tmp = dst + ".part"
            with urllib.request.urlopen(req, timeout=300) as r, open(tmp, "wb") as f:
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk: break
                    f.write(chunk)
            if sha512(tmp) != m["sha512"]:
                os.remove(tmp); raise RuntimeError("hash mismatch")
            os.replace(tmp, dst)
            return (m["name"], "ok")
        except Exception as e:
            err = str(e)
    return (m["name"], "fail: " + err)

print(f"共 {len(lst)} 个模组 -> {out}")
ok = cached = fail = 0
failures = []
with cf.ThreadPoolExecutor(max_workers=6) as ex:
    for name, st in ex.map(one, lst):
        if st == "ok":
            ok += 1; print("  [OK]   ", name)
        elif st == "cached":
            cached += 1
        else:
            fail += 1; failures.append((name, st)); print("  [FAIL] ", name)
print(f"\n完成: 新下载 {ok} · 已存在 {cached} · 失败 {fail}")
if failures:
    print("\n失败清单:")
    for n, s in failures: print(" ", n, s)
    sys.exit(2)
PY
'''

open(os.path.join(PACK, "download_mods.ps1"), "w", encoding="utf-8-sig").write(PS1)
open(os.path.join(PACK, "download_mods.sh"), "w", encoding="utf-8", newline="\n").write(SH)
print("wrote download_mods.ps1 / download_mods.sh")
