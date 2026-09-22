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
      // Ground segments may sit ABOVE the level's base line by giving their
      // own `y` — terraces, ledges, a quarry stepping down. Everything that
      // reads ground already reads `seg.y` rather than `groundY` (collision,
      // carving, hazard stripes, the outline pass), so this was a data
      // change rather than a system one.
      //
      // A raised segment is thickened to the same base so there's never a
      // visible gap under a terrace and nothing can be reached from beneath
      // it. `groundY` stays the level's floor and its meaning elsewhere —
      // notably the world edge, which is why every level's LAST segment
      // should sit at groundY.
      ...data.ground.map(g => {
        const y = g.y == null ? groundY : g.y;
        return { x: g.x, y, width: g.width, height: (groundY + 40) - y, ground: true };
      }),
      // baseY is captured here so a platform the Terraformer lifts
      // (entities/bosses.js) always has an unmoved position to return to,
      // however many times the fight restarts.
      // baseX/baseY are captured here so anything that moves a platform —
      // the Terraformer lifting its arena, a level's own oscillating movers
      // (levels/movers.js) — always has an unmoved position to return to,
      // however many times the fight or the level restarts.
      ...data.platforms.map(p => ({ ...p, baseY: p.y, baseX: p.x }))
    ],

    // Spikes sit on a surface: y defaults to the ground line. The hitbox is
    // deliberately smaller than the art — inset at the sides and only the
    // lower part deadly — so clipping a tip doesn't kill you.
    hazards: (data.hazards || []).map(h => {
      // Spikes sit on whatever surface is under them, which is no longer
      // always the level's floor. Authoring y by hand for every bed on a
      // terrace would be a transcription error waiting to happen, so the
      // default is looked up from the ground beneath instead.
      const under = data.ground.find(g => h.x >= g.x && h.x < g.x + g.width);
      const baseY = h.y ?? (under && under.y != null ? under.y : groundY);
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

    // Story equipment the player arrives already holding. Every level
    // otherwise starts them unarmed and makes them earn a drop; this is
    // how the Cornerstone survives the level boundary once Quarrick has
    // handed it over, without weapons in general becoming persistent.
    startsWith: data.startsWith || null,
    startsWithAmmo: data.startsWithAmmo || 0,

    // How many corners the spheres have taken off Quarrick by the time the
    // player meets him here (0-4). Authored per level because it IS the
    // deterioration beat of his arc, which GAME_DESIGN is explicit should
    // be read off his body rather than narrated.
    quarrickDamage: data.quarrickDamage || 0,

    // Which cutscenes this level has and what sets each one off. Evaluated
    // by cutscenes/triggers.js; the beat lists themselves are registered in
    // cutscenes/library.js. Cloned per entry so a level reload can't
    // inherit anything a previous attempt scribbled on.
    cutscenes: (data.cutscenes || []).map(c => ({ ...c, when: { ...c.when } })),
    house: data.house ? { ...data.house } : null,

    // raw spawn data — the entity modules build their own run state from these
    enemySpawns: data.enemies || [],
    coinSpawns: data.coins || [],
    // Triangles for the Cornerstone, placed in the world. Scarcity is
    // supposed to make each rescue a decision, not to strand a player who
    // spent the lot on the first corrupted square they met.
    ammoSpawns: data.ammo || []
  };

  return current;
}

export function getLevel() {
  return current;
}
