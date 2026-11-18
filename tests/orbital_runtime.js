var gpOrbitalTrial;

function gpOrbitalReleaseFixtureChunks(server) {
  try {
    server.getCommands().getDispatcher().execute('execute in minecraft:overworld run forceload remove 20 150 60 192',
      server.createCommandSourceStack().withSuppressedOutput());
  } catch (e) {}
}

function gpOrbitalFixtureCommand(player, mode) {
  const server = player.getServer();
  const commands = server.createCommandSourceStack().withSuppressedOutput();
  const dispatcher = server.getCommands().getDispatcher();
  const run = command => dispatcher.execute('execute in minecraft:overworld run ' + command, commands);
  const name = '' + player.username;
  const uuid = Java.loadClass('net.minecraft.core.UUIDUtil').uuidToIntArray(player.uuid);
  const owner = [uuid[0], uuid[1], uuid[2], uuid[3]].join(',');
  const recipeId = Java.loadClass('net.minecraft.resources.ResourceLocation').parse('godpath:orbital_cannon');
  const now = gpOrbitalTime(player);
  if (gpOrbitalTrial && !gpOrbitalTrial.finished) gpOrbitalReleaseFixtureChunks(server);
  gpOrbitalTrial = null;
  try { run('forceload add 20 150 60 192'); } catch (e) { console.info('[GP-ORBITAL] CHUNKS ' + e); }
  server.scheduleInTicks(30, () => {
    try { run('kill @e[tag=gp_orbital_test]'); } catch (e) {}
    try { run('kill @e[type=minecraft:item,x=40,y=280,z=170,distance=..23]'); } catch (e) {}
    try { run('fill 20 280 150 60 284 190 minecraft:air'); } catch (e) {}
    try { run('fill 20 275 150 60 279 190 minecraft:stone'); } catch (e) {}
    run('setblock 40 280 170 minecraft:stone');
    try { run('setblock 40 281 170 minecraft:stone'); } catch (e) {}
    run('time set day');
    run('setblock 44 280 172 minecraft:chest');
    run('setblock 36 280 172 minecraft:bedrock');
    run('setblock 38 279 172 minecraft:bedrock');
    try { run('setblock 40 279 180 minecraft:bedrock'); } catch (e) {}
    run('summon minecraft:sheep 43.5 280 170.5 {Tags:["gp_orbital_test","gp_orbital_sheep"],NoAI:1b,PersistenceRequired:1b}');
    run('summon minecraft:wolf 38.5 280 172.5 {Tags:["gp_orbital_test","gp_orbital_pet"],NoAI:1b,PersistenceRequired:1b,Sitting:1b,Owner:[I;' + owner + ']}');
    player.stopRiding();
    run('tp ' + name + ' 40.5 280 180.5 180 4');
    run('item replace entity ' + name + ' weapon.mainhand with godpath:orbital_cannon');
    player.persistentData.putBoolean('gp_god', mode !== 'locked');
    player.persistentData.putBoolean('gp_orbital_terrain', mode === 'terrain');
    player.persistentData.putLong('gp_orbital_ready_at', 0);
    player.getCooldowns().removeCooldown(player.getMainHandItem().getItem());
    gpOrbitalTrial = { player: player, mode: mode, started: false, finished: false, deadline: now + (mode === 'locked' ? 180 : 1200) };
    console.info('[GP-ORBITAL] READY ' + mode + ' recipe=' + server.getRecipeManager().byKey(recipeId).isPresent());
    player.sendData('gp_orbital_fixture_ready', { mode: mode });
  });
}

ServerEvents.commandRegistry(event => {
  const commands = event.commands;
  const command = commands.literal('gp_orbital_test');
  command.requires(source => source.getTextName() == 'GodPathTest');
  ['entities', 'terrain', 'locked'].forEach(mode => {
    command.then(commands.literal(mode).executes(context => {
      try { gpOrbitalFixtureCommand(context.source.getPlayerOrException(), mode); }
      catch (error) { console.error('[GP-ORBITAL] FIXTURE ' + mode + ' ' + error); }
      return 1;
    }));
  });
  event.register(command);
});

ServerEvents.tick(() => {
  const trial = gpOrbitalTrial;
  if (!trial || trial.finished) return;
  const player = trial.player;
  const now = gpOrbitalTime(player);
  const charge = gpOrbitalCharges.get('' + player.uuid);
  if (charge && !trial.started) {
    trial.started = true;
    console.info('[GP-ORBITAL] CHARGING ' + charge.mode + ' tick=' + now + ' target=' + charge.target.pos);
  }
  const cooldown = gpOrbitalCooldown(player);
  if (trial.started && !charge && cooldown === 0) {
    trial.started = false;
    console.info('[GP-ORBITAL] CANCELLED ' + trial.mode + ' tick=' + now);
  }
  if (cooldown > 0 && !trial.impactTick) {
    trial.impactTick = now;
    console.info('[GP-ORBITAL] FIRED ' + trial.mode + ' tick=' + now + ' cooldown=' + cooldown);
  }
  if (!trial.impactTick && now < trial.deadline) return;
  if (trial.impactTick && now - trial.impactTick < 110) return;
  trial.finished = true;
  const level = player.level;
  const server = player.getServer();
  const dispatcher = server.getCommands().getDispatcher();
  const commands = server.createCommandSourceStack().withSuppressedOutput();
  const count = selector => {
    try { return dispatcher.execute('execute in minecraft:overworld if entity ' + selector, commands); } catch (e) { return 0; }
  };
  const pos = Java.loadClass('net.minecraft.core.BlockPos');
  const center = level.getBlockState(new pos(40, 280, 170));
  const craterBase = level.getBlockState(new pos(40, 277, 170));
  const chest = level.getBlockState(new pos(44, 280, 172)).hasBlockEntity();
  const bedrock = !level.getBlockState(new pos(36, 280, 172)).isAir();
  const sheep = count('@e[type=minecraft:sheep,tag=gp_orbital_sheep]');
  const pet = count('@e[type=minecraft:wolf,tag=gp_orbital_pet]');
  const drops = count('@e[type=minecraft:item,x=40,y=280,z=170,distance=..23]');
  gpOrbitalReleaseFixtureChunks(server);
  console.info('[GP-ORBITAL] RESULT ' + trial.mode + ' fired=' + !!trial.impactTick + ' centerAir=' + center.isAir() +
    ' craterBaseAir=' + craterBase.isAir() + ' chest=' + chest + ' bedrock=' + bedrock + ' sheep=' + sheep +
    ' pet=' + pet + ' drops=' + drops + ' playerAlive=' + player.isAlive() + ' pending=' + gpOrbitalCraterQueue.length);
});

PlayerEvents.loggedOut(event => {
  if (gpOrbitalTrial && '' + gpOrbitalTrial.player.uuid === '' + event.player.uuid) {
    if (!gpOrbitalTrial.finished) gpOrbitalReleaseFixtureChunks(event.player.getServer());
    gpOrbitalTrial = null;
  }
});
