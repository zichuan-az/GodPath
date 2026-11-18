const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptDir = path.join(__dirname, '../pack/kubejs/server_scripts');

function load(files = []) {
  const handlers = {};
  const logs = [];
  const globals = new Proxy({}, { set() { throw new Error('global is read-only in server scripts'); } });
  const context = vm.createContext({ global: globals, Text: { of: x => x },
    AABB: { of: (...args) => args },
    console: { info() {}, error: x => logs.push(String(x)) }, Math: Object.create(Math) });
  for (const group of ['PlayerEvents', 'EntityEvents', 'ItemEvents', 'BlockEvents', 'ServerEvents', 'NetworkEvents']) {
    context[group] = new Proxy({}, { get: (_, name) => (...args) => {
      const callback = args.at(-1);
      const target = args.length > 1 ? args[0] : '*';
      (handlers[`${group}.${name}:${target}`] ||= []).push(callback);
    }});
  }
  for (const file of ['00_lib.js', ...files]) {
    vm.runInContext(fs.readFileSync(path.join(scriptDir, file), 'utf8'), context, { filename: file });
  }
  return { context, handlers, logs,
    fire(group, event, target = '*') {
      for (const cb of handlers[`${group}:${target}`] || []) cb(event);
    } };
}

function player() {
  const data = new Map();
  const commands = [];
  const attributes = new Map();
  const pending = [];
  const p = { username: 'Tester', uuid: '00000000-0000-0000-0000-000000000001',
    x: 4, y: 64, z: 8, age: 400, tickCount: 400, opCalls: 0,
    tell() {}, inventory: { getItem: () => ({ id: 'minecraft:air', isEmpty: () => true }) },
    getMainHandItem: () => ({ id: 'minecraft:air', isEmpty: () => true }),
    getOffHandItem: () => ({ id: 'minecraft:air', isEmpty: () => true }),
    isPlayer: () => true, isShiftKeyDown: () => false, isSpectator: () => false,
    getAttribute: () => ({ getModifier: id => attributes.has(id) ? { amount: () => attributes.get(id), operation: () => 'ADD_VALUE' } : null }),
    level: { isClientSide: false, gameTime: 2400, dimension: 'minecraft:overworld',
      isNight: () => false, isRaining: () => false },
    persistentData: { contains: key => data.has(key),
      getString: key => data.get(key) || '', putString: (k, v) => data.set(k, String(v)),
      getBoolean: key => data.get(key) || false, putBoolean: (k, v) => data.set(k, v),
      getInt: key => data.get(key) || 0, putInt: (k, v) => data.set(k, v),
      getLong: key => data.get(key) || 0, putLong: (k, v) => data.set(k, v),
      getDouble: key => data.get(key) || 0, putDouble: (k, v) => data.set(k, v) },
    runCommandSilent() { p.opCalls++; },
  };
  p.server = { players: [p], runCommandSilent(command) {
    commands.push(command);
    const op = command.match(/attribute @s (\S+) modifier (add|remove) (\S+)(?: ([-.\d]+) (\S+))?/);
    if (op) {
      if (!op[1].startsWith('minecraft:generic.')) throw new Error(`Unknown 1.21.1 attribute: ${op[1]}`);
      if (op[2] === 'remove') attributes.delete(op[3]);
      else attributes.set(op[3], Number(op[4]));
    }
    return 1;
  }, scheduleInTicks(ticks, callback) { pending.push({ ticks, callback }); } };
  return { p, data, commands, attributes, pending };
}

test('server scripts load with the KubeJS 2101 read-only global binding', () => {
  const h = load(fs.readdirSync(scriptDir).filter(x => x.endsWith('.js') && x !== '00_lib.js').sort());
  assert.equal(h.logs.length, 0);
});

test('adventure guide marks delivery only after a successful real command result', () => {
  const { context: c } = load(['80_adventure_guide.js']);
  const { p, data } = player();
  let result = 0;
  const commands = [];
  const source = {};
  p.server.createCommandSourceStack = () => ({ withSuppressedOutput: () => source });
  p.server.getCommands = () => ({ getDispatcher: () => ({ execute(command, actualSource) {
    assert.equal(actualSource, source);
    commands.push(command);
    return result;
  } }) });
  assert.equal(c.gpGiveAdventureGuide(p), false);
  assert.equal(data.has('gp_guide_4'), false);
  result = 1;
  assert.equal(c.gpGiveAdventureGuide(p), true);
  assert.equal(data.get('gp_guide_4'), true);
  assert.equal(c.gpGiveAdventureGuide(p), false);
  assert.equal(commands.length, 2);
  assert.match(commands[1], /written_book_content=/);
  assert.match(commands[1], /六道遗迹/);
});

test('worn relics are detected and counted through the real inventory boundary', () => {
  const { context: c } = load(); const { p } = player();
  const stacks = [{ id: 'godpath:world_seed', count: 1 }, { id: 'godpath:life_shard', count: 4 }];
  c.gpCuriosInventory = () => ({ getEquippedCurios: () => ({
    getSlots: () => stacks.length, getStackInSlot: slot => stacks[slot]
  }) });
  assert.equal(c.gpHeld(p, 'world_seed'), true);
  assert.equal(c.gpHeldCount(p, 'life_shard'), 4);
  assert.equal(c.gpEquipped(p, 'world_seed'), true);
  stacks.length = 0;
  assert.equal(c.gpHeld(p, 'world_seed'), false);
});

test('divinity cancels lethal damage and death including generic kill only for ascended players', () => {
  const h = load(['72_divinity.js']); const { p, data } = player();
  let hp = 0, cancelled = 0, damage = 1000000;
  p.getMaxHealth = () => 200; p.setHealth = value => { hp = value; };
  const event = { entity: p, cancel: () => cancelled++, setDamage: value => { damage = value; } };
  h.fire('EntityEvents.beforeHurt', event, 'minecraft:player');
  assert.equal(cancelled, 0);
  data.set('gp_god', true);
  h.fire('EntityEvents.beforeHurt', event, 'minecraft:player');
  assert.equal(damage, 0);
  h.fire('EntityEvents.death', event, 'minecraft:player');
  assert.ok(cancelled > 0); assert.equal(hp, 200);
});

test('divinity grants real flight and revokes only the ability it owns', () => {
  const { context: c } = load(['72_divinity.js']); const { p, data } = player();
  const abilities = { mayfly: false, flying: false, setFlyingSpeed() {} };
  let updates = 0;
  p.getAbilities = () => abilities; p.onUpdateAbilities = () => updates++;
  p.isCreative = () => false; p.isSpectator = () => false;
  data.set('gp_god', true); c.gpSyncDivineFlight(p);
  assert.equal(abilities.mayfly, true); assert.equal(updates, 1);
  c.gpSyncDivineFlight(p); assert.equal(updates, 1);
  data.set('gp_god', false); c.gpSyncDivineFlight(p);
  assert.equal(abilities.mayfly, false); assert.equal(updates, 2);
  abilities.mayfly = true; c.gpSyncDivineFlight(p);
  assert.equal(abilities.mayfly, true);
});

test('equipped two and four relic builds reconcile and remove resonance attributes', () => {
  const { context: c } = load(['25_relic_resonance.js']); const { p, attributes } = player();
  let worn = { origin_stone_core: true, world_seed: true, first_earth_crown: true, echo_of_origin: true };
  c.gpWornRelics = () => worn;
  c.gpApplyResonance(p);
  assert.equal(attributes.get('godpath:resonance_origin_armor'), 12);
  assert.equal(attributes.get('godpath:resonance_origin_toughness'), 8);
  worn = {}; c.gpApplyResonance(p);
  assert.equal(attributes.has('godpath:resonance_origin_armor'), false);
  assert.equal(attributes.has('godpath:resonance_origin_toughness'), false);
});

test('server-side method returning false is not mistaken for a client level', () => {
  const { context: c } = load();
  assert.equal(c.gpIsServer({ level: { isClientSide: () => false } }), true);
  assert.equal(c.gpIsServer({ level: { isClientSide: () => true } }), false);
  assert.equal(c.gpIsServer({ level: { isClientSide: false } }), true);
});

test('ordinary players execute internal effects through the server as that player', () => {
  const { context: c } = load(); const { p, commands } = player();
  c.gpRun(p, 'give @s godpath:origin_shard');
  assert.equal(p.opCalls, 0);
  assert.match(commands[0], /^execute as Tester at @s run give @s godpath:origin_shard$/);
});

test('persistent progress counts each valid relic only once', () => {
  const { context: c } = load(); const { p, data } = player();
  data.set('gp_found', 'world_seed,world_seed,garbage,origin_stone_core');
  assert.equal(c.gpCount(p), 2);
  assert.equal(c.gpAddGod(p, 'garbage'), false);
});

test('Boss rewards remain guaranteed even when the ordinary drop roll succeeds', () => {
  const h = load(['40_home_shield.js', '15_shards.js']); const { p, commands } = player();
  h.context.Math.random = () => 0;
  h.fire('EntityEvents.death', { damageSource: { getEntity: () => p },
    entity: { type: 'minecraft:wither', x: 10, y: 64, z: 10 } });
  assert.equal(commands.filter(x => x.includes('summon minecraft:item') && x.includes('godpath:blade_shard')).length, 4);
  assert.equal(commands.filter(x => x.includes('summon minecraft:item') && x.includes('godpath:arcane_shard')).length, 1);
});

test('Ender Dragon and installed mod Bosses receive the same guaranteed rewards', () => {
  for (const type of ['minecraft:ender_dragon', 'cataclysm:ignis', 'aquamirae:captain_cornelia']) {
    const h = load(['40_home_shield.js', '15_shards.js']); const { p, commands } = player();
    h.context.Math.random = () => 0.9;
    h.fire('EntityEvents.death', { damageSource: { getEntity: () => p }, entity: { type, x: 0, y: 70, z: 0 } });
    assert.equal(commands.filter(x => x.includes('summon minecraft:item')).length, 5, type);
  }
});

test('wither skeleton is an ordinary hostile rather than a Boss', () => {
  const h = load(['40_home_shield.js', '15_shards.js']); const { p, commands } = player();
  h.context.Math.random = () => 0.9;
  h.fire('EntityEvents.death', { damageSource: { getEntity: () => p },
    entity: { type: 'minecraft:wither_skeleton', x: 0, y: 70, z: 0 } });
  assert.equal(commands.filter(x => x.includes('summon minecraft:item')).length, 0);
});

test('immature crops and stored Farmer Delight produce never generate life shards', () => {
  for (const [id, properties] of [['minecraft:wheat', { age: '2' }],
    ['minecraft:beetroots', { age: '2' }], ['farmersdelight:tomatoes', { age: '1' }],
    ['farmersdelight:rice_bag', {}], ['farmersdelight:cabbage_crate', {}]]) {
    const h = load(['15_shards.js']); const { p, commands } = player(); h.context.Math.random = () => 0;
    h.fire('BlockEvents.broken', { player: p, block: { id, properties, x: 1, y: 64, z: 1 } });
    assert.equal(commands.filter(x => x.includes('summon minecraft:item')).length, 0, id);
  }
});

test('mature crops still generate life shards at the existing drop chance', () => {
  for (const [id, age] of [['minecraft:wheat', 7], ['minecraft:beetroots', 3], ['farmersdelight:tomatoes', 3], ['farmersdelight:rice', 3], ['farmersdelight:rice_panicles', 3]]) {
    const h = load(['15_shards.js']); const { p, commands } = player(); h.context.Math.random = () => 0;
    h.fire('BlockEvents.broken', { player: p, block: { id, properties: { age }, x: 1, y: 64, z: 1 } });
    assert.equal(commands.filter(x => x.includes('summon minecraft:item') && x.includes('life_shard')).length, 1, id);
  }
});

test('active and passive effects emit the Minecraft 1.21.1 effect argument shape', () => {
  const h = load(['20_god_effects.js']); const { p, commands } = player();
  h.fire('ItemEvents.rightClicked', { player: p }, 'godpath:harvest_chalice');
  const effects = commands.map(x => x.split(' run ').at(-1)).filter(x => x.startsWith('effect give'));
  assert.ok(effects.length >= 2);
  for (const command of effects) assert.match(command, /^effect give \S+ \S+ \d+ \d+ (true|false)$/);
});

test('first relic cooldown use works in a newly created world', () => {
  const h = load(['20_god_effects.js']); const { p, commands } = player(); p.level.gameTime = 5;
  h.fire('ItemEvents.rightClicked', { player: p }, 'godpath:temporal_rivet');
  assert.ok(commands.some(x => x.includes('minecraft:slowness')), 'first use should activate');
  const count = commands.length;
  h.fire('ItemEvents.rightClicked', { player: p }, 'godpath:temporal_rivet');
  assert.equal(commands.length, count, 'immediate reuse should be rejected');
});

test('ritual repeated clicks schedule only one ascension', () => {
  const h = load(['70_ritual.js']); const { p, data, pending } = player();
  data.set('gp_found', Array.from(h.context.GP_GODS).join(','));
  h.fire('BlockEvents.rightClicked', { player: p }, 'minecraft:lodestone');
  h.fire('BlockEvents.rightClicked', { player: p }, 'minecraft:lodestone');
  assert.equal(pending.filter(x => x.ticks === 260).length, 1);
});

test('blade tier attributes are removed when putting the sword away and restored after respawn', () => {
  const h = load(['65_blade_skills.js']); const { p, data, attributes } = player();
  data.set('gp_blade_kills', 25); data.set('gp_blade_tier', 1);
  p.getMainHandItem = () => ({ id: 'slashblade:slashblade', isEmpty: () => false });
  h.fire('PlayerEvents.tick', { player: p });
  assert.equal(attributes.get('godpath:blade_t1'), 3);
  p.getMainHandItem = () => ({ id: 'minecraft:air', isEmpty: () => true });
  h.fire('PlayerEvents.tick', { player: p });
  assert.equal(attributes.has('godpath:blade_t1'), false);
  attributes.clear();
  p.getMainHandItem = () => ({ id: 'slashblade:slashblade', isEmpty: () => false });
  h.fire('PlayerEvents.tick', { player: p });
  assert.equal(attributes.get('godpath:blade_t1'), 3);
});

test('divine attributes recover after respawn without giving rewards again', () => {
  const h = load(['20_god_effects.js', '50_difficulty.js', '70_ritual.js']);
  const { p, data, commands, attributes } = player(); data.set('gp_god', true);
  h.fire('PlayerEvents.tick', { player: p });
  assert.equal(attributes.get('godpath:divine_hp'), 180);
  assert.equal(commands.some(x => x.includes('give @s godpath:divinity_mark')), false);
});

test('world seed records dimension and accepts an anchor at zero coordinates', () => {
  const h = load(['20_god_effects.js']); const { p, commands } = player();
  p.x = p.y = p.z = 0; p.level.dimension = 'minecraft:the_nether'; p.isShiftKeyDown = () => true;
  h.fire('ItemEvents.rightClicked', { player: p }, 'godpath:world_seed');
  p.level.dimension = 'minecraft:overworld'; p.isShiftKeyDown = () => false;
  h.fire('ItemEvents.rightClicked', { player: p }, 'godpath:world_seed');
  assert.ok(commands.some(x => x.includes('execute in minecraft:the_nether run tp @s 0 0 0')));
});

test('crop acceleration grows nearby crops without modifying global game rules', () => {
  const h = load(['15_shards.js', '20_god_effects.js']); const { p, commands } = player();
  const wheat = { id: 'minecraft:wheat', properties: { age: '1' },
    set(id, props) { this.id = id; this.properties = props; } };
  p.level.getBlock = (x, y, z) => x === 4 && y === 64 && z === 9 ? wheat : { id: 'minecraft:air' };
  h.fire('ItemEvents.rightClicked', { player: p }, 'godpath:heart_of_seasons');
  assert.equal(Number(wheat.properties.age), 7);
  assert.equal(commands.some(x => x.includes('gamerule randomTickSpeed')), false);
});

function combatEntities(p) {
  return [
    { uuid: '00000000-0000-0000-0000-000000000011', type: 'minecraft:zombie', x: p.x, y: p.y, z: p.z + 4 },
    { uuid: '00000000-0000-0000-0000-000000000012', type: 'minecraft:zombie', x: p.x, y: p.y, z: p.z - 4 },
    { uuid: '00000000-0000-0000-0000-000000000013', type: 'minecraft:cow', x: p.x, y: p.y, z: p.z + 3 },
  ];
}

test('ordinary and crouching right clicks leave blade skills untouched', () => {
  const h = load(['65_blade_skills.js']); const { p, data, commands } = player();
  const blade = { id: 'slashblade:slashblade', isEmpty: () => false };
  data.set('gp_blade_kills', 25);
  p.getMainHandItem = () => blade;
  p.level.getEntitiesWithin = () => combatEntities(p);
  h.fire('ItemEvents.rightClicked', { player: p, item: blade });
  p.isShiftKeyDown = () => true;
  h.fire('ItemEvents.rightClicked', { player: p, item: blade });
  assert.equal(data.has('gp_slash_cd'), false);
  assert.equal(data.has('gp_burst_cd'), false);
  assert.deepEqual(commands, []);
});

test('dedicated sword beam hits enemies ahead and respects its server-side cooldown', () => {
  const h = load(['40_home_shield.js', '65_blade_skills.js']); const { p, data, commands } = player();
  data.set('gp_blade_kills', 25); p.getLookAngle = () => ({ x: 0, y: 0, z: 1 });
  p.level.getEntitiesWithin = () => combatEntities(p);
  p.getMainHandItem = () => ({ id: 'slashblade:slashblade', isEmpty: () => false });
  h.fire('NetworkEvents.dataReceived', { player: p }, 'godpath_blade_skill');
  h.fire('NetworkEvents.dataReceived', { player: p }, 'godpath_blade_skill');
  const damages = commands.filter(x => x.includes(' run damage '));
  assert.equal(damages.length, 1);
  assert.match(damages[0], /damage 00000000-0000-0000-0000-000000000011 10 minecraft:player_attack by @s$/);
});

test('burst hits hostile entities around the player without harming animals', () => {
  const h = load(['40_home_shield.js', '65_blade_skills.js']); const { p, data, commands } = player();
  data.set('gp_blade_kills', 25); p.isShiftKeyDown = () => true;
  p.level.getEntitiesWithin = () => combatEntities(p);
  p.getMainHandItem = () => ({ id: 'slashblade:slashblade', isEmpty: () => false });
  h.fire('NetworkEvents.dataReceived', { player: p }, 'godpath_blade_skill');
  const damages = commands.filter(x => x.includes(' run damage '));
  assert.equal(damages.length, 2);
  assert.ok(damages.every(x => !x.includes('000000000013')));
});

test('the blade skill packet cannot supply a weapon when the server main hand is empty', () => {
  const h = load(['65_blade_skills.js']); const { p, data, commands } = player();
  data.set('gp_blade_kills', 25);
  h.fire('NetworkEvents.dataReceived', { player: p, data: { item: 'slashblade:slashblade' } }, 'godpath_blade_skill');
  assert.equal(data.has('gp_slash_cd'), false);
  assert.deepEqual(commands, []);
});

test('the client registers an in-game blade skill key and sends only its channel', () => {
  const registrations = [];
  const startup = fs.readFileSync(path.join(scriptDir, '../startup_scripts/05_blade_key.js'), 'utf8');
  vm.runInNewContext(startup, { Platform: { isClientEnvironment: () => false } });
  vm.runInNewContext(startup, {
    Platform: { isClientEnvironment: () => true },
    KeyBindEvents: { registry: callback => callback({
      register: (id, key) => ({ inGame: () => registrations.push([id, key]) }),
    }) },
  });
  assert.deepEqual(registrations, [['godpath_blade_skill', 'KEY_F8']]);

  const sent = [];
  const client = fs.readFileSync(path.join(scriptDir, '../client_scripts/15_blade_key.js'), 'utf8');
  vm.runInNewContext(client, {
    KeyBindEvents: { pressed: (id, callback) => {
      assert.equal(id, 'godpath_blade_skill');
      callback({ player: { sendData: (...args) => sent.push(args) } });
    } },
  });
  assert.deepEqual(sent, [['godpath_blade_skill']]);
});

test('holding a native blade restores vanilla combat even without an item swap', () => {
  const source = fs.readFileSync(path.join(scriptDir, '../client_scripts/16_blade_epicfight_compat.js'), 'utf8');
  vm.runInNewContext(source, { Platform: { isLoaded: () => false } });
  class NativeBlade {}
  let tick;
  let switches = 0;
  const patch = { isEpicFightMode: () => switches === 0, toVanillaMode: sync => {
    assert.equal(sync, true);
    switches++;
  } };
  vm.runInNewContext(source, {
    Platform: { isLoaded: () => true },
    Java: { loadClass: name => name.endsWith('ItemSlashBlade') ? NativeBlade : {
      getInstance: () => ({ getPlayerPatch: () => patch }),
    } },
    ClientEvents: { tick: callback => { tick = callback; } },
  });
  const holder = item => ({ player: { getMainHandItem: () => ({ getItem: () => item }) } });
  tick(holder({}));
  assert.equal(switches, 0);
  const equipped = holder(new NativeBlade());
  tick(equipped);
  tick(equipped);
  assert.equal(switches, 1);
});

test('blade law aura restores actual modifiers after respawn despite a retained flag', () => {
  const h = load(['60_blade.js']); const { p, data, attributes } = player();
  data.set('gp_found', 'thunder_blade_soul,dragonfang_blade,void_sheath,final_tablet');
  data.set('gp_blade_aura', true);
  p.getMainHandItem = () => ({ id: 'slashblade:slashblade', isEmpty: () => false });
  h.fire('PlayerEvents.tick', { player: p });
  assert.equal(attributes.get('godpath:blade_atk'), 12);
});

test('disconnecting during ritual cancels the pending ascension', () => {
  const h = load(['70_ritual.js']); const { p, data, pending } = player();
  data.set('gp_found', Array.from(h.context.GP_GODS).join(','));
  h.fire('BlockEvents.rightClicked', { player: p }, 'minecraft:lodestone');
  h.fire('PlayerEvents.loggedOut', { player: p });
  pending.find(x => x.ticks === 260).callback();
  assert.equal(data.get('gp_god') || false, false);
});

test('an old ritual timer cannot complete a restarted ritual', () => {
  const h = load(['70_ritual.js']); const { p, data, pending } = player();
  data.set('gp_found', Array.from(h.context.GP_GODS).join(','));
  h.fire('BlockEvents.rightClicked', { player: p }, 'minecraft:lodestone');
  h.fire('PlayerEvents.loggedOut', { player: p });
  h.fire('PlayerEvents.loggedIn', { player: p });
  h.fire('BlockEvents.rightClicked', { player: p }, 'minecraft:lodestone');
  const [old, restarted] = pending.filter(task => task.ticks === 260);
  old.callback();
  assert.equal(data.get('gp_god') || false, false);
  restarted.callback();
  assert.equal(data.get('gp_god'), true);
});

test('a cancelled first-join warmup remains eligible until successful completion', () => {
  const h = load(['82_chunk_warmup.js']); const { p, data, pending } = player();
  p.server.isDedicated = () => false;
  p.isRemoved = () => false;
  p.level.getChunkSource = () => ({});
  h.fire('PlayerEvents.loggedIn', { player: p });
  pending.shift().callback();
  assert.ok(h.context.gpChunkWarmup);
  h.fire('PlayerEvents.loggedOut', { player: p });
  assert.equal(data.has('gp_nearby_warmup_started'), false);
  h.fire('PlayerEvents.loggedIn', { player: p });
  pending.shift().callback();
  h.context.gpFinishNearbyChunks('完成');
  assert.equal(data.get('gp_nearby_warmup_started'), true);
});

test('attribute reconciliation upgrades an existing incorrect modifier amount', () => {
  const { context: c } = load(); const { p, attributes } = player();
  attributes.set('godpath:runtime_value', 0.03);
  c.gpEnsureAttribute(p, 'minecraft:generic.movement_speed', 'godpath:runtime_value', 0.15);
  assert.equal(attributes.get('godpath:runtime_value'), 0.15);
});

test('cooldown reads KubeJS remapped getTime when no gameTime property exists', () => {
  const { context: c } = load(); const { p, data } = player();
  delete p.level.gameTime; p.level.getTime = () => 9;
  assert.equal(c.gpCooldown(p, 'method_cd', 60), 0);
  assert.equal(data.get('method_cd'), 9);
  assert.equal(c.gpCooldown(p, 'method_cd', 60), 60);
});

test('Farmer Delight growth respects the actual age-3 properties', () => {
  for (const id of ['farmersdelight:tomatoes', 'farmersdelight:rice', 'farmersdelight:rice_panicles']) {
    const h = load(['15_shards.js', '20_god_effects.js']); const { p } = player();
    const crop = { id, properties: { age: '1' }, set(id, props) {
      if (Number(props.age) > 3) throw new Error('Illegal AGE_3 value');
      this.properties = props;
    } };
    p.level.getBlock = (x, y, z) => x === 4 && y === 64 && z === 9 ? crop : { id: 'minecraft:air' };
    h.fire('ItemEvents.rightClicked', { player: p }, 'godpath:heart_of_seasons');
    assert.equal(Number(crop.properties.age), 3, id);
  }
});
