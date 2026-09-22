// Level 4 — the face where the spheres start shooting back.
//
// Up to here every threat has been contact damage, and the design doc is
// blunt about what that does to the curve: "the difficulty curve flattens
// out once the player has reliable melee." So this is where the ranged
// tier arrives. The projectile is a slow round pellet — the hard constraint
// was that it can never be mistaken for the player's triangle, and round vs
// pointed at a glance is the version of that a child can read at speed.
//
// The player is carrying the Cornerstone from here to the end of the game.
// It is the last weapon; nothing after this drops another one. Ammo is what
// later bosses pay out instead.

const GROUND_Y = 410;

export default {
  id: 'level4',
  name: 'Three Against One',
  worldWidth: 7500,
  groundY: GROUND_Y,
  playerSpawn: { x: 90, y: 300 },

  startsWith: 'cornerstone',
  startsWithAmmo: 10,
  quarrickDamage: 2,

  ground: [
    { x: 0,    width: 850 },
    { x: 920,  width: 530 },    // 70
    { x: 1540, width: 560 },    // 90
    { x: 2155, width: 645 },    // 55
    { x: 2950, width: 750 },    // 150 — run only
    { x: 3760, width: 640 },    // 60
    { x: 4490, width: 610 },    // 90
    { x: 5260, width: 1940 }    // 160 — run only
  ],

  platforms: [
    { x: 180,  y: 330, width: 120, height: 18 },
    { x: 480,  y: 285, width: 110, height: 18 },
    { x: 930,  y: 320, width: 100, height: 18 },
    { x: 1230, y: 265, width: 100, height: 18, chewed: true },
    { x: 1570, y: 310, width: 100, height: 18 },
    { x: 1880, y: 235, width: 100, height: 18, chewed: true },
    { x: 2180, y: 320, width: 100, height: 18 },
    { x: 2550, y: 255, width: 100, height: 18, chewed: true },
    { x: 2970, y: 310, width: 70,  height: 18 },
    { x: 3450, y: 280, width: 100, height: 18, chewed: true },
    { x: 3940, y: 340, width: 100, height: 18 },   // stones over the long bed
    { x: 4090, y: 340, width: 100, height: 18 },
    { x: 4270, y: 250, width: 70,  height: 18, chewed: true },
    { x: 4700, y: 250, width: 80,  height: 18 },
    { x: 4960, y: 225, width: 90,  height: 18, chewed: true },
    { x: 5350, y: 300, width: 100, height: 18 },
    { x: 5850, y: 265, width: 100, height: 18, chewed: true },
    { x: 6150, y: 315, width: 100, height: 18 },
    { x: 6500, y: 285, width: 100, height: 18, chewed: true }
  ],

  hazards: [
    { type: 'spikes', x: 1100, width: 50 },
    { type: 'spikes', x: 1750, width: 50 },
    { type: 'spikes', x: 2400, width: 50 },
    { type: 'spikes', x: 3100, width: 50 },
    { type: 'spikes', x: 3300, width: 50 },
    { type: 'spikes', x: 3900, width: 350 },   // crossed on the two stones
    { type: 'spikes', x: 4600, width: 50 },
    { type: 'spikes', x: 4850, width: 60 },
    { type: 'spikes', x: 5500, width: 50 },
    { type: 'spikes', x: 5700, width: 50 }
  ],

  ammo: [
    { x: 1290, y: 250,           amount: 4 },
    { x: 3000, y: GROUND_Y - 34, amount: 4 },
    { x: 4740, y: 235,           amount: 4 },
    { x: 6200, y: 300,           amount: 5 }
  ],

  cutscenes: [
    { id: 'l4-arrival', when: { levelStart: true }, once: true },
    { id: 'edge-transition', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    { x: 350,  y: GROUND_Y - 22, w: 22, minX: 300,  maxX: 600,  speed: 1.7 },
    { x: 980,  y: 300,           w: 20, minX: 930,  maxX: 1030, speed: 1.2 },
    // the first sphere in the game that shoots
    { x: 1650, y: GROUND_Y - 22, w: 22, minX: 1560, maxX: 1900, speed: 1.4,
      tier: 'aggressor', shoots: true },
    { x: 1920, y: 215,           w: 20, minX: 1880, maxX: 1980, speed: 1.2 },
    { x: 2300, y: GROUND_Y - 22, w: 22, minX: 2200, maxX: 2500, speed: 1.6,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 2600, y: GROUND_Y - 26, w: 26, minX: 2560, maxX: 2780, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 3500, y: GROUND_Y - 22, w: 22, minX: 3380, maxX: 3660, speed: 1.5,
      tier: 'aggressor', shoots: true },
    { x: 3990, y: 320,           w: 20, minX: 3940, maxX: 4040, speed: 1.1 },
    { x: 4550, y: GROUND_Y - 22, w: 22, minX: 4500, maxX: 4590, speed: 1.6,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 5000, y: 205,           w: 20, minX: 4960, maxX: 5050, speed: 1.2 },
    { x: 5440, y: GROUND_Y - 26, w: 26, minX: 5370, maxX: 5560, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 5900, y: GROUND_Y - 22, w: 22, minX: 5800, maxX: 6100, speed: 1.5,
      tier: 'aggressor', shoots: true },

    // --- The Demolition Crew ---
    // "Three coordinated smaller spheres with distinct roles. Boss-as-
    // puzzle: read the roles, break the coordination."
    //
    // While all three are up they shield each other and only the shooter
    // can be hurt — and the shooter is the one hanging back, which is
    // exactly the thing a player's instinct says to ignore. Take it out and
    // the other two lose the link. They're deliberately smaller than the
    // single bosses (26px, not 33): three of them, and the threat is the
    // arrangement rather than any one of them.
    { x: 6700, y: GROUND_Y - 26, w: 26, minX: 6350, maxX: 7050, speed: 1.5,
      boss: true, mode: 'fight', bossKind: 'crew', crew: 'demo', role: 'bruiser',
      hp: 2, stompProof: true },
    { x: 6850, y: GROUND_Y - 26, w: 26, minX: 6350, maxX: 7050, speed: 1.6,
      boss: true, mode: 'fight', bossKind: 'crew', crew: 'demo', role: 'bruiser',
      hp: 2, stompProof: true },
    { x: 7000, y: GROUND_Y - 26, w: 26, minX: 6400, maxX: 7100, speed: 1.2,
      boss: true, mode: 'fight', bossKind: 'crew', crew: 'demo', role: 'shooter',
      hp: 2, stompProof: true, dropsAmmo: 6 }
  ],

  coins: [
    [220, 316], [265, 316],
    [520, 271], [565, 271],
    [700, 396], [760, 396],
    [965, 306],
    [1265, 251],
    [1380, 396],
    [1605, 296],
    [1915, 221],
    [2050, 396],
    [2215, 306], [2260, 306],
    [2585, 241],
    [2720, 396],
    [3000, 296],
    [3480, 266], [3525, 266],
    [3640, 396],
    [3860, 330], [3980, 326], [4130, 326],
    [4300, 236],
    [4420, 396],
    [4730, 236],
    [4990, 211],
    [5180, 396],
    [5385, 286],
    [5620, 396],
    [5885, 251],
    [6185, 301],
    [6330, 396], [6390, 396],
    [6535, 271]
  ],

  checkpoints: [
    { x: 2130, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 3730, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 5280, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
