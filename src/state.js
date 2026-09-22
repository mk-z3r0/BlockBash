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
  // Everything in flight from either side: the player's restoration
  // triangles and the spheres' return fire, in one list because they
  // update and draw identically and only differ by `team`. See
  // weapons/combat.js.
  projectiles: [],
  // Set by anything that lands a hit on the player during one frame's
  // update — a sphere's swing, a sphere's shot, walking into a corrupted
  // square. Read and cleared once per frame by the playing scene, which
  // owns what being hit MEANS (a life, a respawn, maybe the end of the
  // run). Collecting it here keeps that decision in one place instead of
  // threading a return value out of three different systems.
  playerTouchedHazard: false,
  // Corrupted squares restored this level, kept so a cutscene or the HUD
  // can ask. Cleared with the level.
  restoredCount: 0,
  missiles: [] // unused while the bazooka is parked — see weapons/bazooka.js
};
