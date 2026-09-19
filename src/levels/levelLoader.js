// Turns level data into live runtime objects. Everything mutable is cloned
// on load, so replaying a level starts from a clean slate instead of
// inheriting whatever the last attempt left behind.
let current = null;

export function loadLevel(data) {
  const groundY = data.groundY;

  current = {
    id: data.id,
    name: data.name,
    worldWidth: data.worldWidth,
    groundY,
    playerSpawn: { ...data.playerSpawn },

    // ground segments and floating platforms share one array — collision
    // treats them identically; only drawing and hazard stripes care which
    // is which, via the `ground` flag
    platforms: [
      ...data.ground.map(g => ({ x: g.x, y: groundY, width: g.width, height: 40, ground: true })),
      ...data.platforms.map(p => ({ ...p }))
    ],

    // Spikes sit on a surface: y defaults to the ground line. The hitbox is
    // deliberately smaller than the art — inset at the sides and only the
    // lower part deadly — so clipping a tip doesn't kill you.
    hazards: (data.hazards || []).map(h => {
      const baseY = h.y ?? groundY;
      return {
        ...h,
        y: baseY,
        hitbox: { x: h.x + 4, y: baseY - 12, width: Math.max(1, h.width - 8), height: 12 }
      };
    }),
    checkpoints: (data.checkpoints || []).map(c => ({ ...c, activated: false })),
    goal: { ...data.goal },
    boss: data.boss ? { ...data.boss } : null,
    house: data.house ? { ...data.house } : null,

    // raw spawn data — the entity modules build their own run state from these
    enemySpawns: data.enemies || [],
    coinSpawns: data.coins || []
  };

  return current;
}

export function getLevel() {
  return current;
}
