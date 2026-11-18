#!/usr/bin/env bash
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
