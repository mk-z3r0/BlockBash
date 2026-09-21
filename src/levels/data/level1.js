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
  // Bumped from 7200 (2026-09-20, edge-of-world transition): ground itself
  // still ends at 7200 (unchanged — see the last `ground` entry below), but
  // the camera's own clamp is `worldWidth - VIEW_WIDTH`, so worldWidth needs
  // real headroom past the actual edge or the camera can never pan far
  // enough to reveal the edge-of-world wall (levelRenderer.js's
  // drawWorldEdge) before the player is already standing on top of it. This
  // 300px of "extra" width is never walkable — nothing solid exists out
  // there — it exists purely so the camera can see the wall coming.
  worldWidth: 7500,
  groundY: GROUND_Y,
  playerSpawn: { x: 100, y: 300 },

  // Where the opening cutscene leaves off — the block house the player just
  // walked out of. Purely decorative (no collision); optional per level, so
  // only level 1 needs one. Sits at x:0-500's ground segment, left of the
  // first floating platform at x:150, so it never overlaps real geometry.
  house: { x: 55 },

  // Gaps: 500-555 (55), 1350-1390 (40), 1500-1560 (60), 2150-2175 (25),
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
  //
  // The 2150 gap needed the same treatment for a different reason
  // (2026-09-19): it was 40px, and three successive 20% speed/gravity cuts
  // eroded its landing margin down to exactly +0px at run speed — a real
  // 15px-wide window to jump *within*, but zero slack in the landing itself,
  // so any tiny extra deceleration would come up short. Narrowed to 25px to
  // restore real margin. Worth re-checking any gap this close to run's max
  // carry the next time a speed constant changes — carry *distance* staying
  // fixed doesn't mean every gap's specific margin does.
  ground: [
    { x: 0,    width: 500 },
    { x: 555,  width: 795 },
    { x: 1390, width: 110 },   // stepping-stone island
    { x: 1560, width: 590 },
    { x: 2175, width: 1325 },
    { x: 3660, width: 1040 },     // shrunk from 3570 (2026-09-20): widens the 3500 gap to 160px, restoring its "requires run" role — see the physics-lab retune note below
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

    // Staircase (2026-09-20) — four solid blocks flush with the ground,
    // each a tile (22px) taller than the last, filling what used to be a
    // long dead-flat run between the last first-half platform (ends 2970)
    // and the checkpoint at 3300. Unlike every other platform in this
    // level these sit ON the ground rather than floating, so they're
    // climbed rather than jumped to — a different shape of obstacle, and
    // a gentle one: a single tile of rise per step is nothing against a
    // jump that peaks at 117px. Coins sit on each tread as the reward for
    // going up instead of walking past.
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
    // The tall wall (2026-09-20) — 3 tiles (66px) of solid block in the
    // long empty run-up to the boss. The one obstacle in the level that
    // has to be jumped *onto* in a single committed hop rather than
    // stepped up: a 16-frame hold clears 82px, so 66px leaves real margin
    // while still being the tallest thing here by some way. Coin on top.
    { x: 6300, y: 344, width: 66, height: 66 }
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
    { type: 'spikes', x: 4320, width: 160 },
    // the long bed — crossed via stepping stones, not jumped. It starts well
    // clear of the 4700 pit: a full-power jump off that lip carries ~162px,
    // and landing in spikes because you jumped hard is a rotten way to die.
    { type: 'spikes', x: 4920, width: 340 },
    { type: 'spikes', x: 5700, width: 35 },
    { type: 'spikes', x: 5850, width: 50 },
    { type: 'spikes', x: 5980, width: 50 }    // last hazard: 6030+ stays clear for the boss cutscene
  ],

  // Rescaled 2026-09-20 for the SMB3-accurate physics rewrite + hand-tuned
  // accel/walkMax/runMax (physics-lab branch): the old speeds (0.64-1.088,
  // tuned against the pre-rewrite player model's walkMax 1.28/runMax 2.304)
  // were flagged as a known gap in that rewrite's own report — even the
  // boss's chargeSpeed (1.536) had fallen slower than the new player's
  // plain walk (2.29), so nothing here could threaten a walking player
  // anymore. Every value here (and chargeSpeed below) is scaled by the same
  // ~1.79x the walkMax cap grew (1.28 -> 2.29), preserving each enemy's
  // relative speed to the player exactly as before. Unlike the player's
  // jump, there's no arc to preserve for enemies — they don't jump (see the
  // `canHop` gate in entities/enemy.js; off until a later level turns it
  // on) — so this is a flat rescale, nothing more.
  enemies: [
    { x: 250,  y: GROUND_Y - 22, w: 22, minX: 220,  maxX: 460,  speed: 1.6 },
    { x: 700,  y: GROUND_Y - 22, w: 22, minX: 650,  maxX: 950,  speed: 1.95 },
    { x: 660,  y: 300 - 20,      w: 20, minX: 655,  maxX: 750,  speed: 1.26 },
    { x: 1600, y: GROUND_Y - 22, w: 22, minX: 1580, maxX: 1800, speed: 1.83 },
    { x: 1760, y: 200 - 20,      w: 20, minX: 1755, maxX: 1830, speed: 1.15 },
    { x: 2360, y: 260 - 20,      w: 20, minX: 2355, maxX: 2460, speed: 1.26 },
    // Two additions (2026-09-20) filling the thinnest stretch of the
    // spheres half: the wide 2040-2230 platform had coins but nothing
    // guarding them, and the run into the new staircase was empty ground.
    { x: 2100, y: 300 - 20,      w: 20, minX: 2045, maxX: 2225, speed: 1.26 },
    { x: 2900, y: GROUND_Y - 22, w: 22, minX: 2760, maxX: 2980, speed: 1.6 },
    { x: 3400, y: GROUND_Y - 22, w: 22, minX: 3300, maxX: 3480, speed: 1.72 },
    { x: 3750, y: 300 - 20,      w: 20, minX: 3700, maxX: 3810, speed: 1.15 },
    { x: 4550, y: 290 - 20,      w: 20, minX: 4500, maxX: 4610, speed: 1.26 },
    { x: 6150, y: 300 - 20,      w: 20, minX: 6100, maxX: 6220, speed: 1.37 },
    // 50% larger than the standard 22px sphere (33px) — the boss should
    // read as visibly bigger than anything else on screen before it even
    // wakes up
    // maxX pulled back from 7100 to 7010 (2026-09-20): the boss digs a pit
    // immediately to its right during the cutscene (carveMiningGap in
    // scenes/playingScene.js), and patrolling right up to the goal flag at
    // 7100 left no room between its right edge and the flag to put one —
    // the dig silently no-op'd whenever it woke on the right half of its
    // old patrol.
    { x: 6980, y: GROUND_Y - 33, w: 33, minX: 6900, maxX: 7010, speed: 1.37, boss: true }
  ],

  // Two tiers, by how they're actually reached: no-jump-needed (walking on
  // ground or standing on a platform you already had to climb to reach) vs
  // jump-required (arcing over a pit or a spike bed while airborne). Ground
  // coins sit 14px above groundY (396); platform coins now use that same
  // 14px-above-the-surface offset (2026-09-19 — they used to float ~35-40px
  // above their platform, which meant an *extra* hop was needed even after
  // you'd already climbed up there. Getting up to the platform is the
  // intended skill; a second micro-jump once you're standing on it wasn't
  // adding anything, just friction). Hazard-arc coins are unchanged — those
  // are deliberately jump-tier, telegraphing the jump that clears the hazard
  // underneath them, not a platform you stand on.
  coins: [
    // first half — platform tier: 14px above the platform surface, same
    // reachable-while-standing offset as the ground tier below
    [180, 306], [230, 306],       // platform at x150-270,  y320
    [680, 286], [730, 286],       // platform at x650-770,  y300
    [920, 216],                   // platform at x900-1000, y230
    [1170, 306], [1220, 306],     // platform at x1150-1250, y320
    [1770, 186],                  // platform at x1750-1850, y200
    [2075, 286], [2125, 286],     // platform at x2040-2230, y300
    [2370, 246],                  // platform at x2350-2480, y260
    [2620, 186],                  // platform at x2600-2700, y200
    [2870, 286], [2920, 286],     // platform at x2850-2970, y300
    // one per staircase tread (2026-09-20) — same 14px-above-the-surface
    // offset, so each is collected just by walking up, never an extra hop
    [3019, 374], [3077, 352], [3135, 330], [3193, 308],
    // first half — jump tier: arcs over the 1500-1560 gap, not a platform
    [1530, 240], [1580, 240],
    // first half — ground tier: open ground, no platform or hazard nearby
    [800, 396], [1000, 396], [1900, 396], [2720, 396], [2900, 396],

    // second half — jump tier: arcs over each hazard telegraph the jump.
    // The two 3-coin trios are built from the player's real jump trajectory
    // (tools/jump-trajectory-probe.html — records actual (x,y) each frame of
    // a real jump, rather than authoring a curve by eye) — re-run any time a
    // speed constant changes, since carry *distance* being preserved doesn't
    // mean the curve's shape is. Re-sampled 2026-09-20 for the SMB3-accurate
    // physics rewrite + hand-tuned accel/walkMax/runMax.
    //
    // Design rule (2026-09-20): a 3-coin group is built as a true symmetric
    // parabola, not a raw trace of all 3 points off the (asymmetric —
    // gravityFall is heavier than gravityRise, confirmed to matter in
    // practice, see below) real curve. The center coin sits at the real
    // trajectory's apex; the two outer coins sit at equal x-offsets from it,
    // sharing one y, so the trio reads as one clean, mirrored arc rather
    // than a lopsided one. The 3980 trio matches a WALK-speed jump timed
    // right at the hazard's leading edge (that hazard is walk-clearable);
    // the 4320 trio matches a RUN-speed jump the same way (that hazard —
    // widened to 160px this pass — requires run).
    //
    // The run trio's shared y (310) was swept, not guessed: no single y
    // collects all 3 across every timing in tools/coin-trio-check.html's
    // full -15..+15 lead sweep, because the rise and fall halves of the
    // real arc sit at different heights for the same x-offset from the
    // apex — true left/right symmetry and 100%-of-every-timing
    // collectibility aren't both achievable here. 310 collects all 3 from
    // the canonical "jump right at the edge" timing (lead 0) through early
    // jumps (lead +5..+15); only late jumps (lead -5..-15, i.e. already
    // past the edge before jumping) miss the near/left coin. That's the
    // right side to give up: jumping late over a hazard is the riskier
    // technique anyway, not the one worth optimizing for.
    [4006, 340], [4038, 304], [4070, 340],
    [4180, 365], [4230, 365],
    [4372, 310], [4422, 299], [4472, 310],
    [5710, 340], [5745, 340], [5865, 340], [5995, 340],
    // second half — platform tier: same 14px-above-surface offset
    [3740, 286], [3780, 286],     // "coin perch" platform at x3700-3810, y300
    [4540, 276], [4580, 276],     // "coin perch" platform at x4500-4610, y290
    [5010, 326],                  // stepping stone at x4960-5060, y340
    [5170, 326],                  // stepping stone at x5120-5220, y340
    [6140, 286], [6180, 286],     // platform at x6100-6220, y300
    [6333, 330],                  // on top of the tall wall at x6300-6366, y344
    // second half — ground tier
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
  // where a rescue NPC deals with it, stomping it and leaving its pickaxe
  // behind (the player's first and only weapon this level — see
  // weapons/pickaxe.js and entities/weaponPickup.js; the player starts
  // completely unarmed). Later levels get real fights.
  // Everything past 6030 is kept clear so the NPC's run-in reads cleanly.
  // wakeX sits ~420px short of the boss on purpose: the boss needs room to
  // charge before the rescue NPC intercepts it. Trigger it too close and the
  // boss immediately stops against the player, and the whole leap happens
  // with nothing moving. The cutscene also won't fire until the boss is
  // fully inside the camera's view (see updateCutscene in playingScene.js) —
  // wakeX alone isn't enough since the camera eases toward the player rather
  // than snapping, so it can still lag behind at the moment wakeX is crossed.
  boss: { mode: 'cutscene', wakeX: 6560, chargeSpeed: 2.75 }
};
