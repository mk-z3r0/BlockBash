import { ctx, VIEW_WIDTH, drawBackground } from '../engine/renderer.js';
import { isColliding } from '../engine/physics.js';
import { camera, updateCamera, resetCamera } from '../engine/camera.js';
import { state } from '../state.js';
import {
  player, resetPlayer, updatePlayer, drawPlayer, drawPlayerShout,
  setRespawnPoint, resetDustTimer
} from '../entities/player.js';
import { updateEnemies, drawEnemies, spawnEnemies } from '../entities/enemy.js';
import { createRescueNPC, updateRescueNPC, drawRescueNPC } from '../entities/npc.js';
import { updateParticles, drawParticles, resetParticles, spawnExplosion } from '../entities/particles.js';
import { resetCoins, updateCoins, drawCoins } from '../entities/coins.js';
import { spawnWeaponPickup, updateWeaponPickups, drawWeaponPickups } from '../entities/weaponPickup.js';
import { updateWeaponInput } from '../weapons/pickaxe.js';
import { loadLevel, getLevel } from '../levels/levelLoader.js';
import { drawPlatforms, drawGoal, drawCheckpoints, drawHazards } from '../levels/levelRenderer.js';
import { drawBlockHouse } from './blockHouse.js';
import { levels } from '../levels/registry.js';
import { showToast, updateToast, drawHUD, toast } from '../ui/hud.js';
import { playHit, playCheckpoint, playPickaxeReady, playPickaxeSwing, playExplosion, playWin, playGameOver } from '../audio/sfx.js';
import { startMusic } from '../audio/audio.js';
import { switchTo } from './sceneManager.js';
import { recordProgress } from '../save.js';
import { drawOverlay } from '../ui/overlays.js';

// --- Cutscene state machine (the pickaxe-boss showdown): null (not
// started) -> 'freeze' -> 'charge' -> 'rescue' -> 'done'. Scoped to this
// scene rather than a dedicated module for now — see the Phase 0 notes on
// why (Phase 5's cutscene engine is where this earns its own home). ---
let cutscene = null;
let cutsceneTimer = 0;
let rescueNPC = null;

// Pause is a flag, not a scene transition — switching away from 'playing'
// and back would re-run enter(), which always means "start a run" or
// "retry the level," neither of which is "resume where I was." A flag
// sidesteps that entirely: update() just does nothing while paused.
let paused = false;

function bossActive() {
  // the boss blocks the flag until the cutscene NPC has dealt with it
  if (cutscene === 'done') return false;
  return state.enemies.some(e => e.boss && e.alive);
}

function resetBossAndCutscene() {
  cutscene = null;
  cutsceneTimer = 0;
  rescueNPC = null;
  state.enemies.filter(e => e.boss).forEach(boss => {
    boss.alive = true;
    boss.squish = 0;
    boss.awake = false;
    boss.swingPhase = 0;
    boss.shout = 0;
    boss.x = boss.baseX;
    boss.y = boss.baseY;
    boss.hopVY = 0;
    boss.speed = Math.abs(boss.speed) || 1.2;
  });
  // the fight is restarting — any drop from a previous attempt that never
  // got picked up (the player died between the boss dying and reaching it)
  // would otherwise sit stranded next to a boss that's alive again
  state.weaponPickups = state.weaponPickups.filter(p => p.collected);
}

function loseLife() {
  state.lives--;
  if (state.lives <= 0) {
    recordProgress(state.currentLevelIndex, state.score);
    state.gameState = 'gameover';
    playGameOver();
    switchTo('gameover');
  } else {
    resetPlayer();
    resetBossAndCutscene();
  }
}

function updateCutscene() {
  const bossConfig = getLevel().boss;
  // levels with no boss, or with a boss meant to be fought rather than
  // watched (Phase 4), never run this cutscene
  if (!bossConfig || bossConfig.mode !== 'cutscene') return;

  if (cutscene === null) {
    const boss = state.enemies.find(e => e.boss && e.alive);
    // Gated on the boss being fully visible in the current camera view, not
    // just player.x crossing wakeX — wakeX alone could fire while the boss
    // was still off-screen to the right (camera eases toward the player
    // rather than snapping, so it lags behind, especially approaching at
    // run speed). Both conditions still apply: wakeX gives the boss room to
    // charge before the player's right on top of it, and visibility means
    // the player actually sees what triggered the cutscene.
    const bossFullyOnScreen = boss
      && boss.x >= camera.x
      && boss.x + boss.w <= camera.x + VIEW_WIDTH;
    if (boss && player.x + player.width > bossConfig.wakeX && bossFullyOnScreen) {
      cutscene = 'freeze';
      cutsceneTimer = 0;
      player.velocityX = 0;
      player.velocityY = 0;
      boss.awake = true;
      boss.swingPhase = 1;
      boss.shout = 40;
      playPickaxeReady();
    }
  }

  if (cutscene === 'freeze') {
    player.velocityX = 0;
    player.shout = 30;
    cutsceneTimer++;
    const boss = state.enemies.find(e => e.boss && e.alive);
    if (boss) {
      boss.swingPhase++;
      if (boss.swingPhase % 26 === 0) playPickaxeSwing();
    }
    if (cutsceneTimer > 120) {
      cutscene = 'charge';
      cutsceneTimer = 0;
    }
  }

  if (cutscene === 'charge') {
    player.velocityX = 0;
    player.shout = 30;
    const boss = state.enemies.find(e => e.boss && e.alive);
    if (boss) {
      boss.speed = -bossConfig.chargeSpeed;
      boss.x += boss.speed;
      boss.swingPhase++;
      if (boss.swingPhase % 26 === 0) playPickaxeSwing();
    }
    cutsceneTimer++;

    if (cutsceneTimer === 40 && !rescueNPC) {
      rescueNPC = createRescueNPC(camera.x - 60);
    }

    if (rescueNPC && rescueNPC.stomped) {
      cutscene = 'rescue';
      cutsceneTimer = 0;
    }

    if (boss && boss.x < player.x + player.width + 40) {
      boss.x = player.x + player.width + 40;
    }

    if (cutsceneTimer > 300) {
      if (boss) {
        boss.alive = false;
        boss.squish = 14;
        spawnExplosion(boss.x + boss.w / 2, boss.y + boss.w / 2, '#8effc0');
        playExplosion();
        spawnWeaponPickup(boss.x + boss.w / 2, getLevel().groundY);
      }
      cutscene = 'rescue';
      cutsceneTimer = 0;
    }
  }

  if (cutscene === 'rescue') {
    player.shout = 0;
    cutsceneTimer++;
    if (cutsceneTimer > 100) {
      cutscene = 'done';
      showToast('COAST IS CLEAR!', 120);
    }
  }

  if (rescueNPC) {
    const shouldRemove = updateRescueNPC(rescueNPC, VIEW_WIDTH, camera.x);
    if (shouldRemove) rescueNPC = null;
  }
}

// Loads whichever level is at `index` into the current run, without
// touching score or lives — those persist across a level transition and
// only reset with the run itself. This is what both "advance to the next
// level" and "retry the level I died on" share.
function startLevel(index) {
  state.currentLevelIndex = index;
  recordProgress(index, state.score);
  startMusic(); // idempotent — no-op on retries once it's already playing
  paused = false;

  const level = loadLevel(levels[index]);
  state.enemies = spawnEnemies(level.enemySpawns);
  resetCoins();
  state.weaponPickups = [];
  state.missiles = []; // unused while the bazooka is parked — see weapons/bazooka.js
  resetParticles();
  resetDustTimer();
  resetBossAndCutscene();
  setRespawnPoint(level.playerSpawn.x, level.playerSpawn.y);
  resetPlayer();
  player.hasWeapon = false; // starts unarmed every fresh level load
  resetCamera();
  state.gameState = 'playing';
  showToast(level.name.toUpperCase(), 100);
}

// Same level, fresh attempt — what a game-over retry does. Never sends the
// player back to level 1 just because they ran out of lives.
function retryCurrentLevel() {
  state.score = 0;
  state.lives = 3;
  state.coinsCollected = 0;
  startLevel(state.currentLevelIndex);
}

// A brand new playthrough — what the title screen starts.
function startNewRun() {
  state.currentLevelIndex = 0;
  retryCurrentLevel();
}

export function drawWorldAndHUD() {
  drawBackground(camera.x);
  ctx.save();
  ctx.translate(-camera.x, 0);
  const house = getLevel().house;
  if (house) drawBlockHouse(house.x, getLevel().groundY, 1.1);
  drawPlatforms();
  drawHazards();
  drawCheckpoints();
  drawGoal();
  drawCoins(state.frameCount);
  drawWeaponPickups(state.frameCount);
  drawEnemies(state.frameCount, cutscene === 'done');
  drawParticles();
  drawPlayer(state.frameCount);
  drawPlayerShout();
  if (rescueNPC) drawRescueNPC(rescueNPC, state.frameCount);
  ctx.restore();
  drawHUD();
}

export const playingScene = {
  // data.retry: same level, fresh score/lives (a game-over retry).
  // Anything else (title screen, or no data at all): a brand new run.
  enter(data) {
    if (data && data.retry) retryCurrentLevel();
    else startNewRun();
  },

  update() {
    if (paused) return;
    state.frameCount++;
    const inputLocked = !!(cutscene && cutscene !== 'done');

    const { fellInPit } = updatePlayer(inputLocked);
    updateWeaponInput(player, inputLocked);

    if (fellInPit) {
      playHit();
      loseLife();
      if (state.gameState !== 'playing') return;
    }

    if (player.invincible <= 0 && getLevel().hazards.some(h => isColliding(player, h.hitbox))) {
      playHit();
      loseLife();
      if (state.gameState !== 'playing') return;
    }

    for (const checkpoint of getLevel().checkpoints) {
      if (!checkpoint.activated && isColliding(player, checkpoint)) {
        checkpoint.activated = true;
        setRespawnPoint(checkpoint.x, checkpoint.y - 20);
        showToast('CHECKPOINT REACHED', 90);
        playCheckpoint();
      }
    }

    updateCutscene();

    const cutsceneActive = !!(cutscene && cutscene !== 'done');
    const { hitPlayer } = updateEnemies(player, cutsceneActive);
    if (hitPlayer) {
      playHit();
      loseLife();
      if (state.gameState !== 'playing') return;
    }

    updateParticles();
    updateCoins(player);
    updateWeaponPickups(player);

    const goal = getLevel().goal;
    if (isColliding(player, goal)) {
      if (bossActive()) {
        // the sphere body-blocks the flag — taunt and shove the player back
        player.x = goal.x - player.width - 30;
        player.velocityX = 0;
        if (toast.timer <= 0) showToast("THE SPHERE WON'T LET YOU", 80);
      } else if (state.currentLevelIndex + 1 < levels.length) {
        startLevel(state.currentLevelIndex + 1);
        return;
      } else {
        recordProgress(state.currentLevelIndex, state.score);
        state.gameState = 'win';
        playWin();
        switchTo('win');
        return;
      }
    }

    updateToast();
    updateCamera(player.x, VIEW_WIDTH, getLevel().worldWidth);
  },

  draw() {
    drawWorldAndHUD();
    if (paused) {
      drawOverlay('PAUSED', 'Press ESC or START to resume', `Score ${state.score} · Level ${state.currentLevelIndex + 1}`, '#5ee7ff');
    }
  },

  handleKeyDown(e, alreadyDown) {
    if (e.key === 'Escape' && !alreadyDown) {
      paused = !paused;
      return;
    }
    if (paused) return; // no other input does anything while paused

    // secret unlock (parents only): Shift+K calls the sphere off so the flag
    // works, or skips the cutscene if it's playing
    if (e.shiftKey && (e.key === 'K' || e.key === 'k') && cutscene && cutscene !== 'done') {
      const boss = state.enemies.find(b => b.boss && b.alive);
      if (boss) {
        boss.alive = false;
        boss.squish = 14;
        spawnExplosion(boss.x + boss.w / 2, boss.y + boss.w / 2, '#8effc0');
        playExplosion();
        spawnWeaponPickup(boss.x + boss.w / 2, getLevel().groundY);
      }
      cutscene = 'done';
      rescueNPC = null;
      showToast('THE SPHERES RETREAT!', 120);
    }
  }
};
