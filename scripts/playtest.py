"""Prepare/run an isolated client using an existing local launcher installation.

No accounts, tokens, worlds or launcher settings are copied. Existing library and
asset files are read in place; all game writes go to build/playtest/instance.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

BASE = Path(__file__).resolve().parents[1]


def permitted(entry: dict) -> bool:
    rules = entry.get("rules", [])
    allowed = not rules
    for rule in rules:
        system = rule.get("os", {})
        if system.get("name", "windows") != "windows":
            continue
        if system.get("arch", "x86_64") not in ("x86_64", "amd64"):
            continue
        if rule.get("features"):
            continue
        allowed = rule["action"] == "allow"
    return allowed


def prepare(source: Path, java: Path) -> tuple[Path, list[str]]:
    version = json.loads((source / (source.name + ".json")).read_text(encoding="utf-8-sig"))
    minecraft = source.parent.parent
    target = BASE / "build/playtest/instance"
    target.mkdir(parents=True, exist_ok=True)
    for name in ("mods", "config", "defaultconfigs"):
        if (source / name).is_dir():
            shutil.copytree(source / name, target / name, dirs_exist_ok=True)
    # Overrides are authoritative. User saves are deliberately excluded.
    shutil.copytree(BASE / "pack/kubejs", target / "kubejs", dirs_exist_ok=True)
    if (BASE / "pack/config").exists():
        shutil.copytree(BASE / "pack/config", target / "config", dirs_exist_ok=True)
    natives = target / "natives"
    existing_natives = source / (source.name + "-natives")
    if existing_natives.is_dir():
        shutil.copytree(existing_natives, natives, dirs_exist_ok=True)
    else:
        natives.mkdir(exist_ok=True)
    (target / "options.txt").write_text(
        "version:3955\nlang:zh_cn\nfullscreen:false\nmaxFps:60\n"
        "renderDistance:6\nsimulationDistance:5\nguiScale:3\n"
        "onboardAccessibility:false\nshowSubtitles:true\n", encoding="utf-8")
    library_root = minecraft / "libraries"
    classpath = []
    missing = []
    for library in version["libraries"]:
        if not permitted(library):
            continue
        artifact = library.get("downloads", {}).get("artifact")
        if not artifact:
            continue
        file = library_root / artifact["path"]
        if not file.is_file():
            missing.append(str(file))
        classpath.append(str(file))
    primary = source / (source.name + ".jar")
    classpath.append(str(primary))
    if missing:
        raise RuntimeError("Missing installed libraries:\n" + "\n".join(missing))
    values = {
        "auth_player_name": "GodPathTest", "auth_uuid": "00000000-0000-0000-0000-000000000001",
        "auth_access_token": "0", "clientid": "00000000-0000-0000-0000-000000000000",
        "auth_xuid": "0", "user_type": "legacy", "version_type": "GodPath local test",
        "version_name": version["id"], "game_directory": str(target),
        "assets_root": str(minecraft / "assets"), "assets_index_name": version["assetIndex"]["id"],
        "natives_directory": str(natives), "launcher_name": "GodPathSmokeTest",
        "launcher_version": "1", "classpath": os.pathsep.join(classpath),
        "classpath_separator": os.pathsep, "primary_jar_name": primary.name,
        "library_directory": str(library_root),
    }

    def expand(items: list) -> list[str]:
        result = []
        for item in items:
            if isinstance(item, dict):
                if not permitted(item):
                    continue
                item = item["value"]
            for part in item if isinstance(item, list) else [item]:
                for key, value in values.items():
                    part = part.replace("${" + key + "}", value)
                if "${" in part:
                    raise RuntimeError("Unresolved launcher argument: " + part)
                result.append(part)
        return result

    args = [str(java), "-Xms1G", "-Xmx6G", "-Dfile.encoding=UTF-8"]
    args += expand(version["arguments"]["jvm"])
    args += [version["mainClass"]] + expand(version["arguments"]["game"])
    report = {"source": str(source), "target": str(target), "java": str(java),
              "copied_mods": len(list((target / "mods").glob("*.jar"))),
              "copied_worlds": False, "offline_test_profile": "GodPathTest", "args": args}
    (target.parent / "launch.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return target, args


def launch(target: Path, args: list[str], seconds: int) -> int:
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    run = target.parent / ("run_" + stamp)
    run.mkdir()
    started = time.monotonic()
    with (run / "console.log").open("wb") as log:
        proc = subprocess.Popen(args, cwd=target, stdout=log, stderr=subprocess.STDOUT,
                                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        (target.parent / "active.json").write_text(json.dumps({"pid": proc.pid, "run": str(run)}), encoding="utf-8")
        print(f"Client PID {proc.pid}; output {run}", flush=True)
        try:
            while (proc.poll() is None and time.monotonic() - started < seconds
                   and not (target.parent / 'stop.request').exists()):
                time.sleep(1)
        finally:
            stopped = proc.poll() is None
            if stopped:
                proc.terminate()
                try:
                    proc.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()
    for rel in ("logs/latest.log", "logs/kubejs/startup.log", "logs/kubejs/server.log", "logs/kubejs/client.log"):
        if (target / rel).is_file():
            shutil.copy2(target / rel, run / rel.replace("/", "_"))
    text = (run / "console.log").read_text(encoding="utf-8", errors="replace")
    markers = [line[:600] for line in text.splitlines() if any(x in line for x in (
        "[GP-TEST]", "Error loading KubeJS script", "Loaded 1/", "ERROR", "FATAL"))]
    result = {"elapsed_seconds": round(time.monotonic() - started, 1), "exit_code": proc.returncode,
              "stopped_by_harness": stopped, "result": "needs_log_review", "markers": markers,
              "note": "Process survival alone is not a passed gameplay test."}
    (run / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "markers"}, ensure_ascii=False), flush=True)
    return 0 if stopped or proc.returncode == 0 else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--instance", type=Path)
    parser.add_argument("--java", type=Path)
    parser.add_argument("--launch", action="store_true")
    parser.add_argument("--seconds", type=int, default=600)
    ns = parser.parse_args()
    if ns.instance:
        if not ns.java or not ns.java.is_file():
            parser.error("--java must point to Java 21 java.exe")
        target, arguments = prepare(ns.instance.resolve(), ns.java.resolve())
        print(f"Prepared {target}; {len(arguments)} launcher arguments.", flush=True)
    else:
        config = json.loads((BASE / "build/playtest/launch.json").read_text(encoding="utf-8"))
        target, arguments = Path(config["target"]), config["args"]
    if ns.launch:
        raise SystemExit(launch(target, arguments, ns.seconds))
