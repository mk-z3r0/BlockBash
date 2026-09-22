import { initInput } from './engine/input.js';
import { pollGamepad } from './engine/gamepad.js';
import { initAudio, resumeAudioIfSuspended, toggleMute } from './audio/audio.js';
import { bufferJump } from './entities/player.js';
import { registerScene, switchTo, update, draw, handleKeyDown } from './scenes/sceneManager.js';
import { introScene } from './scenes/introScene.js';
import { titleScene } from './scenes/titleScene.js';
import { playingScene } from './scenes/playingScene.js';
import { winScene } from './scenes/winScene.js';
import { gameOverScene } from './scenes/gameOverScene.js';
import { P } from './engine/physics.js';
import { initNarrative } from './narrative.js';

// Story position comes back from the save before any scene runs, so a
// cutscene marked `once` knows on the very first frame whether it has
// already been seen.
initNarrative();

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

// Fixed-timestep accumulator (2026-09-20): the loop used to call update()
// once per requestAnimationFrame, which ties simulation speed to display
// refresh rate — on a 144Hz monitor every per-frame constant in physics.js
// (speed, gravity, accel...) effectively runs 2.4x fast, making tuning
// monitor-specific. update() itself is untouched and still does exactly one
// frame's worth of work per call; this loop just decides how many times to
// call it based on real elapsed time, so the simulation always advances at
// P.fixedTimestepHz fixed steps/sec regardless of display Hz. Read from P
// (not a local const) every frame so tools/physics-lab.html can retune it
// live, same as every other physics value.
// Clamp a single rAF frame's elapsed time before feeding the accumulator —
// without this, a tab-blur/backgrounded-tab gap (multi-second delta on
// return) would queue hundreds of catch-up steps and the player would
// visibly teleport as they all resolve.
const MAX_FRAME_MS = 250;
// Spiral-of-death guard: if a single rAF callback still can't drain the
// accumulator within this many steps (slow device, dev tools open, etc.),
// stop and let the remainder carry over to following frames instead of the
// while-loop growing unbounded and freezing the tab further.
const MAX_STEPS_PER_FRAME = 5;

let lastTime = null;
let accumulator = 0;

// No render interpolation: draw() always shows the exact state left by the
// most recent update() step, never a blended in-between. That's a step
// behind true real-time smoothness, but it keeps the visuals matching the
// same discrete step math the physics tuning is judged against.
function gameLoop(now) {
  if (lastTime === null) lastTime = now;
  const frameMs = Math.min(now - lastTime, MAX_FRAME_MS);
  lastTime = now;
  accumulator += frameMs;

  pollGamepad();

  const stepMs = 1000 / P.fixedTimestepHz;
  let steps = 0;
  while (accumulator >= stepMs && steps < MAX_STEPS_PER_FRAME) {
    update();
    accumulator -= stepMs;
    steps++;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
