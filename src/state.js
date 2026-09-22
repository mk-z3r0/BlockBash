// Shared run state that many systems read/write: entity lists that get
// rebuilt on reset, plus top-level counters. Player has its own module
// (entities/player.js) since it's self-contained; level geometry comes from
// levels/levelLoader.js.
export const state = {
  frameCount: 0,
  gameState: 'title', // 'title' | 'playing' | 'win' | 'gameover'
  score: 0,
  lives: 3,
  coinsCollected: 0,
  currentLevelIndex: 0,
  enemies: [],
  // Quarrick during the boss fight. An entity slot rather than cutscene
  // scratch because he OUTLIVES the cutscene that spawns him: once the
  // showdown is over he's still walking off-screen under his own steam
  // while the player has control back. See cutscenes/runner.js's note on
  // what belongs in a cutscene's `data` and what doesn't.
  rescueNPC: null,
  weaponPickups: [],
  missiles: [] // unused while the bazooka is parked — see weapons/bazooka.js
};
