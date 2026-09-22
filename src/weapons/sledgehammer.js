// The sledgehammer — level 2's weapon, dropped by the Excavator.
//
// Pose math only, exactly like weapons/pickaxe.js: the registry
// (weapons/registry.js) owns the numbers that make it *play* differently,
// and weapons/combat.js owns the swinging. Everything here is "where is the
// arm and how is the tool angled at progress t".
//
// It reads as the pickaxe's heavier sibling on purpose. Longer reach and
// real knockback, bought with a much slower cooldown — the design doc's
// axis for the middle tier is "trades mobility for power", and this is the
// bluntest version of that trade.

import { ctx, drawSledgehammerIcon } from '../engine/renderer.js';

// Carried high and back, like something too heavy to hold out in front.
const IDLE_FIST = (hw, hh, facing) => ({ x: -facing * hw * 0.15, y: -hh * 1.0 });
const IDLE_ANGLE = -2.35;

// Ends buried in the ground ahead — an overhead smash, not a level swipe.
// That's what sells the knockback the registry gives it.
const STRUCK_FIST = (hw, hh, facing) => ({ x: facing * (hw + 26), y: hh * 0.55 });
const STRUCK_ANGLE = 1.15;

export function sledgeAngleAt(progress) {
  return IDLE_ANGLE + (STRUCK_ANGLE - IDLE_ANGLE) * progress;
}

export function sledgeFistAt(hw, hh, facing, progress) {
  const idle = IDLE_FIST(hw, hh, facing);
  const struck = STRUCK_FIST(hw, hh, facing);
  return {
    x: idle.x + (struck.x - idle.x) * progress,
    y: idle.y + (struck.y - idle.y) * progress
  };
}

export function drawHeldSledgehammer(hand, facing, progress) {
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.scale(facing, 1);
  ctx.rotate(sledgeAngleAt(progress));
  drawSledgehammerIcon();
  ctx.restore();
}
