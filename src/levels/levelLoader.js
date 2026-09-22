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
    // Where the solid ground actually stops — the literal edge of this cube
    // face (see scenes/playingScene.js's edge-transition state machine and
    // levels/levelRenderer.js's drawWorldEdge). Deliberately NOT the same
    // thing as worldWidth: worldWidth is free to extend further, reserving
    // empty space past the edge purely so the camera has room to pan into
    // and reveal the edge-of-world visual before the player physically gets
    // there (the camera never shows past worldWidth). Computed from the raw
    // ground data rather than authored per level, so every level gets a
    // correct edge automatically, including ones with a gap right at the end.
    worldEdgeX: Math.max(...data.ground.map(g => g.x + g.width)),
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
    // No `goal` any more (2026-09-21): levels used to end at a flag placed
    // short of the actual edge, which meant "level cleared" could fire
    // without the player ever reaching — or even seeing — the edge it was
    // standing in for. The edge itself is the goal now; see `worldEdgeX`
    // above and the transition trigger in scenes/playingScene.js.
    boss: data.boss ? { ...data.boss } : null,

    // Which cutscenes this level has and what sets each one off. Evaluated
    // by cutscenes/triggers.js; the beat lists themselves are registered in
    // cutscenes/library.js. Cloned per entry so a level reload can't
    // inherit anything a previous attempt scribbled on.
    cutscenes: (data.cutscenes || []).map(c => ({ ...c, when: { ...c.when } })),
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
