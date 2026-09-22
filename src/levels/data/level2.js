// Level 2 — The Quarry. The second cube face, and where the game starts
// talking.
//
// IDENTITY: this level goes DOWN. The spheres have cut a stepped quarry into
// the face, and the player arrives on its rim and descends into it — four
// terraces, each 40px below the last, before the floor levels out for the
// run to the Excavator. That's what makes it read as somewhere rather than
// as level 1 with different furniture: the horizon line moves.
//
// Dropping to a lower terrace across a gap is free, which makes the first
// half generous on purpose (it's the second level in the game). The one
// climb back UP, at 3490, is the level's first real demand.
//
// What's new mechanically, in the order the player meets it:
//   - tool-carrying spheres that break patrol and come at you
//   - a boss that can be fought, and the sledgehammer out of it

const GROUND_Y = 410;      // the quarry floor, and the level's base line
const RIM = 290;           // where the player arrives

export default {
  id: 'level2',
  name: 'The Quarry',
  worldWidth: 7500,
  groundY: GROUND_Y,
  playerSpawn: { x: 90, y: RIM - 120 },

  startsWith: 'pickaxe',
  quarrickDamage: 1,

  // Terraces. A segment with its own `y` sits above the base line and is
  // thickened down to it by the loader, so the quarry has solid walls rather
  // than floating shelves.
  ground: [
    { x: 0,    width: 700,  y: RIM },        // the rim
    { x: 770,  width: 520,  y: 330 },        // 70 gap, 40px down
    { x: 1380, width: 560,  y: 370 },        // 90 gap, 40px down
    { x: 2000, width: 640 },                 // 60 gap, 40px down — the floor
    { x: 2790, width: 700 },                 // 150 gap, run only
    { x: 3545, width: 620,  y: 370 },        // 55 gap, and 40px UP
    { x: 4255, width: 600 },                 // 90 gap, back down
    { x: 5015, width: 2185 }                 // 160 gap, run only, then the boss
  ],

  platforms: [
    { x: 200,  y: 210, width: 120, height: 18 },
    { x: 470,  y: 170, width: 110, height: 18 },
    { x: 810,  y: 250, width: 100, height: 18 },
    { x: 1140, y: 200, width: 100, height: 18, chewed: true },
    { x: 1410, y: 290, width: 100, height: 18 },
    { x: 1760, y: 230, width: 100, height: 18, chewed: true },
    { x: 2080, y: 320, width: 110, height: 18 },
    { x: 2420, y: 260, width: 100, height: 18, chewed: true },
    // a lift down into the deepest part of the cut — optional, and the coins
    // on it are the reason to bother
    { x: 2900, y: 250, width: 90,  height: 18, move: { y: 90, period: 260 } },
    // Two stepping stones over the long bed, not one. Level 1 established
    // the shape and it's the only arrangement where a wide hazard stays
    // fair: one platform in the middle means two long committed jumps with
    // spikes under both, and no way to stop and re-time.
    { x: 3100, y: 340, width: 100, height: 18 },
    { x: 3250, y: 340, width: 100, height: 18 },
    { x: 3575, y: 280, width: 90,  height: 18 },
    { x: 3900, y: 230, width: 100, height: 18, chewed: true },
    { x: 4285, y: 310, width: 100, height: 18 },
    { x: 4640, y: 250, width: 100, height: 18, chewed: true },
    { x: 5080, y: 300, width: 110, height: 18 },
    { x: 5450, y: 250, width: 100, height: 18 },
    { x: 5900, y: 300, width: 100, height: 18, chewed: true },
    { x: 6300, y: 260, width: 110, height: 18 },
    // The one thing here that has to be climbed rather than jumped over —
    // three tiles of solid block in the run-up to the arena, the same idea
    // as level 1's tall wall and the level's last obstacle before the fight.
    { x: 6650, y: GROUND_Y - 66, width: 66, height: 66 }
  ],

  hazards: [
    // Spikes take the height of whatever terrace they're standing on — the
    // loader looks it up, so a bed on the rim doesn't have to be authored
    // with a y by hand.
    { type: 'spikes', x: 380,  width: 50 },
    { type: 'spikes', x: 1000, width: 50 },
    { type: 'spikes', x: 1600, width: 55 },
    { type: 'spikes', x: 2250, width: 50 },
    { type: 'spikes', x: 3050, width: 340 },  // crossed on the lift, or run past above
    { type: 'spikes', x: 3750, width: 50 },
    { type: 'spikes', x: 4450, width: 55 },
    { type: 'spikes', x: 5250, width: 50 },
    { type: 'spikes', x: 5620, width: 60 }
    // 6100 onward: the Excavator's ground. It digs its own holes in it.
  ],

  cutscenes: [
    { id: 'l2-arrival', when: { levelStart: true }, once: true },
    { id: 'edge-transition', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    { x: 250,  y: RIM - 22,      w: 22, minX: 200,  maxX: 360,  speed: 1.6 },
    { x: 600,  y: RIM - 22,      w: 22, minX: 500,  maxX: 690,  speed: 1.8 },
    { x: 850,  y: 230,           w: 20, minX: 810,  maxX: 910,  speed: 1.2 },
    { x: 1200, y: 330 - 22,      w: 22, minX: 1150, maxX: 1280, speed: 1.7 },
    { x: 1800, y: 370 - 22,      w: 22, minX: 1700, maxX: 1930, speed: 1.8 },
    // The first sphere in the game that comes after you, and the first
    // carrying a tool — on the open quarry floor with room to back away.
    { x: 2300, y: GROUND_Y - 22, w: 22, minX: 2060, maxX: 2600, speed: 1.5,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 2460, y: 240,           w: 20, minX: 2420, maxX: 2520, speed: 1.2 },
    { x: 3250, y: GROUND_Y - 22, w: 22, minX: 3180, maxX: 3480, speed: 1.6 },
    { x: 3940, y: 210,           w: 20, minX: 3900, maxX: 4000, speed: 1.2 },
    { x: 4600, y: GROUND_Y - 22, w: 22, minX: 4520, maxX: 4840, speed: 1.6,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 5120, y: 280,           w: 20, minX: 5080, maxX: 5190, speed: 1.2 },
    { x: 5750, y: GROUND_Y - 22, w: 22, minX: 5700, maxX: 5880, speed: 1.5,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 6340, y: 240,           w: 20, minX: 6300, maxX: 6410, speed: 1.3 },

    // --- The Excavator ---
    { x: 6980, y: GROUND_Y - 33, w: 33, minX: 6200, maxX: 7130, speed: 1.5,
      boss: true, mode: 'fight', bossKind: 'excavator', bossName: 'THE EXCAVATOR',
      // The rig it operates. Drawn, not swung — see `tool` in entities/enemy.js.
      tool: 'drill',
      hp: 4, stompProof: true, drops: 'sledgehammer' }
  ],

  coins: [
    [240, 196], [285, 196],
    [510, 156], [555, 156],
    [640, RIM - 14],
    [845, 236], [890, 236],
    [1180, 186],
    [1310, 330 - 14],
    [1445, 276], [1490, 276],
    [1800, 216],
    [1900, 370 - 14],
    [2120, 306], [2165, 306],
    [2460, 246],
    [2560, 396],
    // the reward for riding the lift down over the long bed
    [2930, 236], [2930, 300], [2930, 350],
    [3140, 326], [3290, 326],
    [3400, 396],
    [3610, 266], [3650, 266],
    [3940, 216],
    [4100, 356],
    [4320, 296], [4365, 296],
    [4680, 236],
    [4800, 396],
    [5120, 286],
    [5490, 236],
    [5940, 286], [5985, 286],
    [6340, 246],
    [6683, 330],
    [6800, 396], [6860, 396]
  ],

  checkpoints: [
    { x: 2020, y: GROUND_Y - 70, width: 8, height: 70 },   // the quarry floor
    { x: 3560, y: 370 - 70,      width: 8, height: 70 },   // the climb
    { x: 5040, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
