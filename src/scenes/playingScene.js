import { ctx, VIEW_WIDTH, drawBackground } from '../engine/renderer.js';
import { camera, updateCamera, resetCamera } from '../engine/camera.js';
import { state } from '../state.js';
import {
  player, resetPlayer, updatePlayer, drawPlayer, drawPlayerShout,
  setRespawnPoint, resetDustTimer
} from '../entities/player.js';
import { updateEnemies, drawEnemies, spawnEnemies } from '../entities/enemy.js';
import { initBoss } from '../entities/bosses.js';
import { updateRescueNPC, drawRescueNPC } from '../entities/npc.js';
import { updateParticles, drawParticles, resetParticles, spawnExplosion, spawnDust } from '../entities/particles.js';
import { resetCoins, updateCoins, drawCoins } from '../entities/coins.js';
import { updateWeaponPickups, drawWeaponPickups, spawnAmmoPickup } from '../entities/weaponPickup.js';
import {
  updatePlayerWeapon, updateProjectiles, drawProjectiles,
  resetProjectiles, consumePlayerHit
} from '../weapons/combat.js';
import { loadLevel, getLevel } from '../levels/levelLoader.js';
import { drawPlatforms, drawCheckpoints, drawHazards, drawWorldEdge } from '../levels/levelRenderer.js';
import { restoreCarvedGaps } from '../levels/terrain.js';
import { drawBlockHouse } from './blockHouse.js';
import { levels } from '../levels/registry.js';
import { showToast, updateToast, drawHUD, toast } from '../ui/hud.js';
import { playHit, playWin, playGameOver } from '../audio/sfx.js';
import { startMusic } from '../audio/audio.js';
import { switchTo } from './sceneManager.js';
import { recordProgress } from '../save.js';
import { markCutsceneSeen } from '../narrative.js';
import { drawOverlay } from '../ui/overlays.js';
import { hitHazard, checkCheckpoints } from './playing/collisions.js';
import {
  startCutscene, updateCutscene, drawCutsceneWorld, drawCutsceneScreen,
  skipCutscene, isCutsceneActive, activeCutsceneId, currentLocks,
  setWorldTransform, getWorldTransform, hasCompleted, resetCutscenes
} from '../cutscenes/runner.js';
import { pendingCutscene } from '../cutscenes/triggers.js';
import { cutsceneLibrary } from '../cutscenes/library.js';
import { advanceDialogue, isDialogueOpen } from '../ui/dialogue.js';

// How far the view lifts while someone is talking. Conversations happen at
// ground level and the dialogue bar covers the bottom third of the screen,
// so without this the two characters having the conversation are behind it.
//
// Derived, not guessed: the panel's top edge sits at
// VIEW_HEIGHT - PANEL_H - PANEL_MARGIN = 450 - 104 - 14 = 332 (ui/dialogue.js),
// and a speaker standing on the ground occupies world y 388-410. Lifting by
// 96 puts the ground line at 314, which clears the panel with room for a
// 44px-tall Quarrick to stand there whole. A first attempt at 58 cleared
// his head and left the player entirely behind the bar.
//
// Eased rather than snapped — a hard jump on the first line reads as a
// glitch, and every scripted moment in this game is paced to be read.
const DIALOGUE_LIFT = 96;

// Pause is a flag, not a scene transition — switching away from 'playing'
// and back would re-run enter(), which always means "start a run" or
// "retry the level," neither of which is "resume where I was." A flag
// sidesteps that entirely: update() just does nothing while paused.
let paused = false;

// --- the context cutscenes get ---
// Everything a beat is allowed to touch, handed over rather than imported.
// That's what lets a cutscene be exercised on its own (see
// tools/cutscene-runner-probe.html) and stops the next one reaching into
// this module's privates the way the two hand-rolled ones used to.
function makeCutsceneContext() {
  return {
    player,
    state,
    camera,
    get level() { return getLevel(); },
    spawnExplosion,
    spawnDust,
    showToast,
    setWorldTransform,
    finishLevel,
    data: {}   // per-run scratch, replaced by startCutscene
  };
}

function beginCutscene(entry) {
  const def = cutsceneLibrary[entry.id];
  if (!def) {
    console.warn(`level declares cutscene "${entry.id}" but nothing is registered under that id`);
    return;
  }
  startCutscene(def, makeCutsceneContext());
  if (entry.once) markCutsceneSeen(entry.id);
}

// The level-end payoff: advance, or win if this was the last one. Handed to
// cutscenes through the context so the ending can call it without importing
// the registry and the save layer.
function finishLevel() {
  if (state.currentLevelIndex + 1 < levels.length) {
    startLevel(state.currentLevelIndex + 1);
  } else {
    recordProgress(state.currentLevelIndex, state.score);
    state.gameState = 'win';
    playWin();
    switchTo('win');
  }
}

// The boss blocks the way to the edge until its cutscene has resolved.
function bossActive() {
  if (hasCompleted('boss-showdown')) return false;
  // A restored boss is no longer in anyone's way — the Sculptor is beaten by
  // being turned back into a square, not by being killed, so it stays
  // `alive` (and walks off under its own steam) after the fight is won.
  return state.enemies.some(e => e.boss && e.alive && !e.restored);
}

function resetBossAndCutscene() {
  resetCutscenes();
  state.rescueNPC = null;
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
    // A fight restarts from the top, which means the numbers as well as the
    // position. Without this a boss killed just before the player died came
    // back with hp already at zero, its drop already marked as handled, and
    // its phase machine mid-swing — beatable in one hit and paying out
    // nothing. `baseHp`/`baseRestoreHits` are captured at spawn precisely so
    // there is something true to come back to.
    boss.hp = boss.baseHp;
    boss.restoreHits = boss.baseRestoreHits;
    boss.restored = false;
    boss.fleeing = false;
    boss.fleeDir = 0;
    boss.cornersLost = 4;
    boss.hitFlash = 0;
    boss.knockback = 0;
    if (boss.mode === 'fight') initBoss(boss);
  });
  // The fight is restarting, so a drop from a previous attempt that was never
  // picked up would sit stranded next to a boss that's alive again.
  //
  // Only BOSS drops, though. This used to drop every uncollected pickup in
  // the level, which was harmless when the only pickup in the game was the
  // Foreman's pickaxe and actively dangerous once levels started placing
  // their own ammo: dying once anywhere made every remaining triangle in the
  // level vanish, and in level 7 that could leave a player unable to finish
  // the core with no way to get more.
  state.weaponPickups = state.weaponPickups.filter(p => p.collected || !p.fromBoss);
  // and put back whatever ground the boss mined out
  restoreCarvedGaps(getLevel());
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
    // Wipes any cutscene mid-flight too. Not reachable with level 1's own
    // geometry (nothing near the edge can hit the player during the
    // walk-up, and the boss cutscene is barred from digging into that
    // corridor), but a future level's ending could sit somewhere less
    // safe, and a stale scripted walk surviving a respawn would keep
    // driving the post-respawn player toward an edge they're nowhere near.
    resetBossAndCutscene();
  }
}

// Quarrick's own legs during the boss fight. He's an entity, not cutscene
// scratch: the showdown hands control back to the player the moment it's
// over, and he's still walking off-screen after that. Runs in the update
// sequence below, right after the cutscene, which is exactly where the
// hand-rolled version called it from.
function updateRescueNPCEntity() {
  if (!state.rescueNPC) return;
  if (updateRescueNPC(state.rescueNPC, VIEW_WIDTH, camera.x)) state.rescueNPC = null;
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
  level.ammoSpawns.forEach(a => spawnAmmoPickup(a.x, a.y == null ? level.groundY - 30 : a.y, a.amount || 4));
  state.missiles = []; // unused while the bazooka is parked — see weapons/bazooka.js
  resetProjectiles();
  state.restoredCount = 0;
  state.playerTouchedHazard = false;
  resetParticles();
  resetDustTimer();
  resetBossAndCutscene();
  setRespawnPoint(level.playerSpawn.x, level.playerSpawn.y);
  resetPlayer();
  // Starts unarmed every fresh level load — a weapon is earned per level,
  // it doesn't carry over. The one exception is the Cornerstone, which is
  // story equipment rather than a level drop: once Quarrick hands it over
  // it stays handed over, so levels that come after the handoff give it
  // back at spawn (see `startsWith` in the level data).
  player.weapon = level.startsWith || null;
  player.hasWeapon = !!player.weapon;
  player.ammo = level.startsWithAmmo || 0;
  player.weaponTimer = 0;
  player.weaponCooldown = 0;
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
  // Deliberately drawn OUTSIDE the world rotation below, even though the
  // edge transition's spirit is "everything rotates together":
  // drawBackground fills the entire canvas every frame, and rotating a
  // full-canvas fill around an off-center pivot leaves it no longer
  // covering the corners — real gaps flashing through, not a subtle seam.
  // It also doesn't make physical sense for a starfield light-years away to
  // spin from a local 90° tilt of one patch of planet surface.
  drawBackground(camera.x, camera.y);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // The world — everything that tips when the level ends. Set by whichever
  // beat is rotating the level; null for every ordinary frame of play, so
  // this is a no-op transform the rest of the time.
  const spin = getWorldTransform();
  ctx.save();
  if (spin) {
    ctx.translate(spin.pivotX, spin.pivotY);
    ctx.rotate(spin.angle);
    ctx.translate(-spin.pivotX, -spin.pivotY);
  }

  const level = getLevel();
  if (level.house) drawBlockHouse(level.house.x, level.groundY, 1.1);
  drawPlatforms();
  drawWorldEdge(state.frameCount);
  drawHazards();
  drawCheckpoints();
  drawCoins(state.frameCount);
  drawWeaponPickups(state.frameCount);
  drawEnemies(state.frameCount, hasCompleted('boss-showdown'));
  drawProjectiles(state.frameCount);
  drawParticles();
  if (state.rescueNPC) drawRescueNPC(state.rescueNPC, state.frameCount);
  // Anything a cutscene puppets — drawn inside the rotation, so a character
  // standing on the face that's turning turns with it.
  drawCutsceneWorld();
  ctx.restore();

  // The player is drawn OUTSIDE that rotation on purpose: during the leap
  // it's the world that turns, not them. They stay upright through the
  // whole arc and come down on whichever face has swung into place — which
  // is the entire point of the beat. Outside the rotation but still inside
  // the camera translate, so they're positioned in ordinary world
  // coordinates exactly as before.
  drawPlayer(state.frameCount, isCutsceneActive());
  drawPlayerShout();

  ctx.restore();
  drawHUD();
  // Screen-space cutscene layer (the dialogue bar) goes over the HUD.
  drawCutsceneScreen();
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

    // Read once, at the top, and branch in ONE place. The three cutscenes
    // that existed before the runner each hand-rolled their own bail-outs
    // scattered through this function; this is what replaced that.
    //
    // Read BEFORE the cutscene advances, so a beat that ends this frame
    // still governs this frame. That's not a subtlety worth losing: it's
    // what the old code did (its beat switch happened at the END of
    // update, and the next frame's top-of-function check saw the new one),
    // and the edge transition's frame timings are asserted by probes.
    const locks = currentLocks();

    if (locks.physics === 'run') {
      const { fellInPit } = updatePlayer(locks.input === 'locked');
      updatePlayerWeapon(locks.input === 'locked');

      if (fellInPit) {
        playHit();
        loseLife();
        if (state.gameState !== 'playing') return;
      }

      if (hitHazard()) {
        playHit();
        loseLife();
        if (state.gameState !== 'playing') return;
      }

      checkCheckpoints();
    }

    // Start whatever this level says should be playing by now. Nothing
    // about which cutscene, or when, lives in this file any more — see the
    // `cutscenes` block in the level's data.
    if (!isCutsceneActive()) {
      const entry = pendingCutscene(getLevel());
      if (entry) beginCutscene(entry);
    }
    updateCutscene();
    if (state.gameState !== 'playing') return; // a cutscene can end the level
    updateRescueNPCEntity();

    if (locks.physics === 'run') {
      updateEnemies(player, isCutsceneActive());
      updateProjectiles();
      // One read, after everything that can hurt the player has run —
      // contact, a sphere's swing, and a sphere's shot all raise the same
      // flag (see weapons/combat.js).
      if (consumePlayerHit()) {
        playHit();
        loseLife();
        if (state.gameState !== 'playing') return;
      }

      updateParticles();
      updateCoins(player);
      updateWeaponPickups(player);
    }

    updateToast();

    // The boss body-blocks the way to the edge until its cutscene has
    // resolved. The edge cutscene's own trigger can't express "unless the
    // boss is still up" — that's a shove-back with a taunt, not a
    // condition — so it stays here.
    if (bossActive() && !isCutsceneActive()) {
      const level = getLevel();
      const triggerX = level.worldEdgeX - 100;
      if (player.x + player.width >= triggerX) {
        player.x = triggerX - player.width - 30;
        player.velocityX = 0;
        if (toast.timer <= 0) showToast("THE SPHERE WON'T LET YOU", 80);
      }
    }

    if (locks.camera === 'follow') {
      updateCamera(player.x, VIEW_WIDTH, getLevel().worldWidth);
    }

    // Deliberately OUTSIDE the camera lock: say() beats lock the camera to
    // 'scripted' so the scene stops following, and this still has to happen
    // during them. It only ever settles back to 0 when no cutscene is
    // running at all, so a scene that drives camera.y itself — the edge
    // transition's look down over the drop — is never fought for control
    // of the axis.
    if (isDialogueOpen()) {
      camera.y += (DIALOGUE_LIFT - camera.y) * 0.12;
    } else if (!isCutsceneActive()) {
      camera.y += (0 - camera.y) * 0.12;
      if (Math.abs(camera.y) < 0.5) camera.y = 0;
    }
  },

  draw() {
    drawWorldAndHUD();
    if (paused) {
      drawOverlay('PAUSED', 'Press ESC or START to resume', `Score ${state.score} · Level ${state.currentLevelIndex + 1}`, '#5ee7ff');
    }
  },

  handleKeyDown(e, alreadyDown) {
    // Dialogue eats the advance key before anything else can act on it —
    // otherwise the same press that turns the page also makes the player
    // jump the moment control comes back.
    if (isDialogueOpen() && !alreadyDown &&
        (e.key === ' ' || e.key === 'Enter' || e.key === 'b')) {
      advanceDialogue();
      return;
    }

    // Skipping a cutscene is Escape only — NOT "any key" the way the
    // opening cutscene does it. The intro can take any key because the
    // player isn't playing when it runs; these fire mid-stride, very likely
    // with movement and jump being pressed, and "any key" meant an ordinary
    // jump input during the walk-up instantly cleared the level with none
    // of the ending seen. Checked before Escape's own pause toggle below,
    // and before the `paused` early-return so it still works if the game
    // somehow got paused going in.
    if (isCutsceneActive() && e.key === 'Escape' && !alreadyDown) {
      skipCutscene();
      return;
    }

    if (e.key === 'Escape' && !alreadyDown) {
      paused = !paused;
      return;
    }
    if (paused) return; // no other input does anything while paused

    // secret unlock (parents only): Shift+K calls the sphere off so the
    // way clears, or skips the showdown if it's playing
    if (e.shiftKey && (e.key === 'K' || e.key === 'k') &&
        activeCutsceneId() === 'boss-showdown') {
      skipCutscene();
      showToast('THE SPHERES RETREAT!', 120);
    }
  }
};
