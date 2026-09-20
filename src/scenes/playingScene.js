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
import { updateParticles, drawParticles, resetParticles, spawnExplosion, spawnDust } from '../entities/particles.js';
import { resetCoins, updateCoins, drawCoins } from '../entities/coins.js';
import { spawnWeaponPickup, updateWeaponPickups, drawWeaponPickups } from '../entities/weaponPickup.js';
import { updateWeaponInput } from '../weapons/pickaxe.js';
import { loadLevel, getLevel } from '../levels/levelLoader.js';
import { drawPlatforms, drawGoal, drawCheckpoints, drawHazards } from '../levels/levelRenderer.js';
import { drawBlockHouse } from './blockHouse.js';
import { levels } from '../levels/registry.js';
import { showToast, updateToast, drawHUD, toast } from '../ui/hud.js';
import { playHit, playCheckpoint, playPickaxeReady, playPickaxeSwing, playPickaxeMining, playExplosion, playWin, playGameOver } from '../audio/sfx.js';
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
// The boss's mining swings actually carve a gap out of the ground it's
// standing over partway through 'freeze' (see carveMiningGap) — this
// tracks the swap so resetBossAndCutscene can put the original ground back
// on a mid-level retry. On a fresh level load, loadLevel() hands back a
// brand new platforms array anyway, so restoring against a stale reference
// here is a harmless no-op (the indexOf lookups just find nothing).
let minedGap = null;

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
    boss.speed = Math.abs(boss.speed) || 0.96;
    boss.mining = false;
  });
  // the fight is restarting — any drop from a previous attempt that never
  // got picked up (the player died between the boss dying and reaching it)
  // would otherwise sit stranded next to a boss that's alive again
  state.weaponPickups = state.weaponPickups.filter(p => p.collected);

  // put back the ground the boss mined out, if any — see minedGap's note
  if (minedGap) {
    const platforms = getLevel().platforms;
    const li = platforms.indexOf(minedGap.leftPiece);
    if (li !== -1) platforms.splice(li, 1, minedGap.originalSeg);
    const ri = platforms.indexOf(minedGap.rightPiece);
    if (ri !== -1) platforms.splice(ri, 1);
    minedGap = null;
  }
}

// Carves a ~2-block gap out of the ground segment the boss is standing on,
// centered under it — called once partway through the 'freeze' mining
// beat (see updateCutscene) so the dust/sound it's already spawning reads
// as actually reshaping the world, not just miming it. Only ever removes
// ground near the boss's own patrol area (far past where the player is
// frozen at wakeX), and the gap is small enough to clear on a plain walk —
// this is a "hey, look what it did" beat on the way to the goal, not a
// hazard sprung on the player mid-cutscene.
function carveMiningGap(boss) {
  if (minedGap) return; // once per cutscene run
  const level = getLevel();
  const center = boss.x + boss.w / 2;
  const seg = level.platforms.find(p => p.ground && center >= p.x && center <= p.x + p.width);
  if (!seg) return;

  const gapWidth = 44; // ~2 blocks — comfortably walk-clearable
  const margin = 20;   // leave at least this much solid ground on each side
  const gapStart = Math.max(seg.x + margin, center - gapWidth / 2);
  const gapEnd = Math.min(seg.x + seg.width - margin, gapStart + gapWidth);
  if (gapEnd - gapStart < 20) return; // segment too narrow to safely carve

  const leftPiece = { x: seg.x, y: seg.y, width: gapStart - seg.x, height: seg.height, ground: true };
  const rightPiece = { x: gapEnd, y: seg.y, width: (seg.x + seg.width) - gapEnd, height: seg.height, ground: true };
  const idx = level.platforms.indexOf(seg);
  level.platforms.splice(idx, 1, leftPiece, rightPiece);
  minedGap = { originalSeg: seg, leftPiece, rightPiece };

  spawnExplosion(center, level.groundY, '#8a6a45');
  spawnDust(center, level.groundY, 18, { color: 'rgba(120, 90, 60, 0.9)', spread: 5.5, size: 12, life: 34 });
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
      boss.mining = true;
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
      // The boss spends this beat digging rather than idly revving — reads
      // as "reshaping the world." swingPhase%26===7 lands the sound/
      // particles near the downswing's peak (progress=1 at
      // swingPhase*0.24≈π/2, i.e. swingPhase≈6.5), not at %26===0 which is
      // the raised (progress=0) point in the same oscillation.
      if (boss.swingPhase % 26 === 7) {
        playPickaxeMining();
        spawnDust(boss.x + boss.w / 2, getLevel().groundY, 10, {
          color: 'rgba(120, 90, 60, 0.85)',
          spread: 3.5,
          size: 10,
          life: 26
        });
        // The third swing (of ~5 across the freeze beat) is the one that
        // actually breaks through — a couple of ordinary-looking mining
        // swings first, then the ground visibly gives way, rather than
        // carving it on the very first hit before the player's had a beat
        // to read "it's digging."
        if (boss.swingPhase === 59) carveMiningGap(boss);
      }
    }
    if (cutsceneTimer > 120) {
      cutscene = 'charge';
      cutsceneTimer = 0;
      if (boss) boss.mining = false; // stops digging to charge — can't do both
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
