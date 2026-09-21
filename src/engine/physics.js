// World/physics tuning constants and the one shared collision test.
//
// All tuning values live on one exported mutable object, P, instead of
// individual `const` exports (2026-09-20) — tools/physics-lab.html needs to
// change these at runtime to A/B tune, which plain `const` bindings can't
// do. Every importer reads through P.<NAME> so a lab edit is visible
// everywhere immediately, with no re-import or reload.
//
// --- Historical record: the pre-physics-lab tuning journey (2026-09-19) ---
// Before this rewrite, movement used a much simpler ad-hoc model (flat
// ACCEL/FRICTION, one GRAVITY_UP/GRAVITY_DOWN split, WALK/RUN_MAX_SPEED).
// It went through three rounds of playtesting cuts with a 2nd grader, each
// cutting speed AND gravity by the same 20% together so jump-carry distance
// (walk ~93.5px, run ~168px) stayed put while airtime/height grew floatier
// each time (final values: gravity 0.2688/0.4352, accel 0.35, walk/run
// speed 1.28/2.304 — cut cumulatively 36% below the 0.42/0.68 and 2.0/3.6
// originals). That model is fully replaced below by an SMB3-accurate one
// (see the physics-lab task doc for why) — kept here only so the reasoning
// behind those old numbers isn't lost; none of them are live anymore.

// SMB3's internal units are 1/16px subpixels at a 16px native tile; this
// project runs at 22px tiles, so every SMB3-native value below is
// multiplied by SCALE to convert. Values were checked against the real
// disassembly (captainsouthbird/smb3, and a from-that-source JS port at
// velipso/smb3-physics) rather than trusting guesses — several guesses in
// the original physics-lab task spec turned out to disagree with the ROM;
// those are called out below at the value that changed.
export const SCALE = 1.375; // this project's tileSize (22) / SMB3's native tileSize (16)

export const P = {
  // --- World ---
  SCALE,
  tileSize: 22,
  fixedTimestepHz: 60, // read live each frame by main.js's accumulator — see engine/main loop

  // --- Horizontal ---
  // ONE acceleration value for walk/run/dash — only the speed CAP differs
  // by tier, not the ramp-up rate. ROM-accurate native value is 14/256 px/
  // frame^2 (0.0752 scaled), confirmed via velipso/smb3-physics (ported
  // directly from the real disassembly) — the task spec's guess of 0.0625
  // (16/256) was close but not the ROM value. Hand-tuned upward twice since
  // via tools/physics-lab.html playtesting (2026-09-20: 0.0752 -> 0.15,
  // still felt slow to get moving -> 0.203) — now ~2.7x the ROM rate,
  // still under the old ad-hoc model's 0.35.
  accel: 0.203,
  // Ground-only: friction to a stop with no input held, AND easing back
  // down to the cap on landing above it. In the real game this shares the
  // ROM-accurate accel constant (true for "big" Mario) — kept at the ROM
  // value (not bumped alongside accel above) since a snappier stop wasn't
  // part of the "feels slow to get moving" feedback that motivated the bump.
  groundFriction: 14 / 256 * SCALE, // 0.0751953125
  // Separate, steeper deceleration when the held direction opposes current
  // velocity (skidding to a stop or reversal). ROM-accurate native value is
  // 32/256 (0.1719 scaled); hand-tuned alongside accel, now matching it
  // exactly (0.19 -> 0.203, 2026-09-20 playtesting) — not a rule, just
  // where two rounds of "feels a bit slow" landed both at once.
  skidDecel: 0.203,
  // Speed caps. ROM-accurate values (native -> scaled) confirmed via
  // datacrystal's SMB3 RAM notes (walk/run/run+P) and the disassembly's
  // Player_XVel comment ("max value is $38" = 56 subpixels = 3.5 native,
  // matching run+P's original ROM value): walkMax 1.5->2.0625, runMax
  // 2.5->3.4375. Both hand-tuned up across two playtesting rounds
  // (2026-09-20: runMax 3.4375->3.68->4; walkMax 2.0625->2.29->3.21, then
  // corrected down to 2.8 — 3.21 was an overshoot from the second round,
  // not an intentional "walk and run should feel close" call).
  // pSpeedMax was untouched through the first round but came down slightly
  // in the second (4.8125 -> 4.5) — with runMax up this much, the
  // ROM-accurate P-speed cap left less headroom above runMax than it used
  // to; narrowed the gap back down on purpose rather than leaving P-speed a
  // smaller relative jump than it read as originally.
  walkMax: 2.8,
  runMax: 4,
  pSpeedMax: 4.5,
  // Slide cap only matters on sloped terrain (Player_Slide in the real
  // game), which this flat-ground game doesn't have yet — exposed for lab
  // completeness/future slope support, not currently reachable in play.
  slideMax: 3.9375 * SCALE,  // 5.4140625 — native 63/16, per datacrystal
  // Below this, treat horizontal speed as "not moving" for animation/dust
  // purposes — not an SMB3 concept, this project's own tuned threshold
  // (was a hardcoded 0.6 scattered across player.js; centralized here).
  // Nudged 0.6 -> 0.7 alongside the second accel/speed-cap round so the
  // "moving" animation threshold keeps the same rough fraction of walkMax.
  minWalkSpeed: 0.7,
  // AIR: accel/skidDecel apply at full strength in the air in the real
  // game (multiplier 1.0) — NOT halved, despite the original physics-lab
  // task spec's belief that SMB3 halves air control. velipso/smb3-physics
  // (from the real disassembly) shows no `!playerInAir` guard at all on
  // its accel/skid branches; only ground-only friction and the
  // above-cap-easing are gated to the ground. Exposed as a live multiplier
  // anyway so this can be A/B'd against the task author's original belief.
  airControlMultiplier: 1.0,
  // Passive deceleration with no input held, in the air. Real SMB3 has no
  // such thing — ground friction simply doesn't apply airborne at all
  // (momentum preserved until landing or active steering), matching what
  // this project already independently arrived at pre-physics-lab (see the
  // historical AIR_FRICTION note this replaces). Default 0 = that real
  // behavior; exposed for A/B comparison, not because the ROM has a
  // nonzero value for it.
  airFriction: 0,
  // Non-SMB3: locks horizontal velocity entirely at its takeoff value for
  // the whole jump (no air steering at all except via reversal), matching
  // the task author's ORIGINAL (pre-disassembly-check) idea of air
  // control, before airControlMultiplier/airFriction (above) replaced it
  // as the real-game behavior. Off by default; toggle on to A/B against it.
  lockAirMomentum: false,

  // P-meter: fills while |vx| >= runMax, drains otherwise. Native timings
  // from datacrystal's SMB3 notes ($515 countdown: reset to 7 while
  // running, to 23 while not) — these are frame counts, not distances, so
  // SCALE doesn't apply. pMeterSegments was the real game's step count (7,
  // matching its 7-arrow status-bar meter) until the second hand-tuning
  // round bumped it to 10 (2026-09-20) — with accel/runMax both higher now,
  // reaching runMax itself takes fewer frames, so 7 segments filled too
  // fast for P-speed to feel like a distinct, earned state; 10 stretches it
  // back out. Full from empty while running continuously still takes
  // pMeterSegments * pMeterFillFrames frames, just more of them now.
  pMeterFillFrames: 7,
  pMeterDrainFrames: 23,
  pMeterSegments: 10,

  // --- Vertical ---
  // Three gravity states, re-evaluated every frame (see the switch logic
  // in entities/player.js) — confirmed via velipso/smb3-physics:
  //   if (vy < -riseGravityThreshold && jump held) gravity = gravityRise
  //   else gravity = gravityFall
  // Native 1/16 and 5/16 (exactly a 5:1 ratio — gravity is nearly off
  // during the fast part of the rise) and threshold 2.0, all confirmed
  // exact matches to the task spec's own guesses (no correction needed
  // for these three, unlike accel/baseJumpVelocity below).
  gravityRise: 1 / 16 * SCALE,   // 0.0859375
  gravityFall: 5 / 16 * SCALE,   // 0.4296875
  riseGravityThreshold: 2.0 * SCALE, // 2.75
  // Terminal velocity: the disassembly's OBJECT_MAXFALL constant is $40
  // (4.0 native), applied as a clamp BEFORE that frame's gravity is added
  // — so the actual max Y move in any given frame is 4.0 + gravityFall =
  // 4.3125 native, not 4.0 itself (confirmed: OBJECT_MAXFALL = $40 is a
  // real label in captainsouthbird/smb3, not a guess). This project clamps
  // AFTER adding gravity each frame instead (see updatePlayer) — clamping
  // 4.3125 after-add reproduces the identical observed per-frame fall
  // speed as clamping 4.0 before-add, just without replicating the ROM's
  // specific clamp-then-add instruction order.
  terminalVelocity: 4.3125 * SCALE, // 5.9296875
  // Jump velocity is sampled ONCE at takeoff from horizontal speed and
  // latched for the whole jump (never recomputed mid-air). Base velocity
  // native -3.5, confirmed via velipso/smb3-physics's JUMP_FORCE table
  // ([-3.5, -3.625, -3.75, -4]) — the task spec's own estimate of -3.0 was
  // a real disagreement with the ROM (flagged per the task's "STOP and
  // tell me" instruction for this exact value): the actual base is 17%
  // higher-magnitude than guessed.
  baseJumpVelocity: -3.5 * SCALE, // -4.8125
  // Per-tier delta subtracted from baseJumpVelocity, stored as negative so
  // `vy = baseJumpVelocity + jumpTable[tier]` reads as one addition (both
  // are already in this codebase's negative-is-up convention). Native
  // magnitudes [0, 0.125, 0.25, 0.5] match the task spec exactly, and
  // exactly reproduce velipso/smb3-physics's JUMP_FORCE table once
  // subtracted from -3.5 (-3.5, -3.625, -3.75, -4) — cross-confirmed, no
  // correction needed here despite the baseJumpVelocity correction above.
  jumpTable: [0, -0.125 * SCALE, -0.25 * SCALE, -0.5 * SCALE], // [0, -0.171875, -0.34375, -0.6875]
  // Tier boundaries, kept in NATIVE-derived (but pre-scaled) units per the
  // task spec's explicit instruction — comparing scaled |vx| against these
  // directly is equivalent to flooring native |vx| into tiers [0,1,2,3]
  // without a runtime division. tier = number of bounds <= |vx|, capped 3.
  speedTierBounds: [1 * SCALE, 2 * SCALE, 3 * SCALE], // [1.375, 2.75, 4.125]

  // --- Non-SMB3 additions, kept at today's live-game values (unchanged by
  // the physics-lab rewrite) — the vanilla 1988 game has neither; these
  // are this project's own forgiveness windows from earlier playtesting.
  // The physics-lab's "smb3" preset (tools/physics-lab.html) zeroes these
  // to compare against pure ROM behavior; the live game keeps them on. ---
  coyoteFrames: 5,
  jumpBufferFrames: 6,

  STOMP_BOUNCE: -8,

  // Respawn safety window (2026-09-19, playtesting feedback: respawning at a
  // checkpoint happened fast enough to walk straight into an enemy or off a
  // ledge into a pit before there was time to react). Two separate problems,
  // two separate fixes:
  // - RESPAWN_FREEZE_FRAMES ignores left/right input so the player can't walk
  //   anywhere for the first half second. This is the one that actually
  //   covers the pit case — invincibility (below) only ever blocked hazard
  //   and enemy contact damage, never the fall-into-a-pit check, so no amount
  //   of invincibility alone would have stopped a blind respawn-and-walk from
  //   ending in a fall.
  // - RESPAWN_INVINCIBLE_FRAMES covers enemy/spike contact for a full second.
  RESPAWN_FREEZE_FRAMES: 30,
  RESPAWN_INVINCIBLE_FRAMES: 60,
};

export function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
