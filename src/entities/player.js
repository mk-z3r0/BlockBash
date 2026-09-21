import { keys } from '../engine/input.js';
import { ctx, VIEW_HEIGHT, drawStickLegs, drawMuscleArm } from '../engine/renderer.js';
import { P, isColliding } from '../engine/physics.js';
import { getLevel } from '../levels/levelLoader.js';
import { spawnDust } from './particles.js';
import { playJump } from '../audio/sfx.js';
import { drawHeldPickaxe, pickaxeFistTarget } from '../weapons/pickaxe.js';

export const player = {
  x: 100, y: 0, width: 22, height: 22,
  velocityX: 0, velocityY: 0,
  isOnGround: false,
  facing: 1,
  invincible: 0,
  // Starts unarmed — see weapons/pickaxe.js and entities/weaponPickup.js.
  // Set true only by collecting what the level 1 boss drops; reset per
  // level in scenes/playingScene.js's startLevel(), never on a mid-level
  // death (resetPlayer(), below) since dying shouldn't un-earn it.
  hasWeapon: false,
  weaponTimer: 0,
  weaponCooldown: 0,
  bazookaCooldown: 0, // unused while the bazooka is parked — see weapons/bazooka.js
  coyoteTimer: 0,
  jumpBuffer: 0,
  wasOnGround: false,
  shout: 0,
  respawnFreeze: 0, // frames left of ignoring left/right input after a respawn — see resetPlayer()
  pMeter: 0,      // 0..P.pMeterSegments — full unlocks the pSpeedMax run cap, see physics.js
  pMeterTimer: 0  // frames toward the next fill/drain tick, see physics.js's pMeterFillFrames/pMeterDrainFrames
};

export let respawnPoint = { x: 100, y: 300 };
let dustTimer = 0;

export function setRespawnPoint(x, y) {
  respawnPoint = { x, y };
}

export function resetDustTimer() {
  dustTimer = 0;
}

export function bufferJump() {
  player.jumpBuffer = P.jumpBufferFrames;
}

// --- axis-separated platform collision (2026-09-20) ---
// Move + resolve X, THEN move + resolve Y — never both axes off one
// combined move. The previous approach moved x and y together in one step
// and picked whichever of the four overlaps (left/right/top/bottom) came
// out smallest, which works fine at low speed but misreads a fast landing
// as a side hit once horizontal speed and gravity both grew: landing
// dead-center on a platform's top edge with enough velocityX built up can
// leave the top overlap larger than the side overlap for a frame, so the
// old code would think you'd run into the platform's side instead of
// landing on it. Resolving one axis at a time removes the ambiguity
// entirely — each axis only ever has two candidate sides, picked by the
// sign of that axis's velocity, never by comparing overlap sizes.
//
// Each axis move is substepped so a single frame's move can't tunnel past
// (or otherwise skip testing against) a platform thinner than the move
// itself — e.g. level1's checkpoint poles are 8px wide, and jump/fall
// speed regularly exceeds that in a single frame. Substep size is half the
// smallest solid platform dimension in the level, per the same margin used
// elsewhere in this codebase for "small enough not to skip an edge."
function resolvePlatformsX(platforms) {
  for (const platform of platforms) {
    if (platform.width <= 1) continue; // a fully retracted ledge is not solid
    if (!isColliding(player, platform)) continue;
    if (player.velocityX >= 0) player.x = platform.x - player.width;
    else player.x = platform.x + platform.width;
    player.velocityX = 0;
  }
}

function resolvePlatformsY(platforms) {
  for (const platform of platforms) {
    if (platform.width <= 1) continue;
    if (!isColliding(player, platform)) continue;
    if (player.velocityY >= 0) {
      player.y = platform.y - player.height;
      player.velocityY = 0;
      player.isOnGround = true;
    } else {
      player.y = platform.y + platform.height;
      player.velocityY = 0;
    }
  }
}

function moveAndResolveAxis(axis, platforms) {
  const isX = axis === 'x';
  const velocity = isX ? player.velocityX : player.velocityY;
  if (velocity === 0) return;

  let minDim = Infinity;
  for (const p of platforms) {
    if (p.width <= 1) continue;
    minDim = Math.min(minDim, p.width, p.height);
  }
  const maxStep = Number.isFinite(minDim) ? Math.max(1, minDim / 2) : Math.abs(velocity);
  const steps = Math.max(1, Math.ceil(Math.abs(velocity) / maxStep));
  const stepAmount = velocity / steps;

  for (let i = 0; i < steps; i++) {
    if (isX) player.x += stepAmount; else player.y += stepAmount;
    if (isX) resolvePlatformsX(platforms); else resolvePlatformsY(platforms);
    // a collision just zeroed the velocity for this axis — nothing left to
    // substep, so stop rather than continuing to move at the old velocity
    if ((isX ? player.velocityX : player.velocityY) === 0) break;
  }
}

export function resetPlayer() {
  player.x = respawnPoint.x;
  player.y = respawnPoint.y;
  player.velocityX = 0;
  player.velocityY = 0;
  player.isOnGround = false;
  player.invincible = P.RESPAWN_INVINCIBLE_FRAMES;
  player.respawnFreeze = P.RESPAWN_FREEZE_FRAMES;
  player.coyoteTimer = 0;
  player.jumpBuffer = 0;
  player.wasOnGround = false;
  player.pMeter = 0;
  player.pMeterTimer = 0;
}

// Called once per frame while gameState === 'playing'. Handles movement,
// jumping, gravity, and platform collision. Cross-system reactions (pit
// death, checkpoints, weapon swings) are the caller's job — see
// scenes/playingScene.js.
export function updatePlayer(inputLocked) {
  const level = getLevel();
  // Frozen right after a respawn: ignores left/right (but not jump) so a
  // disoriented player can't immediately walk into an enemy or off a ledge
  // into a pit — see the P.RESPAWN_FREEZE_FRAMES note in physics.js for why
  // invincibility alone (below) never covered the pit case. Checked BEFORE
  // decrementing so the freeze holds for exactly P.RESPAWN_FREEZE_FRAMES full
  // frames, not one fewer (a real off-by-one caught by
  // tools/respawn-safety-probe.html: checking after the decrement let one
  // frame of input through right on the boundary).
  const frozen = player.respawnFreeze > 0;
  if (player.respawnFreeze > 0) player.respawnFreeze--;
  const left = !inputLocked && !frozen && (keys['ArrowLeft'] || keys['a']);
  const right = !inputLocked && !frozen && (keys['ArrowRight'] || keys['d']);
  const running = !inputLocked && keys['Shift'];

  // --- P-meter: fills while |vx| >= runMax, drains otherwise — driven
  // purely by current speed, not by which button is held (see physics.js).
  // Frame counts, not distances, so P.SCALE never applies here. ---
  if (Math.abs(player.velocityX) >= P.runMax) {
    if (++player.pMeterTimer >= P.pMeterFillFrames) {
      player.pMeterTimer = 0;
      player.pMeter = Math.min(P.pMeterSegments, player.pMeter + 1);
    }
  } else if (++player.pMeterTimer >= P.pMeterDrainFrames) {
    player.pMeterTimer = 0;
    player.pMeter = Math.max(0, player.pMeter - 1);
  }
  const hasPMeter = player.pMeter >= P.pMeterSegments;

  // --- horizontal: ONE accel value for every tier (walk/run/P-speed) —
  // only the CAP below differs by tier, never the ramp-up rate. Skidding
  // (input opposing current velocity) uses its own steeper skidDecel;
  // ground friction and easing back down to a cap that just dropped are
  // both ground-only — momentum is preserved in the air except through
  // active steering (airControlMultiplier), matching the real game. See
  // physics.js for why this replaced the old flat ACCEL/TURN_ACCEL model. ---
  const runCap = hasPMeter ? P.pSpeedMax : P.runMax;
  const maxSpeed = running ? runCap : P.walkMax;
  const airborneLocked = !player.isOnGround && P.lockAirMomentum;
  const airMul = player.isOnGround ? 1 : P.airControlMultiplier;
  const hitDir = (left && right) ? 0 : left ? -1 : right ? 1 : 0;

  if (hitDir === 0) {
    if (!airborneLocked) {
      const decel = player.isOnGround ? P.groundFriction : P.airFriction;
      if (player.velocityX > 0) player.velocityX = Math.max(0, player.velocityX - decel);
      else if (player.velocityX < 0) player.velocityX = Math.min(0, player.velocityX + decel);
    }
    // else: airborne-locked with no input held — frozen at takeoff speed
  } else {
    const opposing = (player.velocityX > 0 && hitDir < 0) || (player.velocityX < 0 && hitDir > 0);
    if (!airborneLocked || opposing) {
      player.facing = hitDir;
      if (opposing) {
        player.velocityX += hitDir * P.skidDecel * airMul;
      } else if (Math.abs(player.velocityX) < maxSpeed) {
        player.velocityX += hitDir * P.accel * airMul;
      } else if (player.isOnGround) {
        // above the current cap (e.g. Shift released mid-run) — ease back
        // down to it, grounded only
        player.velocityX -= hitDir * P.groundFriction;
      }
    }
    // else: airborne-locked with input held in the SAME direction as
    // current velocity — frozen at takeoff speed until landing or reversal
  }

  // --- coyote time: still allowed to jump briefly after leaving a ledge ---
  if (player.isOnGround) player.coyoteTimer = P.coyoteFrames;
  else if (player.coyoteTimer > 0) player.coyoteTimer--;

  // --- jump buffer: a press just before landing still fires the jump ---
  if (player.jumpBuffer > 0) player.jumpBuffer--;

  if (!inputLocked && player.jumpBuffer > 0 && player.coyoteTimer > 0) {
    // Jump power is sampled ONCE from horizontal speed at takeoff and
    // latched for the whole jump — never recomputed mid-air. tier = how
    // many speedTierBounds the takeoff |vx| clears, capped at 3.
    let tier = 0;
    for (const bound of P.speedTierBounds) {
      if (Math.abs(player.velocityX) >= bound) tier++;
    }
    tier = Math.min(tier, 3);
    player.velocityY = P.baseJumpVelocity + P.jumpTable[tier];
    player.isOnGround = false;
    player.coyoteTimer = 0;
    player.jumpBuffer = 0;
    playJump();
    spawnDust(player.x + player.width / 2, player.y + player.height, 9, { spread: 3.2, size: 8, life: 20 });
  }

  // --- gravity: three states, re-evaluated every frame — there is no
  // jump-cut velocity multiplier; releasing jump just switches from the
  // light rise gravity to the heavier fall gravity immediately, which is
  // what actually produces variable jump height in the real game. Holding
  // jump back down mid-rise re-enters the light gravity too, as long as vy
  // is still above riseGravityThreshold — that's correct SMB3 behavior,
  // not a bug to fix. See physics.js for the ROM sourcing on all of this. ---
  const jumpHeld = keys[' '] || keys['ArrowUp'] || keys['w'];
  const rising = player.velocityY < -P.riseGravityThreshold && jumpHeld;
  player.velocityY += rising ? P.gravityRise : P.gravityFall;
  player.velocityY = Math.min(player.velocityY, P.terminalVelocity);
  const incomingFallSpeed = player.velocityY;

  // --- move + resolve, one axis at a time — see the note above
  // moveAndResolveAxis for why this replaced a combined move with
  // min-overlap resolution ---
  moveAndResolveAxis('x', level.platforms);

  // --- world bounds (x) --- checked right after the x-axis resolves, same
  // as the world edges were always the x-axis's other kind of wall
  if (player.x < 0) { player.x = 0; player.velocityX = 0; }
  if (player.x + player.width > level.worldWidth) {
    player.x = level.worldWidth - player.width;
    player.velocityX = 0;
  }

  player.isOnGround = false;
  moveAndResolveAxis('y', level.platforms);

  // --- landing dust: a puff sized to how hard the landing was ---
  if (!player.wasOnGround && player.isOnGround) {
    const impact = Math.min(16, Math.max(6, Math.round(incomingFallSpeed * 1.6)));
    spawnDust(player.x + player.width / 2, player.y + player.height, impact, { spread: 4, size: 9, life: 26 });
  }
  player.wasOnGround = player.isOnGround;

  // --- running dust: puffs kicked up behind the player while running on
  // the ground. Gated on the run input itself, not just speed — walking
  // alone can also clear minWalkSpeed, so speed alone doesn't distinguish
  // the two. ---
  if (player.isOnGround && running && Math.abs(player.velocityX) > P.minWalkSpeed) {
    dustTimer--;
    if (dustTimer <= 0) {
      dustTimer = 3;
      const footX = player.x + player.width / 2 - player.facing * (player.width / 2 - 2);
      spawnDust(footX, player.y + player.height - 1, 3, {
        spread: 2.2,
        driftX: -player.facing * 1.2,
        size: 8,
        life: 22
      });
    }
  } else {
    dustTimer = 0;
  }

  // --- invincibility countdown ---
  if (player.invincible > 0) player.invincible--;

  const fellInPit = player.y > VIEW_HEIGHT + 100;
  return { fellInPit };
}

export function drawPlayer(frameCount) {
  if (player.invincible > 0 && Math.floor(frameCount / 4) % 2 === 0) return;

  const moving = player.isOnGround && Math.abs(player.velocityX) > P.minWalkSpeed;
  const legSwing = moving ? Math.sin(frameCount * 0.5) * 14 : 4;
  const hw = player.width / 2;
  const hh = player.height / 2;
  const legLength = 9; // stick-leg length, measured down from the torso to the ground
  const groundY = hh;           // bottom of the hitbox — the actual ground line
  const hipY = hh - legLength;  // bottom of the torso, where the legs attach

  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);

  // stick legs — the feet land exactly on the ground line, not past it
  drawStickLegs(hipY, groundY, legSwing);

  // the torso sits on top of the legs (shifted up by the leg length), not
  // sunk down to the ground itself
  ctx.save();
  ctx.translate(0, -legLength);

  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(-hw, -hh, player.width, player.height);
  ctx.strokeStyle = '#c99a2e';
  ctx.lineWidth = 2;
  ctx.strokeRect(-hw, -hh, player.width, player.height);

  // one muscular arm on whichever side the character is facing, rooted at
  // the center of the square — the same art the spheres use. Once the
  // pickaxe is earned, the fist aims at a carry/swing target instead of the
  // fixed unarmed reach, so the arm itself moves with the weapon rather
  // than holding one static pose while only the axe rotates in its hand.
  const fist = player.hasWeapon
    ? pickaxeFistTarget(hw, hh, player.facing, player.weaponTimer)
    : { x: player.facing * (hw + 17), y: -hh * 0.35 };
  const hand = drawMuscleArm(0, -hh * 0.1, fist.x, fist.y);

  // persistent once earned — drawn every frame, not just during the 16-frame
  // swing window, so it doesn't flicker in and out of view
  if (player.hasWeapon) {
    drawHeldPickaxe(hand, player.facing, player.weaponTimer);
  }
  ctx.restore();
  ctx.restore();
}

export function drawPlayerShout() {
  if (player.shout <= 0) return;
  const cx = player.x + player.width / 2;
  const cy = player.y - 14;
  ctx.save();
  ctx.globalAlpha = Math.min(1, player.shout / 10);
  ctx.fillStyle = '#fffbe0';
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff4d8d';
  ctx.font = 'bold 15px Trebuchet MS, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', cx, cy + 5);
  ctx.restore();
}
