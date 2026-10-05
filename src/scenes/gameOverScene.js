import { drawOverlay } from '../ui/overlays.js';
import { drawWorldAndHUD } from './playingScene.js';
import { switchTo } from './sceneManager.js';
import { getDifficultyId } from '../difficulty.js';

export const gameOverScene = {
  draw() {
    drawWorldAndHUD();
    const hard = getDifficultyId() === 'hard';
    drawOverlay(hard ? 'GAME OVER' : 'ONE MORE GO?',
      hard ? 'Out of lives — start again from level 1.' : 'Out of lives — try this level from the beginning.',
      hard ? 'SPACE / ENTER / R — restart the game' : 'SPACE / ENTER / R — restart this level', '#ff4d8d');
  },
  handleKeyDown(e) {
    if (e.key === 'r' || e.key === 'R' || e.key === ' ' || e.key === 'Enter') {
      switchTo('playing', getDifficultyId() === 'hard' ? undefined : { retry: true });
    }
  }
};
