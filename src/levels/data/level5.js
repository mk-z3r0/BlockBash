// Level 5 — the face where the room is the enemy.
//
// The Terraformer "never fights directly. Reshapes the arena around the
// player — platforms rise, fall, and shift — and the fight is against the
// room." So it sits on a ledge nothing can reach from the ground, and the
// only way to its height is to ride the platforms it is itself raising.
// It's open at the top of its own breath, which is the same moment those
// platforms put the player level with it. The thing it's doing to the arena
// IS the window.
//
// Out in the level, the environmental degradation is at its worst before
// the final face: most of the architecture here is chewed.

const GROUND_Y = 410;

export default {
  id: 'level5',
  name: 'The Room That Moves',
  worldWidth: 7500,
  groundY: GROUND_Y,
  playerSpawn: { x: 90, y: 300 },

  startsWith: 'cornerstone',
  startsWithAmmo: 10,
  quarrickDamage: 2,

  ground: [
    { x: 0,    width: 820 },
    { x: 890,  width: 520 },    // 70
    { x: 1500, width: 560 },    // 90
    { x: 2115, width: 640 },    // 55
    { x: 2905, width: 760 },    // 150 — run only
    { x: 3725, width: 645 },    // 60
    { x: 4460, width: 600 },    // 90
    { x: 5220, width: 1980 }    // 160 — run only
  ],

  platforms: [
    { x: 170,  y: 330, width: 120, height: 18, chewed: true },
    { x: 470,  y: 285, width: 110, height: 18 },
    { x: 900,  y: 320, width: 100, height: 18, chewed: true },
    { x: 1200, y: 265, width: 100, height: 18, chewed: true },
    { x: 1530, y: 310, width: 100, height: 18 },
    { x: 1840, y: 235, width: 100, height: 18, chewed: true },
    { x: 2140, y: 320, width: 100, height: 18, chewed: true },
    { x: 2510, y: 255, width: 100, height: 18, chewed: true },
    { x: 2925, y: 310, width: 70,  height: 18 },
    { x: 3410, y: 280, width: 100, height: 18, chewed: true },
    { x: 3900, y: 340, width: 100, height: 18 },   // stones over the long bed
    { x: 4050, y: 340, width: 100, height: 18 },
    { x: 4240, y: 250, width: 70,  height: 18, chewed: true },
    { x: 4660, y: 250, width: 80,  height: 18, chewed: true },
    { x: 4920, y: 225, width: 90,  height: 18, chewed: true },
    { x: 5310, y: 300, width: 100, height: 18, chewed: true },
    { x: 5800, y: 265, width: 100, height: 18, chewed: true },

    // --- the Terraformer's arena ---
    // `mover` is how far this platform is lifted at the top of the boss's
    // cycle (entities/bosses.js). At rest they sit at their authored y and
    // the ledge is unreachable; at full lift they're a staircase to it.
    { x: 6280, y: 330, width: 110, height: 18, mover: 150 },
    { x: 6520, y: 330, width: 110, height: 18, mover: 150 },
    // The ledge the boss sits on. 150 is above a standing jump from the
    // ground (which peaks with the player's feet around y185), so the only
    // way level with it is off a raised mover.
    { x: 6760, y: 150, width: 320, height: 18 }
  ],

  hazards: [
    { type: 'spikes', x: 1080, width: 50 },
    { type: 'spikes', x: 1720, width: 50 },
    { type: 'spikes', x: 2360, width: 50 },
    { type: 'spikes', x: 3060, width: 50 },
    { type: 'spikes', x: 3260, width: 55 },
    { type: 'spikes', x: 3860, width: 350 },   // crossed on the two stones
    { type: 'spikes', x: 4570, width: 50 },
    { type: 'spikes', x: 4810, width: 60 },
    { type: 'spikes', x: 5460, width: 50 },
    { type: 'spikes', x: 5660, width: 50 }
  ],

  ammo: [
    { x: 1250, y: 250,           amount: 4 },
    { x: 2960, y: GROUND_Y - 34, amount: 4 },
    { x: 4700, y: 235,           amount: 4 },
    { x: 6150, y: GROUND_Y - 34, amount: 5 }
  ],

  cutscenes: [
    { id: 'l5-arrival', when: { levelStart: true }, once: true },
    { id: 'edge-transition', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    { x: 340,  y: GROUND_Y - 22, w: 22, minX: 290,  maxX: 580,  speed: 1.7 },
    { x: 950,  y: 300,           w: 20, minX: 900,  maxX: 1000, speed: 1.2 },
    { x: 1620, y: GROUND_Y - 22, w: 22, minX: 1530, maxX: 1880, speed: 1.5,
      tier: 'aggressor', shoots: true },
    { x: 1880, y: 215,           w: 20, minX: 1840, maxX: 1940, speed: 1.2 },
    { x: 2250, y: GROUND_Y - 22, w: 22, minX: 2160, maxX: 2460, speed: 1.6,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 2560, y: GROUND_Y - 26, w: 26, minX: 2520, maxX: 2740, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 3460, y: GROUND_Y - 22, w: 22, minX: 3340, maxX: 3620, speed: 1.5,
      tier: 'aggressor', shoots: true },
    { x: 3950, y: 320,           w: 20, minX: 3900, maxX: 4000, speed: 1.1 },
    { x: 4520, y: GROUND_Y - 22, w: 22, minX: 4470, maxX: 4560, speed: 1.6,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 4960, y: 205,           w: 20, minX: 4920, maxX: 5010, speed: 1.2 },
    { x: 5400, y: GROUND_Y - 26, w: 26, minX: 5330, maxX: 5520, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 5860, y: GROUND_Y - 22, w: 22, minX: 5760, maxX: 6060, speed: 1.5,
      tier: 'aggressor', shoots: true },

    // --- The Terraformer ---
    // It never comes to you and it never swings. It sits on its ledge and
    // works the room. hp 3, but reaching it at all is the fight.
    { x: 6880, y: 150 - 33, w: 33, minX: 6800, maxX: 7040, speed: 0,
      boss: true, mode: 'fight', bossKind: 'terraformer', hp: 3,
      stompProof: true, dropsAmmo: 6 }
  ],

  coins: [
    [210, 316], [255, 316],
    [510, 271],
    [680, 396], [740, 396],
    [935, 306],
    [1235, 251],
    [1350, 396],
    [1565, 296],
    [1875, 221],
    [2010, 396],
    [2175, 306],
    [2545, 241],
    [2680, 396],
    [2955, 296],
    [3440, 266],
    [3600, 396],
    [3820, 330], [3940, 326], [4090, 326],
    [4270, 236],
    [4390, 396],
    [4690, 236],
    [4950, 211],
    [5140, 396],
    [5345, 286],
    [5580, 396],
    [5835, 251],
    [6100, 396], [6160, 396],
    [6320, 316], [6560, 316]
  ],

  checkpoints: [
    { x: 2090, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 3695, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 5240, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
