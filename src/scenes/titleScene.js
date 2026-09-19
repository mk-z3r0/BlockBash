import { ctx, VIEW_WIDTH, VIEW_HEIGHT, drawBackground } from '../engine/renderer.js';
import { drawOverlay, drawTitleDecor } from '../ui/overlays.js';
import { switchTo } from './sceneManager.js';
import { loadSave } from '../save.js';

let save = null;

export const titleScene = {
  enter() {
    // read once on entry rather than every frame — localStorage access is
    // wrapped in try/catch inside loadSave(), but there's no reason to pay
    // for it 60 times a second
    save = loadSave();
  },

  draw() {
    drawBackground(0);
    drawTitleDecor();
    drawOverlay(
      'BLOCK BASH',
      'The smooth spheres have come to sand the corners off everything.',
      'Press SPACE or ENTER to defend your world',
      '#f2c14e'
    );

    if (save && (save.furthestLevelIndex > 0 || save.bestScore > 0)) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5ee7ff';
      ctx.font = '12px Trebuchet MS, Arial, sans-serif';
      ctx.fillText(
        `Best: level ${save.furthestLevelIndex + 1} · score ${save.bestScore}`,
        VIEW_WIDTH / 2,
        VIEW_HEIGHT / 2 + 58
      );
    }
  },
  handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      // the opening cutscene plays once, the first time a run is started —
      // after that, starting from title goes straight into gameplay
      switchTo(save && save.hasSeenIntro ? 'playing' : 'intro');
    }
  }
};
