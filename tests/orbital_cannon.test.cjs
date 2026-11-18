const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadOrbital() {
  const handlers = {};
  const events = group => new Proxy({}, {
    get: (_, name) => (...args) => { handlers[group + '.' + name] = args.at(-1); }
  });
  const context = vm.createContext({
    Java: { loadClass: () => ({}) },
    Platform: { isLoaded: () => false },
    ServerEvents: events('ServerEvents'),
    PlayerEvents: events('PlayerEvents'),
    EntityEvents: events('EntityEvents'),
    NetworkEvents: events('NetworkEvents'),
    global: {},
    gpDimension: level => String(level.dimension),
    console
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../pack/kubejs/server_scripts/85_orbital_cannon.js'), 'utf8'), context);
  return { context, handlers };
}

test('charge cannot fire before sixty ticks, or across eligibility, dimension or target changes', () => {
  const { context } = loadOrbital();
  const level = 'minecraft:overworld';
  const target = { distanceSquared: 128 * 128 };
  const charge = { dimension: level, startTick: 100, target };
  assert.equal(context.gpOrbitalCanFire(charge, level, true, true, 159, target.distanceSquared), false);
  assert.equal(context.gpOrbitalCanFire(charge, level, true, true, 160, target.distanceSquared), true);
  assert.equal(context.gpOrbitalCanFire(charge, level, false, true, 160, target.distanceSquared), false);
  assert.equal(context.gpOrbitalCanFire(charge, level, true, false, 160, target.distanceSquared), false);
  assert.equal(context.gpOrbitalCanFire(charge, {}, true, true, 160, target.distanceSquared), false);
  assert.equal(context.gpOrbitalCanFire(charge, level, true, true, 160, target.distanceSquared + 1), false);
  assert.equal(context.gpOrbitalCanFire(null, level, true, true, 160, 0), false);
  assert.equal(context.GP_ORBITAL.cooldownTicks, 600);
});

test('crater queue stays inside its footprint, tapers and respects the shared tick budget', () => {
  const { context } = loadOrbital();
  const first = { target: { x: 0, y: 80, z: 0 }, cursor: 0, depth: 0 };
  const second = { target: { x: 100, y: 80, z: 100 }, cursor: 0, depth: 0 };
  context.gpOrbitalCraterQueue.push(first, second);
  const positions = new Map([[first, []], [second, []]]);
  let cycles = 0;
  while (context.gpOrbitalCraterQueue.length) {
    let work = 0;
    context.gpOrbitalProcessCrater((job, x, y, z) => {
      work++;
      positions.get(job).push([x, y, z]);
    });
    assert.ok(work <= context.GP_ORBITAL.blocksPerTick);
    assert.ok(++cycles <= 300);
  }
  assert.ok(positions.get(first).length > 1000);
  for (const [job, cells] of positions) {
    assert.equal(new Set(cells.map(cell => cell.join(','))).size, cells.length);
    for (const [x, y, z] of cells) {
      assert.ok(y <= 80 && y > 80 - 24);
      assert.ok((x - job.target.x) ** 2 + (z - job.target.z) ** 2 <= 16 ** 2);
    }
    assert.ok(cells.filter(cell => cell[1] === 80).length > cells.filter(cell => cell[1] === 57).length);
  }
});

test('only living non-player non-pet entities inside the spherical strike are affected', () => {
  const { context } = loadOrbital();
  assert.equal(context.gpOrbitalEntityEligible(true, false, false, true, 24 ** 2, 24), true);
  assert.equal(context.gpOrbitalEntityEligible(true, false, false, true, 24 ** 2 + 1, 24), false);
  assert.equal(context.gpOrbitalEntityEligible(true, true, false, true, 0, 24), false);
  assert.equal(context.gpOrbitalEntityEligible(true, false, true, true, 0, 24), false);
  assert.equal(context.gpOrbitalEntityEligible(false, false, false, true, 0, 24), false);
  assert.equal(context.gpOrbitalEntityEligible(true, false, false, false, 0, 24), false);
});

test('release, logout and unload clean up the active runtime state', () => {
  const { context, handlers } = loadOrbital();
  const player = {
    uuid: 'tester',
    getMainHandItem: () => ({ id: 'godpath:orbital_cannon' }),
    getServer: () => ({ overworld: () => ({ getGameTime: () => 0 }) }),
    level: { dimension: () => ({ location: () => 'minecraft:overworld' }) },
    persistentData: { getBoolean: () => false },
    isUsingItem: () => false,
    displayClientMessage: () => {}
  };
  context.Text = { translate: value => value };
  context.gpOrbitalCharges.set('tester', {});
  handlers['PlayerEvents.tick']({ player });
  assert.equal(context.gpOrbitalCharges.size, 0);
  context.gpOrbitalCharges.set('tester', {});
  handlers['PlayerEvents.loggedOut']({ player });
  assert.equal(context.gpOrbitalCharges.size, 0);
  context.gpOrbitalCharges.set('tester', {});
  context.gpOrbitalCraterQueue.push({});
  handlers['ServerEvents.unloaded']({});
  assert.equal(context.gpOrbitalCharges.size, 0);
  assert.equal(context.gpOrbitalCraterQueue.length, 0);
});

test('claim protection fails closed and terrain preserves claimed chunks even for their owners', () => {
  const { context } = loadOrbital();
  const player = {};
  const level = {
    getServer: () => ({}),
    dimension: 'minecraft:overworld'
  };
  assert.equal(context.gpOrbitalClaimAccess(level, player, 40, 170, true), true);
  context.gpOrbitalClaimsInstalled = true;
  assert.equal(context.gpOrbitalClaimAccess(level, player, 40, 170, true), false);

  context.GpOrbitalResourceLocation = { parse: id => id };
  let ownerAllowed = false;
  let foundClaim = true;
  context.GpOrbitalClaims = {
    get: () => ({
      getServerClaimsManager: () => ({
        get: (dimension, x, z) => {
          assert.equal(dimension, 'minecraft:overworld');
          assert.equal(x, -1);
          assert.equal(z, 10);
          return foundClaim ? {} : null;
        }
      }),
      getChunkProtection: () => ({ hasChunkAccess: () => ownerAllowed })
    })
  };
  assert.equal(context.gpOrbitalClaimAccess(level, player, -1, 170, false), false);
  ownerAllowed = true;
  assert.equal(context.gpOrbitalClaimAccess(level, player, -1, 170, false), true);
  assert.equal(context.gpOrbitalClaimAccess(level, player, -1, 170, true), false);
  foundClaim = false;
  assert.equal(context.gpOrbitalClaimAccess(level, player, -1, 170, true), true);
});

test('locked aim is clipped before unloaded chunks and requires a loaded target', () => {
  const { context } = loadOrbital();
  const requests = [];
  const level = {
    getChunkSource: () => ({
      getChunkNow: (x, z) => {
        requests.push([x, z]);
        return x < 2 ? {} : null;
      }
    })
  };
  const origin = { x: 1, z: 2, add: x => x + 1 };
  const direction = { x: 1, z: 0, scale: distance => distance };
  const end = context.gpOrbitalClipEnd(level, origin, direction);
  assert.ok(end < 32 && end > 31.99);
  assert.deepEqual(requests, [[0, 0], [1, 0], [2, 0]]);
  assert.equal(context.gpOrbitalTargetValid(level, { x: 32, y: 70, z: 2 }), false);
});


test('clipping terminates with vertical, diagonal or invalid aim', () => {
  const { context } = loadOrbital();
  let reads = 0;
  const level = { getChunkSource: () => ({ getChunkNow: () => { reads++; return {}; } }) };
  const origin = { x: 0, z: 0, add: distance => distance };
  const aim = (x, z) => ({ x, z, scale: distance => distance });
  assert.equal(context.gpOrbitalClipEnd(level, origin, aim(0, 0)), 128);
  assert.equal(context.gpOrbitalClipEnd(level, origin, aim(-Math.SQRT1_2, Math.SQRT1_2)), 128);
  assert.equal(context.gpOrbitalClipEnd(level, origin, aim(NaN, 1)), null);
  assert.ok(reads < 32);
});


test('the world border rejects blocks wholly outside and accepts intersecting blocks', () => {
  const { context } = loadOrbital();
  const level = { getWorldBorder: () => ({
    getMinX: () => -3.5, getMaxX: () => 7, getMinZ: () => -5, getMaxZ: () => 2.5
  }) };
  assert.equal(context.gpOrbitalWithinBorder(level, -4, 2), true);
  assert.equal(context.gpOrbitalWithinBorder(level, -5, 2), false);
  assert.equal(context.gpOrbitalWithinBorder(level, 7, 2), false);
  assert.equal(context.gpOrbitalWithinBorder(level, 6, -6), false);
  assert.equal(context.gpOrbitalWithinBorder(level, 6, 3), false);
});


test('the station footprint is protected only in opted-in overworlds', () => {
  const { context } = loadOrbital();
  let expedition = true;
  context.gpExpeditionEnabled = () => expedition;
  const overworld = { dimension: 'minecraft:overworld', getServer: () => ({}) };
  const nether = { ...overworld, dimension: 'minecraft:the_nether' };
  assert.equal(context.gpOrbitalTerrainAllowed(overworld, {}, -8, -20), false);
  assert.equal(context.gpOrbitalTerrainAllowed(overworld, {}, 200, 30), false);
  assert.equal(context.gpOrbitalTerrainAllowed(overworld, {}, 201, 30), true);
  assert.equal(context.gpOrbitalTerrainAllowed(nether, {}, 0, 0), true);
  expedition = false;
  assert.equal(context.gpOrbitalTerrainAllowed(overworld, {}, 0, 0), true);
});
