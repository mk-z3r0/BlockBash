import { ctx, VIEW_WIDTH, VIEW_HEIGHT, drawBackground } from '../engine/renderer.js';
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
import { drawPlatforms, drawCheckpoints, drawHazards, drawWorldEdge } from '../levels/levelRenderer.js';
import { drawBlockHouse } from './blockHouse.js';
import { levels } from '../levels/registry.js';
import { showToast, updateToast, drawHUD, toast } from '../ui/hud.js';
import { playHit, playCheckpoint, playPickaxeReady, playPickaxeSwing, playPickaxeMining, playExplosion, playWin, playGameOver, playJump } from '../audio/sfx.js';
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

// --- Edge-of-the-world transition: null -> 'approach' -> 'brink' ->
// 'leap' -> 'land' -> (advances to the next level, or wins if this was the
// last one). The cube-planet premise made literal: the level doesn't just
// end, the player walks to the edge of this face, looks down, jumps — and
// the world rotates 90° underneath them so they come down on the next face.
//
// Same "state machine scoped to this scene" shape as the boss cutscene
// above, not a separate scene, because it needs the same live world state
// (platforms/player/camera) that scene already owns — see the Phase 0 notes
// on why cutscenes live here for now.
let transition = null;
let transitionTimer = 0;
// The rotation applied to the world around the edge point in
// drawWorldAndHUD, 0 (untouched) through -PI/2 (fully tipped). Kept
// separate from transitionTimer/transition so drawWorldAndHUD doesn't need
// to know which beat produced this frame's angle, only what it currently is.
let transitionAngle = 0;
// Where the leap started, captured when 'leap' begins so the arc has a
// fixed origin to interpolate from rather than chasing a moving player.
let leapFromX = 0;

// How close to the edge the player has to get for the ending to start.
// There's no goal flag any more (2026-09-21) — the edge IS the goal — so
// this is what replaces touching it. 100px keeps the old pacing exactly:
// it's where the flag used to stand, leaving the last stretch of ground as
// the scripted walk-up.
const EDGE_TRIGGER_MARGIN = 100;

// Auto-walk speed during 'approach' — deliberately gentler than the
// player's own walk cap (see physics.js's P.walkMax): this is a scripted,
// slightly reverent "arriving at the edge" walk, not a normal run to it.
const APPROACH_SPEED = 1.6;
const APPROACH_ACCEL = 0.12;
// Safety cap on 'approach' — normally it ends as soon as the player's
// walked to the edge, this just guarantees the transition can't hang
// forever if a level's geometry is ever unusual enough that the target is
// never quite reached.
const APPROACH_MAX_FRAMES = 150;
// Long enough for the camera pan below to actually land and be read as a
// look down over the drop, rather than a twitch before the jump.
const BRINK_FRAMES = 80;
const LEAP_FRAMES = 84;
const LEAP_HEIGHT = 88;   // arc peak above the surface
const LEAP_REACH = 74;    // how far past the corner the player comes down
// The world finishes rotating a little before the player lands, so they're
// coming down onto ground that's already settled rather than onto something
// still visibly moving.
const LEAP_ROTATE_DONE_AT = 0.82;
const LAND_FRAMES = 34;
// How fast the camera eases toward centring the player during 'brink'.
// Slow enough to read as a deliberate look downward.
const BRINK_CAMERA_EASE = 0.07;

// Smoothstep-style ease — the rotation should read as a deliberate tip,
// not a linear spin at constant speed. Standard cubic ease-in-out.
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Starts the edge transition — called once, from the edge-proximity check
// in update(), once the boss is no longer blocking the way. Locks input the
// same way the boss cutscene does (see `inputLocked` in update()).
function beginEdgeTransition() {
  transition = 'approach';
  transitionTimer = 0;
  transitionAngle = 0;
  player.velocityY = 0;
}

// Advances whichever beat is active. Split out of update() because
// 'approach'/'brink' still want the rest of update()'s normal per-frame
// work (particles, coin bob, enemy patrol) running alongside them, while
// 'leap'/'land' deliberately don't — see update()'s own top-of-function
// branch for that split.
function updateEdgeTransition() {
  const level = getLevel();
  const edgeStopX = level.worldEdgeX - player.width;

  if (transition === 'approach') {
    player.facing = 1;
    player.velocityX = Math.min(player.velocityX + APPROACH_ACCEL, APPROACH_SPEED);
    transitionTimer++;
    if (player.x >= edgeStopX || transitionTimer > APPROACH_MAX_FRAMES) {
      player.x = edgeStopX;
      player.velocityX = 0;
      transition = 'brink';
      transitionTimer = 0;
    }
    return;
  }

  if (transition === 'brink') {
    // Stand at the lip and look down. The camera centres the player on
    // both axes — x as well as y, so the empty space past the edge takes
    // up the whole right half of the screen instead of being crammed
    // against the frame — which is the only way the drop is legible at
    // all, since there's deliberately nothing drawn out there to give it
    // scale (see levelRenderer.js's drawWorldEdge).
    player.velocityX = 0;
    camera.x += ((player.x + player.width / 2 - VIEW_WIDTH / 2) - camera.x) * BRINK_CAMERA_EASE;
    camera.y += ((player.y + player.height / 2 - VIEW_HEIGHT / 2) - camera.y) * BRINK_CAMERA_EASE;
    transitionTimer++;
    if (transitionTimer > BRINK_FRAMES) {
      transition = 'leap';
      transitionTimer = 0;
      leapFromX = player.x;
      playJump();
    }
    return;
  }

  if (transition === 'leap') {
    // Fully scripted: a fixed arc out over the edge while the world turns
    // underneath. Not physics-driven, because "down" is exactly the thing
    // that's changing during this beat — running gravity through it would
    // mean picking one of the two floors to fall toward, and it looks
    // wrong against either. The camera holds still so the corner the world
    // is pivoting around stays put on screen.
    transitionTimer++;
    const t = Math.min(1, transitionTimer / LEAP_FRAMES);
    const surfaceY = level.groundY - player.height;
    player.x = leapFromX + (level.worldEdgeX + LEAP_REACH - leapFromX) * t;
    player.y = surfaceY - LEAP_HEIGHT * Math.sin(Math.PI * t);
    player.facing = 1;

    const spin = Math.min(1, t / LEAP_ROTATE_DONE_AT);
    transitionAngle = -Math.PI / 2 * easeInOutCubic(spin);

    if (t >= 1) {
      player.y = surfaceY; // down on the new face, feet on its surface
      transition = 'land';
      transitionTimer = 0;
    }
    return;
  }

  if (transition === 'land') {
    transitionTimer++;
    if (transitionTimer > LAND_FRAMES) finishEdgeTransition();
  }
}

// The payoff — the same branch the goal collision used to run inline before
// any of this existed: advance to the next level, or win if this was the
// last one. Also what the skip key jumps straight to.
function finishEdgeTransition() {
  transition = null;
  transitionTimer = 0;
  transitionAngle = 0;
  if (state.currentLevelIndex + 1 < levels.length) {
    startLevel(state.currentLevelIndex + 1);
  } else {
    recordProgress(state.currentLevelIndex, state.score);
    state.gameState = 'win';
    playWin();
    switchTo('win');
  }
}

// Pause is a flag, not a scene transition — switching away from 'playing'
// and back would re-run enter(), which always means "start a run" or
// "retry the level," neither of which is "resume where I was." A flag
// sidesteps that entirely: update() just does nothing while paused.
let paused = false;

function bossActive() {
  // the boss blocks the way to the edge until the cutscene NPC has dealt
  // with it — see the edge-proximity check in update()
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

// Where the boss's pickaxe is landing while it mines: just past its right
// edge, since it faces right through the whole 'freeze' beat.
function digPointFor(boss) {
  return boss.x + boss.w + 8;
}

// Carves a ~2-block gap out of the ground immediately to the RIGHT of the
// boss — never under it. Enemies have no ground collision of their own
// (see updateEnemies), so a pit opening under the boss's feet would just
// leave it hanging in mid-air over its own hole; digging to the side it's
// actually facing keeps the whole beat readable. Called once partway
// through the mining beat (see updateCutscene) so the dust/sound it's
// already spawning reads as actually reshaping the world, not miming it.
// The gap is small enough to clear on a plain walk — a "hey, look what it
// did" beat on the way to the goal, not a hazard sprung on the player.
function carveMiningGap(boss) {
  if (minedGap) return; // once per cutscene run
  const level = getLevel();
  const digX = digPointFor(boss);
  const seg = level.platforms.find(p => p.ground && digX >= p.x && digX <= p.x + p.width);
  if (!seg) return;

  const gapWidth = 44; // ~2 blocks — comfortably walk-clearable
  const margin = 20;   // leave at least this much solid ground on each side
  // Never dig into the last stretch before the edge. The player's scripted
  // walk-up to the edge runs with real physics (see updateEdgeTransition's
  // 'approach'), so a hole anywhere in that corridor wouldn't be a
  // decoration — they'd walk straight into it mid-cutscene.
  const approachGuard = level.worldEdgeX - EDGE_TRIGGER_MARGIN - 24;
  const gapStart = Math.max(seg.x + margin, digX);
  const gapEnd = Math.min(seg.x + seg.width - margin, approachGuard, gapStart + gapWidth);
  if (gapEnd - gapStart < 20) return; // no room to carve without hitting something

  const leftPiece = { x: seg.x, y: seg.y, width: gapStart - seg.x, height: seg.height, ground: true };
  const rightPiece = { x: gapEnd, y: seg.y, width: (seg.x + seg.width) - gapEnd, height: seg.height, ground: true };
  const idx = level.platforms.indexOf(seg);
  level.platforms.splice(idx, 1, leftPiece, rightPiece);
  minedGap = { originalSeg: seg, leftPiece, rightPiece };

  const center = (gapStart + gapEnd) / 2;
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
    // Not reachable with level 1's own geometry today (nothing near the
    // edge can hit the player during 'approach'/'brink' — no enemy patrol
    // reaches it, no hazard or gap exists past the boss fight, and
    // carveMiningGap is explicitly barred from digging into that corridor),
    // but a future level's ending could sit somewhere less safe, and a
    // stale 'approach'/'brink' surviving a respawn would keep silently
    // driving the post-respawn player toward an edge they're nowhere near
    // anymore. 'leap'/'land' can't be interrupted by a death at all —
    // update() returns before any hit/pit check runs during those two.
    transition = null;
    transitionTimer = 0;
    transitionAngle = 0;
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
      // No "!" yet — it hasn't noticed the player, it's busy digging. That
      // beat belongs to 'turn' below. (updateEnemies skips its own shout
      // countdown entirely while a cutscene is active, so a bubble set here
      // would just hang over the boss for the whole scene.)
      // Faces right for the whole mining beat — it hasn't noticed the
      // player yet, it's busy digging. Facing is read off the sign of
      // `speed` (see drawEnemies), and the boss stops patrolling the
      // moment it's awake, so setting it once here holds until the 'turn'
      // beat flips it back. The hole it digs lands on this same side.
      boss.speed = Math.abs(boss.speed);
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
        // dust flies from where the pick actually lands (its right side),
        // not from under the boss — same spot the gap opens up
        spawnDust(digPointFor(boss), getLevel().groundY, 10, {
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
      cutscene = 'turn';
      cutsceneTimer = 0;
      if (boss) boss.mining = false; // stops digging to look up — can't do both
    }
  }

  // Beat between digging and charging: the boss turns away from its fresh
  // hole, spots the player, and brandishes the pickaxe before it moves.
  // Without this the turn and the charge happen on the same frame, which
  // reads as the boss having known you were there the whole time.
  if (cutscene === 'turn') {
    player.velocityX = 0;
    player.shout = 30;
    cutsceneTimer++;
    const boss = state.enemies.find(e => e.boss && e.alive);
    if (boss) {
      boss.speed = -Math.abs(boss.speed); // face left, toward the player
      boss.swingPhase++;
      if (cutsceneTimer === 1) {
        boss.shout = 45; // "!" — it's seen you
        playPickaxeReady();
      }
    }
    if (cutsceneTimer > 45) {
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
  // Deliberately drawn OUTSIDE the pivot-rotation block below, even though
  // the edge transition's spirit is "everything rotates together":
  // drawBackground fills the entire canvas (0,0,VIEW_WIDTH,VIEW_HEIGHT)
  // every frame, and rotating a full-canvas fill around an off-center pivot
  // leaves it no longer covering the canvas corners — real gaps flashing
  // through at the edges, not a subtle seam. It also doesn't make physical
  // sense for a starfield light-years away to visibly spin from a local 90°
  // tilt of one small patch of planet surface. Everything that's actually
  // PART of the world (ground, platforms, the edge wall, the player,
  // enemies, particles) still rotates together below.
  drawBackground(camera.x, camera.y);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // The world — everything that tips when the level ends. The rotation
  // pivots around the literal edge point (worldEdgeX, groundY); see
  // updateEdgeTransition(). transitionAngle is 0 the rest of the time, so
  // this is a no-op transform for every normal frame of play.
  ctx.save();
  if (transitionAngle !== 0) {
    const level = getLevel();
    ctx.translate(level.worldEdgeX, level.groundY);
    ctx.rotate(transitionAngle);
    ctx.translate(-level.worldEdgeX, -level.groundY);
  }

  const house = getLevel().house;
  if (house) drawBlockHouse(house.x, getLevel().groundY, 1.1);
  drawPlatforms();
  drawWorldEdge(state.frameCount);
  drawHazards();
  drawCheckpoints();
  drawCoins(state.frameCount);
  drawWeaponPickups(state.frameCount);
  drawEnemies(state.frameCount, cutscene === 'done');
  drawParticles();
  if (rescueNPC) drawRescueNPC(rescueNPC, state.frameCount);
  ctx.restore();

  // The player is drawn OUTSIDE that rotation on purpose: during the leap
  // it's the world that turns, not them. They stay upright through the
  // whole arc and come down on whichever face has swung into place — which
  // is the entire point of the beat, and reads completely differently from
  // the player spinning along with the scenery. Outside the rotation but
  // still inside the camera translate, so they're positioned in ordinary
  // world coordinates exactly as before.
  drawPlayer(state.frameCount);
  drawPlayerShout();

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

    // 'leap'/'land' are pure choreography — the player is on a scripted arc
    // and the world is spinning around its own edge underneath them, so
    // there's no meaningful "up" to apply gravity toward and nothing
    // stable to collide against. Advance only the transition's own timer
    // and skip player/enemy/particle physics entirely for these two beats.
    // ('approach'/'brink' are handled further down, alongside the rest of
    // update()'s normal per-frame work, same as the boss cutscene's
    // 'freeze'/'charge' beats already are — only the leap needs this
    // harder cutoff.)
    if (transition === 'leap' || transition === 'land') {
      updateEdgeTransition();
      return;
    }

    const inputLocked = !!(cutscene && cutscene !== 'done') || !!transition;

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

    // 'approach'/'brink': the scripted walk-to-the-edge beats. Everything
    // above still runs (particles, coin bob, enemy patrol stay alive right
    // up to the edge), but the trigger check and camera-follow below are
    // meaningless once we're already walking the last stretch — and
    // 'brink' drives the camera itself — so bail out before reaching them.
    if (transition) {
      updateEdgeTransition();
      updateToast();
      return;
    }

    // Reaching the edge is what ends the level now — there's no goal flag
    // to touch (2026-09-21). Triggering a margin short of the actual drop
    // leaves room for the scripted walk-up, and means the player can never
    // out-run the trigger and walk off the edge under their own power.
    const level = getLevel();
    const triggerX = level.worldEdgeX - EDGE_TRIGGER_MARGIN;
    if (player.x + player.width >= triggerX) {
      if (bossActive()) {
        // the sphere body-blocks the way — taunt and shove the player back
        player.x = triggerX - player.width - 30;
        player.velocityX = 0;
        if (toast.timer <= 0) showToast("THE SPHERE WON'T LET YOU", 80);
      } else {
        beginEdgeTransition();
        return;
      }
    }

    updateToast();
    updateCamera(player.x, VIEW_WIDTH, level.worldWidth);
  },

  draw() {
    drawWorldAndHUD();
    if (paused) {
      drawOverlay('PAUSED', 'Press ESC or START to resume', `Score ${state.score} · Level ${state.currentLevelIndex + 1}`, '#5ee7ff');
    }
  },

  handleKeyDown(e, alreadyDown) {
    // Skipping the ending is Escape only — NOT "any key" the way the
    // opening cutscene does it (2026-09-21). The intro can take any key
    // because the player isn't playing when it runs; this fires while
    // they're mid-stride, very likely still holding or tapping movement
    // and jump, and "any key" meant an ordinary jump input during the
    // walk-up instantly cleared the level with none of the ending seen.
    // Checked before Escape's own pause toggle below, so Escape skips
    // rather than pausing mid-leap, and before the `paused` early-return
    // so it still works if the game somehow got paused going into this.
    if (transition && e.key === 'Escape' && !alreadyDown) {
      finishEdgeTransition();
      return;
    }

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
