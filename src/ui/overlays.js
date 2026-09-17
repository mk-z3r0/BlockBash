import { ctx, VIEW_WIDTH, VIEW_HEIGHT } from '../engine/renderer.js';

export function drawOverlay(title, sub1, sub2, accent) {
  ctx.fillStyle = 'rgba(10, 13, 28, 0.85)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 40px Trebuchet MS, Arial, sans-serif';
  ctx.fillText(title, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 30);

  ctx.fillStyle = '#e8ecf7';
  ctx.font = '16px Trebuchet MS, Arial, sans-serif';
  ctx.fillText(sub1, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 10);

  ctx.fillStyle = '#7a84a8';
  ctx.font = '13px Trebuchet MS, Arial, sans-serif';
  ctx.fillText(sub2, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 36);
}

export function drawTitleDecor() {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 77, 141, 0.25)';
  ctx.beginPath();
  ctx.arc(560, 340, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(620, 300, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(242, 193, 78, 0.35)';
  ctx.fillRect(200, 330, 28, 28);
  ctx.fillRect(240, 300, 20, 20);
  ctx.restore();
}
