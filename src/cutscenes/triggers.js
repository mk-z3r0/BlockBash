// Decides when a level's cutscenes fire.
//
// Levels declare their cutscenes as data:
//
//   cutscenes: [
//     { id: 'boss-showdown',   when: { bossInView: true }, once: true },
//     { id: 'edge-transition', when: { nearWorldEdge: EDGE_TRIGGER_MARGIN } }
//   ]
//
// so adding a cutscene to a level is an entry in its data file plus a beat
// list in cutscenes/<level>/, and nothing in scenes/playingScene.js.
//
// `once: true` means "only ever, across the whole save" and consults
// narrative state. Everything else replays on a retry, which is what you
// want for a fight the player just died during.

import { state } from '../state.js';
import { player } from '../entities/player.js';
import { camera } from '../engine/camera.js';
import { VIEW_WIDTH } from '../engine/renderer.js';
import { hasSeenCutscene } from '../narrative.js';
import { hasCompleted, isCutsceneActive } from './runner.js';

// Each condition takes (value, level) and returns whether it's satisfied
// this frame. Keep them cheap: every one of these runs every frame for
// every not-yet-played cutscene in the level.
const CONDITIONS = {
  // Immediately, the frame the level starts.
  levelStart: () => true,

  // The player's leading edge has passed this world x.
  reachX: x => player.x + player.width > x,

  // The player is within `margin` px of where the ground actually stops.
  nearWorldEdge: (margin, level) => player.x + player.width >= level.worldEdgeX - margin,

  // The level's boss has woken range AND is fully on screen. Both halves
  // matter: `wakeX` alone could fire while the boss was still off-screen to
  // the right, because the camera eases toward the player rather than
  // snapping and so lags behind, especially at run speed. Requiring
  // visibility means the player actually sees what triggered the scene.
  bossInView: (_, level) => {
    if (!level.boss || level.boss.mode !== 'cutscene') return false;
    const boss = state.enemies.find(e => e.boss && e.alive);
    if (!boss) return false;
    const fullyOnScreen = boss.x >= camera.x && boss.x + boss.w <= camera.x + VIEW_WIDTH;
    return fullyOnScreen && player.x + player.width > level.boss.wakeX;
  },

  // Every boss in the level is down.
  bossDefeated: () => !state.enemies.some(e => e.boss && e.alive),

  // Never fires on its own — for cutscenes another system starts by hand.
  manual: () => false
};

function satisfied(when, level) {
  return Object.entries(when).every(([key, value]) => {
    const test = CONDITIONS[key];
    if (!test) {
      console.warn(`unknown cutscene trigger condition "${key}"`);
      return false;
    }
    return test(value, level);
  });
}

// Returns the cutscene declaration that should start this frame, or null.
// Only ever returns one: two cutscenes firing on the same frame would have
// to interleave, and there's no sane answer for what that means.
export function pendingCutscene(level) {
  if (isCutsceneActive()) return null;
  const declared = level.cutscenes || [];
  for (const entry of declared) {
    if (hasCompleted(entry.id)) continue;           // already played this attempt
    if (entry.once && hasSeenCutscene(entry.id)) continue; // already played, ever
    if (satisfied(entry.when, level)) return entry;
  }
  return null;
}
