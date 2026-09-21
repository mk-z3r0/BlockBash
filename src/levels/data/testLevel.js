// A sandbox duplicate of level1.js, for messing with character controls,
// weapons, enemies, etc. without touching the real level 1. Not in the
// normal progression (see levels/registry.js) — load it by visiting the
// game with ?test in the URL. Diverges freely from level1.js from here on;
// keep it in sync manually if you want a change reflected in both.

const GROUND_Y = 410;

export default {
  id: 'test-sandbox',
  name: 'Test Sandbox',
  worldWidth: 7500, // camera headroom past the actual edge (7200) — see level1.js
  groundY: GROUND_Y,
  playerSpawn: { x: 100, y: 300 },

  house: { x: 55 },

  ground: [
    { x: 0,    width: 500 },
    { x: 555,  width: 795 },
    { x: 1390, width: 110 },   // stepping-stone island
    { x: 1560, width: 590 },
    { x: 2175, width: 1325 },
    { x: 3660, width: 1040 },     // widens the 3500 gap to 160px — mirrors level1.js's physics-lab retune, 2026-09-20
    { x: 4760, width: 740 },
    { x: 5590, width: 1610 }
  ],

  platforms: [
    // --- first half ---
    { x: 150,  y: 320, width: 120, height: 18 },
    { x: 330,  y: 330, width: 90,  height: 18 },
    { x: 650,  y: 300, width: 120, height: 18 },
    { x: 900,  y: 230, width: 100, height: 18 },
    { x: 1150, y: 320, width: 100, height: 18 },
    { x: 1620, y: 280, width: 140, height: 18 },
    { x: 1750, y: 200, width: 100, height: 18 },
    { x: 2040, y: 300, width: 190, height: 18 },
    { x: 2350, y: 260, width: 130, height: 18 },
    { x: 2600, y: 200, width: 100, height: 18 },
    { x: 2850, y: 300, width: 120, height: 18 },

    // staircase — mirrors level1.js, 2026-09-20
    { x: 2990, y: 388, width: 58, height: 22 },
    { x: 3048, y: 366, width: 58, height: 44 },
    { x: 3106, y: 344, width: 58, height: 66 },
    { x: 3164, y: 322, width: 58, height: 88 },

    // --- second half ---
    { x: 3700, y: 300, width: 110, height: 18 },  // coin perch, before the first spikes
    { x: 4500, y: 290, width: 110, height: 18 },  // coin perch
    { x: 4960, y: 340, width: 100, height: 18 },  // stepping stones over the long bed
    { x: 5120, y: 340, width: 100, height: 18 },
    { x: 6100, y: 300, width: 120, height: 18 },
    { x: 6300, y: 344, width: 66, height: 66 }   // tall wall — mirrors level1.js
  ],

  hazards: [
    { type: 'spikes', x: 3980, width: 48 },
    { type: 'spikes', x: 4320, width: 160 },
    { type: 'spikes', x: 4920, width: 340 },
    { type: 'spikes', x: 5700, width: 35 },
    { type: 'spikes', x: 5850, width: 50 },
    { type: 'spikes', x: 5980, width: 50 }
  ],

  // Rescaled to match level1.js's physics-lab retune, 2026-09-20 (~1.79x,
  // matching how far walkMax grew) — see level1.js for the full note.
  enemies: [
    { x: 250,  y: GROUND_Y - 22, w: 22, minX: 220,  maxX: 460,  speed: 1.6 },
    { x: 700,  y: GROUND_Y - 22, w: 22, minX: 650,  maxX: 950,  speed: 1.95 },
    { x: 660,  y: 300 - 20,      w: 20, minX: 655,  maxX: 750,  speed: 1.26 },
    { x: 1600, y: GROUND_Y - 22, w: 22, minX: 1580, maxX: 1800, speed: 1.83 },
    { x: 1760, y: 200 - 20,      w: 20, minX: 1755, maxX: 1830, speed: 1.15 },
    { x: 2360, y: 260 - 20,      w: 20, minX: 2355, maxX: 2460, speed: 1.26 },
    { x: 2100, y: 300 - 20,      w: 20, minX: 2045, maxX: 2225, speed: 1.26 },
    { x: 2900, y: GROUND_Y - 22, w: 22, minX: 2760, maxX: 2980, speed: 1.6 },
    { x: 3400, y: GROUND_Y - 22, w: 22, minX: 3300, maxX: 3480, speed: 1.72 },
    { x: 3750, y: 300 - 20,      w: 20, minX: 3700, maxX: 3810, speed: 1.15 },
    { x: 4550, y: 290 - 20,      w: 20, minX: 4500, maxX: 4610, speed: 1.26 },
    { x: 6150, y: 300 - 20,      w: 20, minX: 6100, maxX: 6220, speed: 1.37 },
    // maxX pulled back to leave room for the cutscene dig — see level1.js
    { x: 6980, y: GROUND_Y - 33, w: 33, minX: 6900, maxX: 7010, speed: 1.37, boss: true }
  ],

  coins: [
    [180, 306], [230, 306], [680, 286], [730, 286],
    [920, 216], [1170, 306], [1220, 306],
    [1770, 186], [2075, 286], [2125, 286],
    [2370, 246], [2620, 186], [2870, 286], [2920, 286],
    [3019, 374], [3077, 352], [3135, 330], [3193, 308],   // staircase treads
    [1530, 240], [1580, 240],
    [800, 396], [1000, 396], [1900, 396], [2720, 396], [2900, 396],

    // symmetric 3-coin trios — mirrors level1.js's design rule, 2026-09-20
    [4006, 340], [4038, 304], [4070, 340],
    [4180, 365], [4230, 365],
    [4372, 310], [4422, 299], [4472, 310],
    [5710, 340], [5745, 340], [5865, 340], [5995, 340],
    [3740, 286], [3780, 286],
    [4540, 276], [4580, 276],
    [5010, 326], [5170, 326],
    [6140, 286], [6180, 286], [6333, 330],   // 6333 = on top of the tall wall
    [5320, 396], [5620, 396], [5660, 396],
    [6400, 396], [6450, 396], [6500, 396]
  ],

  checkpoints: [
    { x: 1600, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 3300, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 5300, y: GROUND_Y - 70, width: 8, height: 70 }
  ],

  goal: { x: 7100, y: 200, width: 10, height: GROUND_Y - 200 },

  boss: { mode: 'cutscene', wakeX: 6560, chargeSpeed: 2.75 }
};
