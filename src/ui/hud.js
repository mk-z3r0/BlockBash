import { ctx, VIEW_WIDTH, VIEW_HEIGHT, drawRestoreTriangle } from '../engine/renderer.js';
import { muted } from '../audio/audio.js';
import { state } from '../state.js';
import { player } from '../entities/player.js';
import { getWeapon } from '../weapons/registry.js';

export const toast = { text: null, timer: 0 };

export function showToast(text, duration) {
  toast.text = text;
  toast.timer = duration;
}

export function updateToast() {
  if (toast.timer > 0) toast.timer--;
}

// Ammo is only ever shown for a weapon that HAS ammo, which today means
// the Cornerstone alone. A counter that reads "-" or "unlimited" for every
// other weapon would be three quarters of the game showing a number that
// never moves.
//
// Drawn as the triangles themselves rather than a digit: the player already
// knows the shape (it's what the weapon fires and what an ammo pickup looks
// like), and at these counts — ten and down — pips are read at a glance
// where a number has to be read as a number. Below four they pulse, which
// is the only warning the scarcity gets.
function drawAmmo() {
  const weapon = getWeapon(player.weapon);
  if (!weapon || weapon.ammo == null) return;

  const count = Math.max(0, player.ammo);
  const low = count > 0 && count <= 3;
  ctx.save();
  ctx.globalAlpha = low ? 0.55 + 0.45 * Math.abs(Math.sin(state.frameCount * 0.12)) : 1;
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.translate(VIEW_WIDTH - 22 - i * 15, 42);
    ctx.rotate(-Math.PI / 2);   // pointing up, so a row of them reads as a magazine
    drawRestoreTriangle(6, 1);
    ctx.restore();
  }
  ctx.restore();

  if (count === 0) {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7a84a8';
    ctx.font = 'bold 12px Trebuchet MS, Arial, sans-serif';
    ctx.fillText('NO TRIANGLES', VIEW_WIDTH - 14, 47);
    ctx.restore();
  }
}

export function drawHUD() {
  ctx.fillStyle = '#e8ecf7';
  ctx.font = 'bold 16px Trebuchet MS, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE  ' + state.score, 14, 26);

  ctx.save();
  ctx.translate(20, 44);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#5ee7ff';
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();
  ctx.fillStyle = '#5ee7ff';
  ctx.font = 'bold 14px Trebuchet MS, Arial, sans-serif';
  ctx.fillText(String(state.coinsCollected), 34, 49);

  for (let i = 0; i < state.lives; i++) {
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(VIEW_WIDTH - 30 - i * 26, 12, 16, 16);
  }

  drawAmmo();

  if (toast.timer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, toast.timer / 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8effc0';
    ctx.font = 'bold 15px Trebuchet MS, Arial, sans-serif';
    ctx.fillText(toast.text, VIEW_WIDTH / 2, 46);
    ctx.restore();
  }

  if (muted) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7a84a8';
    ctx.font = '12px Trebuchet MS, Arial, sans-serif';
    ctx.fillText('muted', VIEW_WIDTH - 14, VIEW_HEIGHT - 12);
  }
}
