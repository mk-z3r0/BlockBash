// Screen shake and hit-stop — the two cheapest things that make hitting
// something feel like hitting something.
//
// IMPLEMENTATION_PLAN's step 9 calls this "procedural refinement (particles,
// screen shake, animation curves, juice) — not a sprite pipeline", and it's
// the one part of polish that changes how the game PLAYS rather than how it
// looks: a boss that flinches and a frame that lurches tell the player their
// hit landed, which is information, not decoration.
//
// Both are deliberately small numbers. The reference is a 7-year-old playing
// on a laptop, not a trailer.

let shake = 0;
let hitStop = 0;
let seed = 0;

// mag is in pixels of peak offset. 3 is a solid hit, 8 is a boss dying.
export function addShake(mag) {
  shake = Math.min(14, Math.max(shake, mag));
}

// Frames of frozen time on impact. 3-5 reads as weight; more reads as lag.
export function addHitStop(frames) {
  hitStop = Math.max(hitStop, frames);
}

export function updateImpact() {
  if (hitStop > 0) hitStop--;
  if (shake > 0) {
    shake *= 0.82;
    if (shake < 0.15) shake = 0;
  }
  seed++;
}

export function isHitStopped() {
  return hitStop > 0;
}

// Offset applied to the world transform. Deliberately not random per axis
// per frame — that reads as static. A fast sine pair shakes along a line
// that rotates, which reads as a jolt.
export function shakeOffset() {
  if (shake <= 0) return { x: 0, y: 0 };
  return {
    x: Math.sin(seed * 2.7) * shake,
    y: Math.cos(seed * 3.9) * shake * 0.6
  };
}

export function resetImpact() {
  shake = 0;
  hitStop = 0;
}
