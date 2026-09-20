// World/physics tuning constants and the one shared collision test.
//
// Gravity is cut by the same percentage as the speed constants below every
// time they drop, deliberately — not a separate feel tweak. Horizontal jump
// carry = speed * airtime, and airtime scales with 1/gravity for a fixed
// JUMP_FORCE, so scaling speed and gravity down by the same factor cancels
// out: carry distance stays put (walk ~93.5px, run ~168px, unchanged since
// the very first cut — verified every time by rerunning the gap-probe
// autoplay clean). Cut twice now, each by 20% (2026-09-19, playtesting with
// a 2nd grader: 0.42/0.68 -> 0.336/0.544 -> 0.2688/0.4352), for a cumulative
// 36% below the original. Airtime and peak height keep rising each time
// this happens (now ~73 frames / ~225px, up from the original ~47/~144) —
// that's an increasingly floaty arc, worth watching if it's cut again.
export const GRAVITY_UP = 0.2688;   // gravity while rising — lighter, floatier arc up
export const GRAVITY_DOWN = 0.4352; // gravity while falling — a bit snappier than rising, not jarring
export const ACCEL = 0.35;          // how fast the player speeds up — gentler ramp, less "instant" feel
export const FRICTION = 0.9;        // how fast the player slows down when no key is held, on the ground
// Airborne deceleration when no direction is held. Deliberately 0, not a
// smaller version of FRICTION: releasing the stick mid-jump used to apply
// the same 0.9/frame ground friction in the air, killing horizontal speed
// in ~4 frames (3.6/0.9) regardless of what's still ahead — over a pit,
// that meant stopping and dropping straight down unless you kept holding
// forward the whole way, which reads as broken, not deliberate. Real
// platformer jump momentum is preserved once you leave the ground; only
// landing (FRICTION, above) or actively steering (ACCEL/TURN_ACCEL, still
// live in the air) changes it from there.
export const AIR_FRICTION = 0;
export const TURN_ACCEL = 0.5;      // extra deceleration applied when reversing direction

// Walk is the default pace; holding the run button raises the speed cap.
// Both caps (and every enemy's patrol speed, and the boss's chargeSpeed)
// have now been cut 20% twice from their original values (2.0/3.6 ->
// 1.6/2.88 -> 1.28/2.304, 2026-09-19) for an overall slower feel — the
// acceleration curve (ACCEL/TURN_ACCEL, above) is untouched both times, so
// this is a pure top-speed change, not a different ramp-up. Jump-carry
// distance is preserved despite the lower speed by also cutting gravity the
// same percentage each time (see the note above GRAVITY_UP) — the level's
// gaps and hazard widths didn't need re-tuning, verified by rerunning the
// gap-probe autoplay clean at the new speed both times.
export const WALK_MAX_SPEED = 1.28;
export const RUN_MAX_SPEED = 2.304;
export const JUMP_FORCE = -11;
export const JUMP_CUT_MULTIPLIER = 0.6; // releasing jump early cuts upward velocity, enabling short hops
// Grace window to still jump just after walking off a ledge. Cut from 9
// (2026-09-19) — measured with tools/coyote-drift-probe.html that the last
// frame a jump still fired, the player was a full body-width (22px) past
// the edge and nearly a full body-height (20px) below the platform surface
// at run speed: visibly hanging in open air over the pit, not a subtle
// forgiveness window. 5 frames brings that down to ~13px past / ~8px below.
export const COYOTE_FRAMES = 5;
export const JUMP_BUFFER_FRAMES = 6; // grace window: a jump press just before landing still fires
export const STOMP_BOUNCE = -8;

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
export const RESPAWN_FREEZE_FRAMES = 30;
export const RESPAWN_INVINCIBLE_FRAMES = 60;

export function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
