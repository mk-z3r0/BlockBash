// Level 7 — the hollow centre, and the end of the game.
//
// Not a seventh face. GAME_DESIGN's arc is six outer faces, then a descent,
// then "the planet's hollow centre... a large cavity — and at the middle of
// it is what they've been digging toward."
//
// The level is a long walk in through the inside of the crust, and then the
// cavity itself. The core sits in the middle of it, floating, and does not
// move for the entire fight. What moves is everything else: shockwaves along
// the floor, sections of floor dropping out, and its gravity leaning on the
// player.
//
// The arena's platforms are the whole fight. Triangles fly level, so the
// only place the core can be hit from is a platform at ITS height — the two
// at y170 either side of it, and the pair at y230. The low ones at y300 are
// below its body and can't reach it. That is "the player orbits it on
// platforms" in a game that only scrolls sideways: you cross the cavity to
// get an angle, and the floor you cross is the thing it's taking away.

const GROUND_Y = 410;

export default {
  id: 'level7',
  name: 'The Middle of the World',
  worldWidth: 7600,
  groundY: GROUND_Y,
  playerSpawn: { x: 90, y: 300 },

  startsWith: 'cornerstone',
  // Twelve faces to put back, and everything else in here to survive. The
  // level carries more triangles than any other, and it still isn't
  // generous — the arena pickups are placed where crossing to them costs
  // something.
  startsWithAmmo: 14,
  quarrickDamage: 2,

  ground: [
    { x: 0,    width: 2000 },
    { x: 2090, width: 1310 },   // 90
    { x: 3550, width: 1450 },   // 150 — run only
    { x: 5090, width: 2210 }    // 90, then the cavity
  ],

  platforms: [
    // the walk in — everything down here is barely square any more
    { x: 150,  y: 330, width: 120, height: 18, chewed: true },
    { x: 500,  y: 280, width: 110, height: 18, chewed: true },
    { x: 900,  y: 240, width: 110, height: 18, chewed: true },
    { x: 1300, y: 300, width: 110, height: 18, chewed: true },
    { x: 1650, y: 250, width: 100, height: 18, chewed: true },
    { x: 2200, y: 320, width: 110, height: 18, chewed: true },
    { x: 2700, y: 260, width: 110, height: 18, chewed: true },
    { x: 3100, y: 300, width: 110, height: 18, chewed: true },
    { x: 3650, y: 280, width: 110, height: 18, chewed: true },
    { x: 4100, y: 240, width: 110, height: 18, chewed: true },
    { x: 4600, y: 300, width: 110, height: 18, chewed: true },

    // --- the cavity ---
    // Two tiers up each side of the core, and a low tier that deliberately
    // cannot reach it.
    { x: 5900, y: 300, width: 130, height: 18 },
    { x: 6080, y: 230, width: 110, height: 18 },
    { x: 6210, y: 170, width: 100, height: 18 },
    { x: 6520, y: 170, width: 100, height: 18 },
    { x: 6640, y: 230, width: 110, height: 18 },
    { x: 6800, y: 300, width: 130, height: 18 }
  ],

  hazards: [
    { type: 'spikes', x: 700,  width: 50 },
    { type: 'spikes', x: 1150, width: 50 },
    // 1800, not 1900: at 1900 this bed ended only 50px before the gap at
    // 2000, so clearing it left no runway at all to jump the gap. Caught by
    // the audit probe, which couldn't even place a test runway between them.
    { type: 'spikes', x: 1800, width: 50 },
    { type: 'spikes', x: 2500, width: 50 },
    { type: 'spikes', x: 2900, width: 50 },
    { type: 'spikes', x: 3800, width: 50 },
    { type: 'spikes', x: 4300, width: 50 },
    { type: 'spikes', x: 4800, width: 50 },
    { type: 'spikes', x: 5300, width: 50 }
    // 5600 onward is the cavity floor. It starts clear and does not stay
    // that way — the core takes it apart during the fight.
  ],

  ammo: [
    { x: 1350, y: 285,           amount: 4 },
    { x: 3150, y: 285,           amount: 4 },
    { x: 4650, y: 285,           amount: 5 },
    // in the cavity, on the two low platforms that can't hit the core —
    // going for them means giving up an angle
    { x: 5960, y: 285,           amount: 5 },
    { x: 6860, y: 285,           amount: 5 }
  ],

  cutscenes: [
    { id: 'l7-arrival', when: { levelStart: true }, once: true },
    // Fires when the core is no longer a thing standing in anyone's way —
    // which, for the only boss in the game that cannot be killed, means it
    // has been put back together.
    { id: 'l7-ending', when: { bossDefeated: true } }
    // No edge transition. There is nowhere left to go.
  ],

  enemies: [
    { x: 400,  y: GROUND_Y - 22, w: 22, minX: 350,  maxX: 640,  speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 950,  y: 220,           w: 20, minX: 900,  maxX: 1010, speed: 1.3 },
    { x: 1450, y: GROUND_Y - 22, w: 22, minX: 1350, maxX: 1650, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 1700, y: 230,           w: 20, minX: 1650, maxX: 1750, speed: 1.2 },
    { x: 2300, y: GROUND_Y - 26, w: 26, minX: 2200, maxX: 2450, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },
    { x: 2750, y: 240,           w: 20, minX: 2700, maxX: 2810, speed: 1.3 },
    { x: 3200, y: GROUND_Y - 22, w: 22, minX: 3100, maxX: 3380, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 3900, y: GROUND_Y - 22, w: 22, minX: 3860, maxX: 4080, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 4400, y: GROUND_Y - 26, w: 26, minX: 4360, maxX: 4580, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },
    { x: 4900, y: GROUND_Y - 22, w: 22, minX: 4860, maxX: 4980, speed: 1.6,
      tier: 'aggressor', shoots: true },

    // --- The Core ---
    // Twelve faces, twelve triangles, and no way to hurt it in between. It
    // has no hp field at all: `restoreHits` is the only number that matters
    // and the only thing that moves it.
    { x: 6350, y: 140, w: 130, minX: 6350, maxX: 6480, speed: 0,
      kind: 'core', boss: true, mode: 'fight', bossKind: 'core',
      restoreHits: 12, stompProof: true }
  ],

  coins: [
    [190, 316], [235, 316],
    [540, 266],
    [820, 396],
    [940, 226],
    [1210, 396],
    [1340, 286],
    [1620, 396],
    [1690, 236],
    [2050, 396],
    [2240, 306],
    [2660, 396],
    [2740, 246],
    [3050, 396],
    [3140, 286],
    [3450, 396],
    [3690, 266],
    [4050, 396],
    [4140, 226],
    [4500, 396],
    [4640, 286],
    [5150, 396], [5210, 396],
    [5500, 396], [5560, 396],
    [5940, 286],
    [6120, 216],
    [6250, 156],
    [6560, 156],
    [6680, 216],
    [6840, 286]
  ],

  checkpoints: [
    { x: 2060, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 3520, y: GROUND_Y - 70, width: 8, height: 70 },
    // The last checkpoint in the game, just before the cavity opens out.
    { x: 5600, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
