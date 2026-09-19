// World/physics tuning constants and the one shared collision test.
export const GRAVITY_UP = 0.42;     // gravity while rising — lighter, floatier arc up
export const GRAVITY_DOWN = 0.68;   // gravity while falling — a bit snappier than rising, not jarring
export const ACCEL = 0.35;          // how fast the player speeds up — gentler ramp, less "instant" feel
export const FRICTION = 0.9;        // how fast the player slows down when no key is held
export const TURN_ACCEL = 0.5;      // extra deceleration applied when reversing direction

// Walk is the default pace; holding the run button raises the speed cap.
// RUN_MAX_SPEED intentionally matches the old single MAX_SPEED (3.6)
// exactly, using the SAME acceleration too — not just the same cap — so
// running reproduces the old velocity profile frame-for-frame, not just its
// top speed. That distinction turned out to matter: an earlier version gave
// running a faster ramp-up as a feel tweak, and the tiny difference in
// exactly when full speed was reached was enough to shift a jump's timing
// against a patrolling enemy that the gap-probe autoplay had cleared clean
// before. Level 1's gaps and jump-carry distances were tuned against the
// original constant, so running has to be a true reproduction of it, not an
// approximation — verified by rerunning the autoplay holding run throughout
// and confirming zero deaths again. Walking is genuinely new and slower.
export const WALK_MAX_SPEED = 2.0;
export const RUN_MAX_SPEED = 3.6;
export const JUMP_FORCE = -11;
export const JUMP_CUT_MULTIPLIER = 0.6; // releasing jump early cuts upward velocity, enabling short hops
export const COYOTE_FRAMES = 9;     // grace window to still jump just after walking off a ledge
export const JUMP_BUFFER_FRAMES = 6; // grace window: a jump press just before landing still fires
export const STOMP_BOUNCE = -8;

export function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
