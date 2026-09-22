// The Excavator's rig.
//
// Enemy kit, like the chainsaw: registered as a weapon because the registry
// is what every hand in this game draws through, but nothing swings it at
// anyone. The Excavator threatens by existing and by taking the floor apart;
// see entities/bosses.js.
//
// Pose math to the usual contract. A drill is BRACED rather than swung — it's
// held level and pushed — so the idle and working poses differ by very little
// and the motion the player reads is the bit turning, not the arm moving.

import { ctx, drawDrillIcon } from '../engine/renderer.js';
import { state } from '../state.js';

const IDLE_FIST = (hw, hh, facing) => ({ x: facing * (hw + 12), y: -hh * 0.25 });
const PUSH_FIST = (hw, hh, facing) => ({ x: facing * (hw + 24), y: -hh * 0.1 });
const IDLE_ANGLE = 0.05;
const PUSH_ANGLE = -0.05;

export function drillAngleAt(progress) {
  return IDLE_ANGLE + (PUSH_ANGLE - IDLE_ANGLE) * Math.min(1, progress * 2);
}

export function drillFistAt(hw, hh, facing, progress) {
  const t = Math.min(1, progress * 2);
  const idle = IDLE_FIST(hw, hh, facing);
  const push = PUSH_FIST(hw, hh, facing);
  return {
    x: idle.x + (push.x - idle.x) * t,
    y: idle.y + (push.y - idle.y) * t
  };
}

export function drawHeldDrill(hand, facing, progress) {
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.scale(facing, 1);
  ctx.rotate(drillAngleAt(progress));
  drawDrillIcon(state.frameCount);
  ctx.restore();
}

export function drawDrillPickup() {
  drawDrillIcon(state.frameCount);
}
