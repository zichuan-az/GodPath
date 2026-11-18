var gpActiveRituals = new Map();

function gpCancelRitual(p) {
  gpActiveRituals.delete('' + p.uuid);
  p.persistentData.putBoolean('gp_ascending', false);
}

BlockEvents.rightClicked('minecraft:lodestone', event => {
  try {
    var p = null;
    try { p = event.player } catch (e0) { return }
    if (!p) return;
    if (!gpIsServer(p)) return;
    var ritualId = '' + p.uuid;
    if (gpActiveRituals.has(ritualId)) return;

    if (gpIsGod(p)) {
      gpTell(p, '§6你已是神格之身。§7神座静静回应着你的呼吸。');
      gpRun(p, 'playsound minecraft:block.beacon.ambient player @s ~ ~ ~ 1 1.4');
      return;
    }

    var n = gpCount(p);
    if (n < 24) {
      var missing = 24 - n;
      gpTell(p, '§c神座沉默 §7| 神格共鸣 §e' + n + '§7/§a24 §7，还差 §e' + missing + ' §7件');
      gpRun(p, 'particle minecraft:smoke ~ ~1 ~ 0.3 0.3 0.3 0.02 20');
      gpRun(p, 'playsound minecraft:block.lodestone.place player @s ~ ~ ~ 0.6 0.8');
      return;
    }

    var ritual = {};
    gpActiveRituals.set(ritualId, ritual);
    p.persistentData.putBoolean('gp_ascending', true);
    gpTell(p, '§6§l◆ 神座共鸣开始 ◆');
    if (typeof gpCeremonyTitle == 'function') gpCeremonyTitle(p, 'godpath.ritual.begin', 'godpath.ritual.begin.subtitle');
    gpRun(p, 'playsound minecraft:block.beacon.activate player @a[distance=..64] ~ ~ ~ 2 0.6');

    var steps = [0, 40, 80, 120, 160, 200];
    var s = gpServer(p);

    for (var i = 0; i < steps.length; i++) {
      (function (t, idx) {
        try {
          s.scheduleInTicks(t, function () {
            try {
              if (gpActiveRituals.get(ritualId) !== ritual) return;
              if (typeof gpAscensionVisual == 'function') gpAscensionVisual(p, idx);
              gpRun(p, 'playsound minecraft:block.amethyst_block.chime player @a[distance=..32] ~ ~ ~ 1.4 ' + (1.0 + idx * 0.12));
            } catch (x) { }
          });
        } catch (x2) { }
      })(steps[i], i);
    }

    try {
      s.scheduleInTicks(260, function () {
        try {
          if (gpActiveRituals.get(ritualId) === ritual) doAscend(p);
        } catch (err) { console.error('[godpath] 成神异常: ' + err) }
      });
    } catch (e1) {

      doAscend(p);
    }
  } catch (err) {
    console.error('[godpath] 仪式异常: ' + err);
  }
});

function doAscend(p) {
  gpCancelRitual(p);
  if (gpIsGod(p)) return;

  try { p.persistentData.putBoolean('gp_god', true) } catch (e) { }

  gpApplyDivinity(p);
  if (typeof gpSyncDivineFlight == 'function') gpSyncDivineFlight(p);

  gpRun(p, 'give @s godpath:divinity_mark');
  if (typeof gpGrantDivineArmament == 'function') gpGrantDivineArmament(p);
  gpRun(p, 'give @s minecraft:elytra');
  gpRun(p, 'give @s minecraft:diamond 32');

  var name = '';
  try { name = '' + p.username } catch (e2) { try { name = '' + p.name.string } catch (e3) { } }
  try {
    gpServerRun(p, 'tellraw @a {"text":"","extra":[{"text":"[神格之路] ","color":"gold","bold":true},{"text":"' + name + ' ","color":"yellow"},{"text":"集齐 24 件神物，登临神座。","color":"white"}]}');
  } catch (e4) { }

  gpTell(p, '§6§l★ 你已成神 ★');
  gpTell(p, '§7永久获得：生命 +180 · 攻击 +60 · 护甲 +40 · 韧性 +20 · 移速 +50% · 幸运 +20');
  gpTell(p, '§e不死神躯：免疫伤害与死亡（含 /kill）· 双击跳跃自由飞行 · 专属神裁刀已降临');
  gpTell(p, '§7家园结界半径扩展至 64 格 · 天穹自由飞行 · 拔刀剑终局形态解锁');

  if (typeof gpCeremonyTitle == 'function') gpCeremonyTitle(p, 'godpath.ritual.ascended', 'godpath.ritual.ascended.subtitle');
  gpRun(p, 'playsound minecraft:ui.toast.challenge_complete player @a[distance=..64] ~ ~ ~ 2 1');
  if (typeof gpAscensionVisual == 'function') gpAscensionVisual(p, 6);
  gpRun(p, 'effect give @s minecraft:regeneration 20 4 true');
  gpRun(p, 'effect give @s minecraft:absorption 120 4 true');
  gpRun(p, 'effect give @s minecraft:glowing 6 0 true');
}

function gpApplyDivinity(p) {
  gpEnsureAttribute(p, 'minecraft:generic.max_health', 'godpath:divine_hp', 180);
  gpEnsureAttribute(p, 'minecraft:generic.attack_damage', 'godpath:divine_atk', 60);
  gpEnsureAttribute(p, 'minecraft:generic.armor', 'godpath:divine_armor', 40);
  gpEnsureAttribute(p, 'minecraft:generic.armor_toughness', 'godpath:divine_toughness', 20);
  gpEnsureAttribute(p, 'minecraft:generic.knockback_resistance', 'godpath:divine_stability', 1);
  gpEnsureAttribute(p, 'minecraft:generic.movement_speed', 'godpath:divine_speed', 0.5, 'add_multiplied_base');
  gpEnsureAttribute(p, 'minecraft:generic.luck', 'godpath:divine_luck', 20);
}

PlayerEvents.loggedIn(event => gpCancelRitual(event.player));
PlayerEvents.loggedOut(event => gpCancelRitual(event.player));
PlayerEvents.respawned(event => gpCancelRitual(event.player));
EntityEvents.death('minecraft:player', event => gpCancelRitual(event.entity));
