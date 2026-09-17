import { ctx, VIEW_WIDTH, drawBackground } from '../engine/renderer.js';
import { isColliding, WORLD_WIDTH } from '../engine/physics.js';
import { camera, updateCamera, resetCamera } from '../engine/camera.js';
import { state } from '../state.js';
import {
  player, resetPlayer, updatePlayer, drawPlayer, drawPlayerShout,
  setRespawnPoint, resetDustTimer
} from '../entities/player.js';
import { updateEnemies, drawEnemies } from '../entities/enemy.js';
import { createRescueNPC, updateRescueNPC, drawRescueNPC } from '../entities/npc.js';
import { updateParticles, drawParticles, resetParticles, spawnExplosion } from '../entities/particles.js';
import { resetCoins, updateCoins, drawCoins } from '../entities/coins.js';
import { updateBazookaInput, updateMissiles, drawMissiles } from '../weapons/bazooka.js';
import {
  goal, checkpoint, createEnemies, resetDynamicPlatforms,
  drawPlatforms, drawGoal, drawCheckpoint, BOSS_WAKE_X, BOSS_CHARGE_SPEED
} from '../levels/level1.js';
import { showToast, updateToast, drawHUD, toast } from '../ui/hud.js';
import { playHit, playCheckpoint, playChainsawStart, playChainsawLoop, playExplosion, playWin, playGameOver } from '../audio/sfx.js';
import { switchTo } from './sceneManager.js';

// --- Cutscene state machine (the chainsaw-boss showdown): null (not
// started) -> 'freeze' -> 'charge' -> 'rescue' -> 'done'. Scoped to this
// scene rather than a dedicated module for now — see the Phase 0 notes on
// why (Phase 5's cutscene engine is where this earns its own home). ---
let cutscene = null;
let cutsceneTimer = 0;
let rescueNPC = null;

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
    boss.sawRev = 0;
    boss.shout = 0;
    boss.x = boss.baseX;
    boss.y = boss.baseY;
    boss.hopVY = 0;
    boss.speed = Math.abs(boss.speed) || 1.2;
  });
}

function loseLife() {
  state.lives--;
  if (state.lives <= 0) {
    state.gameState = 'gameover';
    playGameOver();
    switchTo('gameover');
  } else {
    resetPlayer();
    resetBossAndCutscene();
  }
}

function updateCutscene() {
  if (cutscene === null) {
    const boss = state.enemies.find(e => e.boss && e.alive);
    if (boss && player.x + player.width > BOSS_WAKE_X) {
      cutscene = 'freeze';
      cutsceneTimer = 0;
      player.velocityX = 0;
      player.velocityY = 0;
      boss.awake = true;
      boss.sawRev = 1;
      boss.shout = 40;
      playChainsawStart();
    }
  }

  if (cutscene === 'freeze') {
    player.velocityX = 0;
    player.shout = 30;
    cutsceneTimer++;
    const boss = state.enemies.find(e => e.boss && e.alive);
    if (boss) {
      boss.sawRev++;
      if (boss.sawRev % 26 === 0) playChainsawLoop();
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
      boss.speed = -BOSS_CHARGE_SPEED;
      boss.x += boss.speed;
      boss.sawRev++;
      if (boss.sawRev % 26 === 0) playChainsawLoop();
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

function resetGame() {
  state.score = 0;
  state.lives = 3;
  state.enemies = createEnemies();
  resetCoins();
  state.missiles = [];
  resetParticles();
  resetDustTimer();
  resetBossAndCutscene();
  resetDynamicPlatforms(); // also clears checkpoint.activated
  setRespawnPoint(100, 300);
  resetPlayer();
  resetCamera();
  state.gameState = 'playing';
  showToast('', 0);
}

export function drawWorldAndHUD() {
  drawBackground(camera.x);
  ctx.save();
  ctx.translate(-camera.x, 0);
  drawPlatforms();
  drawCheckpoint();
  drawGoal();
  drawCoins(state.frameCount);
  drawEnemies(state.frameCount, cutscene === 'done');
  drawMissiles();
  drawParticles();
  drawPlayer(state.frameCount);
  drawPlayerShout();
  if (rescueNPC) drawRescueNPC(rescueNPC, state.frameCount);
  ctx.restore();
  drawHUD();
}

export const playingScene = {
  enter: resetGame,

  update() {
    state.frameCount++;
    const inputLocked = !!(cutscene && cutscene !== 'done');

    const { fellInPit } = updatePlayer(inputLocked);
    updateBazookaInput(player, inputLocked);

    if (fellInPit) {
      playHit();
      loseLife();
      if (state.gameState !== 'playing') return;
    }

    if (!checkpoint.activated && isColliding(player, checkpoint)) {
      checkpoint.activated = true;
      setRespawnPoint(checkpoint.x, checkpoint.y - 20);
      showToast('CHECKPOINT REACHED', 90);
      playCheckpoint();
    }

    updateCutscene();

    const cutsceneActive = !!(cutscene && cutscene !== 'done');
    const { hitPlayer } = updateEnemies(player, cutsceneActive);
    if (hitPlayer) {
      playHit();
      loseLife();
      if (state.gameState !== 'playing') return;
    }

    updateMissiles();
    updateParticles();
    updateCoins(player);

    if (isColliding(player, goal)) {
      if (bossActive()) {
        // the sphere body-blocks the flag — taunt and shove the player back
        player.x = goal.x - player.width - 30;
        player.velocityX = 0;
        if (toast.timer <= 0) showToast("THE SPHERE WON'T LET YOU", 80);
      } else {
        state.gameState = 'win';
        playWin();
        switchTo('win');
        return;
      }
    }

    updateToast();
    updateCamera(player.x, VIEW_WIDTH, WORLD_WIDTH);
  },

  draw: drawWorldAndHUD,

  handleKeyDown(e) {
    // secret unlock (parents only): Shift+K calls the sphere off so the flag
    // works, or skips the cutscene if it's playing
    if (e.shiftKey && (e.key === 'K' || e.key === 'k') && cutscene && cutscene !== 'done') {
      const boss = state.enemies.find(b => b.boss && b.alive);
      if (boss) {
        boss.alive = false;
        boss.squish = 14;
        spawnExplosion(boss.x + boss.w / 2, boss.y + boss.w / 2, '#8effc0');
        playExplosion();
      }
      cutscene = 'done';
      rescueNPC = null;
      showToast('THE SPHERES RETREAT!', 120);
    }
  }
};
