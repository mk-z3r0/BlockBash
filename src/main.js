import { initInput } from './engine/input.js';
import { initAudio, resumeAudioIfSuspended, toggleMute } from './audio/audio.js';
import { bufferJump } from './entities/player.js';
import { registerScene, switchTo, update, draw, handleKeyDown } from './scenes/sceneManager.js';
import { introScene } from './scenes/introScene.js';
import { titleScene } from './scenes/titleScene.js';
import { playingScene } from './scenes/playingScene.js';
import { winScene } from './scenes/winScene.js';
import { gameOverScene } from './scenes/gameOverScene.js';

registerScene('intro', introScene);
registerScene('title', titleScene);
registerScene('playing', playingScene);
registerScene('win', winScene);
registerScene('gameover', gameOverScene);

// A click/tap unlocks audio without going through handleKeyDown — a
// keypress also unlocks audio, but keydown is what the intro scene (and
// others) read as "skip." Without a separate path, the only browser-legal
// way to turn sound on doubles as skipping straight past the thing you
// wanted to hear.
document.addEventListener('pointerdown', () => {
  initAudio();
  resumeAudioIfSuspended();
});

initInput({
  onKeyDown(e, alreadyDown) {
    // any key wakes up audio (browsers block autoplay until a gesture)
    initAudio();
    resumeAudioIfSuspended();

    if (e.key === 'm' || e.key === 'M') toggleMute();

    if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && !alreadyDown) {
      bufferJump();
    }

    handleKeyDown(e, alreadyDown);
  }
});

switchTo('title');

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
