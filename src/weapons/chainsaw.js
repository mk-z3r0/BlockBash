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
