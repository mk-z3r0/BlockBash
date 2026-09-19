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
//
// Walk vs run (added once the run button existed): walk's max jump carry is
// ~93.5px, run's is ~168px (same jump physics, just the horizontal speed
// cap differs — see physics.js). Measured every gap and spike bed at both
// speeds with tools/walk-run-probe.html rather than guessing from that
// number alone. Result: level 1's gaps already split naturally into
// walk-viable and run-required just from their widths (70/90px gaps
// effectively need run; 40/55/60px gaps clear on foot, though walk leaves
// so little margin that some — the first gap especially — need the jump
// timed right at the edge, not early; see that gap's own comment for why
// that's a feature, not a bug). The one deliberate addition is the 4320
// spike bed, widened specifically to require run — see its own comment.

const GROUND_Y = 410;

export default {
  id: 'level1',
  name: 'The First Stand',
  worldWidth: 7200,
  groundY: GROUND_Y,
  playerSpawn: { x: 100, y: 300 },

  // Where the opening cutscene leaves off — the block house the player just
  // walked out of. Purely decorative (no collision); optional per level, so
  // only level 1 needs one. Sits at x:0-500's ground segment, left of the
  // first floating platform at x:150, so it never overlaps real geometry.
  house: { x: 55 },

  // Gaps: 500-555 (55), 1350-1390 (40), 1500-1560 (60), 2150-2190 (40),
  // 3500-3570 (70), 4700-4760 (60), 5500-5590 (90). Run's jump carries
  // ~168px, walk's only ~93.5px (same jump physics, lower speed cap — see
  // physics.js) — measured every one of these at both speeds with
  // tools/walk-run-probe.html rather than assuming from width alone.
  //
  // The first gap (500-555) is narrower than the others on purpose: it's
  // the very first obstacle after leaving the house, and gating the run
  // mechanic behind the first thing a new player meets is bad onboarding,
  // even in a level that's meant to mix walk- and run-only jumps. It was
  // 80px originally — walk-viable only on a knife's edge (confirmed two
  // ways: 1/3 canned timings landed it by a single pixel, and an adaptive
  // autoplay bot couldn't clear it consistently either). Narrowed so it's
  // comfortably walkable; the run requirement shows up properly at
  // 3500-3570 and 5500-5590 once the player's had room to get their bearings.
  ground: [
    { x: 0,    width: 500 },
    { x: 555,  width: 795 },
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
    // Widened from 60 to 90px specifically to make this one require run —
    // walk's max jump carry is ~93.5px (vs run's ~168px), so 90px leaves
    // walk no real margin (measured: 0/3 timings clear it on foot, same as
    // the 90px gap at 5500), while run still clears it with room to spare.
    // Deliberately the first hard gate: level 1's other three jumpable
    // spike beds (48-60px) all clear on foot, so this is the one spot that
    // actually teaches "sometimes you need to hold run," not just permits it.
    { type: 'spikes', x: 4320, width: 90 },
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

  // Two tiers, deliberately: coins near groundY (~396, genuinely collectible
  // while walking — no jump needed at all) vs coins tied to a platform or a
  // hazard-clearing jump (the existing higher ones, unchanged — reaching
  // those already requires the skill it should). Level 1 keeps that split
  // simple; later levels should widen the gap between the two tiers rather
  // than add a third.
  coins: [
    // first half — platform/jump tier (unchanged)
    [180, 280], [230, 280], [680, 260], [730, 260],
    [920, 190], [1170, 280], [1220, 280], [1530, 240],
    [1580, 240], [1770, 160], [2075, 260], [2125, 260],
    [2370, 220], [2620, 160], [2870, 260], [2920, 260],
    // first half — walkable tier: open ground, no platform or hazard nearby
    [800, 396], [1000, 396], [1900, 396], [2720, 396], [2900, 396],

    // second half — arcs over each hazard telegraph the jump (jump tier,
    // unchanged in height; the 4320 trio widened in x to match that spike
    // bed's new 90px width)
    [3740, 265], [3780, 265],
    [3960, 350], [4004, 315], [4048, 350],
    [4180, 365], [4230, 365],
    [4335, 345], [4365, 300], [4395, 345],
    [4540, 255], [4580, 255],
    [5010, 305], [5170, 305],
    [5710, 340], [5745, 340], [5865, 340], [5995, 340],
    [6140, 265], [6180, 265],
    // second half — walkable tier
    [5320, 396], [5620, 396], [5660, 396],
    [6400, 396], [6450, 396], [6500, 396]
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
