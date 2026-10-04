import { drawOverlay } from '../ui/overlays.js';
import { drawWorldAndHUD } from './playingScene.js';
import { switchTo } from './sceneManager.js';

export const gameOverScene = {
  draw() {
    drawWorldAndHUD();
    drawOverlay('ONE MORE GO?', 'Your checkpoint, coins and weapon are safe.', 'SPACE / ENTER / R — back to your checkpoint', '#ff4d8d');
  },
  handleKeyDown(e) {
    if (e.key === 'r' || e.key === 'R' || e.key === ' ' || e.key === 'Enter') {
      switchTo('playing', { checkpointRetry: true });
    }
  }
};
