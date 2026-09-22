import { ctx, VIEW_WIDTH, VIEW_HEIGHT } from '../engine/renderer.js';
import { drawWorldAndHUD } from './playingScene.js';
import { switchTo } from './sceneManager.js';
import { state } from '../state.js';
import { loadSave } from '../save.js';

// The end of the game, not the end of a level.
//
// This used to be the generic overlay reading "LEVEL CLEAR", which was true
// when there was one level. Seven levels, a mentor who came apart and got
// put back together, and a planet argued back into a cube deserve their own
// screen — and the one thing it must not do is congratulate the player on a
// kill. GAME_DESIGN is explicit: "the ending is a restoration, not a kill."
// So there's no body count on here. There's a cube.

// A square drawn the way the core ends up: corners intact, edges lit in the
// cyan that has meant "the world, as it should be" since the first level's
// cube-edge seam.
function drawRestoredCube(cx, cy, size, frameCount) {
  const h = size / 2;
  const pulse = 0.55 + 0.45 * Math.sin(frameCount * 0.03);

  ctx.save();
  ctx.translate(cx, cy);

  // a soft aura, so it reads as lit rather than as a flat shape
  const glow = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 1.1);
  glow.addColorStop(0, `rgba(94, 231, 255, ${0.16 * pulse})`);
  glow.addColorStop(1, 'rgba(94, 231, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-size, -size, size * 2, size * 2);

  const face = ctx.createLinearGradient(0, -h, 0, h);
  face.addColorStop(0, '#3d7fa8');
  face.addColorStop(1, '#1b3d63');
  ctx.fillStyle = face;
  ctx.fillRect(-h, -h, size, size);

  ctx.strokeStyle = `rgba(94, 231, 255, ${0.6 + 0.4 * pulse})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(-h, -h, size, size);

  // The eight corners, marked. They're the whole point of the game, and the
  // last thing the player did was put twelve of them back.
  ctx.fillStyle = '#d7faff';
  const c = 5;
  [[-h, -h], [h - c, -h], [-h, h - c], [h - c, h - c]].forEach(([x, y]) =>
    ctx.fillRect(x, y, c, c));

  ctx.restore();
}

export const winScene = {
  draw() {
    drawWorldAndHUD();

    ctx.fillStyle = 'rgba(10, 13, 28, 0.9)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    drawRestoredCube(VIEW_WIDTH / 2, 150, 92, state.frameCount);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#5ee7ff';
    ctx.font = 'bold 34px Trebuchet MS, Arial, sans-serif';
    ctx.fillText('THE WORLD IS SQUARE AGAIN', VIEW_WIDTH / 2, 258);

    ctx.fillStyle = '#e8ecf7';
    ctx.font = '15px Trebuchet MS, Arial, sans-serif';
    ctx.fillText('Six faces, one hollow centre, and every corner put back.', VIEW_WIDTH / 2, 290);

    const save = loadSave();
    ctx.fillStyle = '#f2c14e';
    ctx.font = 'bold 15px Trebuchet MS, Arial, sans-serif';
    ctx.fillText(`SCORE ${state.score}    COINS ${state.coinsCollected}    LIVES LEFT ${state.lives}`,
      VIEW_WIDTH / 2, 324);

    if (state.score >= save.bestScore) {
      ctx.fillStyle = '#8effc0';
      ctx.font = 'bold 13px Trebuchet MS, Arial, sans-serif';
      ctx.fillText('BEST RUN YET', VIEW_WIDTH / 2, 348);
    } else {
      ctx.fillStyle = '#7a84a8';
      ctx.font = '13px Trebuchet MS, Arial, sans-serif';
      ctx.fillText(`Best ${save.bestScore}`, VIEW_WIDTH / 2, 348);
    }

    ctx.fillStyle = '#7a84a8';
    ctx.font = '13px Trebuchet MS, Arial, sans-serif';
    ctx.fillText('Press R to go round again', VIEW_WIDTH / 2, 392);
  },

  handleKeyDown(e) {
    if (e.key === 'r' || e.key === 'R' || e.key === ' ' || e.key === 'Enter') {
      switchTo('playing');
    }
  }
};
