// What the player running into things does — pulled out of playingScene so
// its update loop can read as a sequence of named steps rather than an
// inline wall of checks.
//
// Each of these returns true if the player should lose a life, rather than
// calling loseLife itself: losing a life can end the run and switch scenes,
// and a module this low-level has no business deciding that. The scene
// owns the consequence; this owns the detection.

import { isColliding } from '../../engine/physics.js';
import { player, setRespawnPoint } from '../../entities/player.js';
import { getLevel } from '../../levels/levelLoader.js';
import { showToast } from '../../ui/hud.js';
import { playCheckpoint } from '../../audio/sfx.js';

// Spikes and the like. Invincibility frames after a respawn mean the player
// can stand in a hazard briefly without dying again immediately.
export function hitHazard() {
  if (player.invincible > 0) return false;
  return getLevel().hazards.some(h => isColliding(player, h.hitbox));
}

// Fires its toast and sound as a side effect — a checkpoint is entirely a
// feedback event, there's no decision for the caller to make.
export function checkCheckpoints() {
  for (const checkpoint of getLevel().checkpoints) {
    if (!checkpoint.activated && isColliding(player, checkpoint)) {
      checkpoint.activated = true;
      setRespawnPoint(checkpoint.x, checkpoint.y - 20);
      showToast('CHECKPOINT REACHED', 90);
      playCheckpoint();
    }
  }
}
