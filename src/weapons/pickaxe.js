import { ctx, drawPickaxeIcon } from '../engine/renderer.js';
import { keys } from '../engine/input.js';
import { isColliding } from '../engine/physics.js';
import { spawnExplosion } from '../entities/particles.js';
import { playPickaxeSwing, playStomp } from '../audio/sfx.js';
import { state } from '../state.js';

// The player starts unarmed — this does nothing until player.hasWeapon is
// true, which only happens once the level 1 boss is defeated and its
// dropped pickaxe is collected (see entities/weaponPickup.js). Melee, not
// the old bazooka's ranged shot: short reach, fast cooldown, no projectile.
export const SWING_COOLDOWN = 30; // twice per second at 60fps — no toast on a blocked swing, just silently gated
export const SWING_DURATION = 16;
const SWING_REACH = 51; // 50% more than the original 34

function swing(player, cutsceneActive) {
  if (cutsceneActive) return;
  if (!player.hasWeapon) return;
  if (player.weaponCooldown > 0) return;

  player.weaponCooldown = SWING_COOLDOWN;
  player.weaponTimer = SWING_DURATION;
  playPickaxeSwing();
}

// Checked every frame the swing animation is active, not just the instant
// the button was pressed. A single-frame check was the original design, but
// at run speed the player can close several px/frame — press a hair too
// early, miss the empty hitbox that frame, and run straight into the enemy
// on the next one, taking a body hit instead of landing the swing. Matching
// the hitbox's active window to the full visible animation (SWING_DURATION)
// makes the weapon land reliably regardless of how fast the player is moving.
function hitEnemiesInRange(player) {
  const hitbox = {
    x: player.facing > 0 ? player.x + player.width : player.x - SWING_REACH,
    y: player.y,
    width: SWING_REACH,
    height: player.height
  };
  for (const enemy of state.enemies) {
    if (!enemy.alive || enemy.boss) continue;
    const eBox = { x: enemy.x, y: enemy.y, width: enemy.w, height: enemy.w };
    if (isColliding(hitbox, eBox)) {
      enemy.alive = false;
      enemy.squish = 14;
      state.score += 150;
      spawnExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.w / 2, '#8effc0');
      playStomp();
    }
  }
}

// Cooldown ticking + the held-key check that swings. Called once per frame
// from the playing scene while gameState === 'playing'.
export function updateWeaponInput(player, cutsceneActive) {
  if (player.weaponCooldown > 0) player.weaponCooldown--;
  if (player.weaponTimer > 0) {
    player.weaponTimer--;
    hitEnemiesInRange(player);
  }
  if (keys['b'] || keys['B']) swing(player, cutsceneActive);
}

// Idle carry: fist tucked in close to the shoulder — the top-front corner
// of the torso, roughly where a shoulder would be if a square had one —
// with the pickaxe resting nearly upright over it, not hanging out at arm's
// length in front of the body.
const IDLE_FIST = (hw, hh, facing) => ({ x: facing * hw * 0.4, y: -hh * 0.85 });
const IDLE_ANGLE = -1.85;

// End of the swing: the handle drawn flat, parallel to the ground. The
// handle in drawPickaxeIcon() runs from (0,0) to (18,-13) before rotation,
// so it's level (screen-space y delta of 0) when rotated by
// atan2(13, 18) — solving 18*sin(a) - 13*cos(a) = 0 for the root that keeps
// sweeping the same direction the swing already travels (the other root
// would reverse direction partway through). The fist still reaches to the
// same forward-and-down spot as before — only the final angle changed, from
// "still tilted" to "fully level."
const STRUCK_FIST = (hw, hh, facing) => ({ x: facing * (hw + 22), y: -hh * 0.12 });
const STRUCK_ANGLE = Math.atan2(13, 18);

// progress: 0 = idle (over the shoulder), 1 = struck (handle level with the
// ground). Shared by both the player's discrete swing (progress driven by
// weaponTimer counting down, below) and the boss's continuous threat swing
// (entities/enemy.js, progress driven by an oscillating phase instead) so
// both read as the same motion.
export function pickaxeAngleAt(progress) {
  return IDLE_ANGLE + (STRUCK_ANGLE - IDLE_ANGLE) * progress;
}

export function pickaxeFistAt(hw, hh, facing, progress) {
  const idle = IDLE_FIST(hw, hh, facing);
  const struck = STRUCK_FIST(hw, hh, facing);
  return {
    x: idle.x + (struck.x - idle.x) * progress,
    y: idle.y + (struck.y - idle.y) * progress
  };
}

// Where the fist should aim while carrying the pickaxe. Callers feed this
// straight into drawMuscleArm() instead of the fixed unarmed reach target,
// so the whole arm visibly moves through the swing along with the weapon —
// previously only the axe rotated, in a hand that stayed planted at the
// same idle spot the entire time. The swing interpolates directly from the
// idle (shoulder) pose to the struck pose, so it starts exactly where the
// arm was already resting instead of popping to a separate wind-up pose first.
export function pickaxeFistTarget(hw, hh, facing, weaponTimer) {
  if (weaponTimer <= 0) return pickaxeFistAt(hw, hh, facing, 0);
  const progress = 1 - weaponTimer / SWING_DURATION; // 0 at swing start -> 1 at the end
  return pickaxeFistAt(hw, hh, facing, progress);
}

// Mining pose (boss cutscene only — see scenes/playingScene.js's 'freeze'
// state): swinging down into the ground instead of a level combat strike.
// Shares the same idle/shoulder start as the combat swing above; only the
// end pose differs. MINE_ANGLE aims the head roughly straight down with a
// slight forward lean (derived the same way as STRUCK_ANGLE: rotating the
// head's local center, ~(20.5, -14.5), until it points mostly toward +y).
//
// The fist reaches out past the body on the facing side, not down the
// centerline (2026-09-20): the pit the boss digs now opens immediately to
// its right rather than under it (carveMiningGap), so a centered chop read
// as the hole appearing somewhere the pick never touched.
const MINE_FIST = (hw, hh, facing) => ({ x: facing * (hw + 12), y: hh * 0.8 });
const MINE_ANGLE = 2.0;

export function miningAngleAt(progress) {
  return IDLE_ANGLE + (MINE_ANGLE - IDLE_ANGLE) * progress;
}

export function miningFistAt(hw, hh, facing, progress) {
  const idle = IDLE_FIST(hw, hh, facing);
  const mine = MINE_FIST(hw, hh, facing);
  return {
    x: idle.x + (mine.x - idle.x) * progress,
    y: idle.y + (mine.y - idle.y) * progress
  };
}

// Drawn in the hand every frame the weapon is carried — persistent once
// earned, not just flickering into view for the swing's 16 frames. `hand`
// is whatever drawMuscleArm() returned for the caller's arm (fed the target
// from pickaxeFistTarget(), above, so hand and axe move together).
//
// scale(facing, 1) before rotating — not folding facing into the angle
// itself — is what keeps the pickaxe pointing in front of the holder on
// both sides. drawPickaxeIcon() always points toward local +x; mirroring
// the axis first makes "+x" mean "away from the body" regardless of which
// way they face, so the same angle looks right both ways instead of
// swinging into their own body on one side.
export function drawHeldPickaxe(hand, facing, weaponTimer) {
  drawHeldPickaxeAt(hand, facing, weaponTimer > 0 ? 1 - weaponTimer / SWING_DURATION : 0);
}

// The same thing, taking progress directly. The weapon registry
// (weapons/registry.js) drives every weapon from a 0..1 progress value so
// they're interchangeable in a hand; this is the pickaxe's entry point for
// that. drawHeldPickaxe above is kept as the timer-taking form its existing
// callers use.
export function drawHeldPickaxeAt(hand, facing, progress) {
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.scale(facing, 1);
  ctx.rotate(pickaxeAngleAt(progress));
  drawPickaxeIcon();
  ctx.restore();
}
