if (Platform.isClientEnvironment()) {
  KeyBindEvents.registry(event => {
    event.register('godpath_orbital_mode', 'KEY_F7').inGame();
  });
}

StartupEvents.registry('item', event => {
  const cannon = event.create('godpath:orbital_cannon');
  cannon.maxStackSize(1);
  cannon.rarity('epic');
  cannon.fireResistant();
  cannon.parentModel('godpath:item/orbital_cannon_geometry');
  cannon.useAnimation('bow');
  cannon.useDuration(() => 72000);
  cannon.use((level, player, hand) => '' + hand === 'MAIN_HAND');
});
