// Level 3 — What the Sanders Left. The turn the whole game is built around.
//
// IDENTITY: this level stands up. Where the quarry went down in terraces,
// this face has been sanded into COLUMNS — the spheres took everything
// between them and left pillars of block standing. So it's climbed rather
// than crossed: far fewer pits than any other level, and instead a forest of
// solid stacks that have to be jumped onto, stepped up, and dropped off.
//
// Structurally it's in three parts:
//   0-3100     the pillars, with the drill. And the first corrupted
//              square, which the drill does nothing to. That lesson has to
//              land BEFORE the weapon that answers it exists.
//   3100       Quarrick hands over the Cornerstone and immediately corrupts.
//              The clearing here is deliberately the flattest, emptiest
//              ground in the level — the scene is the obstacle.
//   3700-7300  the verb, practised. Squares to restore, triangles to find,
//              and the Sculptor, which cannot be hurt.
//
// REBUILT after play, because it was the one level that was measurably
// meaner than the rest and nobody could say why. The take-off windows were
// fine — tools/level-audit-probe.html sweeps them and level 3's were as wide
// as level 1's. The problem was on the other end of the jump. Every bed in
// the level landed the player in a 30-60px slot between the spikes they had
// just cleared and the next column, with no room to stop, turn, or set up;
// and the columns they then had to climb were 54px wide against a 22px
// player. The audit could not see either, because it only ever asked whether
// the player got PAST the obstacle. It asks both now, and this level is
// authored to the answers:
//
//   * every column is 84px wide, not 54 — landing on one is a jump, not a
//     stunt
//   * every spike bed leaves 95px+ of floor after it before the next column
//   * two columns per stretch instead of three, so there is somewhere to
//     stand between them
//
// The level is still the climbing level. It is no longer the level where a
// correct jump puts you somewhere you cannot jump again from.

const GROUND_Y = 410;
// A pillar is authored by its height so the stacks read as stacks in the
// data too, rather than as a column of y values to check by hand. The width
// defaults to the one width every column in the level now uses — a number
// that exists because the audit measures landing surfaces against the 22px
// player, and 84 is the first width that stops reading as a tightrope.
const COLUMN_W = 84;
const pillar = (x, h, opts = {}) => ({ x, y: GROUND_Y - h, width: COLUMN_W, height: h, ...opts });

export default {
  id: 'level3',
  name: 'What the Sanders Left',
  worldWidth: 7600,
  groundY: GROUND_Y,
  playerSpawn: { x: 80, y: 300 },

  // The Excavator's drill, taken off it at the end of level 2. (The level
  // picker hands it over; a continuous run arrives already holding it.)
  startsWith: 'drill',
  quarrickDamage: 3,

  // Six gaps, not seven, and wider ground between them. The vertical work is
  // the point here; pits would just be noise on top of it.
  ground: [
    { x: 0,    width: 900 },
    { x: 970,  width: 630 },    // 70
    { x: 1690, width: 710 },    // 90
    { x: 2460, width: 1240 },   // 60 — the long stretch holding the clearing
    { x: 3795, width: 805 },    // 95
    { x: 4655, width: 645 },    // 55
    { x: 5395, width: 1905 }    // 95 — then the Sculptor
  ],

  platforms: [
    // --- a stair of stumps out of the spawn, teaching the level's verb ---
    // Three treads, each one jump up, with the spike bed at the top of them
    // as the exam. Nothing here can kill you until 600.
    pillar(300, 44),
    pillar(410, 88),
    pillar(520, 100),
    { x: 700, y: 200, width: 110, height: 18 },

    // --- the first real columns ---
    // Two per stretch from here on. The 176 is the tallest thing in the
    // level's first half and it is deliberately the SECOND column, so the
    // player arrives at it having already made the shorter version.
    pillar(1020, 76, { chewed: true }),
    pillar(1270, 100),
    { x: 1400, y: 200, width: 100, height: 18, chewed: true },

    pillar(1760, 76, { chewed: true }),
    pillar(2010, 66),
    { x: 2230, y: 248, width: 110, height: 18 },

    // --- approaching the clearing: the stacks thin out and get shorter ---
    pillar(2530, 76),
    pillar(2800, 44, { chewed: true }),
    // 2884-3700 is the clearing. Nothing in it. Nothing over it.

    // --- after the handoff, the columns come back taller ---
    pillar(3930, 76, { chewed: true }),
    pillar(4180, 100, { chewed: true }),
    { x: 4400, y: 200, width: 110, height: 18 },

    pillar(4730, 76, { chewed: true }),
    pillar(4980, 76),
    { x: 5120, y: 220, width: 110, height: 18, chewed: true },

    // --- the run in to the Sculptor: three columns, descending ---
    pillar(5550, 76, { chewed: true }),
    pillar(5800, 76, { chewed: true }),
    pillar(6100, 88, { chewed: true }),
    { x: 6420, y: 314, width: 110, height: 18 }
    // 6600 onward is the Sculptor's ground, left open.
  ],

  hazards: [
    // Each bed sits just past a column, so the column top is the launch pad
    // — and each one lands the player on open floor, never against the next
    // column's wall. The 95px after every bed is the number the audit
    // enforces; it's what separates "I cleared it" from "I cleared it and
    // now I'm stuck in a slot".
    { type: 'spikes', x: 620,  width: 55 },
    { type: 'spikes', x: 1120, width: 55 },
    { type: 'spikes', x: 1860, width: 55 },
    { type: 'spikes', x: 2110, width: 55 },
    { type: 'spikes', x: 2630, width: 55 },
    // clearing: no hazards 2685-3900
    { type: 'spikes', x: 4030, width: 55 },
    { type: 'spikes', x: 4280, width: 55 },
    { type: 'spikes', x: 4830, width: 55 },
    { type: 'spikes', x: 5650, width: 55 },
    { type: 'spikes', x: 5900, width: 55 },
    // There was a twelfth bed here, 16px past the column at 6100. From the
    // column top it was fine; from the floor nobody could set it up, and
    // moved out to where the floor could, the column top couldn't reach
    // it. The run-in to the Sculptor has two beds, which is plenty.
  ],

  ammo: [
    { x: 3820, y: GROUND_Y - 34, amount: 4 },
    { x: 5160, y: 186,           amount: 4 },
    { x: 6470, y: 280,           amount: 5 }
  ],

  cutscenes: [
    // Not `once`. A player who dies after the handoff respawns holding the
    // level's starting weapon, so a scene marked as seen and never re-run
    // would leave them without the Cornerstone for the rest of the game.
    // `lacksWeapon` is what stops it replaying on every death after it: a
    // mid-level death resets the player's position, not what they're
    // carrying, so the scene that hands over the Cornerstone has no business
    // running for someone who already has one.
    { id: 'l3-handoff',  when: { reachX: 3100, lacksWeapon: 'cornerstone' } },
    { id: 'edge-transition', when: { nearWorldEdge: 100, bossDefeated: true } }
  ],

  enemies: [
    { x: 200,  y: GROUND_Y - 22, w: 22, minX: 150,  maxX: 290,  speed: 1.7 },
    { x: 740,  y: 180,           w: 20, minX: 700,  maxX: 810,  speed: 1.2 },
    { x: 1180, y: GROUND_Y - 22, w: 22, minX: 1175, maxX: 1265, speed: 1.6 },
    { x: 1430, y: 180,           w: 20, minX: 1400, maxX: 1500, speed: 1.2 },
    { x: 1960, y: GROUND_Y - 22, w: 22, minX: 1920, maxX: 2005, speed: 1.8,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 2260, y: 228,           w: 20, minX: 2230, maxX: 2340, speed: 1.2 },
    // The first corrupted square in the game, on the open ground before the
    // clearing. The sledgehammer bounces off it. That is the entire reason
    // it is standing here, 200px before anyone explains what it is.
    { x: 2920, y: GROUND_Y - 26, w: 26, minX: 2890, maxX: 3040, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    // 3100-3450: the clearing, and the handoff. Empty.
    //
    // And then, forty paces after he is taken, the first thing the player
    // can actually use what he gave them on. The scene used to END on a
    // corrupted Quarrick, so the tutorial for the verb was the emotional
    // beat itself; now that he's taken instead, the verb needs a target of
    // its own within a few seconds of the player getting the tool, or they
    // walk the rest of the level not knowing what the B button does.
    { x: 3500, y: GROUND_Y - 26, w: 26, minX: 3450, maxX: 3620, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 4420, y: 180,           w: 20, minX: 4400, maxX: 4510, speed: 1.3 },
    { x: 4540, y: GROUND_Y - 22, w: 22, minX: 4500, maxX: 4640, speed: 1.7,
      tier: 'pursuer', weapon: 'pickaxe' },
    { x: 5150, y: 200,           w: 20, minX: 5120, maxX: 5230, speed: 1.3 },
    { x: 5740, y: GROUND_Y - 26, w: 26, minX: 5710, maxX: 5795, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },
    { x: 6450, y: 294,           w: 20, minX: 6420, maxX: 6530, speed: 1.3 },
    // Kept back from the last checkpoint at 6340 — an octagon shambles after
    // you from 200px away, so anything closer is a respawn into contact.
    { x: 6010, y: GROUND_Y - 26, w: 26, minX: 5990, maxX: 6090, speed: 0.8,
      kind: 'octagon', restoreHits: 2 },

    // --- The Sculptor ---
    // Nothing in the arsenal can hurt it. Six triangles put it back.
    { x: 6900, y: GROUND_Y - 54, w: 54, minX: 6650, maxX: 7180, speed: 0.75,
      kind: 'octagon', boss: true, bossName: 'THE SCULPTOR', restoreHits: 6 }
  ],

  coins: [
    // the stair
    [330, 352], [440, 308], [550, 296],
    [740, 186], [780, 186],
    [820, 396],
    // first columns
    [1050, 320],
    [1200, 396], [1240, 396],
    [1300, 296],
    [1430, 186], [1470, 186],
    [1550, 396],
    // second stretch
    [1790, 320],
    [1940, 396], [1980, 396],
    [2040, 330],
    [2260, 234], [2300, 234],
    // in to the clearing
    [2560, 320],
    [2830, 352],
    [2980, 396],
    [3200, 396], [3300, 396], [3400, 396],
    // after the handoff
    [3960, 320],
    [4120, 396], [4160, 396],
    [4210, 296],
    [4430, 186], [4470, 186],
    [4760, 320],
    [4920, 396], [4960, 396],
    [5010, 320],
    [5150, 206], [5190, 206],
    // the run in
    [5580, 320],
    [5760, 396],
    [5830, 320],
    [6000, 396], [6040, 396],
    [6130, 308],
    [6450, 300], [6490, 300],
    [6620, 396], [6680, 396]
  ],

  checkpoints: [
    // On the flat between the two columns of each stretch, never against a
    // wall and never inside a patrol.
    { x: 1450, y: GROUND_Y - 70, width: 8, height: 70 },
    // In the clearing, past the handoff. `lacksWeapon` on the scene is what
    // stops it re-running for someone who already has the Cornerstone, so
    // the checkpoint no longer has to sit in front of the trigger to
    // protect it — and the clearing is the only flat, empty, enemy-free
    // ground in the level, which is exactly what a checkpoint wants.
    { x: 3250, y: GROUND_Y - 70, width: 8, height: 70 },
    { x: 5150, y: GROUND_Y - 70, width: 8, height: 70 },
    // Before the Sculptor, outside the 200px an octagon will shamble after
    // you from — respawning next to the boss you just failed is the
    // cheapest death in the game.
    { x: 6340, y: GROUND_Y - 70, width: 8, height: 70 }
  ]
};
