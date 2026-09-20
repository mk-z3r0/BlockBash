import { keys } from '../engine/input.js';
import { ctx, VIEW_HEIGHT, drawStickLegs, drawMuscleArm } from '../engine/renderer.js';
import {
  GRAVITY_UP, GRAVITY_DOWN, ACCEL, FRICTION, AIR_FRICTION, TURN_ACCEL,
  WALK_MAX_SPEED, RUN_MAX_SPEED,
  JUMP_FORCE, JUMP_CUT_MULTIPLIER, COYOTE_FRAMES, JUMP_BUFFER_FRAMES,
  RESPAWN_FREEZE_FRAMES, RESPAWN_INVINCIBLE_FRAMES,
  isColliding
} from '../engine/physics.js';
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
  jumpCut: true,
  wasOnGround: false,
  shout: 0,
  respawnFreeze: 0 // frames left of ignoring left/right input after a respawn — see resetPlayer()
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
  player.jumpBuffer = JUMP_BUFFER_FRAMES;
}

export function resetPlayer() {
  player.x = respawnPoint.x;
  player.y = respawnPoint.y;
  player.velocityX = 0;
  player.velocityY = 0;
  player.isOnGround = false;
  player.invincible = RESPAWN_INVINCIBLE_FRAMES;
  player.respawnFreeze = RESPAWN_FREEZE_FRAMES;
  player.coyoteTimer = 0;
  player.jumpBuffer = 0;
  player.jumpCut = true;
  player.wasOnGround = false;
}

// Called once per frame while gameState === 'playing'. Handles movement,
// jumping, gravity, and platform collision. Cross-system reactions (pit
// death, checkpoints, weapon swings) are the caller's job — see
// scenes/playingScene.js.
export function updatePlayer(inputLocked) {
  const level = getLevel();
  // Frozen right after a respawn: ignores left/right (but not jump) so a
  // disoriented player can't immediately walk into an enemy or off a ledge
  // into a pit — see the RESPAWN_FREEZE_FRAMES note in physics.js for why
  // invincibility alone (below) never covered the pit case. Checked BEFORE
  // decrementing so the freeze holds for exactly RESPAWN_FREEZE_FRAMES full
  // frames, not one fewer (a real off-by-one caught by
  // tools/respawn-safety-probe.html: checking after the decrement let one
  // frame of input through right on the boundary).
  const frozen = player.respawnFreeze > 0;
  if (player.respawnFreeze > 0) player.respawnFreeze--;
  const left = !inputLocked && !frozen && (keys['ArrowLeft'] || keys['a']);
  const right = !inputLocked && !frozen && (keys['ArrowRight'] || keys['d']);
  const running = !inputLocked && keys['Shift'];
  const maxSpeed = running ? RUN_MAX_SPEED : WALK_MAX_SPEED;

  if (left && !right) {
    if (player.velocityX > 0) player.velocityX -= TURN_ACCEL; // reversing: extra kick to kill old momentum
    player.velocityX -= ACCEL;
    player.facing = -1;
    // clamped only while actively accelerating — see the note below on why
    // this doesn't happen unconditionally every frame
    player.velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, player.velocityX));
  } else if (right && !left) {
    if (player.velocityX < 0) player.velocityX += TURN_ACCEL;
    player.velocityX += ACCEL;
    player.facing = 1;
    player.velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, player.velocityX));
  } else {
    // No direction held: friction only, no speed-cap clamp. The cap used to
    // apply unconditionally every frame, which meant releasing Shift
    // mid-air (maxSpeed dropping from RUN to WALK) instantly chopped
    // existing run-speed momentum down to the walk cap on the very next
    // frame, even with AIR_FRICTION at 0 — a second, more subtle way the
    // same "why did I stop over the pit" bug could happen. Momentum should
    // only change via friction (grounded) or active steering (the branches
    // above), never a passive clamp reacting to a cap that just changed.
    const friction = player.isOnGround ? FRICTION : AIR_FRICTION;
    if (player.velocityX > 0) player.velocityX = Math.max(0, player.velocityX - friction);
    else if (player.velocityX < 0) player.velocityX = Math.min(0, player.velocityX + friction);
  }

  // --- coyote time: still allowed to jump briefly after leaving a ledge ---
  if (player.isOnGround) player.coyoteTimer = COYOTE_FRAMES;
  else if (player.coyoteTimer > 0) player.coyoteTimer--;

  // --- jump buffer: a press just before landing still fires the jump ---
  if (player.jumpBuffer > 0) player.jumpBuffer--;

  if (!inputLocked && player.jumpBuffer > 0 && player.coyoteTimer > 0) {
    player.velocityY = JUMP_FORCE;
    player.isOnGround = false;
    player.coyoteTimer = 0;
    player.jumpBuffer = 0;
    player.jumpCut = false;
    playJump();
    spawnDust(player.x + player.width / 2, player.y + player.height, 9, { spread: 3.2, size: 8, life: 20 });
  }

  // --- variable jump height: releasing the key early cuts the jump short ---
  const jumpHeld = keys[' '] || keys['ArrowUp'] || keys['w'];
  if (!jumpHeld && !player.jumpCut && player.velocityY < 0) {
    player.velocityY *= JUMP_CUT_MULTIPLIER;
    player.jumpCut = true;
  }

  // --- gravity: heavier on the way down for a snappier, more predictable arc ---
  player.velocityY += (player.velocityY < 0) ? GRAVITY_UP : GRAVITY_DOWN;
  const incomingFallSpeed = player.velocityY;

  // --- move ---
  player.x += player.velocityX;
  player.y += player.velocityY;

  // --- world bounds ---
  if (player.x < 0) { player.x = 0; player.velocityX = 0; }
  if (player.x + player.width > level.worldWidth) {
    player.x = level.worldWidth - player.width;
    player.velocityX = 0;
  }

  // --- platform collisions ---
  player.isOnGround = false;
  for (const platform of level.platforms) {
    if (platform.width <= 1) continue; // a fully retracted ledge is not solid
    if (isColliding(player, platform)) {
      const overlapLeft   = (player.x + player.width) - platform.x;
      const overlapRight  = (platform.x + platform.width) - player.x;
      const overlapTop    = (player.y + player.height) - platform.y;
      const overlapBottom = (platform.y + platform.height) - player.y;
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapTop && player.velocityY >= 0) {
        player.y = platform.y - player.height;
        player.velocityY = 0;
        player.isOnGround = true;
      } else if (minOverlap === overlapBottom && player.velocityY < 0) {
        player.y = platform.y + platform.height;
        player.velocityY = 0;
      } else if (minOverlap === overlapLeft && player.velocityX >= 0) {
        player.x = platform.x - player.width;
        player.velocityX = 0;
      } else if (minOverlap === overlapRight && player.velocityX <= 0) {
        player.x = platform.x + platform.width;
        player.velocityX = 0;
      }
    }
  }

  // --- landing dust: a puff sized to how hard the landing was ---
  if (!player.wasOnGround && player.isOnGround) {
    const impact = Math.min(16, Math.max(6, Math.round(incomingFallSpeed * 1.6)));
    spawnDust(player.x + player.width / 2, player.y + player.height, impact, { spread: 4, size: 9, life: 26 });
  }
  player.wasOnGround = player.isOnGround;

  // --- running dust: puffs kicked up behind the player while running on
  // the ground. Gated on the run input itself, not just speed — walking
  // already clears the old 0.6 speed threshold on its own now that walk
  // is slower but still >0.6, so speed alone doesn't distinguish them. ---
  if (player.isOnGround && running && Math.abs(player.velocityX) > 0.6) {
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

  const moving = player.isOnGround && Math.abs(player.velocityX) > 0.6;
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
