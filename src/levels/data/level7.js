// Level 7 — The Middle of the World. The hollow centre, and the end.
//
// IDENTITY: this level only goes down. Not a seventh face — GAME_DESIGN's
// arc is six outer faces, then a descent, then "the planet's hollow
// centre... a large cavity, and at the middle of it is what they've been
// digging toward."
//
// So the walk in is four ledges, each a long drop below the last, cut
// through the inside of the crust. There is no climb anywhere in it and
// nothing to go back up to. Then the ledges stop and the cavity opens out:
// one enormous flat floor with the core hanging over the middle of it.
//
// There's no cube edge here, and the level says so (`noWorldEdge`). Every
// other level ends at the bright corner seam where two faces meet; a corner
// of the planet glowing at the back of its own hollow middle would be
// nonsense.
//
// --- the arena is the fight ---
// Triangles fly level, so the core can only be hit from a platform at ITS
// height: the two at y170 either side of it, and the pair at y230. The low
// tier at y300 is below its body and cannot reach it — and that is where
// the ammo is. Crossing for more triangles means giving up your angle, and
// the floor you cross is the thing the core is taking away.

const GROUND_Y = 410;

export default {
  id: 'level7',
  name: 'The Middle of the World',
  worldWidth: 7600,
  groundY: GROUND_Y,
  playerSpawn: { x: 80, y: 120 },
  noWorldEdge: true,

  startsWith: 'cornerstone',
  // Twelve faces to put back and a room actively trying to stop you. More
  // triangles than any other level carries, and it still isn't generous.
  startsWithAmmo: 14,
  quarrickDamage: 1,   // put back on the fifth face: chipped, but square

  // Four ledges down through the crust, then the cavity floor.
  ground: [
    { x: 0,    width: 1100, y: 250 },
    { x: 1190, width: 1010, y: 300 },   // 90
    { x: 2350, width: 1050, y: 350 },   // 150 — run only
    { x: 3490, width: 1110 },           // 90 — the floor
    { x: 4760, width: 2540 }            // 160 — the cavity
  ],

  platforms: [
    // the walk in — barely square, and nothing to climb back to
    { x: 260,  y: 170, width: 110, height: 18, chewed: true },
    { x: 620,  y: 130, width: 110, height: 18, chewed: true },
    { x: 900,  y: 180, width: 100, height: 18, chewed: true },
    { x: 1250, y: 220, width: 100, height: 18, chewed: true },
    { x: 1700, y: 180, width: 110, height: 18, chewed: true },
    { x: 2020, y: 230, width: 100, height: 18, chewed: true },
    { x: 2410, y: 270, width: 100, height: 18, chewed: true },
    { x: 2850, y: 230, width: 110, height: 18, chewed: true },
    { x: 3180, y: 280, width: 100, height: 18, chewed: true },
    { x: 3560, y: 300, width: 100, height: 18, chewed: true },
    { x: 3980, y: 250, width: 110, height: 18, chewed: true },
    { x: 4340, y: 300, width: 100, height: 18, chewed: true },

    // --- the cavity ---
    // Three tiers each side of the core. The low pair cannot reach it.
    { x: 5000, y: 300, width: 130, height: 18 },
    { x: 5320, y: 230, width: 110, height: 18 },
    { x: 5600, y: 170, width: 110, height: 18 },
    { x: 6580, y: 170, width: 110, height: 18 },
    { x: 6860, y: 230, width: 110, height: 18 },
    { x: 7080, y: 300, width: 130, height: 18 }
  ],

  hazards: [
    { type: 'spikes', x: 420,  width: 55 },
    { type: 'spikes', x: 800,  width: 60 },
    { type: 'spikes', x: 1450, width: 55 },
    { type: 'spikes', x: 1880, width: 60 },
    { type: 'spikes', x: 2600, width: 55 },
    { type: 'spikes', x: 3000, width: 60 },
    { type: 'spikes', x: 3750, width: 55 },
    { type: 'spikes', x: 4180, width: 60 }
    // The cavity floor starts clear. It does not stay that way.
  ],

  ammo: [
    { x: 1300, y: 200,  amount: 4 },
    { x: 2900, y: 210,  amount: 4 },
    { x: 4030, y: 230,  amount: 5 },
    // in the cavity, on the two low tiers that can't hit the core
    { x: 5060, y: 280,  amount: 5 },
    { x: 7140, y: 280,  amount: 5 }
  ],

  cutscenes: [
    { id: 'l7-arrival', when: { levelStart: true }, once: true },
    // Fires when the core is no longer standing in anyone's way — which,
    // for the only boss in the game that cannot be killed, means it has
    // been put back together.
    { id: 'l7-ending', when: { bossDefeated: true } }
    // No edge transition. There is nowhere left to go.
  ],

  // The descent is the last thing the game asks before the core, and it is
  // the one stretch that should have everything in it. It didn't: measured
  // by tools/enemy-ladder-probe.html the finale was carrying nine advanced
  // enemies against the sixth face's seventeen, so the level immediately
  // before the ending was the emptiest since level 3 — the game got easier
  // exactly where it should have peaked.
  //
  // Every rung of the ladder is on this face now: pursuers with both
  // weapons, shooters, bouncers, corrupted squares. Nothing new is
  // introduced, which is deliberate — the last level is an exam, not a
  // lesson.
  //
  // AUTHORING RULE, and the thing that took two passes to get right: the
  // first ~190px of every ground segment is left empty. That is where the
  // checkpoints go. Filling the level end to end put seventeen enemies in
  // it and left nowhere at all to respawn — tools/checkpoint-siting-probe
  // reported two legal spots in seven thousand pixels, and two of the
  // level's three checkpoints were standing inside a shooter's range.
  // A segment start is the right home for a flag anyway: you come back to
  // the beginning of the stretch you died in, not the middle of it.
  //
  // The FLOATING platforms are exempt from that rule and carry a lot of the
  // load here, because an enemy 70px above the floor can't reach it
  // (AGGRO_HEIGHT in entities/enemy.js) and so doesn't cost a checkpoint
  // site. On the last face, a ledge you have to land on has something on it
  // that objects.
  enemies: [
    // --- the first ledge (no checkpoint: the level starts here) ---
    { x: 340,  y: 250 - 22, w: 22, minX: 280,  maxX: 410,  speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 560,  y: 250 - 22, w: 22, minX: 500,  maxX: 780,  speed: 1.6, bounce: true },
    { x: 700,  y: 110,      w: 20, minX: 620,  maxX: 730,  speed: 1.3 },
    { x: 980,  y: 250 - 22, w: 22, minX: 900,  maxX: 1080, speed: 1.6,
      tier: 'aggressor', shoots: true },

    // --- the second: checkpoint at 1230, so nothing on the floor before 1410
    { x: 1620, y: 300 - 22, w: 22, minX: 1560, maxX: 1760, speed: 1.7,
      tier: 'pursuer', weapon: 'chainsaw' },
    // Was a plain patroller on a ledge.
    { x: 1760, y: 160,      w: 20, minX: 1700, maxX: 1810, speed: 1.4,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 2060, y: 208,      w: 22, minX: 2020, maxX: 2120, speed: 1.4,
      tier: 'aggressor', shoots: true },
    { x: 2100, y: 300 - 26, w: 26, minX: 2040, maxX: 2190, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },

    // --- the third: checkpoint at 2390 ---
    // On the ledge at 2850, not the one at 2410. A respawn arrives 90px
    // above the flag and FALLS, so it passes through the altitude of any
    // platform beside it on the way down — and the checkpoint at 2390 sits
    // right next to 2410. tools/respawn-state-probe.html caught it by
    // standing still there and dying; the siting tool couldn't, because it
    // was comparing enemy heights against the floor rather than against the
    // column the player drops through.
    { x: 2890, y: 210,      w: 20, minX: 2850, maxX: 2960, speed: 1.5, bounce: true },
    { x: 2700, y: 350 - 22, w: 22, minX: 2680, maxX: 2830, speed: 1.6, bounce: true },
    { x: 2900, y: 350 - 26, w: 26, minX: 2870, maxX: 2985, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },
    { x: 3220, y: 260,      w: 20, minX: 3180, maxX: 3280, speed: 1.4,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 3250, y: 350 - 22, w: 22, minX: 3120, maxX: 3380, speed: 1.7,
      tier: 'aggressor', shoots: true },

    // --- the floor of the crust: checkpoint at 3530 ---
    { x: 3880, y: GROUND_Y - 22, w: 22, minX: 3840, maxX: 4000, speed: 1.7,
      tier: 'pursuer', weapon: 'chainsaw' },
    { x: 4100, y: GROUND_Y - 22, w: 22, minX: 4030, maxX: 4170, speed: 1.6, bounce: true },
    { x: 4380, y: 280,      w: 20, minX: 4340, maxX: 4440, speed: 1.4,
      tier: 'aggressor', shoots: true },
    { x: 4400, y: GROUND_Y - 26, w: 26, minX: 4340, maxX: 4520, speed: 0.85,
      kind: 'octagon', restoreHits: 2 },

    // --- the mouth of the cavity: checkpoint at 4800 ---
    // The last two before the core. Past 5400 the arena is the core's, and
    // nothing else is put in it: its three phases are already attacking the
    // room the player is standing on.
    { x: 5050, y: GROUND_Y - 22, w: 22, minX: 4990, maxX: 5140, speed: 1.8,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 5300, y: GROUND_Y - 22, w: 22, minX: 5240, maxX: 5400, speed: 1.6,
      tier: 'aggressor', shoots: true },

    // --- The Core ---
    // Twelve faces, twelve triangles, and no way to hurt it in between. No
    // hp field at all: restoreHits is the only number that matters.
    { x: 6020, y: 140, w: 130, minX: 6020, maxX: 6150, speed: 0,
      kind: 'core', boss: true, mode: 'fight', bossKind: 'core',
      bossName: 'THE CORE', restoreHits: 12, stompProof: true }
  ],

  coins: [
    [300, 156], [345, 156],
    [660, 116], [705, 116],
    [940, 166],
    [1060, 236],
    [1285, 206], [1325, 206],
    [1740, 166],
    [2060, 216],
    [2160, 286],
    [2450, 256], [2490, 256],
    [2890, 216],
    [3220, 266],
    [3350, 336],
    [3600, 286], [3640, 286],
    [4020, 236],
    [4380, 286],
    [4700, 396],
    [5050, 286],
    [5370, 216], [5415, 216],
    [5650, 156],
    [5850, 396], [5910, 396],
    [6300, 396], [6360, 396],
    [6630, 156],
    [6910, 216], [6955, 216],
    [7130, 286]
  ],

  // One per stretch, each just inside the start of it — see the authoring
  // rule on the enemy list above for why they can only be there.
  checkpoints: [
    // Each ledge down is only 50px below the one before it, which is
    // inside the 70px an enemy will engage across — so the shooters on
    // the ledge ABOVE reach the first stretch of the one below, and
    // these sit past that rather than at the very start.
    { x: 1340, y: 300 - 70, width: 8, height: 70 },
    { x: 2390, y: 350 - 70, width: 8, height: 70 },
    { x: 3630, y: GROUND_Y - 70, width: 8, height: 70 },
    // The last checkpoint in the game, right where the cavity opens out.
    { x: 4800, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
