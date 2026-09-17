import { drawOverlay } from '../ui/overlays.js';
import { drawWorldAndHUD } from './playingScene.js';
import { switchTo } from './sceneManager.js';
import { state } from '../state.js';

export const winScene = {
  draw() {
    drawWorldAndHUD();
    drawOverlay('LEVEL CLEAR', 'The squares hold their ground. Final score: ' + state.score, 'Press R to play again', '#5ee7ff');
  },
  handleKeyDown(e) {
    if (e.key === 'r' || e.key === 'R' || e.key === ' ' || e.key === 'Enter') {
      switchTo('playing');
    }
  }
};
