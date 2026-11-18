# ============================================================
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
