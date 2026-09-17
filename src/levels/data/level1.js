// Level 1 — pure data, no behavior. The loader (levels/levelLoader.js)
// turns this into live runtime objects.
//
// Ground segments only need x/width; y and height come from groundY.
// Floating platforms carry their own y/height.

const GROUND_Y = 410;

export default {
  id: 'level1',
  name: 'The First Stand',
  worldWidth: 3200,
  groundY: GROUND_Y,
  playerSpawn: { x: 100, y: 300 },

  // Gaps left between these segments: 500-580, 1350-1400, 1480-1560,
  // 2150-2190. All well inside a full-speed jump (~168px of travel).
  ground: [
    { x: 0,    width: 500 },
    { x: 580,  width: 770 },
    { x: 1400, width: 80 },   // stepping-stone island in the wide pit
    { x: 1560, width: 590 },
    { x: 2190, width: 1010 }
  ],

  platforms: [
    { x: 150,  y: 320, width: 120, height: 18 },
    { x: 470,  y: 330, width: 90,  height: 18 },
    { x: 650,  y: 300, width: 120, height: 18 },
    { x: 900,  y: 230, width: 100, height: 18 },
    { x: 1150, y: 320, width: 100, height: 18 },
    { x: 1620, y: 280, width: 140, height: 18 },
    { x: 1750, y: 200, width: 100, height: 18 },
    { x: 2040, y: 300, width: 190, height: 18 },
    { x: 2350, y: 260, width: 130, height: 18 },
    { x: 2600, y: 200, width: 100, height: 18 },
    { x: 2850, y: 300, width: 120, height: 18 }
  ],

  hazards: [],

  enemies: [
    { x: 250,  y: GROUND_Y - 22, w: 22, minX: 220,  maxX: 460,  speed: 1.4 },
    { x: 700,  y: GROUND_Y - 22, w: 22, minX: 650,  maxX: 950,  speed: 1.7 },
    { x: 660,  y: 300 - 20,      w: 20, minX: 655,  maxX: 750,  speed: 1.1 },
    { x: 1600, y: GROUND_Y - 22, w: 22, minX: 1580, maxX: 1800, speed: 1.6 },
    { x: 1760, y: 200 - 20,      w: 20, minX: 1755, maxX: 1830, speed: 1.0 },
    { x: 2360, y: 260 - 20,      w: 20, minX: 2355, maxX: 2460, speed: 1.1 },
    { x: 2980, y: GROUND_Y - 26, w: 26, minX: 2900, maxX: 3100, speed: 1.2, boss: true }
  ],

  coins: [
    [180, 280], [230, 280], [680, 260], [730, 260],
    [920, 190], [1170, 280], [1220, 280], [1530, 240],
    [1580, 240], [1770, 160], [2075, 260], [2125, 260],
    [2370, 220], [2620, 160], [2870, 260], [2920, 260],
    [1000, 380], [1900, 380], [2900, 380]
  ],

  checkpoints: [
    { x: 1600, y: GROUND_Y - 70, width: 8, height: 70 }
  ],

  goal: { x: 3100, y: 200, width: 10, height: GROUND_Y - 200 },

  // Level 1's boss can't be fought — walking into range plays a cutscene
  // where a rescue NPC deals with it. Later levels get real fights.
  boss: { mode: 'cutscene', wakeX: 2560, chargeSpeed: 2.4 }
};
