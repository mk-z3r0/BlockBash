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
  missiles: []
};
