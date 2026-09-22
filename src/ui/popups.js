// Little numbers that float off the thing you just did.
//
// The score has always been a digit in the corner that silently gets bigger,
// which means the difference between stomping a sphere (100) and putting a
// corrupted square back (300) was invisible at the moment it happened. These
// say what something was worth where it happened, which is the only place
// the player is looking.
//
// Drawn in WORLD space, inside the camera transform, so a popup stays over
// the thing that earned it while the screen scrolls.

import { ctx } from '../engine/renderer.js';

const LIFE = 46;
let popups = [];

export function addPopup(x, y, text, color = '#f2c14e') {
  // A cap, because a sledgehammer through a crowd can produce a lot of these
  // at once and a wall of numbers is worse than none.
  if (popups.length > 14) popups.shift();
  popups.push({ x, y, text, color, life: LIFE });
}

export function updatePopups() {
  for (const p of popups) {
    p.y -= 0.9;
    p.life--;
  }
  popups = popups.filter(p => p.life > 0);
}

export function drawPopups() {
  if (!popups.length) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px Trebuchet MS, Arial, sans-serif';
  for (const p of popups) {
    // Fades out over the last third rather than the whole life, so it's
    // readable for most of the time it exists.
    ctx.globalAlpha = Math.min(1, p.life / (LIFE * 0.34));
    ctx.fillStyle = 'rgba(10, 13, 28, 0.55)';
    ctx.fillText(p.text, p.x + 1, p.y + 1);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.restore();
}

export function resetPopups() {
  popups = [];
}
