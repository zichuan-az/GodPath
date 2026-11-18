var gpJourneyRuntimeObservations = new Map();

PlayerEvents.loggedIn(event => {
  var player = event.player;
  if ('' + player.username != 'GodPathTest') return;
  var data = player.persistentData;
  var command = player.server.getCommands().getDispatcher();
  var source = player.createCommandSourceStack().withPermission(0);
  var stage = data.getInt(GP_JOURNEY_STAGE);
  var enabled = gpJourneyHasMap(player);
  console.info('[GP-JOURNEY] LOGIN expedition=' + enabled + ' stage=' + stage +
    ' hits=' + data.getInt('gp_journey_hits') + ' claimed=' + data.getBoolean('gp_journey_starter_issued'));
  console.info('[GP-JOURNEY] NON_OP permission2=' + source.hasPermission(2) +
    ' journal=' + command.execute('journey', source) + ' laws=' + command.execute('journey laws', source));
  gpJourneyRuntimeObservations.set('' + player.uuid, stage);
});

PlayerEvents.tick(event => {
  var player = event.player, id = '' + player.uuid;
  if (!gpJourneyRuntimeObservations.has(id) || gpAge(player) % 20 != 0) return;
  var data = player.persistentData, stage = data.getInt(GP_JOURNEY_STAGE);
  if (gpJourneyRuntimeObservations.get(id) == stage) return;
  gpJourneyRuntimeObservations.set(id, stage);
  var vehicle = player.getVehicle();
  var message = '[GP-JOURNEY] STAGE ' + stage + ' hits=' + data.getInt('gp_journey_hits') +
    ' xyz=' + Math.floor(player.x) + ',' + Math.floor(player.y) + ',' + Math.floor(player.z) +
    ' cart=' + (vehicle == null ? 'none' : vehicle.type) + ' seed=' + gpHeld(player, 'world_seed');
  console.info(message);
  if (stage == 5) console.info('[GP-JOURNEY] COMPLETE');
});

PlayerEvents.loggedOut(event => gpJourneyRuntimeObservations.delete('' + event.player.uuid));

var gpJourneyTrialTime = 0;
var gpJourneyTrailStarted = false;
var gpJourneyRailPosition = -999;

function gpPressRailButton(p, x, y) {
  var level = p.server.overworld();
  var BlockPos = Java.loadClass('net.minecraft.core.BlockPos');
  var pos = new BlockPos(x, y, 1);
  var state = level.getBlockState(pos);
  state.getBlock().press(state, level, pos, p);
  p.server.scheduleInTicks(2, () => console.info('[GP-JOURNEY] BUTTON x=' + x + ' rail=' +
    level.getBlockState(new BlockPos(x == -1 ? 0 : 192, y, 0))));
}

PlayerEvents.tick(event => {
  var p = event.player;
  if ('' + p.username != 'GodPathTest' || gpExpeditionScore(p.server, 'ready') !== 1) return;
  var n = ++gpJourneyTrialTime;
  if (n > 1000) return;
  var hub = gpExpeditionStationY(p.server, 'hub'), trail = gpExpeditionStationY(p.server, 'trail');
  var dispatcher = p.server.getCommands().getDispatcher();
  var source = p.server.createCommandSourceStack().withSuppressedOutput();
  var run = command => dispatcher.execute('execute in minecraft:overworld run ' + command, source);
  var stage = p.persistentData.getInt(GP_JOURNEY_STAGE);
  if (n == 65) {
    var starter = dispatcher.execute('journey blade', p.createCommandSourceStack().withPermission(0));
    console.info('[GP-JOURNEY] STARTER claimed=' + starter + ' stage=' + p.persistentData.getInt(GP_JOURNEY_STAGE) + ' y=' + hub + '->' + trail);
  }
  if (n == 90) {
    run('tp GodPathTest 12.5 ' + hub + ' 18.2 0 0');
    run('item replace entity GodPathTest weapon.mainhand with ' + GP_JOURNEY_BLADE);
  }
  if (n == 100 || n == 120 || n == 140) {
    try { run('execute at GodPathTest run damage @e[tag=gp_expedition_training,sort=nearest,limit=1] 2 minecraft:player_attack by GodPathTest'); }
    catch (e) { console.info('[GP-JOURNEY] TRAIN ' + e); }
  }
  if (n == 160 && stage == 2) {
    run('tp GodPathTest 0.5 ' + hub + ' -1.5 -90 0');
    run('ride GodPathTest mount @e[tag=gp_expedition_cart,limit=1,sort=nearest]');
  }
  if (n == 170 && stage == 2) gpPressRailButton(p, -1, hub);
  if (n % 40 == 0 && p.getVehicle()) {
    gpJourneyRailPosition = Math.floor(p.x);
    console.info('[GP-JOURNEY] CART x=' + gpJourneyRailPosition + ' stage=' + stage);
  }
  if (!gpJourneyTrailStarted && stage == 3 && p.x >= 189) {
    gpJourneyTrailStarted = true;
    run('item replace entity GodPathTest weapon.mainhand with godpath:world_seed');
    p.server.scheduleInTicks(60, () => gpPressRailButton(p, 193, trail));
  }
});

ServerEvents.commandRegistry(event => {
  event.register(event.commands.literal('gp_test_reload').requires(source => source.getTextName() == 'GodPathTest')
    .executes(context => {
      var server = context.source.getServer();
      server.scheduleInTicks(1, () => server.getCommands().getDispatcher().execute('reload', server.createCommandSourceStack()));
      return 1;
    }));
});
