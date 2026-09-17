import { ctx, VIEW_WIDTH, VIEW_HEIGHT } from '../engine/renderer.js';
import { muted } from '../audio/audio.js';
import { state } from '../state.js';

export const toast = { text: null, timer: 0 };

export function showToast(text, duration) {
  toast.text = text;
  toast.timer = duration;
}

export function updateToast() {
  if (toast.timer > 0) toast.timer--;
}

export function drawHUD() {
  ctx.fillStyle = '#e8ecf7';
  ctx.font = 'bold 16px Trebuchet MS, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE  ' + state.score, 14, 26);

  for (let i = 0; i < state.lives; i++) {
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(VIEW_WIDTH - 30 - i * 26, 12, 16, 16);
  }

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
