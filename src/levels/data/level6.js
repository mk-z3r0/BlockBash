// Level 6 — No Tricks Left. The last outer face.
//
// IDENTITY: this one is a fight, not a course. Four long open arenas joined
// by three narrow crossings, and almost nothing to platform over — what's
// dangerous here is the population, not the floor. GAME_DESIGN gives level 6
// "heavy combat, all weapon types" and the General "the hardest FAIR fight
// in the game", and a level of fiddly jumps in front of that would be two
// different games stapled together.
//
// Only three gaps in the whole level. Every other level has six or seven.
//
// --- the choice in the middle ---
// There is a sledgehammer lying in arena 2. The player is carrying the
// Cornerstone and can only hold one weapon, so taking it means trading every
// triangle they have for a heavy melee weapon that never runs out — and
// giving up the ability to restore anything for the rest of the level.
//
// That's the honest version of "all weapon types": not a loadout screen, a
// decision with a cost. Nothing in this level REQUIRES restoring — the
// corrupted squares here can all be walked past — so either answer finishes
// it, and level 7 hands the Cornerstone back at its spawn regardless.
//
// The architecture is barely square any more. Almost every platform is
// chewed; this is the end of the degradation arc before the descent.

const GROUND_Y = 410;
const cover = (x, w, h) => ({ x, y: GROUND_Y - h, width: w, height: h, chewed: true });

export default {
  id: 'level6',
  name: 'No Tricks Left',
  worldWidth: 7600,
  groundY: GROUND_Y,
  playerSpawn: { x: 80, y: 300 },

  startsWith: 'cornerstone',
  startsWithAmmo: 12,
  quarrickDamage: 2,

  ground: [
    { x: 0,    width: 1800 },   // arena 1
    { x: 1890, width: 1610 },   // 90  — arena 2, and the hammer
    { x: 3650, width: 1550 },   // 150 — arena 3, run only
    { x: 5360, width: 1940 }    // 160 — arena 4 and the General, run only
  ],

  platforms: [
    // --- arena 1: learn the room. Cover, and one high perch. ---
    cover(380, 120, 44),
    { x: 700, y: 270, width: 110, height: 18, chewed: true },
    cover(1020, 110, 66),
    cover(1400, 120, 44),

    // --- arena 2: the hammer is on the high shelf, in plain sight ---
    cover(2050, 110, 66),
    { x: 2300, y: 250, width: 120, height: 18, chewed: true },
    cover(2700, 120, 44),
    { x: 3000, y: 280, width: 110, height: 18, chewed: true },
    cover(3280, 110, 66),

    // --- arena 3: the widest, the emptiest, the worst to be caught in ---
    cover(3820, 120, 44),
    { x: 4150, y: 260, width: 110, height: 18, chewed: true },
    cover(4500, 110, 66),
    { x: 4800, y: 240, width: 110, height: 18, chewed: true },
    // 4950, not 5050: at 5050 this block spanned 5050-5170 and the spike
    // bed at 5100-5155 sat INSIDE it, so there was nothing to jump and
    // nowhere to jump from. The audit reported the bed as having no
    // solution, which was exactly right.
    cover(4950, 120, 44),

    // --- arena 4: the run-in, then the General's ground ---
    cover(5520, 110, 66),
    { x: 5800, y: 270, width: 110, height: 18, chewed: true },
    cover(6100, 120, 44)
    // 6300 onward is bare. The General needs room to charge and the player
    // needs to see it coming — nothing to hide behind is the point of it.
  ],

  hazards: [
    // Furniture, not the main event. One per arena, plus one on each
    // crossing's approach so the chokepoints aren't free.
    { type: 'spikes', x: 880,  width: 60 },
    { type: 'spikes', x: 1600, width: 55 },
    { type: 'spikes', x: 2500, width: 60 },
    { type: 'spikes', x: 3180, width: 55 },
    { type: 'spikes', x: 4350, width: 60 },
    // No bed here. It sat 25px from the end of the arena, so clearing it
    // carried the player straight off the ledge into the crossing — a
    // hazard whose correct solution is a death. Arena 3 already has one at
    // 4350, and this level's danger is meant to be its population.
    { type: 'spikes', x: 5950, width: 60 }
  ],

  ammo: [
    { x: 2350, y: 230, amount: 4 },
    { x: 4190, y: 240, amount: 5 },
    { x: 5840, y: 250, amount: 5 }
  ],

  // The choice. Sitting on the shelf in arena 2, impossible to miss and
  // impossible to take by accident — it has to be climbed to.
  weapons: [
    { x: 3050, y: 280, type: 'sledgehammer' }
  ],

  cutscenes: [
    { id: 'l6-arrival', when: { levelStart: true }, once: true },
    // NOT the edge transition. Five faces of walking off an edge and having
    // the world turn under you is the setup; this is the one that doesn't.
    { id: 'descent', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    // The pursuers here carry CHAINSAWS, not pickaxes. Same tier of enemy
    // the player has been fighting since level 2, with a worse tool — the
    // design doc's enemy table gives the late levels "chainsaws, lasers",
    // and a chainsaw is held out in front rather than swung, so it's a
    // different problem from a swing you can wait out.
    // --- arena 1 ---
    { x: 300,  y: GROUND_Y - 22, w: 22, minX: 200,  maxX: 360,  speed: 1.8,
      tier: 'pursuer', weapon: 'chainsaw' },
    { x: 620,  y: GROUND_Y - 22, w: 22, minX: 560,  maxX: 690,  speed: 1.7, canHop: true },
    { x: 750,  y: 250,           w: 20, minX: 700,  maxX: 790,  speed: 1.3 },
    { x: 1150, y: GROUND_Y - 22, w: 22, minX: 1000, maxX: 1300, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 1500, y: GROUND_Y - 26, w: 26, minX: 1440, maxX: 1590, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },

    // --- arena 2 ---
    { x: 2250, y: GROUND_Y - 22, w: 22, minX: 2200, maxX: 2350, speed: 1.8,
      tier: 'pursuer', weapon: 'chainsaw' },
    { x: 2650, y: GROUND_Y - 22, w: 22, minX: 2600, maxX: 2780, speed: 1.7,
      tier: 'aggressor', shoots: true },
    { x: 2350, y: 230,           w: 20, minX: 2300, maxX: 2410, speed: 1.4 },
    { x: 2850, y: GROUND_Y - 22, w: 22, minX: 2790, maxX: 2980, speed: 1.7, canHop: true },
    { x: 3150, y: GROUND_Y - 26, w: 26, minX: 3080, maxX: 3260, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },

    // --- arena 3: the hardest stretch of the level ---
    { x: 3990, y: GROUND_Y - 22, w: 22, minX: 3940, maxX: 4090, speed: 1.8,
      tier: 'pursuer', weapon: 'chainsaw' },
    { x: 4360, y: GROUND_Y - 22, w: 22, minX: 4300, maxX: 4460, speed: 1.7,
      tier: 'aggressor', shoots: true },
    { x: 4650, y: GROUND_Y - 22, w: 22, minX: 4600, maxX: 4730, speed: 1.7, canHop: true },
    { x: 4880, y: GROUND_Y - 22, w: 22, minX: 4820, maxX: 4990, speed: 1.8,
      tier: 'pursuer', weapon: 'chainsaw' },
    { x: 5080, y: GROUND_Y - 22, w: 22, minX: 5030, maxX: 5150, speed: 1.7,
      tier: 'aggressor', shoots: true },
    { x: 5150, y: GROUND_Y - 26, w: 26, minX: 5090, maxX: 5190, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },

    // --- arena 4 ---
    { x: 5700, y: GROUND_Y - 22, w: 22, minX: 5650, maxX: 5800, speed: 1.8,
      tier: 'pursuer', weapon: 'chainsaw' },
    { x: 5980, y: GROUND_Y - 22, w: 22, minX: 5920, maxX: 6080, speed: 1.7,
      tier: 'aggressor', shoots: true },
    { x: 6150, y: GROUND_Y - 22, w: 22, minX: 6090, maxX: 6220, speed: 1.7, canHop: true },

    // --- The General ---
    // Bigger than the Foreman and faster than anything else in the game.
    // Open the whole time, and it tells you before every charge.
    { x: 6850, y: GROUND_Y - 36, w: 36, minX: 6400, maxX: 7220, speed: 1.9,
      boss: true, mode: 'fight', bossKind: 'general', bossName: 'THE GENERAL',
      tool: 'sledgehammer',
      hp: 6, stompProof: true, dropsAmmo: 8 }
  ],

  coins: [
    [420, 352], [465, 352],
    [740, 256], [785, 256],
    [1055, 330],
    [1250, 396], [1310, 396],
    [1440, 352],
    [1750, 396],
    [2085, 330],
    [2340, 236], [2385, 236],
    [2740, 352],
    [3040, 266],
    [3315, 330],
    [3560, 396],
    [3860, 352],
    [4190, 246], [4235, 246],
    [4535, 330],
    [4840, 226], [4885, 226],
    [4990, 352],
    [5280, 396],
    [5555, 330],
    [5840, 256], [5885, 256],
    [6140, 352],
    [6350, 396], [6410, 396], [6470, 396]
  ],

  checkpoints: [
    // Just INSIDE each arena, not in the crossing before it. All three of
    // these were originally at 1830 / 3600 / 5310 — which are 1800-1890,
    // 3500-3650 and 5200-5360, i.e. the three pits. A checkpoint over a pit
    // is a respawn into a fall, forever. Caught by tools/level-data-probe.html
    // the first time it ran.
    { x: 1920, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 3680, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 5390, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
