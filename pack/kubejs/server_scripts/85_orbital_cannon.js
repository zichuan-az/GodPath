var GP_ORBITAL = Object.freeze({
  item: 'godpath:orbital_cannon',
  chargeTicks: 60,
  cooldownTicks: 600,
  range: 128,
  entityRadius: 24,
  craterRadius: 16,
  craterDepth: 24,
  blocksPerTick: 160,
  maxCraterJobs: 4
});

var GpOrbitalBlockPos;
var GpOrbitalClip;
var GpOrbitalClipBlock;
var GpOrbitalClipFluid;
var GpOrbitalAabb;
var GpOrbitalLiving;
var GpOrbitalPlayer;
var GpOrbitalOwnable;
var GpOrbitalHorse;
var GpOrbitalBlocks;
var GpOrbitalBlock;
var GpOrbitalParticles;
var GpOrbitalSounds;
var GpOrbitalSoundSource;
var gpOrbitalClaimsInstalled = false;
var GpOrbitalClaims;

function gpOrbitalLoadNative() {
  if (GpOrbitalBlockPos) return;
  GpOrbitalClip = Java.loadClass('net.minecraft.world.level.ClipContext');
  GpOrbitalClipBlock = Java.loadClass('net.minecraft.world.level.ClipContext$Block');
  GpOrbitalClipFluid = Java.loadClass('net.minecraft.world.level.ClipContext$Fluid');
  GpOrbitalAabb = Java.loadClass('net.minecraft.world.phys.AABB');
  GpOrbitalLiving = Java.loadClass('net.minecraft.world.entity.LivingEntity');
  GpOrbitalPlayer = Java.loadClass('net.minecraft.world.entity.player.Player');
  GpOrbitalOwnable = Java.loadClass('net.minecraft.world.entity.OwnableEntity');
  GpOrbitalHorse = Java.loadClass('net.minecraft.world.entity.animal.horse.AbstractHorse');
  GpOrbitalBlock = Java.loadClass('net.minecraft.world.level.block.Block');
  GpOrbitalBlocks = Java.loadClass('net.minecraft.world.level.block.Blocks');
  GpOrbitalParticles = Java.loadClass('net.minecraft.core.particles.ParticleTypes');
  GpOrbitalSounds = Java.loadClass('net.minecraft.sounds.SoundEvents');
  GpOrbitalSoundSource = Java.loadClass('net.minecraft.sounds.SoundSource');
  GpOrbitalBlockPos = Java.loadClass('net.minecraft.core.BlockPos');
  gpOrbitalClaimsInstalled = Platform.isLoaded('openpartiesandclaims');
  if (gpOrbitalClaimsInstalled) {
    try {
      GpOrbitalClaims = Java.loadClass('xaero.pac.common.server.api.OpenPACServerAPI');
    } catch (error) {
      console.warn('[GodPath] Orbital claim protection unavailable: ' + error);
    }
  }
}

var gpOrbitalCharges = new Map();
var gpOrbitalDisarmed = new Set();
var gpOrbitalCraterQueue = [];
var gpOrbitalClaimWarning = false;

function gpOrbitalHeld(player) {
  return '' + player.getMainHandItem().id === GP_ORBITAL.item;
}

function gpOrbitalMode(player) {
  return player.persistentData.getBoolean('gp_orbital_terrain') ? 'terrain' : 'entities';
}

function gpOrbitalTime(player) {
  const overworld = player.getServer().overworld();
  return Number(typeof overworld.getTime === 'function' ? overworld.getTime() : overworld.getGameTime());
}

function gpOrbitalCooldown(player) {
  return Math.max(0, Number(player.persistentData.getLong('gp_orbital_ready_at')) - gpOrbitalTime(player));
}

function gpOrbitalStatus(player, status, value) {
  const mode = Text.translate('godpath.orbital.mode.' + gpOrbitalMode(player));
  const key = 'godpath.orbital.' + status;
  player.displayClientMessage(value === undefined ? Text.translate(key, mode) : Text.translate(key, mode, '' + value), true);
}

function gpOrbitalLoaded(level, chunkX, chunkZ) {
  return level.getChunkSource().getChunkNow(chunkX, chunkZ) != null;
}

function gpOrbitalClipEnd(level, origin, direction) {
  let chunkX = Math.floor(origin.x / 16);
  let chunkZ = Math.floor(origin.z / 16);
  const stepX = Math.sign(direction.x);
  const stepZ = Math.sign(direction.z);
  const deltaX = stepX === 0 ? Infinity : 16 / Math.abs(direction.x);
  const deltaZ = stepZ === 0 ? Infinity : 16 / Math.abs(direction.z);
  let crossX = stepX === 0 ? Infinity : ((chunkX + (stepX > 0 ? 1 : 0)) * 16 - origin.x) / direction.x;
  let crossZ = stepZ === 0 ? Infinity : ((chunkZ + (stepZ > 0 ? 1 : 0)) * 16 - origin.z) / direction.z;
  let distance = 0;
  while (distance <= GP_ORBITAL.range) {
    if (!gpOrbitalLoaded(level, chunkX, chunkZ)) {
      return distance === 0 ? null : origin.add(direction.scale(distance - 0.0001));
    }
    const crossing = Math.min(crossX, crossZ);
    if (crossing > GP_ORBITAL.range) break;
    if (crossX === crossZ && (!gpOrbitalLoaded(level, chunkX + stepX, chunkZ) ||
        !gpOrbitalLoaded(level, chunkX, chunkZ + stepZ))) {
      return crossing === 0 ? null : origin.add(direction.scale(crossing - 0.0001));
    }
    if (crossX === crossing) {
      crossX += deltaX;
      chunkX += stepX;
    }
    if (crossZ === crossing) {
      crossZ += deltaZ;
      chunkZ += stepZ;
    }
    distance = crossing;
  }
  return origin.add(direction.scale(GP_ORBITAL.range));
}

function gpOrbitalAim(player, level) {
  const origin = player.getEyePosition();
  const end = gpOrbitalClipEnd(level, origin, player.getLookAngle());
  if (end == null) return null;
  const hit = level.clip(new GpOrbitalClip(origin, end, GpOrbitalClipBlock.COLLIDER, GpOrbitalClipFluid.NONE, player));
  if ('' + hit.getType() !== 'BLOCK') return null;
  const pos = hit.getBlockPos();
  return { x: pos.getX(), y: pos.getY(), z: pos.getZ(), pos: pos, hit: hit.getLocation() };
}

function gpOrbitalClaimAccess(level, player, x, z, terrain) {
  if (!gpOrbitalClaimsInstalled) return true;
  if (!GpOrbitalClaims) return false;
  try {
    const api = GpOrbitalClaims.get(level.getServer());
    const dimension = level.dimension().location();
    const chunkX = Math.floor(x / 16);
    const chunkZ = Math.floor(z / 16);
    const claim = api.getServerClaimsManager().get(dimension, chunkX, chunkZ);
    if (claim == null) return true;
    if (terrain) return false;
    return api.getChunkProtection().hasChunkAccess(player, dimension, chunkX, chunkZ);
  } catch (error) {
    if (!gpOrbitalClaimWarning) {
      gpOrbitalClaimWarning = true;
      console.warn('[GodPath] Orbital claim check failed: ' + error);
    }
    return false;
  }
}

function gpOrbitalDimension(level) {
  return '' + level.dimension().location();
}

function gpOrbitalStationProtected(level, x, z) {
  return x >= -8 && x <= 200 && z >= -20 && z <= 30 &&
    gpOrbitalDimension(level) === 'minecraft:overworld' &&
    typeof gpExpeditionEnabled === 'function' && gpExpeditionEnabled(level.getServer());
}

function gpOrbitalTerrainAllowed(level, player, x, z) {
  return !gpOrbitalStationProtected(level, x, z) && gpOrbitalClaimAccess(level, player, x, z, true);
}

function gpOrbitalTargetValid(level, target) {
  return gpOrbitalLoaded(level, Math.floor(target.x / 16), Math.floor(target.z / 16)) &&
    level.getWorldBorder().isWithinBounds(target.pos) && !level.getBlockState(target.pos).isAir();
}

function gpOrbitalCanFire(charge, dimension, eligible, validTarget, currentTick, distanceSquared) {
  return !!charge && charge.dimension === dimension && eligible && validTarget &&
    currentTick - charge.startTick >= GP_ORBITAL.chargeTicks && distanceSquared <= GP_ORBITAL.range ** 2;
}

function gpOrbitalEntityEligible(living, player, pet, alive, distanceSquared, radius) {
  return living && !player && !pet && alive && distanceSquared <= radius * radius;
}

function gpOrbitalDamage(level, player, target, mode) {
  const radius = mode === 'terrain' ? GP_ORBITAL.craterRadius : GP_ORBITAL.entityRadius;
  const center = target.hit;
  const bounds = new GpOrbitalAabb(center.x - radius, center.y - radius, center.z - radius,
    center.x + radius, center.y + radius, center.z + radius);
  const entities = level.getEntities(player, bounds, entity => {
    const living = entity instanceof GpOrbitalLiving;
    const pet = (entity instanceof GpOrbitalOwnable && entity.getOwnerUUID() != null) ||
      (entity instanceof GpOrbitalHorse && entity.isTamed());
    return gpOrbitalEntityEligible(living, entity instanceof GpOrbitalPlayer, pet,
      entity.isAlive(), entity.distanceToSqr(center), radius) &&
      gpOrbitalClaimAccess(level, player, entity.x, entity.z, mode === 'terrain') &&
      (mode !== 'terrain' || !gpOrbitalStationProtected(level, entity.x, entity.z));
  });
  const damage = level.damageSources().playerAttack(player);
  for (let index = 0; index < entities.size(); index++) entities.get(index).hurt(damage, 1000000);
}

function gpOrbitalBuildCrater() {
  var layers = [];
  for (var depth = 0; depth < GP_ORBITAL.craterDepth; depth++) {
    var taper = GP_ORBITAL.craterRadius * (1 - 0.8 * depth / (GP_ORBITAL.craterDepth - 1));
    var cells = [];
    for (var z = -Math.floor(taper); z <= taper; z++) {
      var span = Math.floor(Math.sqrt(taper * taper - z * z));
      for (var x = -span; x <= span; x++) cells.push([x, z]);
    }
    layers.push(cells);
  }
  return layers;
}

var gpOrbitalCraterLayers = gpOrbitalBuildCrater();

function gpOrbitalProcessCrater(visit) {
  let remaining = GP_ORBITAL.blocksPerTick;
  while (remaining > 0 && gpOrbitalCraterQueue.length) {
    const job = gpOrbitalCraterQueue[0];
    const layer = gpOrbitalCraterLayers[job.depth];
    const cell = layer[job.cursor];
    visit(job, job.target.x + cell[0], job.target.y - job.depth, job.target.z + cell[1]);
    remaining--;
    job.cursor++;
    if (job.cursor >= layer.length) {
      job.cursor = 0;
      job.depth++;
      if (job.depth >= gpOrbitalCraterLayers.length) gpOrbitalCraterQueue.shift();
    }
  }
}

function gpOrbitalRemoveBlock(job, x, y, z) {
  const level = job.level;
  if (y < level.getMinBuildHeight() || y >= level.getMaxBuildHeight() ||
      !gpOrbitalLoaded(level, Math.floor(x / 16), Math.floor(z / 16))) return;
  const pos = new GpOrbitalBlockPos(x, y, z);
  if (!level.getWorldBorder().isWithinBounds(pos)) return;
  const state = level.getBlockState(pos);
  if (state.isAir() || state.hasBlockEntity() || state.getDestroySpeed(level, pos) < 0 ||
      !gpOrbitalTerrainAllowed(level, job.player, x, z)) return;
  const updateFlags = GpOrbitalBlock.UPDATE_CLIENTS | GpOrbitalBlock.UPDATE_KNOWN_SHAPE | GpOrbitalBlock.UPDATE_SUPPRESS_DROPS;
  level.setBlock(pos, GpOrbitalBlocks.AIR.defaultBlockState(), updateFlags);
}

function gpOrbitalPoint(level, particle, x, y, z, count, spread, speed) {
  level.sendParticles(particle, x, y, z, count, spread, spread, spread, speed);
}

function gpOrbitalRing(level, point, radius, particle, points, rotation) {
  for (let index = 0; index < points; index++) {
    const angle = index * Math.PI * 2 / points + rotation;
    gpOrbitalPoint(level, particle, point.x + Math.cos(angle) * radius, point.y + 0.2,
      point.z + Math.sin(angle) * radius, 1, 0, 0);
  }
}

function gpOrbitalChargeEffect(charge, elapsed) {
  const level = charge.level;
  const point = charge.target.hit;
  const radius = charge.mode === 'terrain' ? GP_ORBITAL.craterRadius : GP_ORBITAL.entityRadius;
  gpOrbitalRing(level, point, radius, GpOrbitalParticles.ELECTRIC_SPARK, 12, elapsed / 16);
  gpOrbitalRing(level, point, 1 + 5 * (1 - elapsed / GP_ORBITAL.chargeTicks),
    GpOrbitalParticles.END_ROD, 8, -elapsed / 12);
  if (elapsed >= 40) {
    for (let height = 4; height <= 28; height += 4) {
      gpOrbitalPoint(level, GpOrbitalParticles.END_ROD, point.x, point.y + height, point.z, 1, 0.25, 0);
    }
  }
  level.playSound(null, point.x, point.y, point.z, GpOrbitalSounds.NOTE_BLOCK_CHIME.value(),
    GpOrbitalSoundSource.PLAYERS, 0.65, 0.7 + elapsed / 50);
}

function gpOrbitalImpact(charge) {
  const level = charge.level;
  const point = charge.target.hit;
  for (let height = 0; height <= 44; height += 2) {
    gpOrbitalPoint(level, GpOrbitalParticles.END_ROD, point.x, point.y + height, point.z, 3, 0.35, 0);
  }
  gpOrbitalPoint(level, GpOrbitalParticles.FLASH, point.x, point.y, point.z, 1, 0, 0);
  gpOrbitalPoint(level, GpOrbitalParticles.CLOUD, point.x, point.y + 0.5, point.z, 22, 2.4, 0.08);
  gpOrbitalRing(level, point, 7, GpOrbitalParticles.ELECTRIC_SPARK, 16, 0);
  level.playSound(null, point.x, point.y, point.z, GpOrbitalSounds.LIGHTNING_BOLT_THUNDER,
    GpOrbitalSoundSource.PLAYERS, 1.5, 1.35);
}

function gpOrbitalCancel(player, notify) {
  if (!gpOrbitalCharges.delete('' + player.uuid)) return;
  if (notify) gpOrbitalStatus(player, 'cancelled');
}

function gpOrbitalStopUse(player) {
  gpOrbitalCancel(player, true);
  if (player.isUsingItem() && '' + player.getUseItem().id === GP_ORBITAL.item) player.stopUsingItem();
}

function gpOrbitalBegin(player) {
  if (!player.isAlive() || player.isSpectator()) return false;
  if (!gpIsGod(player)) {
    gpOrbitalStatus(player, 'locked');
    return false;
  }
  const cooldown = gpOrbitalCooldown(player);
  if (cooldown > 0) {
    gpOrbitalStatus(player, 'cooldown', Math.ceil(cooldown / 20));
    return false;
  }
  gpOrbitalLoadNative();
  const level = player.serverLevel();
  const target = gpOrbitalAim(player, level);
  if (!target || !gpOrbitalTargetValid(level, target)) {
    gpOrbitalStatus(player, 'no_target');
    return false;
  }
  const mode = gpOrbitalMode(player);
  if (mode === 'terrain' && !gpOrbitalTerrainAllowed(level, player, target.x, target.z)) {
    gpOrbitalStatus(player, 'protected');
    return false;
  }
  const charge = { level: level, dimension: gpOrbitalDimension(level), target: target, mode: mode, startTick: gpOrbitalTime(player) };
  gpOrbitalCharges.set('' + player.uuid, charge);
  gpOrbitalStatus(player, 'charging', 0);
  gpOrbitalChargeEffect(charge, 0);
  return true;
}

function gpOrbitalUsing(player) {
  return player.isUsingItem() && '' + player.getUseItem().id === GP_ORBITAL.item;
}

PlayerEvents.tick(event => {
  const player = event.player;
  const key = '' + player.uuid;
  const charge = gpOrbitalCharges.get(key);
  if (!charge && !gpOrbitalHeld(player)) {
    gpOrbitalDisarmed.delete(key);
    return;
  }
  const using = gpOrbitalUsing(player);
  if (!using) gpOrbitalDisarmed.delete(key);
  const currentTick = gpOrbitalTime(player);
  if (!charge) {
    if (using) {
      if (!gpOrbitalDisarmed.has(key) && !gpOrbitalBegin(player)) gpOrbitalDisarmed.add(key);
      return;
    }
    if (currentTick % 20 === 10 && gpOrbitalHeld(player) && gpIsGod(player)) {
      const cooldown = gpOrbitalCooldown(player);
      if (cooldown > 0) {
        gpOrbitalStatus(player, 'cooldown', Math.ceil(cooldown / 20));
      } else if (gpOrbitalMode(player) === 'terrain') {
        gpOrbitalLoadNative();
        const level = player.serverLevel();
        const target = gpOrbitalAim(player, level);
        gpOrbitalStatus(player, target && !gpOrbitalTerrainAllowed(level, player, target.x, target.z) ? 'protected' : 'ready');
      } else {
        gpOrbitalStatus(player, 'ready');
      }
    }
    return;
  }
  const level = player.serverLevel();
  const eligible = gpOrbitalHeld(player) && using && player.isAlive() && !player.isSpectator() && gpIsGod(player) &&
    gpOrbitalMode(player) === charge.mode;
  const dimension = gpOrbitalDimension(level);
  if (!eligible || dimension !== charge.dimension) {
    gpOrbitalStopUse(player);
    return;
  }
  const elapsed = currentTick - charge.startTick;
  if (elapsed < GP_ORBITAL.chargeTicks) {
    if (elapsed > 0 && elapsed % 10 === 0) {
      gpOrbitalStatus(player, 'charging', Math.floor(elapsed * 100 / GP_ORBITAL.chargeTicks));
      gpOrbitalChargeEffect(charge, elapsed);
    }
    return;
  }
  const target = charge.target;
  const isTerrain = charge.mode === 'terrain';
  gpOrbitalCharges.delete('' + player.uuid);
  player.stopUsingItem();
  if (!gpOrbitalCanFire(charge, dimension, eligible, gpOrbitalTargetValid(level, target), currentTick,
      player.getEyePosition().distanceToSqr(target.hit))) {
    gpOrbitalStatus(player, 'no_target');
    return;
  }
  if (isTerrain && !gpOrbitalTerrainAllowed(level, player, target.x, target.z)) {
    gpOrbitalStatus(player, 'protected');
    return;
  }
  if (isTerrain && gpOrbitalCraterQueue.length >= GP_ORBITAL.maxCraterJobs) {
    gpOrbitalStatus(player, 'busy');
    return;
  }
  player.persistentData.putLong('gp_orbital_ready_at', currentTick + GP_ORBITAL.cooldownTicks);
  player.getCooldowns().addCooldown(player.getMainHandItem().getItem(), GP_ORBITAL.cooldownTicks);
  gpOrbitalImpact(charge);
  gpOrbitalDamage(level, player, target, charge.mode);
  if (isTerrain) gpOrbitalCraterQueue.push({ level: level, player: player, target: target, cursor: 0, depth: 0 });
  gpOrbitalStatus(player, 'fired');
});

NetworkEvents.dataReceived('godpath_orbital_mode', event => {
  const player = event.player;
  if (!gpOrbitalHeld(player) || !player.isAlive()) return;
  gpOrbitalCancel(player, false);
  if (gpOrbitalUsing(player)) gpOrbitalDisarmed.add('' + player.uuid);
  player.persistentData.putBoolean('gp_orbital_terrain', gpOrbitalMode(player) !== 'terrain');
  gpOrbitalStatus(player, 'mode_changed');
});

NetworkEvents.dataReceived('godpath_orbital_cancel', event => gpOrbitalStopUse(event.player));
PlayerEvents.loggedOut(event => {
  gpOrbitalCancel(event.player, false);
  gpOrbitalDisarmed.delete('' + event.player.uuid);
});
EntityEvents.death('minecraft:player', event => gpOrbitalCancel(event.entity, false));
ServerEvents.tick(() => {
  if (gpOrbitalCraterQueue.length) gpOrbitalProcessCrater(gpOrbitalRemoveBlock);
});
ServerEvents.unloaded(() => {
  gpOrbitalCharges.clear();
  gpOrbitalDisarmed.clear();
  gpOrbitalCraterQueue.length = 0;
});
