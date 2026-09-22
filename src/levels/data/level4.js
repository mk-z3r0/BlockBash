// Level 4 — Three Against One. The face where the spheres start shooting.
//
// IDENTITY: cover. Up to here every threat has been contact damage, and the
// design doc is blunt about what that does to the curve — "it flattens out
// once the player has reliable melee." So this level is built around
// sightlines: long open runs with nothing to hide behind, punctuated by
// waist-high blocks that a sphere's shot stops dead against.
//
// That only works because projectiles now collide with terrain
// (weapons/combat.js). Without it there is no such thing as getting behind
// something, and ranged enemies are a tax rather than a problem with a
// solution. It cuts both ways: a triangle that hits a block is a triangle
// spent, and there are never many of those.
//
// Fewer, wider ground segments than any level so far — four gaps instead of
// seven. The platforming isn't the question being asked here.
//
// This is also where the spheres start hopping. `canHop` has been sitting in
// entities/enemy.js since 2026-09-19, switched off and explicitly saved for
// a later level. This is that level.

const GROUND_Y = 410;
const SHELF = 370;   // the raised middle, where most of the shooting happens
const cover = (x, w, h) => ({ x, y: GROUND_Y - h, width: w, height: h });
const shelfCover = (x, w, h) => ({ x, y: SHELF - h, width: w, height: h });

export default {
  id: 'level4',
  name: 'Three Against One',
  worldWidth: 7600,
  groundY: GROUND_Y,
  playerSpawn: { x: 80, y: 300 },

  startsWith: 'cornerstone',
  startsWithAmmo: 10,
  quarrickDamage: 2,

  ground: [
    { x: 0,    width: 1200 },
    { x: 1270, width: 1230, y: SHELF },   // 70 gap, and 40px UP onto the shelf
    { x: 2650, width: 1250, y: SHELF },   // 150 gap — run only, along the shelf
    { x: 3990, width: 1110 },             // 90 gap, and back down
    { x: 5260, width: 2040 }              // 160 gap — run only, then the Crew
  ],

  platforms: [
    // --- open ground, and the first things worth standing behind ---
    cover(380, 110, 44),
    cover(760, 110, 66),
    { x: 1000, y: 280, width: 100, height: 18 },

    // --- the shelf: this is the shooting gallery ---
    shelfCover(1400, 120, 44),
    { x: 1560, y: 250, width: 90,  height: 18, chewed: true },
    shelfCover(1820, 110, 66),
    shelfCover(2150, 120, 44),
    { x: 2330, y: 240, width: 100, height: 18, chewed: true },

    shelfCover(2760, 110, 66),
    // a slider carrying coins back and forth across the open middle — the
    // one place on the shelf with nothing to hide behind
    { x: 3050, y: 250, width: 90, height: 18, move: { x: 170, period: 290 } },
    shelfCover(3380, 120, 44),
    { x: 3600, y: 230, width: 100, height: 18, chewed: true },

    // --- back down, and the run to the arena ---
    cover(4120, 110, 66),
    { x: 4350, y: 270, width: 100, height: 18 },
    cover(4680, 120, 44),
    cover(5400, 110, 66),
    { x: 5650, y: 260, width: 100, height: 18, chewed: true },
    cover(5960, 120, 44),
    { x: 6200, y: 280, width: 100, height: 18 },
    cover(6480, 110, 66)
    // 6650 onward: the Crew's ground, left open on purpose. Three of them
    // need room to surround you, and you need room to see it coming.
  ],

  hazards: [
    { type: 'spikes', x: 560,  width: 55 },
    { type: 'spikes', x: 950,  width: 55 },
    { type: 'spikes', x: 1620, width: 55 },
    { type: 'spikes', x: 2000, width: 60 },
    { type: 'spikes', x: 2950, width: 55 },
    { type: 'spikes', x: 3520, width: 60 },
    { type: 'spikes', x: 4300, width: 55 },
    { type: 'spikes', x: 4850, width: 60 },
    { type: 'spikes', x: 5600, width: 55 },
    { type: 'spikes', x: 6100, width: 60 }
  ],

  ammo: [
    { x: 1030, y: 260,  amount: 4 },
    { x: 2360, y: 220,  amount: 4 },
    { x: 4380, y: 250,  amount: 4 },
    { x: 6230, y: 260,  amount: 5 }
  ],

  cutscenes: [
    { id: 'l4-arrival', when: { levelStart: true }, once: true },
    { id: 'edge-transition', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    { x: 300,  y: GROUND_Y - 22, w: 22, minX: 250,  maxX: 370,  speed: 1.7 },
    { x: 650,  y: GROUND_Y - 22, w: 22, minX: 500,  maxX: 750,  speed: 1.6,
      tier: 'pursuer', weapon: 'pickaxe' },
    // The first sphere in the game that shoots — parked on the shelf edge,
    // firing down the open run the player has to cross.
    { x: 1380, y: SHELF - 22,    w: 22, minX: 1345, maxX: 1450, speed: 1.4,
      tier: 'aggressor', shoots: true },
    { x: 1600, y: 230,           w: 20, minX: 1560, maxX: 1650, speed: 1.3 },
    // ...and the first that hops. Nothing has left the ground under its own
    // power before now.
    { x: 1960, y: SHELF - 22,    w: 22, minX: 1935, maxX: 2140, speed: 1.6, canHop: true },
    { x: 2250, y: SHELF - 26,    w: 26, minX: 2180, maxX: 2420, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 2760, y: SHELF - 22,    w: 22, minX: 2720, maxX: 2830, speed: 1.5,
      tier: 'aggressor', shoots: true },
    { x: 3250, y: SHELF - 22,    w: 22, minX: 3150, maxX: 3370, speed: 1.6, canHop: true },
    { x: 3700, y: SHELF - 22,    w: 22, minX: 3620, maxX: 3880, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 4200, y: GROUND_Y - 22, w: 22, minX: 4000, maxX: 4280, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 4750, y: GROUND_Y - 22, w: 22, minX: 4700, maxX: 4830, speed: 1.6, canHop: true },
    { x: 5450, y: GROUND_Y - 26, w: 26, minX: 5380, maxX: 5570, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 5900, y: GROUND_Y - 22, w: 22, minX: 5750, maxX: 5950, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 6350, y: GROUND_Y - 22, w: 22, minX: 6300, maxX: 6460, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },

    // --- The Demolition Crew ---
    // Smaller than the single bosses (26px, not 33) because three of them is
    // the threat, not any one. While all three are up they shield each other
    // and only the shooter can be hurt — and the shooter is the one hanging
    // back, which is exactly what instinct says to ignore.
    { x: 6800, y: GROUND_Y - 26, w: 26, minX: 6660, maxX: 7200, speed: 1.5,
      boss: true, mode: 'fight', bossKind: 'crew', bossName: 'THE DEMOLITION CREW',
      crew: 'demo', role: 'bruiser', hp: 2, stompProof: true },
    { x: 6950, y: GROUND_Y - 26, w: 26, minX: 6660, maxX: 7200, speed: 1.6,
      boss: true, mode: 'fight', bossKind: 'crew', crew: 'demo', role: 'bruiser',
      hp: 2, stompProof: true },
    { x: 7120, y: GROUND_Y - 26, w: 26, minX: 6700, maxX: 7250, speed: 1.2,
      boss: true, mode: 'fight', bossKind: 'crew', crew: 'demo', role: 'shooter',
      hp: 2, stompProof: true, dropsAmmo: 6 }
  ],

  coins: [
    [420, 352], [465, 352],
    [800, 330],
    [1040, 266], [1085, 266],
    [1150, 396],
    [1440, 312], [1485, 312],
    [1595, 236],
    [1860, 290],
    [2190, 352], [2235, 352],
    [2360, 226],
    [2500, SHELF - 14],
    [2800, 290],
    [3050, 236], [3095, 236],
    [3420, 312],
    [3640, 216], [3685, 216],
    [3860, SHELF - 14],
    [4160, 290],
    [4390, 256], [4435, 256],
    [4720, 352],
    [5050, 396],
    [5440, 290],
    [5690, 246], [5735, 246],
    [6000, 352],
    [6240, 266],
    [6520, 290],
    [6620, 396]
  ],

  checkpoints: [
    { x: 1285, y: SHELF - 70,    width: 8, height: 70 },
    { x: 2665, y: SHELF - 70,    width: 8, height: 70 },
    { x: 5290, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
