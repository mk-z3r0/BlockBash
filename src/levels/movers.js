// Platforms that move, level-wide.
//
// The Terraformer's arena already lifted platforms, but that was owned by
// one boss. GAME_DESIGN's dynamic-world section wants more than that —
// "platforms shift, the environment becomes increasingly untrustworthy" —
// and a level whose floor plan is in motion is a different level to cross
// even when its gaps are the same widths.
//
// A platform opts in from level data:
//
//   { x, y, width, height, move: { y: 90, period: 220 } }         rises and falls
//   { x, y, width, height, move: { x: 150, period: 300, phase: 0.5 } }  slides
//
// `period` is frames for a full cycle, `phase` (0-1) offsets it so a row of
// them doesn't move in lockstep. Both axes may be set at once.
//
// --- what carrying the player costs ---
// A platform moving UP doesn't need to carry anyone: it rises into the
// player's feet and the ordinary collision pass resolves them on top of it.
// A platform moving SIDEWAYS does, because nothing about its x is in the
// player's x, and without help they'd stand still while it slid out from
// under them. So this returns the horizontal delta of whichever platform the
// player is standing on, and the scene adds it — the same contract the
// parked trick-platform code used (levels/trickPlatforms.js), kept because
// it was the right shape.

// How close the player's feet have to be to a platform's top to count as
// standing on it. A couple of pixels of slack, because collision resolves
// them to exactly the surface but gravity nudges them a hair below it again
// before this runs.
const STAND_TOLERANCE = 6;

function standingOn(player, p) {
  if (!player.isOnGround) return false;
  const feet = player.y + player.height;
  if (feet < p.y - STAND_TOLERANCE || feet > p.y + STAND_TOLERANCE) return false;
  return player.x + player.width > p.x && player.x < p.x + p.width;
}

// Moves every `move` platform in the level and returns how far the one under
// the player travelled horizontally this frame.
export function updateMovers(level, frameCount, player) {
  let carry = 0;
  for (const p of level.platforms) {
    if (!p.move) continue;
    const period = p.move.period || 240;
    const phase = (p.move.phase || 0) * Math.PI * 2;
    const t = Math.sin((frameCount / period) * Math.PI * 2 + phase);

    if (p.move.y) p.y = p.baseY - p.move.y * (t * 0.5 + 0.5);
    if (p.move.x) {
      const before = p.x;
      p.x = p.baseX + p.move.x * t;
      if (standingOn(player, p)) carry += p.x - before;
    }
  }
  return carry;
}

// Puts them back where the level data says they start. Called on load and on
// respawn, so a fight or a death never leaves the floor plan somewhere the
// level author never saw.
export function resetMovers(level) {
  for (const p of level.platforms) {
    if (!p.move && !p.mover) continue;
    p.x = p.baseX;
    p.y = p.baseY;
  }
}
