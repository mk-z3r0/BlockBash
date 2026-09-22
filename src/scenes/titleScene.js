import { ctx, VIEW_WIDTH, VIEW_HEIGHT, drawBackground } from '../engine/renderer.js';
import { drawOverlay, drawTitleDecor } from '../ui/overlays.js';
import { switchTo } from './sceneManager.js';
import { loadSave } from '../save.js';
import { levels } from '../levels/registry.js';
import { DEBUG } from '../engine/devflags.js';

let save = null;
// Which level the arrows have landed on. Kept across visits to the title so
// dying on level 5 and coming back doesn't put the cursor back on level 1.
let selected = 0;

// How far the arrows can go.
//
// Normally: any face the player has actually reached. That's a continue
// feature rather than a cheat — `furthestLevelIndex` is already recorded and
// already shown on this screen, and a child who wants to play the quarry
// again shouldn't have to replay level 1 to get there.
//
// With ?debug: everything, because the person testing level 7 has not
// necessarily played to level 7 today.
function highestSelectable() {
  if (DEBUG) return levels.length - 1;
  return Math.max(0, Math.min(save ? save.furthestLevelIndex : 0, levels.length - 1));
}

export const titleScene = {
  enter() {
    // read once on entry rather than every frame — localStorage access is
    // wrapped in try/catch inside loadSave(), but there's no reason to pay
    // for it 60 times a second
    save = loadSave();
    selected = Math.min(selected, highestSelectable());
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

    const top = highestSelectable();
    if (top > 0) {
      const name = levels[selected] ? levels[selected].name : '';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8effc0';
      ctx.font = 'bold 14px Trebuchet MS, Arial, sans-serif';
      ctx.fillText(
        `${selected > 0 ? '\u25c2 ' : '  '}LEVEL ${selected + 1} — ${name}${selected < top ? ' \u25b8' : '  '}`,
        VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 62
      );
      ctx.fillStyle = '#7a84a8';
      ctx.font = '11px Trebuchet MS, Arial, sans-serif';
      ctx.fillText('\u2190 \u2192 to choose', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 80);
    }

    if (save && (save.furthestLevelIndex > 0 || save.bestScore > 0)) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5ee7ff';
      ctx.font = '12px Trebuchet MS, Arial, sans-serif';
      ctx.fillText(
        `Best: level ${save.furthestLevelIndex + 1} · score ${save.bestScore}`,
        VIEW_WIDTH / 2,
        VIEW_HEIGHT / 2 + (highestSelectable() > 0 ? 102 : 58)
      );
    }
  },

  handleKeyDown(e) {
    const top = highestSelectable();
    if (e.key === 'ArrowLeft' || e.key === 'a') { selected = Math.max(0, selected - 1); return; }
    if (e.key === 'ArrowRight' || e.key === 'd') { selected = Math.min(top, selected + 1); return; }

    if (e.key === ' ' || e.key === 'Enter') {
      // The opening cutscene belongs to the beginning of the story, so it
      // only plays when the player is actually starting there — and still
      // only once ever (save.hasSeenIntro).
      if (selected === 0 && !(save && save.hasSeenIntro)) {
        switchTo('intro');
      } else {
        switchTo('playing', { startAt: selected });
      }
    }
  }
};
