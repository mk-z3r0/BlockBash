import { drawBackground } from '../engine/renderer.js';
import { drawOverlay, drawTitleDecor } from '../ui/overlays.js';
import { switchTo } from './sceneManager.js';

export const titleScene = {
  draw() {
    drawBackground(0);
    drawTitleDecor();
    drawOverlay(
      'BLOCK BASH',
      'The smooth spheres have come to sand the corners off everything.',
      'Press SPACE or ENTER to defend your world',
      '#f2c14e'
    );
  },
  handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      switchTo('playing');
    }
  }
};
