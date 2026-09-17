// World/physics tuning constants and the one shared collision test.
export const GRAVITY_UP = 0.42;     // gravity while rising — lighter, floatier arc up
export const GRAVITY_DOWN = 0.68;   // gravity while falling — a bit snappier than rising, not jarring
export const ACCEL = 0.35;          // how fast the player speeds up — gentler ramp, less "instant" feel
export const FRICTION = 0.9;        // how fast the player slows down when no key is held
export const TURN_ACCEL = 0.5;      // extra deceleration applied when reversing direction
export const MAX_SPEED = 3.6;       // top horizontal speed — slower overall pace
export const JUMP_FORCE = -11;
export const JUMP_CUT_MULTIPLIER = 0.6; // releasing jump early cuts upward velocity, enabling short hops
export const COYOTE_FRAMES = 9;     // grace window to still jump just after walking off a ledge
export const JUMP_BUFFER_FRAMES = 6; // grace window: a jump press just before landing still fires
export const STOMP_BOUNCE = -8;
export const WORLD_WIDTH = 3200;
export const GROUND_Y = 410;

export function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
