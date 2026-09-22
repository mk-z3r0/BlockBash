// Level 3 — the third face, and the turn the whole game is built around.
//
// Structurally this level is in three parts:
//
//   0-3400     ordinary play with the sledgehammer, and the first corrupted
//              square. Swinging at it does nothing. That lesson has to land
//              BEFORE the weapon that answers it exists, or the Cornerstone
//              is just another gun.
//   3400       Quarrick hands over the Cornerstone and immediately corrupts.
//              The player's first shot with it is at him.
//   3400-7100  the verb, practised. Corrupted squares to restore, triangles
//              to find, and the Sculptor at the end — a boss that cannot be
//              hurt and has to be put back together.
//
// The degradation is worse here than level 2 (GAME_DESIGN's environmental
// storytelling arc: "sections visibly sanded smooth, corners going
// missing"), which is what `chewed` is doing on half the platforms.

const GROUND_Y = 410;

export default {
  id: 'level3',
  name: 'What the Sanders Left',
  worldWidth: 7400,
  groundY: GROUND_Y,
  playerSpawn: { x: 90, y: 300 },

  // Arrives holding what the Excavator dropped.
  startsWith: 'sledgehammer',
  // Worse than level 2. He is running out.
  quarrickDamage: 3,

  ground: [
    { x: 0,    width: 800 },
    { x: 870,  width: 530 },    // 70
    { x: 1490, width: 510 },    // 90
    { x: 2060, width: 640 },    // 60
    { x: 2850, width: 750 },    // 150 — run only
    { x: 3655, width: 645 },    // 55
    { x: 4390, width: 610 },    // 90
    { x: 5160, width: 1940 }    // 160 — run only, then the long run in
  ],

  platforms: [
    { x: 150,  y: 330, width: 120, height: 18 },
    { x: 420,  y: 280, width: 120, height: 18 },
    { x: 880,  y: 320, width: 100, height: 18 },
    { x: 1180, y: 270, width: 110, height: 18, chewed: true },
    { x: 1520, y: 310, width: 110, height: 18 },
    { x: 1820, y: 240, width: 100, height: 18, chewed: true },
    { x: 2100, y: 320, width: 110, height: 18 },
    { x: 2450, y: 260, width: 100, height: 18, chewed: true },
    { x: 2870, y: 310, width: 80,  height: 18 },
    // the handoff clearing — flat, empty, nothing overhead. The one place
    // in the level with no obstacle in it, because the scene is the obstacle.
    { x: 3150, y: 300, width: 110, height: 18 },
    // stepping stones over the 350px bed
    { x: 3840, y: 340, width: 100, height: 18 },
    { x: 3990, y: 340, width: 100, height: 18 },
    { x: 4170, y: 250, width: 80,  height: 18, chewed: true },
    { x: 4580, y: 250, width: 70,  height: 18 },
    { x: 4850, y: 230, width: 100, height: 18, chewed: true },
    { x: 5250, y: 300, width: 100, height: 18 },
    { x: 5750, y: 270, width: 100, height: 18, chewed: true },
    { x: 6000, y: 320, width: 100, height: 18 },
    { x: 6400, y: 290, width: 100, height: 18, chewed: true }
  ],

  hazards: [
    { type: 'spikes', x: 1050, width: 50 },
    { type: 'spikes', x: 1700, width: 50 },
    { type: 'spikes', x: 2300, width: 50 },
    { type: 'spikes', x: 3000, width: 50 },
    // crossed on the two stones, never jumped
    { type: 'spikes', x: 3800, width: 350 },
    { type: 'spikes', x: 4500, width: 50 },
    { type: 'spikes', x: 4700, width: 60 },
    { type: 'spikes', x: 5400, width: 50 },
    { type: 'spikes', x: 5600, width: 50 }
    // 6300 onward is the Sculptor's ground, kept clear
  ],

  ammo: [
    // All of it after the handoff — before that the player has nothing to
    // put triangles into. Enough across the level to restore every
    // corrupted square AND still face the Sculptor with a full load, if the
    // player picks it all up; not enough to be careless twice.
    { x: 3700, y: GROUND_Y - 34, amount: 4 },
    { x: 4900, y: 200,           amount: 4 },
    { x: 6050, y: 290,           amount: 5 }
  ],

  cutscenes: [
    // Neither is `once`. If the player dies after the handoff, they respawn
    // holding the level's starting weapon again, and the scene that gives
    // them the Cornerstone has to be able to run a second time — otherwise
    // the Sculptor, which can only be beaten with it, is unbeatable.
    // 3250, not 3400: the scene stands Quarrick 150px ahead of the player,
    // and triggering at 3400 put him within 50px of the pit at 3600 — the
    // most important conversation in the game, held on the lip of a hole.
    { id: 'l3-handoff',  when: { reachX: 3250 } },
    { id: 'l3-restored', when: { quarrickRestored: true } },
    { id: 'edge-transition', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    { x: 350,  y: GROUND_Y - 22, w: 22, minX: 300,  maxX: 560,  speed: 1.7 },
    { x: 930,  y: 300,           w: 20, minX: 880,  maxX: 980,  speed: 1.2 },
    { x: 1600, y: GROUND_Y - 22, w: 22, minX: 1520, maxX: 1900, speed: 1.6,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 1870, y: 220,           w: 20, minX: 1820, maxX: 1920, speed: 1.2 },
    // The first corrupted square in the game, on open ground with room to
    // back off. The sledgehammer bounces off it. That's the whole point of
    // putting it here, 900px before anyone explains what it is.
    { x: 2500, y: GROUND_Y - 26, w: 26, minX: 2200, maxX: 2680, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 2900, y: GROUND_Y - 22, w: 22, minX: 2860, maxX: 2990, speed: 1.5,
      tier: 'pursuer', weapon: 'pickaxe' },
    // 3100-3600 deliberately empty: the handoff happens here.
    { x: 3880, y: 320,           w: 20, minX: 3840, maxX: 3940, speed: 1.1 },
    { x: 4420, y: GROUND_Y - 26, w: 26, minX: 4400, maxX: 4690, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 4880, y: 210,           w: 20, minX: 4850, maxX: 4950, speed: 1.2 },
    { x: 5300, y: GROUND_Y - 22, w: 22, minX: 5220, maxX: 5390, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 5850, y: GROUND_Y - 26, w: 26, minX: 5700, maxX: 5990, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 6430, y: 270,           w: 20, minX: 6400, maxX: 6500, speed: 1.3 },

    // --- The Sculptor ---
    // "First octagon boss — a large corrupted square. Defeated by
    // restoration, not combat, which teaches the verb the endgame depends
    // on." Nothing in the arsenal can hurt it. Six triangles put it back.
    { x: 6800, y: GROUND_Y - 54, w: 54, minX: 6500, maxX: 7050, speed: 0.75,
      kind: 'octagon', boss: true, restoreHits: 6 }
  ],

  coins: [
    [190, 316], [235, 316],
    [460, 266], [505, 266],
    [620, 396], [680, 396],
    [915, 306],
    [1215, 256], [1260, 256],
    [1330, 396],
    [1560, 296], [1605, 296],
    [1860, 226],
    [1960, 396],
    [2140, 306], [2185, 306],
    [2490, 246], [2530, 246],
    [2620, 396],
    [2900, 296],
    [3100, 396], [3190, 286], [3235, 286],
    [3450, 396], [3520, 396],
    [3760, 330], [3880, 326], [4030, 326],
    [4205, 236],
    [4330, 396],
    [4610, 236],
    [4890, 216],
    [4960, 396],
    [5290, 286],
    [5500, 396],
    [5790, 256],
    [6040, 306],
    [6200, 396], [6260, 396],
    [6440, 276]
  ],

  checkpoints: [
    { x: 2040, y: GROUND_Y - 70, width: 8, height: 70 },
    // Just before the handoff trigger at 3250, so a death after it means a
    // short walk back into the scene rather than it firing the instant the
    // player reappears.
    { x: 3140, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 5180, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
