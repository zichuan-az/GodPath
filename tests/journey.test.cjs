const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function harness(expedition) {
  const scripts = path.join(__dirname, '..', 'pack/kubejs/server_scripts');
  const events = new Map();
  const roots = new Map();
  const messages = [];
  function literal(name) {
    return {
      name, children: new Map(), allowed: () => true,
      requires(check) { this.allowed = check; return this; },
      then(child) { this.children.set(child.name, child); return this; },
      executes(run) { this.run = run; return this; }
    };
  }
  const context = vm.createContext({
    console: { info() {} },
    Text: { of: text => ({ text, gold() { return this; }, aqua() { return this; }, clickRunCommand() { return this; } }) },
    Item: { of: id => stack(id) },
    Ingredient: { of: () => ({ test: item => item.id.endsWith('_log') }) },
    global: {},
    gpExpeditionEnabled: () => expedition,
    gpExpeditionStationY: () => 96
  });
  for (const area of ['ServerEvents', 'PlayerEvents', 'EntityEvents']) {
    context[area] = new Proxy({}, { get: (_, name) => (...args) => {
      const key = area + '.' + name;
      events.set(key, args.at(-1));
    } });
  }
  const lib = fs.readFileSync(path.join(scripts, '00_lib.js'), 'utf8');
  vm.runInContext(lib, context);
  vm.runInContext(fs.readFileSync(path.join(scripts, '60_blade.js'), 'utf8'), context);
  const journeyPath = path.join(scripts, '83_journey.js');
  if (fs.existsSync(journeyPath)) vm.runInContext(fs.readFileSync(journeyPath, 'utf8'), context);
  events.get('ServerEvents.commandRegistry')?.({ commands: { literal }, register: root => roots.set(root.name, root) });

  function stack(id, count = 1) {
    return { id, count, isEmpty() { return this.count === 0 || id === 'minecraft:air'; }, shrink(n) { this.count -= n; },
      getCount() { return this.count; }, hasTag: tag => tag === 'minecraft:logs' && id.endsWith('_log') };
  }
  function player(saved = new Map(), inventory = []) {
    return {
      x: 12.5, y: 96, z: -6.5, age: 20, server: {}, vehicle: null,
      level: { dimension: 'minecraft:overworld', time: 200, getGameTime() { return this.time; } },
      isPlayer: () => true, isSpectator: () => false, getVehicle() { return this.vehicle; },
      tell: message => messages.push(message.text ?? message),
      mainHandItem: stack('minecraft:air'), getMainHandItem() { return this.mainHandItem; },
      inventory: {
        getItem: i => inventory[i] ?? stack('minecraft:air'),
        add(item) { inventory.push(item); return true; }
      },
      persistentData: {
        contains: key => saved.has(key), getBoolean: key => saved.get(key) ?? false,
        getInt: key => saved.get(key) ?? 0, getLong: key => saved.get(key) ?? 0,
        getString: key => saved.get(key) ?? '', putBoolean: (key, val) => saved.set(key, val),
        putInt: (key, val) => saved.set(key, val), putString: (key, val) => saved.set(key, val),
        putLong: (key, val) => saved.set(key, val), remove: key => saved.delete(key)
      }
    };
  }
  function command(which, p) {
    const source = { getPlayer: () => p, getPlayerOrException: () => p, hasPermission: () => false };
    const root = roots.get('journey');
    assert.ok(root, 'journal command is registered');
    assert.equal(root.allowed(source), true, 'ordinary player can open the journal');
    assert.equal(root.allowed({ getPlayer: () => null }), false, 'console is excluded');
    const node = which ? root.children.get(which) : root;
    node.run({ source });
  }
  function tick(p, x, z = 0) {
    p.x = x; p.z = z; p.age += 20;
    events.get('PlayerEvents.tick')?.({ player: p });
  }
  function hit(p, tagged, damage = 3) {
    const target = { x: 12.5, y: 96, z: 20.5, level: p.level,
      getTags: () => ({ contains: tag => tagged && tag === 'gp_expedition_training' }) };
    p.level.time += 10;
    const event = { entity: target, source: { player: p, getDirectEntity: () => p }, damage,
      getDamage() { return this.damage; }, setDamage(v) { this.damage = v; } };
    events.get('EntityEvents.beforeHurt')?.(event);
    return event.damage;
  }
  return { player, stack, command, tick, hit, messages, events };
}

test('ordinary worlds let a non-op reopen the journal without railway objectives', () => {
  const h = harness(false);
  const p = h.player();
  h.events.get('PlayerEvents.loggedIn')?.({ player: p });
  h.command(null, p);
  h.command(null, p);
  assert.match(h.messages.join('\n'), /世界种子/);
  assert.doesNotMatch(h.messages.join('\n'), /站|乘车|训练/);
});

test('lost starter recovery spends the native recipe inputs and persists through relog', () => {
  const h = harness(true);
  const saved = new Map();
  const inventory = [];
  let p = h.player(saved, inventory);
  h.command('blade', p);
  assert.equal(inventory[0].id, 'slashblade:slashblade_wood');
  h.command('blade', p);
  assert.equal(inventory.length, 1);
  inventory.length = 0;
  p = h.player(saved, inventory);
  h.command('blade', p);
  assert.equal(inventory.length, 0);
  inventory.push(h.stack('minecraft:wooden_sword'), h.stack('minecraft:oak_log'), h.stack('minecraft:spruce_log'));
  h.command('blade', p);
  assert.deepEqual(inventory.map(item => item.count), [0, 0, 0, 1]);
  assert.equal(inventory.at(-1).id, 'slashblade:slashblade_wood');
  assert.equal(h.player().persistentData.getInt('gp_journey_stage'), 0);
});

test('journey records actual blade hits, both minecart legs and the obtained relic across relog', () => {
  const h = harness(true);
  const saved = new Map();
  const inventory = [];
  let p = h.player(saved, inventory);
  h.command('blade', p);
  p.x = 12.5; p.z = 18;
  assert.equal(h.hit(p, true), 0, 'training target is reusable');
  assert.equal(saved.get('gp_journey_hits') ?? 0, 0);
  p.mainHandItem = inventory[0];
  assert.equal(h.hit(p, false), 3);
  assert.equal(h.hit(p, true, 0), 0);
  assert.equal(saved.get('gp_journey_hits') ?? 0, 0);
  for (let i = 0; i < 3; i++) h.hit(p, true);
  assert.equal(saved.get('gp_journey_stage'), 2);
  h.tick(p, 181);
  assert.equal(saved.get('gp_journey_stage'), 2);
  p.vehicle = { type: 'minecraft:minecart', uuid: 'cart' };
  h.tick(p, 10);
  h.tick(p, 181);
  assert.equal(saved.get('gp_journey_stage'), 2, 'boarding followed by teleporting misses the checkpoint');
  h.tick(p, 10);
  h.tick(p, 96);
  p = h.player(saved, inventory);
  p.vehicle = { type: 'minecraft:minecart', uuid: 'cart' };
  h.tick(p, 181);
  assert.equal(saved.get('gp_journey_stage'), 3);
  p.vehicle = null;
  h.tick(p, 181);
  assert.equal(saved.get('gp_journey_stage'), 3);
  inventory.push(h.stack('godpath:world_seed'));
  h.tick(p, 181);
  assert.equal(saved.get('gp_journey_stage'), 4);
  p.vehicle = { type: 'minecraft:minecart', uuid: 'cart' };
  h.tick(p, 181);
  h.tick(p, 96);
  h.tick(p, 10);
  assert.equal(saved.get('gp_journey_stage'), 5);
  h.command('laws', p);
  assert.match(h.messages.join('\n'), /原初[\s\S]*丰饶[\s\S]*机械[\s\S]*连接[\s\S]*奥秘[\s\S]*斩断/);
  assert.match(h.messages.join('\n'), /磁石[\s\S]*轨道炮/);
});
