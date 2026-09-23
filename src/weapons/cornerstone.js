// The Cornerstone — the restoration weapon.
//
// Named here (2026-09-21) because GAME_DESIGN.md flagged "restoration
// weapon" as a working label that the most story-important object in the
// game deserved better than. A cornerstone is the block a structure is set
// out from, it's masonry rather than weaponry (the roster's standing
// constraint is that every weapon is mining/demolition/terraforming kit),
// and the word has the thing it does inside it: it puts corners back.
//
// It fires triangles. A triangle IS a missing corner, so restoring an
// octagon is literal geometry rather than metaphor — that reasoning is in
// IMPLEMENTATION_PLAN's Decisions made and predates this module by a long
// way. Ammo is deliberately scarce: the same weapon is the player's best
// gun, so every rescue costs offence. See the ammo note in step 7.
//
// Pose math and the projectile itself. The firing, the ammo accounting and
// the hit resolution are in weapons/combat.js, like every other weapon.

import { ctx, drawCornerstoneIcon, drawRestoreTriangle } from '../engine/renderer.js';

// Shouldered and level — it's aimed, not wound up. Slightly higher and
// flatter than the first pass, because it's a launcher now and a launcher
// sits against the shoulder rather than out at arm's length.
const IDLE_FIST = (hw, hh, facing) => ({ x: facing * (hw + 4), y: -hh * 0.55 });
const IDLE_ANGLE = -0.12;

// Recoil is backward and up, the opposite direction to every melee weapon's
// follow-through, which is most of what makes it read as "fired" rather
// than "swung" at a glance.
const FIRED_FIST = (hw, hh, facing) => ({ x: facing * (hw - 3), y: -hh * 0.78 });
const FIRED_ANGLE = -0.38;

export function cornerstoneAngleAt(progress) {
  // A kick out and back: peaks early, settles. Unlike a swing, this isn't a
  // straight interpolation — recoil that eased smoothly to its end pose
  // looked like the weapon was being slowly raised.
  const kick = Math.sin(Math.min(1, progress) * Math.PI);
  return IDLE_ANGLE + (FIRED_ANGLE - IDLE_ANGLE) * kick;
}

export function cornerstoneFistAt(hw, hh, facing, progress) {
  const kick = Math.sin(Math.min(1, progress) * Math.PI);
  const idle = IDLE_FIST(hw, hh, facing);
  const fired = FIRED_FIST(hw, hh, facing);
  return {
    x: idle.x + (fired.x - idle.x) * kick,
    y: idle.y + (fired.y - idle.y) * kick
  };
}

export function drawHeldCornerstone(hand, facing, progress) {
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.scale(facing, 1);
  ctx.rotate(cornerstoneAngleAt(progress));
  // brightest at the moment of firing
  drawCornerstoneIcon(0.45 + 0.55 * Math.sin(Math.min(1, progress) * Math.PI));
  ctx.restore();
}

// --- the projectile ---
export const TRIANGLE_SPEED = 7.2;
export const TRIANGLE_SIZE = 7;
// Long enough to cross most of a screen, short enough that a miss doesn't
// travel into the next fight and restore something off-camera.
export const TRIANGLE_LIFE = 110;

export function drawRestoreProjectile(p, frameCount) {
  ctx.save();
  ctx.translate(p.x, p.y);
  // Spins as it flies. A triangle that held one orientation read as an
  // arrowhead — a weapon. Tumbling reads as a piece of something.
  ctx.rotate((frameCount + p.spin) * 0.22);
  drawRestoreTriangle(TRIANGLE_SIZE, Math.min(1, p.life / 20));
  ctx.restore();

  // a short trail, same cyan, so fast shots stay readable
  ctx.save();
  ctx.globalAlpha = 0.25 * Math.min(1, p.life / 20);
  ctx.fillStyle = '#5ee7ff';
  ctx.beginPath();
  ctx.arc(p.x - p.vx * 1.6, p.y - p.vy * 1.6, TRIANGLE_SIZE * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
