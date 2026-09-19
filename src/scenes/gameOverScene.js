import { drawOverlay } from '../ui/overlays.js';
import { drawWorldAndHUD } from './playingScene.js';
import { switchTo } from './sceneManager.js';
import { state } from '../state.js';

export const gameOverScene = {
  draw() {
    drawWorldAndHUD();
    drawOverlay('ROUNDED OUT', 'The spheres got the better corner this time. Score: ' + state.score, 'Press R to try again', '#ff4d8d');
  },
  handleKeyDown(e) {
    if (e.key === 'r' || e.key === 'R' || e.key === ' ' || e.key === 'Enter') {
      switchTo('playing', { retry: true });
    }
  }
};
