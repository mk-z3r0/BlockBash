// Level 3 — What the Sanders Left. The turn the whole game is built around.
//
// IDENTITY: this level stands up. Where the quarry went down in terraces,
// this face has been sanded into COLUMNS — the spheres took everything
// between them and left pillars of block standing. So it's climbed rather
// than crossed: far fewer pits than any other level, and instead a forest of
// solid stacks that have to be jumped onto, stepped up, and dropped off.
//
// Structurally it's in three parts:
//   0-3250     the pillars, with the sledgehammer. And the first corrupted
//              square, which the hammer does nothing to. That lesson has to
//              land BEFORE the weapon that answers it exists.
//   3250       Quarrick hands over the Cornerstone and immediately corrupts.
//              The clearing here is deliberately the flattest, emptiest
//              ground in the level — the scene is the obstacle.
//   3250-7300  the verb, practised. Squares to restore, triangles to find,
//              and the Sculptor, which cannot be hurt.

const GROUND_Y = 410;
// A pillar is authored by its height so the stacks read as stacks in the
// data too, rather than as a column of y values to check by hand.
const pillar = (x, w, h, opts = {}) => ({ x, y: GROUND_Y - h, width: w, height: h, ...opts });

export default {
  id: 'level3',
  name: 'What the Sanders Left',
  worldWidth: 7600,
  groundY: GROUND_Y,
  playerSpawn: { x: 80, y: 300 },

  startsWith: 'sledgehammer',
  quarrickDamage: 3,

  // Six gaps, not seven, and wider ground between them. The vertical work is
  // the point here; pits would just be noise on top of it.
  ground: [
    { x: 0,    width: 900 },
    { x: 970,  width: 630 },    // 70
    { x: 1690, width: 710 },    // 90
    { x: 2460, width: 1240 },   // 60 — the long stretch holding the clearing
    { x: 3850, width: 750 },    // 150 — run only
    { x: 4655, width: 645 },    // 55
    { x: 5460, width: 1840 }    // 160 — run only, then the Sculptor
  ],

  platforms: [
    // --- a stair of stumps out of the spawn, teaching the level's verb ---
    pillar(300, 60, 44),
    pillar(370, 60, 88),
    pillar(440, 60, 132),
    { x: 620, y: 200, width: 110, height: 18 },

    // --- the first real columns ---
    pillar(1060, 54, 110, { chewed: true }),
    pillar(1250, 54, 176),
    { x: 1360, y: 170, width: 100, height: 18, chewed: true },
    pillar(1480, 54, 88),

    pillar(1780, 60, 132, { chewed: true }),
    pillar(1900, 60, 66),
    { x: 2060, y: 210, width: 110, height: 18 },
    pillar(2090, 54, 154, { chewed: true }),

    // --- approaching the clearing: the stacks thin out ---
    pillar(2560, 60, 88),
    pillar(2700, 60, 44, { chewed: true }),
    { x: 2900, y: 250, width: 110, height: 18 },
    // 3100-3700 is the clearing. Nothing in it. Nothing over it.

    // --- after the handoff, the columns come back taller ---
    pillar(3900, 54, 110, { chewed: true }),
    { x: 4050, y: 190, width: 100, height: 18 },
    pillar(4230, 54, 176, { chewed: true }),
    pillar(4400, 54, 88),

    pillar(4720, 60, 132, { chewed: true }),
    { x: 4900, y: 200, width: 100, height: 18, chewed: true },
    // 5040 and taller. At 5120x66 this stump ended 26px before the bed at
    // 5200 — too close to jump from the ground behind it and too low to
    // carry off the top, so the bed had no solution at all.
    pillar(5040, 54, 110),

    pillar(5560, 60, 154, { chewed: true }),
    { x: 5760, y: 220, width: 110, height: 18, chewed: true },
    pillar(5980, 54, 110, { chewed: true }),
    { x: 6200, y: 260, width: 100, height: 18 },
    pillar(6420, 60, 88, { chewed: true })
    // 6600 onward is the Sculptor's ground, left open.
  ],

  hazards: [
    // Between the stumps — the reason to go up rather than through.
    { type: 'spikes', x: 540,  width: 55 },
    { type: 'spikes', x: 1130, width: 60 },
    // 1380, not 1560: at 1560 this bed ran off the end of the ledge at 1600
    // and hung over the pit, so the gap after it could not be jumped from
    // anywhere. Caught by the audit, which reported the GAP as impossible
    // rather than the bed, because that's where the player actually dies.
    { type: 'spikes', x: 1380, width: 55 },
    { type: 'spikes', x: 1980, width: 60 },
    { type: 'spikes', x: 2180, width: 55 },
    { type: 'spikes', x: 2800, width: 50 },
    // clearing: no hazards 3000-3800
    { type: 'spikes', x: 3980, width: 55 },
    { type: 'spikes', x: 4310, width: 60 },
    { type: 'spikes', x: 4800, width: 55 },
    { type: 'spikes', x: 5120, width: 55 },
    { type: 'spikes', x: 5660, width: 55 },
    { type: 'spikes', x: 6060, width: 60 }
  ],

  ammo: [
    { x: 3820, y: GROUND_Y - 34, amount: 4 },
    { x: 4950, y: 180,           amount: 4 },
    { x: 6250, y: 240,           amount: 5 }
  ],

  cutscenes: [
    // Neither is `once`. A player who dies after the handoff respawns holding
    // the level's starting weapon, so a scene marked as seen and never re-run
    // would leave the Sculptor — which can only be beaten with the
    // Cornerstone — unbeatable.
    // `lacksWeapon` is what stops it replaying on every death after it: a
    // mid-level death resets the player's position, not what they're
    // carrying, so the scene that hands over the Cornerstone has no business
    // running for someone who already has one.
    { id: 'l3-handoff',  when: { reachX: 3250, lacksWeapon: 'cornerstone' } },
    { id: 'l3-restored', when: { quarrickRestored: true } },
    { id: 'edge-transition', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    { x: 200,  y: GROUND_Y - 22, w: 22, minX: 150,  maxX: 290,  speed: 1.7 },
    { x: 660,  y: 180,           w: 20, minX: 620,  maxX: 730,  speed: 1.2 },
    { x: 1000, y: GROUND_Y - 22, w: 22, minX: 975,  maxX: 1055, speed: 1.6 },
    { x: 1400, y: 150,           w: 20, minX: 1360, maxX: 1460, speed: 1.2 },
    { x: 1800, y: GROUND_Y - 22, w: 22, minX: 1760, maxX: 1870, speed: 1.8,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 2100, y: 190,           w: 20, minX: 2060, maxX: 2170, speed: 1.2 },
    // The first corrupted square in the game, on the open ground before the
    // clearing. The sledgehammer bounces off it. That is the entire reason
    // it is standing here, 700px before anyone explains what it is.
    { x: 2850, y: GROUND_Y - 26, w: 26, minX: 2780, maxX: 3000, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    // 3100-3700: the clearing. Empty.
    { x: 4100, y: 170,           w: 20, minX: 4050, maxX: 4150, speed: 1.3 },
    { x: 4480, y: GROUND_Y - 22, w: 22, minX: 4440, maxX: 4590, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 4940, y: 180,           w: 20, minX: 4900, maxX: 5000, speed: 1.3 },
    { x: 5380, y: GROUND_Y - 26, w: 26, minX: 5330, maxX: 5450, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 5820, y: 200,           w: 20, minX: 5760, maxX: 5870, speed: 1.3 },
    { x: 6280, y: GROUND_Y - 26, w: 26, minX: 6180, maxX: 6380, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },

    // --- The Sculptor ---
    // Nothing in the arsenal can hurt it. Six triangles put it back.
    { x: 6900, y: GROUND_Y - 54, w: 54, minX: 6650, maxX: 7180, speed: 0.75,
      kind: 'octagon', boss: true, bossName: 'THE SCULPTOR', restoreHits: 6 }
  ],

  coins: [
    [330, 352], [400, 308], [470, 264],
    [660, 186], [700, 186],
    [820, 396],
    [1087, 286],
    [1277, 220],
    [1400, 156], [1440, 156],
    [1507, 308], [1560, 396],
    [1650, 396],
    [1810, 264],
    [1930, 330],
    [2100, 196], [2145, 196],
    [2117, 242], [2300, 396],
    [2420, 396],
    [2590, 308],
    [2730, 352],
    [2940, 236], [2985, 236],
    [3300, 396], [3400, 396], [3500, 396],
    [3927, 286],
    [4090, 176], [4130, 176],
    [4257, 220],
    [4427, 308],
    [4747, 264],
    [4940, 186],
    [5067, 286],
    [5340, 396],
    [5587, 242],
    [5800, 206], [5845, 206],
    [6007, 286],
    [6240, 246],
    [6447, 308],
    [6620, 396], [6680, 396]
  ],

  checkpoints: [
    { x: 1700, y: GROUND_Y - 70, width: 8, height: 70 },
    // Just before the handoff trigger at 3250, so a death after it means a
    // short walk back into the scene rather than it firing on respawn.
    { x: 3130, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 5480, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
