var gpChunkWarmup = null;
var gpChunkWarmupResult = null;
var gpChunkWarmupTicket = null;

function gpWarmupOrder(centerX, centerZ, radius) {
  var chunks = [[centerX, centerZ]];
  for (var ring = 1; ring <= radius; ring++) {
    for (var x = -ring; x <= ring; x++) {
      chunks.push([centerX + x, centerZ - ring], [centerX + x, centerZ + ring]);
    }
    for (var z = 1 - ring; z < ring; z++) {
      chunks.push([centerX - ring, centerZ + z], [centerX + ring, centerZ + z]);
    }
  }
  return chunks;
}

function gpStartNearbyChunks(player, radius, newLimit, automatic) {
  if (gpChunkWarmup) return false;
  var centerX = Math.floor(player.x / 16), centerZ = Math.floor(player.z / 16);
  gpChunkWarmupResult = null;
  gpChunkWarmup = {
    player: player, level: player.level, cache: player.level.getChunkSource(),
    centerX: centerX, centerZ: centerZ, chunks: gpWarmupOrder(centerX, centerZ, radius),
    cursor: 0, prepared: 0, newLimit: newLimit, automatic: automatic, current: null, age: 0, waited: 0
  };
  gpTell(player, '§b区块预热开始 §7| 原地等待时会分批准备附近地形。/gp_pregen status 查看进度。');
  return true;
}

function gpReleaseWarmupChunk(job) {
  if (!job.current) return;
  job.cache.removeRegionTicket(gpChunkWarmupTicket, job.current, 0, job.current);
  job.current = null;
}

function gpFinishNearbyChunks(message) {
  var job = gpChunkWarmup;
  if (!job) return;
  gpReleaseWarmupChunk(job);
  gpChunkWarmup = null;
  gpChunkWarmupResult = { prepared: job.prepared, elapsedTicks: job.age, reason: message };
  if (job.automatic && message == '完成') {
    job.player.persistentData.putBoolean('gp_nearby_warmup_started', true);
  }
  gpTell(job.player, '§b区块预热' + message + ' §7| 准备完成 ' + job.prepared + ' 个区块。');
}

ServerEvents.tick(event => {
  var job = gpChunkWarmup;
  if (!job) return;
  job.age++;
  if (job.player.isRemoved() || gpDimension(job.player.level) != gpDimension(job.level) ||
      Math.abs(Math.floor(job.player.x / 16) - job.centerX) > 16 ||
      Math.abs(Math.floor(job.player.z / 16) - job.centerZ) > 16) {
    gpFinishNearbyChunks('已停止');
    return;
  }
  if (job.current) {
    if (job.cache.getChunkNow(job.current.x, job.current.z) != null) {
      job.prepared++;
      gpReleaseWarmupChunk(job);
    } else if (++job.waited >= 600) gpFinishNearbyChunks('超时');
    return;
  }
  if (job.prepared >= job.newLimit || job.cursor >= job.chunks.length) {
    gpFinishNearbyChunks('完成');
    return;
  }

  if (job.age % 8 != 0 || event.server.getAverageTickTimeNanos() > 38000000) return;
  for (var scan = 0; scan < 40 && job.cursor < job.chunks.length; scan++) {
    var coordinate = job.chunks[job.cursor++];
    if (job.cache.getChunkNow(coordinate[0], coordinate[1]) != null) continue;
    if (!gpChunkWarmupTicket) {
      gpChunkWarmupTicket = Java.loadClass('net.minecraft.server.level.TicketType')
        .create('godpath_pregen', (first, second) => 0, 720);
    }
    var position = new (Java.loadClass('net.minecraft.world.level.ChunkPos'))(coordinate[0], coordinate[1]);
    job.cache.addRegionTicket(gpChunkWarmupTicket, position, 0, position);
    job.current = position;
    job.waited = 0;
    break;
  }
});

PlayerEvents.loggedOut(event => {
  if (gpChunkWarmup && '' + gpChunkWarmup.player.uuid == '' + event.player.uuid) gpFinishNearbyChunks('已停止');
});

ServerEvents.unloaded(event => gpFinishNearbyChunks('已停止'));

PlayerEvents.loggedIn(event => {
  var player = event.player;
  if (player.server.isDedicated() || player.persistentData.getBoolean('gp_nearby_warmup_started')) return;
  player.server.scheduleInTicks(240, () => {
    if (player.isRemoved() || player.isSpectator() || gpDimension(player.level) != 'minecraft:overworld') return;
    gpStartNearbyChunks(player, 14, 16, true);
  });
});

ServerEvents.commandRegistry(event => {
  var commands = event.commands;
  event.register(commands.literal('gp_pregen').requires(source =>
    source.getPlayer() != null && (!source.getServer().isDedicated() || source.hasPermission(2)))
    .then(commands.literal('start').executes(ctx => {
      var player = ctx.source.getPlayerOrException();
      if (!gpStartNearbyChunks(player, 16, 1089)) gpTell(player, '§7已有预热任务在运行。');
      return 1;
    })).then(commands.literal('stop').executes(ctx => {
      gpFinishNearbyChunks('已停止');
      return 1;
    })).then(commands.literal('status').executes(ctx => {
      var player = ctx.source.getPlayerOrException(), job = gpChunkWarmup;
      gpTell(player, job ? '§b区块预热 §7| 已准备 ' + job.prepared + ' 个，已检查 ' + job.cursor + '/' + job.chunks.length + ' 个位置。' : '§7当前没有区块预热任务。');
      return 1;
    })));
});
