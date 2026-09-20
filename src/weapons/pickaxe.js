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

// Struck pose at the end of a swing: reaching forward and down, well past
// horizontal — this is what SWING_REACH's hitbox is modeled on.
const STRUCK_FIST = (hw, hh, facing) => ({ x: facing * (hw + 22), y: -hh * 0.12 });
const STRUCK_ANGLE = -0.15;

// Where the fist should aim while carrying the pickaxe. Callers feed this
// straight into drawMuscleArm() instead of the fixed unarmed reach target,
// so the whole arm visibly moves through the swing along with the weapon —
// previously only the axe rotated, in a hand that stayed planted at the
// same idle spot the entire time. The swing interpolates directly from the
// idle (shoulder) pose to the struck pose, so it starts exactly where the
// arm was already resting instead of popping to a separate wind-up pose first.
export function pickaxeFistTarget(hw, hh, facing, weaponTimer) {
  const idle = IDLE_FIST(hw, hh, facing);
  if (weaponTimer <= 0) return idle;
  const struck = STRUCK_FIST(hw, hh, facing);
  const progress = 1 - weaponTimer / SWING_DURATION; // 0 at swing start -> 1 at the end
  return {
    x: idle.x + (struck.x - idle.x) * progress,
    y: idle.y + (struck.y - idle.y) * progress
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
  const angle = weaponTimer > 0
    ? IDLE_ANGLE + (STRUCK_ANGLE - IDLE_ANGLE) * (1 - weaponTimer / SWING_DURATION)
    : IDLE_ANGLE;
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.scale(facing, 1);
  ctx.rotate(angle);
  drawPickaxeIcon();
  ctx.restore();
}
