// Level 6 — the last outer face, and the one with nothing clever in it.
//
// "The General. Pure combat. Fast, aggressive, no gimmick. The hardest FAIR
// fight in the game." Fair is the operative word and it's the whole design:
// it is open the entire time, it telegraphs every charge, and the recovery
// after one is the window. There is nothing to solve. There is only reading
// it and being somewhere else.
//
// The level around it is the hardest running the game asks for — shooters
// and pursuers together, corrupted squares in the corridors, and the
// architecture barely square any more.

const GROUND_Y = 410;

export default {
  id: 'level6',
  name: 'No Tricks Left',
  worldWidth: 7500,
  groundY: GROUND_Y,
  playerSpawn: { x: 90, y: 300 },

  startsWith: 'cornerstone',
  startsWithAmmo: 12,
  quarrickDamage: 2,

  ground: [
    { x: 0,    width: 800 },
    { x: 870,  width: 520 },    // 70
    { x: 1480, width: 540 },    // 90
    { x: 2075, width: 640 },    // 55
    { x: 2865, width: 740 },    // 150 — run only
    { x: 3705, width: 630 },    // 100
    { x: 4425, width: 600 },    // 90
    { x: 5185, width: 2015 }    // 160 — run only
  ],

  platforms: [
    { x: 160,  y: 330, width: 110, height: 18, chewed: true },
    { x: 450,  y: 285, width: 100, height: 18, chewed: true },
    { x: 880,  y: 320, width: 90,  height: 18, chewed: true },
    { x: 1180, y: 265, width: 90,  height: 18, chewed: true },
    { x: 1510, y: 310, width: 90,  height: 18, chewed: true },
    { x: 1810, y: 235, width: 90,  height: 18, chewed: true },
    { x: 2110, y: 320, width: 90,  height: 18, chewed: true },
    { x: 2480, y: 255, width: 90,  height: 18, chewed: true },
    { x: 2885, y: 310, width: 70,  height: 18, chewed: true },
    { x: 3380, y: 280, width: 90,  height: 18, chewed: true },
    { x: 3850, y: 340, width: 100, height: 18 },   // stones over the long bed
    { x: 4000, y: 340, width: 100, height: 18 },
    { x: 4200, y: 250, width: 70,  height: 18, chewed: true },
    { x: 4620, y: 250, width: 70,  height: 18, chewed: true },
    { x: 4880, y: 225, width: 80,  height: 18, chewed: true },
    { x: 5280, y: 300, width: 90,  height: 18, chewed: true },
    { x: 5760, y: 265, width: 90,  height: 18, chewed: true },
    { x: 6120, y: 300, width: 90,  height: 18, chewed: true }
    // 6300 onward: the General's ground. Deliberately bare — nothing to
    // hide behind, and nothing for it to get stuck on.
  ],

  hazards: [
    { type: 'spikes', x: 1060, width: 50 },
    { type: 'spikes', x: 1700, width: 50 },
    { type: 'spikes', x: 2330, width: 55 },
    { type: 'spikes', x: 3020, width: 50 },
    { type: 'spikes', x: 3220, width: 55 },
    { type: 'spikes', x: 3810, width: 350 },   // crossed on the two stones
    { type: 'spikes', x: 4530, width: 55 },
    { type: 'spikes', x: 4770, width: 60 },
    { type: 'spikes', x: 5420, width: 50 },
    { type: 'spikes', x: 5620, width: 55 }
  ],

  ammo: [
    { x: 1225, y: 250,           amount: 4 },
    { x: 2920, y: GROUND_Y - 34, amount: 4 },
    { x: 4655, y: 235,           amount: 5 },
    { x: 6160, y: 285,           amount: 5 }
  ],

  cutscenes: [
    { id: 'l6-arrival', when: { levelStart: true }, once: true },
    // NOT the edge transition. Five faces of walking off an edge and having
    // the world turn under you is the setup; this is the one that doesn't.
    { id: 'descent', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    { x: 330,  y: GROUND_Y - 22, w: 22, minX: 280,  maxX: 570,  speed: 1.8,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 920,  y: 300,           w: 20, minX: 880,  maxX: 970,  speed: 1.3 },
    { x: 1600, y: GROUND_Y - 22, w: 22, minX: 1500, maxX: 1860, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 1850, y: 215,           w: 20, minX: 1810, maxX: 1900, speed: 1.3 },
    { x: 2200, y: GROUND_Y - 22, w: 22, minX: 2100, maxX: 2420, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 2530, y: GROUND_Y - 26, w: 26, minX: 2490, maxX: 2700, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },
    { x: 2960, y: GROUND_Y - 22, w: 22, minX: 2900, maxX: 3000, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 3420, y: GROUND_Y - 22, w: 22, minX: 3300, maxX: 3580, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 3900, y: 320,           w: 20, minX: 3850, maxX: 3950, speed: 1.2 },
    { x: 4480, y: GROUND_Y - 22, w: 22, minX: 4435, maxX: 4520, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 4920, y: 205,           w: 20, minX: 4880, maxX: 4960, speed: 1.3 },
    { x: 5370, y: GROUND_Y - 26, w: 26, minX: 5300, maxX: 5490, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },
    { x: 5820, y: GROUND_Y - 22, w: 22, minX: 5700, maxX: 6020, speed: 1.6,
      tier: 'aggressor', shoots: true },

    // --- The General ---
    // Bigger than the Foreman and faster than anything else in the game.
    // hp 6, open the whole time, and it tells you before every charge.
    { x: 6800, y: GROUND_Y - 36, w: 36, minX: 6350, maxX: 7120, speed: 1.9,
      boss: true, mode: 'fight', bossKind: 'general', hp: 6,
      stompProof: true, dropsAmmo: 8 }
  ],

  coins: [
    [200, 316], [245, 316],
    [490, 271],
    [660, 396], [720, 396],
    [915, 306],
    [1215, 251],
    [1330, 396],
    [1545, 296],
    [1845, 221],
    [1970, 396],
    [2145, 306],
    [2515, 241],
    [2640, 396],
    [2915, 296],
    [3410, 266],
    [3560, 396],
    [3770, 330], [3890, 326], [4040, 326],
    [4230, 236],
    [4350, 396],
    [4650, 236],
    [4910, 211],
    [5100, 396],
    [5315, 286],
    [5540, 396],
    [5795, 251],
    [6060, 396],
    [6150, 286],
    [6300, 396], [6360, 396]
  ],

  checkpoints: [
    { x: 2050, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 3675, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 5205, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
