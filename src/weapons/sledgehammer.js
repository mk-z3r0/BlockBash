// The sledgehammer — level 2's weapon, dropped by the Excavator.
//
// Pose math only, exactly like weapons/pickaxe.js: the registry
// (weapons/registry.js) owns the numbers that make it *play* differently,
// and weapons/combat.js owns the swinging. Everything here is "where is the
// arm and how is the tool angled at progress t".
//
// It reads as the pickaxe's heavier sibling on purpose. Longer reach and
// real knockback, bought with a slower cooldown — the design doc's axis for
// the middle tier is "trades mobility for power", and this is the bluntest
// version of that trade.
//
// REWRITTEN after play, on the report that it "sucks". Two separate
// problems were wearing one complaint:
//
//   * the head was drawn along the shaft instead of across it, so it looked
//     like a cleaver (fixed in renderer.js's drawSledgehammerIcon)
//   * the swing was a straight interpolation from shouldered to struck.
//     A sledgehammer does not travel in a straight line. It goes UP first,
//     hangs, and then comes down under its own weight — and without that
//     the motion had no weight in it at all, which is the only thing a slow
//     weapon has to offer in exchange for being slow.

import { ctx, drawSledgehammerIcon } from '../engine/renderer.js';

// Shouldered: head up, handle vertical, resting against the body.
//
// The first version put the fist BEHIND the body and the angle at -2.35,
// which laid the handle almost horizontal pointing backwards — so the player
// walked around with a hammer sticking out behind them like a tail. That's
// the pose you see 95% of the time, since a weapon is drawn every frame it's
// carried and only swung for its duration.
//
// The icon's shaft runs (0,0) to (23,-17), i.e. about -36° before rotation,
// so -1.05 puts the total near -93°: straight up, head on top, which is how
// anyone actually carries a sledgehammer.
const IDLE_FIST = (hw, hh, facing) => ({ x: facing * hw * 0.15, y: -hh * 0.8 });
const IDLE_ANGLE = -1.05;

// The top of the backswing: hauled up and slightly behind, head at its
// highest. This is the frame the player should be able to see coming, and
// it's the whole reason the weapon is worth waiting through.
const RAISED_FIST = (hw, hh, facing) => ({ x: -facing * hw * 0.35, y: -hh * 1.15 });
const RAISED_ANGLE = -2.05;

// Ends buried in the ground ahead — an overhead smash, not a level swipe.
// That's what sells the knockback the registry gives it.
const STRUCK_FIST = (hw, hh, facing) => ({ x: facing * (hw + 26), y: hh * 0.6 });
const STRUCK_ANGLE = 1.25;

// How much of the animation is the haul back. Short, and it has to be: the
// registry's `activeFrom` sits after it, and every frame spent winding up is
// a frame the weapon is neither threatening nor recovering.
const WINDUP = 0.28;

const lerp = (a, b, t) => a + (b - a) * t;
const lerpFist = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

// 0 -> WINDUP: haul it up and back.
// WINDUP -> 1: bring it down and through.
//
// The down stroke is ease-OUT — fastest at the top, settling into the
// finish. The first version used ease-in, on the reasoning that a falling
// weight accelerates, and it was wrong for the reason animation is not
// physics: an accelerating swing spends most of its FRAMES at the top, so
// the hammer was still up behind the player's head two thirds of the way
// through its own animation. Drawn out frame by frame
// (tools/weapon-poses.html) the strike happened entirely in the last five
// frames of twenty, and the hitbox — which has to open before the very end
// or the weapon whiffs — opened while the head was still behind the
// shoulder. That is the "it hits before it touches" complaint, in the one
// weapon slow enough to see it happen.
//
// Ease-out puts the travel where the eye is looking: the head comes over
// hard, and the last of the arc is the follow-through.
function phaseOf(progress) {
  if (progress <= WINDUP) {
    // ease-out on the way up: fast off the shoulder, slowing as it tops out
    const t = progress / WINDUP;
    return { up: true, t: 1 - (1 - t) * (1 - t) };
  }
  const t = (progress - WINDUP) / (1 - WINDUP);
  return { up: false, t: 1 - Math.pow(1 - t, 2.4) };
}

export function sledgeAngleAt(progress) {
  const p = phaseOf(progress);
  return p.up ? lerp(IDLE_ANGLE, RAISED_ANGLE, p.t)
              : lerp(RAISED_ANGLE, STRUCK_ANGLE, p.t);
}

export function sledgeFistAt(hw, hh, facing, progress) {
  const p = phaseOf(progress);
  const idle = IDLE_FIST(hw, hh, facing);
  const raised = RAISED_FIST(hw, hh, facing);
  const struck = STRUCK_FIST(hw, hh, facing);
  return p.up ? lerpFist(idle, raised, p.t) : lerpFist(raised, struck, p.t);
}

export function drawHeldSledgehammer(hand, facing, progress) {
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.scale(facing, 1);
  ctx.rotate(sledgeAngleAt(progress));
  drawSledgehammerIcon();
  ctx.restore();
}
