// Parked, not currently wired into any level (2026-09-19) — level 1's boss
// wields a pickaxe now (see weapons/pickaxe.js, and the sfx.js note by
// playChainsawStart/playChainsawLoop). Kept here because a chainsaw-armed
// enemy is planned for a future level; nothing calls drawChainsaw() right
// now, so it has no effect until that level's scene wires it back in.
import { ctx } from '../engine/renderer.js';

export function drawChainsaw(hand, side, frameCount) {
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.scale(side, 1);

  // handle
  ctx.fillStyle = '#2d3340';
  ctx.fillRect(-4, -4, 10, 8);
  // bar
  ctx.fillStyle = '#9aa6bb';
  ctx.fillRect(5, -3, 22, 6);
  ctx.strokeStyle = '#5b6678';
  ctx.lineWidth = 1;
  ctx.strokeRect(5, -3, 22, 6);
  // spinning teeth
  ctx.fillStyle = '#e8eef8';
  const phase = (frameCount * 2.2) % 5;
  for (let tx = 5 + phase; tx < 27; tx += 5) {
    ctx.fillRect(tx, -5.5, 2.5, 2.5);
    ctx.fillRect(tx, 3, 2.5, 2.5);
  }
  // motion blur haze
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(5, -5.5, 22, 1.5);
  ctx.fillRect(5, 4, 22, 1.5);
  ctx.restore();
}

// --- wired in 2026-09-21 ---
//
// GAME_DESIGN's enemy table gives the late levels "chainsaws, lasers, etc.",
// and this had been sitting here drawn-but-unused since the level 1 boss
// swapped to a pickaxe. Level 6's pursuers carry it: the same tier of enemy
// the player has been fighting since level 2, with a worse tool.
//
// Pose math to the same contract as every other weapon (weapons/registry.js),
// with one difference that matters. A chainsaw isn't swung, it's PUT
// somewhere — so the "swing" is a thrust that snaps out over the first third
// of the animation and then holds, rather than an arc that sweeps through.
// That reads as a very different threat from the pickaxe at a glance, which
// is the point of giving it to the same enemy.
import { state } from '../state.js';

const IDLE_FIST = (hw, hh, facing) => ({ x: facing * (hw + 10), y: -hh * 0.3 });
const THRUST_FIST = (hw, hh, facing) => ({ x: facing * (hw + 30), y: -hh * 0.12 });
const IDLE_ANGLE = 0.12;
const THRUST_ANGLE = -0.18;

// Out fast, then held. Everything else in the game eases across its whole
// duration; this deliberately doesn't.
const thrustAt = progress => Math.min(1, progress * 3);

export function chainsawAngleAt(progress) {
  const t = thrustAt(progress);
  return IDLE_ANGLE + (THRUST_ANGLE - IDLE_ANGLE) * t;
}

export function chainsawFistAt(hw, hh, facing, progress) {
  const t = thrustAt(progress);
  const idle = IDLE_FIST(hw, hh, facing);
  const out = THRUST_FIST(hw, hh, facing);
  return {
    x: idle.x + (out.x - idle.x) * t,
    y: idle.y + (out.y - idle.y) * t
  };
}

export function drawHeldChainsaw(hand, facing, progress) {
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(chainsawAngleAt(progress) * facing);
  // drawChainsaw does its own scale(side, 1), so it's handed the facing
  // rather than having it folded into the transform here.
  drawChainsaw({ x: 0, y: 0 }, facing, state.frameCount);
  ctx.restore();
}

// The icon for a dropped pickup, drawn at the same origin contract as the
// other weapon icons. Nothing drops one today — it's enemy kit — but the
// registry expects every weapon to be drawable lying on the ground.
export function drawChainsawIcon() {
  drawChainsaw({ x: 0, y: 0 }, 1, state.frameCount);
}
