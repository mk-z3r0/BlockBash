// Level 1 — pure data, no behavior. The loader (levels/levelLoader.js)
// turns this into live runtime objects.
//
// Ground segments only need x/width; y and height come from groundY.
// Floating platforms carry their own y/height. Spikes sit on the ground line
// unless given their own y.
//
// Shape of the level: the first half (0-3500) is pits and patrolling
// spheres. The second half (3500-6800) introduces spikes and asks for more
// deliberate platforming. It stays beginner-friendly throughout — later
// levels are where this gets mean.
//
// Design rule learned the hard way: never put a floating platform directly
// above a jump-off point. The player rises ~146px on a full jump, so a
// platform overhead turns a correct-timing jump into a head-bonk and a death.
// Every platform here is clear of the corridor above a pit or a spike bed.

const GROUND_Y = 410;

export default {
  id: 'level1',
  name: 'The First Stand',
  worldWidth: 7200,
  groundY: GROUND_Y,
  playerSpawn: { x: 100, y: 300 },

  // Gaps: 500-580 (80), 1350-1390 (40), 1500-1560 (60), 2150-2190 (40),
  // 3500-3570 (70), 4700-4760 (60), 5500-5590 (90). A full-speed jump
  // carries ~162px, so all of these have real margin.
  ground: [
    { x: 0,    width: 500 },
    { x: 580,  width: 770 },
    { x: 1390, width: 110 },   // stepping-stone island
    { x: 1560, width: 590 },
    { x: 2190, width: 1310 },
    { x: 3570, width: 1130 },
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

    // --- second half ---
    { x: 3700, y: 300, width: 110, height: 18 },  // coin perch, before the first spikes
    { x: 4500, y: 290, width: 110, height: 18 },  // coin perch
    { x: 4960, y: 340, width: 100, height: 18 },  // stepping stones over the long bed
    { x: 5120, y: 340, width: 100, height: 18 },
    { x: 6100, y: 300, width: 120, height: 18 }
  ],

  hazards: [
    { type: 'spikes', x: 3980, width: 48 },   // the teaching spike: wide runway, open landing
    // 60px is the beginner ceiling for a jumpable bed: the jump arc carries
    // ~162px, so a wider bed means jumping early lands you mid-spikes and the
    // window of workable timings collapses
    { type: 'spikes', x: 4320, width: 60 },
    // the long bed — crossed via stepping stones, not jumped. It starts well
    // clear of the 4700 pit: a full-power jump off that lip carries ~162px,
    // and landing in spikes because you jumped hard is a rotten way to die.
    { type: 'spikes', x: 4920, width: 340 },
    { type: 'spikes', x: 5700, width: 60 },
    { type: 'spikes', x: 5850, width: 50 },
    { type: 'spikes', x: 5980, width: 50 }    // last hazard: 6030+ stays clear for the boss cutscene
  ],

  enemies: [
    { x: 250,  y: GROUND_Y - 22, w: 22, minX: 220,  maxX: 460,  speed: 1.4 },
    { x: 700,  y: GROUND_Y - 22, w: 22, minX: 650,  maxX: 950,  speed: 1.7 },
    { x: 660,  y: 300 - 20,      w: 20, minX: 655,  maxX: 750,  speed: 1.1 },
    { x: 1600, y: GROUND_Y - 22, w: 22, minX: 1580, maxX: 1800, speed: 1.6 },
    { x: 1760, y: 200 - 20,      w: 20, minX: 1755, maxX: 1830, speed: 1.0 },
    { x: 2360, y: 260 - 20,      w: 20, minX: 2355, maxX: 2460, speed: 1.1 },
    { x: 3400, y: GROUND_Y - 22, w: 22, minX: 3300, maxX: 3480, speed: 1.5 },
    { x: 3750, y: 300 - 20,      w: 20, minX: 3700, maxX: 3810, speed: 1.0 },
    { x: 4550, y: 290 - 20,      w: 20, minX: 4500, maxX: 4610, speed: 1.1 },
    { x: 6150, y: 300 - 20,      w: 20, minX: 6100, maxX: 6220, speed: 1.2 },
    { x: 6980, y: GROUND_Y - 26, w: 26, minX: 6900, maxX: 7100, speed: 1.2, boss: true }
  ],

  coins: [
    // first half
    [180, 280], [230, 280], [680, 260], [730, 260],
    [920, 190], [1170, 280], [1220, 280], [1530, 240],
    [1580, 240], [1770, 160], [2075, 260], [2125, 260],
    [2370, 220], [2620, 160], [2870, 260], [2920, 260],
    [1000, 380], [1900, 380], [2900, 380],
    // second half — arcs over each hazard telegraph the jump
    [3740, 265], [3780, 265],
    [3960, 350], [4004, 315], [4048, 350],
    [4180, 365], [4230, 365],
    [4330, 340], [4350, 305], [4370, 340],
    [4540, 255], [4580, 255],
    [5010, 305], [5170, 305], [5320, 370],
    [5620, 360], [5660, 360],
    [5710, 340], [5745, 340], [5865, 340], [5995, 340],
    [6140, 265], [6180, 265],
    [6400, 370], [6450, 370], [6500, 370]
  ],

  checkpoints: [
    { x: 1600, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 3300, y: GROUND_Y - 70, width: 8, height: 70 },  // start of the spike half
    { x: 5300, y: GROUND_Y - 70, width: 8, height: 70 }   // after the long spike bed
  ],

  goal: { x: 7100, y: 200, width: 10, height: GROUND_Y - 200 },

  // Level 1's boss can't be fought — walking into range plays a cutscene
  // where a rescue NPC deals with it. Later levels get real fights.
  // Everything past 6030 is kept clear so the NPC's run-in reads cleanly.
  // wakeX sits ~420px short of the boss on purpose: the boss needs room to
  // charge before the rescue NPC intercepts it. Trigger it too close and the
  // boss immediately stops against the player, and the whole leap happens
  // with nothing moving.
  boss: { mode: 'cutscene', wakeX: 6560, chargeSpeed: 2.4 }
};
