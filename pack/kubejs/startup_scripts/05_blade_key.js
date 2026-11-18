if (Platform.isClientEnvironment()) {
  KeyBindEvents.registry(event => {
    event.register('godpath_blade_skill', 'KEY_F8').inGame();
  });
}
