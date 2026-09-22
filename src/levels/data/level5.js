// Level 5 — The Room That Moves. The face where the floor plan won't hold
// still.
//
// IDENTITY: nothing here stays where you left it. Lifts rise and fall,
// sliders carry their cargo back and forth, and the Terraformer at the end
// is doing it on purpose. GAME_DESIGN's dynamic-world section asks for "the
// environment becomes increasingly untrustworthy", and this is where that
// stops being set dressing.
//
// --- the two routes, and why they're built that way ---
// The LOW route is ordinary ground: jumpable gaps, jumpable beds, and it is
// what the audit probe verifies. The HIGH route runs along the lifts and
// sliders and carries most of the coins and all of the ammo.
//
// That split is deliberate rather than timid. A crossing that can ONLY be
// made by riding a platform can't be machine-verified the way a jump can —
// the probe would have to model waiting for a phase, boarding, riding and
// stepping off — so making one mandatory would mean shipping a level whose
// solution nothing has checked. Instead the movers are where the rewards
// are. The room moves whether or not you trust it; trusting it pays.
//
// The exception is the boss arena, where riding the platforms IS the fight.
// That one is verified, by tools/boss-fight-probe.html, which rides them.

const GROUND_Y = 410;
const lift = (x, y, w, rise, period, phase = 0) =>
  ({ x, y, width: w, height: 18, move: { y: rise, period, phase } });
const slider = (x, y, w, reach, period, phase = 0) =>
  ({ x, y, width: w, height: 18, move: { x: reach, period, phase } });

export default {
  id: 'level5',
  name: 'The Room That Moves',
  worldWidth: 7600,
  groundY: GROUND_Y,
  playerSpawn: { x: 80, y: 300 },

  startsWith: 'cornerstone',
  startsWithAmmo: 10,
  quarrickDamage: 2,

  ground: [
    { x: 0,    width: 900 },
    { x: 990,  width: 700 },     // 90
    { x: 1750, width: 760 },     // 60
    { x: 2660, width: 800 },     // 150 — run only
    { x: 3550, width: 700, y: 370 },  // 90, and 40px up
    { x: 4340, width: 720 },     // 90, back down
    { x: 5220, width: 2080 }     // 160 — run only, then the Terraformer
  ],

  platforms: [
    // --- LAYOUT DISCIPLINE ---
    // Movers and spike beds never share a stretch of ground. A lift that
    // drifts over a bed's take-off is a head-bonk at some phases and not
    // others, which is a cheap death dressed up as an untrustworthy room.
    // So each ground segment has ONE bed near its middle and its movers out
    // toward the ends, clear of the bed's take-off by at least 60px even at
    // the far end of a slider's travel.
    //
    // The first pass ignored this and the audit raised twelve warnings about
    // it — every one a lift hovering where the player has to jump from.

    // --- seg 1: one lift, alone, with coins stacked up it. The teach. ---
    lift(180, 300, 100, 110, 240),
    { x: 660, y: 270, width: 100, height: 18 },

    // --- seg 2: two lifts out of step with each other ---
    lift(1030, 300, 90, 120, 260, 0),
    slider(1450, 250, 100, 110, 300, 0.5),

    // --- seg 3: sliders start carrying you sideways ---
    slider(1800, 280, 100, 90, 290, 0.2),
    lift(2300, 300, 90, 130, 220, 0.25),

    // --- seg 4 ---
    slider(2700, 270, 100, 100, 340, 0.5),
    lift(3200, 290, 90, 140, 250, 0.75),

    // --- seg 5: the raised stretch ---
    lift(3600, 250, 90, 120, 230, 0.15),
    slider(4050, 230, 100, 90, 280, 0.6),

    // --- seg 6 ---
    lift(4400, 300, 90, 130, 260, 0.4),
    slider(4850, 260, 100, 100, 310, 0.3),

    // --- seg 7: the long run in ---
    lift(5300, 300, 90, 130, 250, 0.1),
    slider(5750, 260, 100, 90, 290, 0.65),
    lift(6120, 300, 90, 120, 240, 0.45),

    // --- the Terraformer's arena ---
    // `mover` (not `move`) is the boss-driven lift: these are raised by its
    // cycle rather than by the clock, so the moment they reach the ledge is
    // the same moment it's open. See entities/bosses.js.
    { x: 6480, y: 330, width: 110, height: 18, mover: 150 },
    { x: 6720, y: 330, width: 110, height: 18, mover: 150 },
    { x: 6960, y: 150, width: 320, height: 18 }
  ],

  hazards: [
    // One per ground segment, near its middle, well clear of every mover.
    { type: 'spikes', x: 480,  width: 55 },
    { type: 'spikes', x: 1300, width: 60 },
    { type: 'spikes', x: 2100, width: 55 },
    { type: 'spikes', x: 3000, width: 60 },
    { type: 'spikes', x: 3900, width: 55 },
    { type: 'spikes', x: 4700, width: 60 },
    { type: 'spikes', x: 5600, width: 55 },
    { type: 'spikes', x: 6000, width: 60 }
    // 6300 onward: the Terraformer's floor, left alone. It has other plans.
  ],

  ammo: [
    // All of it on the high route — the lifts are where the rewards live.
    { x: 1075, y: 240, amount: 4 },
    { x: 3245, y: 220, amount: 4 },
    { x: 4895, y: 200, amount: 4 },
    { x: 6165, y: 240, amount: 5 }
  ],

  cutscenes: [
    { id: 'l5-arrival', when: { levelStart: true }, once: true },
    { id: 'edge-transition', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    { x: 220,  y: GROUND_Y - 22, w: 22, minX: 170,  maxX: 290,  speed: 1.7 },
    { x: 620,  y: 260,           w: 20, minX: 570,  maxX: 660,  speed: 1.3 },
    { x: 880,  y: GROUND_Y - 22, w: 22, minX: 830,  maxX: 900,  speed: 1.6, canHop: true },
    { x: 1330, y: GROUND_Y - 22, w: 22, minX: 1200, maxX: 1450, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 1700, y: GROUND_Y - 22, w: 22, minX: 1650, maxX: 1730, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 2100, y: GROUND_Y - 26, w: 26, minX: 2040, maxX: 2260, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },
    { x: 2560, y: GROUND_Y - 22, w: 22, minX: 2480, maxX: 2620, speed: 1.6, canHop: true },
    { x: 2950, y: GROUND_Y - 22, w: 22, minX: 2900, maxX: 3020, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 3400, y: GROUND_Y - 22, w: 22, minX: 3350, maxX: 3440, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 3850, y: 370 - 22,      w: 22, minX: 3790, maxX: 3900, speed: 1.6, canHop: true },
    { x: 4250, y: 370 - 22,      w: 22, minX: 4150, maxX: 4320, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 4650, y: GROUND_Y - 26, w: 26, minX: 4590, maxX: 4800, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },
    { x: 5150, y: GROUND_Y - 22, w: 22, minX: 5080, maxX: 5190, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 5700, y: GROUND_Y - 22, w: 22, minX: 5600, maxX: 5800, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 6250, y: GROUND_Y - 26, w: 26, minX: 6180, maxX: 6320, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },

    // --- The Terraformer ---
    // It never comes to you and it never swings. hp 3, and reaching it at
    // all is the fight.
    { x: 7080, y: 150 - 33, w: 33, minX: 7000, maxX: 7250, speed: 0,
      boss: true, mode: 'fight', bossKind: 'terraformer', bossName: 'THE TERRAFORMER',
      hp: 3, stompProof: true, dropsAmmo: 6 }
  ],

  coins: [
    [225, 286], [225, 230], [225, 190],
    [700, 256], [745, 256],
    [860, 396],
    [1075, 286], [1075, 220],
    [1495, 236],
    [1650, 396],
    [1845, 266],
    [2345, 286], [2345, 220],
    [2470, 396],
    [2745, 256],
    [3245, 276], [3245, 210],
    [3420, 396],
    [3645, 236], [3645, 180],
    [4095, 216],
    [4200, 356],
    [4445, 286], [4445, 220],
    [4895, 246],
    [5020, 396],
    [5345, 286], [5345, 220],
    [5795, 246],
    [6165, 286], [6165, 230],
    [6350, 396], [6410, 396],
    [6520, 316], [6760, 316]
  ],

  checkpoints: [
    { x: 1770, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 3570, y: 370 - 70,      width: 8, height: 70 },
    { x: 5240, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
