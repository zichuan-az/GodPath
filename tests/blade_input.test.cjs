const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = name => {
  const file = path.join(__dirname, '../pack/kubejs', name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};

test('only empty left clicks with native blades send a swing request', () => {
  class NativeBlade {}
  let callback;
  const sent = [];
  vm.runInNewContext(source('client_scripts/17_blade_empty_swing.js'), {
    Platform: { isLoaded: () => true },
    Java: { loadClass: name => name.endsWith('ItemSlashBlade') ? NativeBlade : name },
    NativeEvents: { onEvent: (type, handler) => {
      assert.equal(type, 'net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$LeftClickEmpty');
      callback = handler;
    } },
  });
  assert.equal(typeof callback, 'function');
  const player = item => ({ isSpectator: () => false, isUsingItem: () => false,
    getMainHandItem: () => ({ getItem: () => item }), sendData: (...args) => sent.push(args) });
  callback({ getEntity: () => player({}) });
  assert.equal(sent.length, 0);
  callback({ getEntity: () => player(new NativeBlade()) });
  assert.deepEqual(sent, [['godpath_blade_empty_swing']]);
});

test('swing packets validate the real server hand and rate-limit native combo progression', () => {
  class NativeBlade {
    onLeftClickEntity(stack, player, target) {
      assert.equal(stack, player.stack);
      assert.equal(target, player);
      player.combos++;
      return true;
    }
  }
  let callback;
  let cooldown = 0;
  const context = {
    Java: { loadClass: () => NativeBlade },
    NetworkEvents: { dataReceived: (channel, handler) => {
      assert.equal(channel, 'godpath_blade_empty_swing'); callback = handler;
    } },
    gpCooldown: (p, key, ticks) => { const left = cooldown; cooldown = ticks; return left; },
  };
  vm.runInNewContext(source('server_scripts/66_blade_input.js'), context);
  assert.equal(typeof callback, 'function');
  const p = { combos: 0, spectator: false, using: false, alive: true,
    isAlive: () => p.alive, isSpectator: () => p.spectator, isUsingItem: () => p.using,
    getMainHandItem: () => p.stack };
  const equip = item => { p.stack = { getItem: () => item, isEmpty: () => false }; };
  equip({});
  callback({ player: p, data: { item: 'slashblade:slashblade' } });
  assert.equal(p.combos, 0);
  equip(new NativeBlade());
  p.using = true; callback({ player: p }); assert.equal(p.combos, 0);
  p.using = false; p.spectator = true; callback({ player: p }); assert.equal(p.combos, 0);
  p.spectator = false; p.alive = false; callback({ player: p }); assert.equal(p.combos, 0);
  p.alive = true; callback({ player: p }); assert.equal(p.combos, 1);
  callback({ player: p }); assert.equal(p.combos, 1);
  cooldown = 0; callback({ player: p }); assert.equal(p.combos, 2);
});
