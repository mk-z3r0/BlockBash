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
  startsWithAmmo: 12,
  quarrickDamage: 1,   // only used after the reunion below: chipped, but square

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
    lift(180, 314, 100, 124, 240),
    { x: 660, y: 314, width: 100, height: 18 },

    // --- seg 2: two lifts out of step with each other ---
    lift(1030, 314, 90, 134, 260, 0),
    slider(1450, 314, 100, 110, 300, 0.5),

    // --- seg 3: sliders start carrying you sideways ---
    slider(1800, 314, 100, 90, 290, 0.2),
    lift(2300, 314, 90, 144, 220, 0.25),

    // --- seg 4 ---
    slider(2700, 314, 100, 100, 340, 0.5),
    lift(3200, 314, 90, 164, 250, 0.75),

    // --- seg 5: the raised stretch ---
    lift(3600, 274, 90, 144, 230, 0.15),
    slider(4050, 274, 100, 90, 280, 0.6),

    // --- seg 6 ---
    lift(4400, 314, 90, 144, 260, 0.4),
    slider(4850, 314, 100, 100, 310, 0.3),

    // --- seg 7: the long run in ---
    lift(5300, 314, 90, 144, 250, 0.1),
    slider(5750, 314, 100, 90, 290, 0.65),
    lift(6120, 314, 90, 134, 240, 0.45),

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
    // Mostly on the high route — the lifts are where the rewards live.
    { x: 1075, y: 240, amount: 4 },
    { x: 3245, y: 220, amount: 4 },
    { x: 4895, y: 200, amount: 4 },
    { x: 6165, y: 240, amount: 5 },
    // Two on the FLOOR, which breaks that rule on purpose. This is the only
    // level where the Cornerstone is the player's whole arsenal, and it is
    // now also the level that asks four triangles for Quarrick. A player who
    // doesn't trust the moving platforms — which the level has spent six
    // screens teaching them not to — would otherwise arrive at the boss with
    // what they started with minus a rescue, and the rescue is not something
    // this game should ever price out of reach.
    { x: 4330, y: GROUND_Y - 34, amount: 4 },
    { x: 5260, y: GROUND_Y - 34, amount: 4 }
  ],

  cutscenes: [
    { id: 'l5-arrival', when: { levelStart: true }, once: true },
    // The reunion. Fires as the player lands on the sixth stretch, with him
    // already on screen — see cutscenes/level5/reunion.js for why the arc
    // waits this long.
    //
    // Neither is `once`. `l5-found` has to be able to run again for a
    // player who died before reaching him, and `l5-restored` is gated on
    // the restoration itself having happened, which a death undoes along
    // with everything else in the level.
    { id: 'l5-found',    when: { reachX: 4300, quarrickLost: true } },
    { id: 'l5-restored', when: { quarrickRestored: true } },
    { id: 'edge-transition', when: { nearWorldEdge: 100 } }
  ],

  enemies: [
    { x: 220,  y: GROUND_Y - 22, w: 22, minX: 170,  maxX: 290,  speed: 1.7 },
    { x: 690,  y: 294,           w: 20, minX: 665,  maxX: 755,  speed: 1.3 },
    { x: 850,  y: GROUND_Y - 22, w: 22, minX: 820,  maxX: 878,  speed: 1.6, bounce: true },
    // Short span on purpose: an aggressor reaches 330px, and anything
    // wider put the checkpoint at 1770 inside it.
    { x: 1360, y: GROUND_Y - 22, w: 22, minX: 1350, maxX: 1400, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 2380, y: GROUND_Y - 22, w: 22, minX: 2320, maxX: 2460, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 2160, y: GROUND_Y - 26, w: 26, minX: 2150, maxX: 2270, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },
    { x: 2760, y: GROUND_Y - 22, w: 22, minX: 2700, maxX: 2860, speed: 1.6, bounce: true },
    { x: 2950, y: GROUND_Y - 22, w: 22, minX: 2900, maxX: 3020, speed: 1.6,
      tier: 'aggressor', shoots: true },
    { x: 3390, y: GROUND_Y - 22, w: 22, minX: 3340, maxX: 3420, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 3850, y: 370 - 22,      w: 22, minX: 3790, maxX: 3900, speed: 1.6, bounce: true },
    { x: 4180, y: 370 - 22,      w: 22, minX: 4100, maxX: 4240, speed: 1.6,
      tier: 'aggressor', shoots: true },
    // --- Quarrick ---
    // An ordinary corrupted square in the level data, flagged `quarrick`,
    // not something a cutscene spawns. That's the whole design of the beat:
    // he can be walked past, come back to, and run out of triangles in
    // front of. 44px wide like every other version of him, so he is
    // visibly bigger than the field octagons before the player is close
    // enough to see he's gold.
    //
    // Four triangles, not the field's two and not the Sculptor's six. Enough
    // to be a decision with ten in the magazine; not so many that a player
    // who has been spending freely arrives unable to afford him.
    { x: 4460, y: GROUND_Y - 44, w: 44, minX: 4400, maxX: 4620, speed: 0.55,
      kind: 'octagon', quarrick: true, restoreHits: 4 },
    { x: 4880, y: GROUND_Y - 22, w: 22, minX: 4820, maxX: 4980, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 5740, y: GROUND_Y - 22, w: 22, minX: 5680, maxX: 5820, speed: 1.6,
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
    [225, 300], [225, 230], [225, 190],
    [700, 300], [745, 300],
    [860, 396],
    [1075, 300], [1075, 220],
    [1495, 300],
    [1650, 396],
    [1845, 300],
    [2345, 300], [2345, 220],
    [2470, 396],
    [2745, 300],
    [3245, 300], [3245, 210],
    [3420, 396],
    [3645, 260], [3645, 180],
    [4095, 260],
    [4200, 356],
    [4445, 300], [4445, 220],
    [4895, 300],
    [5020, 396],
    [5345, 300], [5345, 220],
    [5795, 300],
    [6165, 300], [6165, 230],
    [6350, 396], [6410, 396],
    [6520, 316], [6760, 316]
  ],

  checkpoints: [
    { x: 1960, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 3660, y: 370 - 70,      width: 8, height: 70 },
    { x: 5380, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
