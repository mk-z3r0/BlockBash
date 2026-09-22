// Level 2 — the second cube face, and where the game starts talking.
//
// Level 1 was wordless on purpose (GAME_DESIGN's dialogue section: "the
// story starts opening up in level 2"). This is that. Quarrick is waiting
// where the player lands, he's already missing a corner, and nobody
// mentions it.
//
// What's new mechanically, in the order the player meets it:
//   - tool-carrying spheres. The design doc's enemy table gives level 2
//     "enemies begin carrying tools": these are `tier: 'pursuer'` with a
//     pickaxe, so they break patrol and come at you.
//   - a boss that can actually be fought, and a second weapon out of it.
//
// Geometry follows the level design rules in IMPLEMENTATION_PLAN, and is
// checked by tools/level-audit-probe.html?level=1 rather than by eye: every
// gap and bed clearable, nothing overhanging a jump-off lip, no hazard in a
// landing zone. Run-only obstacles are deliberate and marked.

const GROUND_Y = 410;

export default {
  id: 'level2',
  name: 'The Quarry',
  // 300px of unwalkable headroom past the edge so the camera can pan far
  // enough to reveal it before the player is standing on it — same reason
  // level 1 carries it.
  worldWidth: 7300,
  groundY: GROUND_Y,
  playerSpawn: { x: 90, y: 300 },

  // Quarrick hands the pickaxe over at the end of level 1, and the player
  // walks onto the next face still holding it. Every level from here states
  // what the player arrives carrying, rather than the old "unarmed every
  // level" rule, which would have meant losing an earned weapon at a level
  // boundary for no reason anyone could see.
  startsWith: 'pickaxe',

  // How many corners the spheres have taken off him by now. Authored per
  // level because it IS the deterioration beat — see entities/npc.js.
  quarrickDamage: 1,

  ground: [
    { x: 0,    width: 900 },
    { x: 960,  width: 540 },    // 60px gap
    { x: 1590, width: 510 },    // 90px gap
    { x: 2250, width: 650 },    // 150px gap — run only
    { x: 2955, width: 645 },    // 55px gap
    { x: 3760, width: 740 },    // 160px gap — run only, the level's hardest
    { x: 4570, width: 630 },    // 70px gap
    { x: 5290, width: 1710 }    // 90px gap, then the long run to the boss
  ],

  platforms: [
    { x: 200,  y: 330, width: 120, height: 18 },
    { x: 500,  y: 290, width: 120, height: 18 },
    { x: 990,  y: 320, width: 110, height: 18 },
    { x: 1300, y: 260, width: 100, height: 18 },
    { x: 1600, y: 300, width: 100, height: 18, chewed: true },
    { x: 1900, y: 230, width: 100, height: 18 },
    { x: 2300, y: 310, width: 120, height: 18 },
    { x: 2600, y: 250, width: 100, height: 18, chewed: true },
    // stepping stones over the 300px bed at 3100 — the same shape level 1
    // uses for its long bed, which is the one arrangement where a wide
    // hazard stays fair
    { x: 3140, y: 340, width: 100, height: 18 },
    { x: 3290, y: 340, width: 100, height: 18 },
    { x: 3800, y: 300, width: 120, height: 18 },
    { x: 4200, y: 250, width: 100, height: 18, chewed: true },
    { x: 4600, y: 310, width: 120, height: 18 },
    { x: 4950, y: 240, width: 100, height: 18 },
    { x: 5330, y: 300, width: 110, height: 18, chewed: true },
    { x: 5900, y: 270, width: 100, height: 18 },
    { x: 6300, y: 320, width: 120, height: 18 }
  ],

  hazards: [
    { type: 'spikes', x: 1150, width: 50 },
    { type: 'spikes', x: 1750, width: 50 },
    // Moved from 2400 (caught by the audit probe, not by eye): the platform
    // at 2300-2420 sat directly over that bed's take-off, so a correctly
    // timed jump was a head-bonk into its underside and a death. That is
    // the exact rule the design notes call "the worst bug in level 1",
    // reintroduced by hand and caught by a machine within the hour.
    { type: 'spikes', x: 2500, width: 50 },
    // crossed on the two stones above, never jumped
    { type: 'spikes', x: 3100, width: 300 },
    { type: 'spikes', x: 4100, width: 50 },
    { type: 'spikes', x: 4800, width: 50 },
    { type: 'spikes', x: 5500, width: 50 },
    { type: 'spikes', x: 5750, width: 60 }
    // 6100 onward stays clear: that's the Excavator's arena, and it digs
    // its own holes in it.
  ],

  cutscenes: [
    // `once: true` — he says this the first time you arrive, not every time
    // you die and come back to the start of the level.
    { id: 'l2-arrival', when: { levelStart: true }, once: true },
    { id: 'edge-transition', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    { x: 400,  y: GROUND_Y - 22, w: 22, minX: 350,  maxX: 600,  speed: 1.6 },
    { x: 1030, y: 300,           w: 20, minX: 990,  maxX: 1100, speed: 1.2 },
    { x: 1700, y: GROUND_Y - 22, w: 22, minX: 1620, maxX: 1900, speed: 1.8 },
    // The first sphere in the game that comes after you, and the first
    // carrying a tool. Deliberately on open ground with room to back away.
    { x: 2500, y: GROUND_Y - 22, w: 22, minX: 2300, maxX: 2800, speed: 1.5,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 2650, y: 230,           w: 20, minX: 2600, maxX: 2700, speed: 1.2 },
    { x: 3850, y: 280,           w: 20, minX: 3800, maxX: 3920, speed: 1.2 },
    { x: 4300, y: GROUND_Y - 22, w: 22, minX: 4200, maxX: 4480, speed: 1.6,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 4980, y: 220,           w: 20, minX: 4950, maxX: 5050, speed: 1.2 },
    { x: 5900, y: GROUND_Y - 22, w: 22, minX: 5850, maxX: 6050, speed: 1.5,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 6350, y: 300,           w: 20, minX: 6300, maxX: 6420, speed: 1.3 },

    // --- The Excavator ---
    // 50% bigger than a standard sphere, same as level 1's Foreman, so
    // "boss" keeps meaning one readable thing. hp 4 against a pickaxe that
    // does 1: four landed hits, each of which has to happen inside a
    // ~2-second jammed window, so the fight is about patience rather than
    // damage — which is what "win by jamming the mechanism" has to mean in
    // a game whose only verb is hit.
    { x: 6700, y: GROUND_Y - 33, w: 33, minX: 6150, maxX: 6950, speed: 1.5,
      boss: true, mode: 'fight', bossKind: 'excavator', hp: 4,
      stompProof: true,            // it's a drilling rig; you don't jump on it
      drops: 'sledgehammer' }
  ],

  coins: [
    [240, 316], [290, 316],
    [540, 276], [590, 276],
    [700, 396], [760, 396],
    [1030, 306], [1075, 306],
    [1330, 246], [1370, 246],
    [1630, 286], [1675, 286],
    [1940, 216],
    [2000, 396], [2060, 396],
    [2340, 296], [2390, 296],
    [2630, 236],
    [2700, 396], [2840, 396],
    // the arc over the 3100 bed's first stone
    [3060, 330], [3180, 326], [3330, 326],
    [3460, 396], [3520, 396],
    [3840, 286], [3890, 286],
    [4240, 236],
    [4380, 396], [4440, 396],
    [4640, 296], [4690, 296],
    [4990, 226],
    [5120, 396], [5180, 396],
    [5360, 286], [5405, 286],
    [5620, 396],
    [5940, 256],
    [6150, 396], [6210, 396],
    [6340, 306], [6390, 306]
  ],

  checkpoints: [
    // All three sit outside every patrol span — respawning into a sphere is
    // a cheap death, and with pursuers in the level it would be worse than
    // cheap. Checked by the audit probe.
    { x: 2180, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 3700, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 5250, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
