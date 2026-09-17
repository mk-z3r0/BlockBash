import { keys } from '../engine/input.js';
import { ctx, VIEW_HEIGHT, drawStickLegs, drawMuscleArm } from '../engine/renderer.js';
import {
  GRAVITY_UP, GRAVITY_DOWN, ACCEL, FRICTION, TURN_ACCEL, MAX_SPEED,
  JUMP_FORCE, JUMP_CUT_MULTIPLIER, COYOTE_FRAMES, JUMP_BUFFER_FRAMES,
  WORLD_WIDTH, isColliding
} from '../engine/physics.js';
import { platforms, trickLip, updateDynamicPlatforms } from '../levels/level1.js';
import { spawnDust } from './particles.js';
import { playJump } from '../audio/sfx.js';

export const player = {
  x: 100, y: 0, width: 22, height: 22,
  velocityX: 0, velocityY: 0,
  isOnGround: false,
  facing: 1,
  invincible: 0,
  weaponTimer: 0,
  bazookaCooldown: 0,
  coyoteTimer: 0,
  jumpBuffer: 0,
  jumpCut: true,
  wasOnGround: false,
  shout: 0
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
  player.invincible = 90;
  player.coyoteTimer = 0;
  player.jumpBuffer = 0;
  player.jumpCut = true;
  player.wasOnGround = false;
}

// Called once per frame while gameState === 'playing'. Handles movement,
// jumping, gravity, and platform collision. Cross-system reactions (pit
// death, checkpoints, bazooka firing) are the caller's job — see
// scenes/playingScene.js.
export function updatePlayer(inputLocked) {
  const left = !inputLocked && (keys['ArrowLeft'] || keys['a']);
  const right = !inputLocked && (keys['ArrowRight'] || keys['d']);

  if (left && !right) {
    if (player.velocityX > 0) player.velocityX -= TURN_ACCEL; // reversing: extra kick to kill old momentum
    player.velocityX -= ACCEL;
    player.facing = -1;
  } else if (right && !left) {
    if (player.velocityX < 0) player.velocityX += TURN_ACCEL;
    player.velocityX += ACCEL;
    player.facing = 1;
  } else {
    if (player.velocityX > 0) player.velocityX = Math.max(0, player.velocityX - FRICTION);
    else if (player.velocityX < 0) player.velocityX = Math.min(0, player.velocityX + FRICTION);
  }
  player.velocityX = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.velocityX));

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
  if (player.x + player.width > WORLD_WIDTH) { player.x = WORLD_WIDTH - player.width; player.velocityX = 0; }

  // level's moving platforms react to the player's position/airborne state
  // (using isOnGround as it stood at the end of last frame, on purpose)
  const trickLipDelta = updateDynamicPlatforms(player);

  // --- platform collisions ---
  player.isOnGround = false;
  let standingPlatform = null;
  for (const platform of platforms) {
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
        standingPlatform = platform;
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

  // ride the trick lip smoothly instead of being left behind as it eases back
  if (standingPlatform === trickLip) {
    player.x += trickLipDelta;
  }

  // --- landing dust: a puff sized to how hard the landing was ---
  if (!player.wasOnGround && player.isOnGround) {
    const impact = Math.min(16, Math.max(6, Math.round(incomingFallSpeed * 1.6)));
    spawnDust(player.x + player.width / 2, player.y + player.height, impact, { spread: 4, size: 9, life: 26 });
  }
  player.wasOnGround = player.isOnGround;

  // --- running dust: puffs kicked up behind the player while moving on the ground ---
  if (player.isOnGround && Math.abs(player.velocityX) > 0.6) {
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
  // the center of the square — the same art the spheres use
  const hand = drawMuscleArm(0, -hh * 0.1, player.facing * (hw + 17), -hh * 0.35);

  // the bazooka easter egg — held in the fist at the end of the arm
  if (player.weaponTimer > 0) {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.scale(player.facing, 1);
    ctx.fillStyle = '#3a4a5c';
    ctx.fillRect(-4, -3, 20, 7);
    ctx.fillStyle = '#222c38';
    ctx.fillRect(12, -5, 8, 11);
    if (player.weaponTimer > 10) {
      ctx.fillStyle = 'rgba(255, 223, 122, 0.9)';
      ctx.beginPath();
      ctx.arc(22, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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
